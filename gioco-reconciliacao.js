/* gioco-reconciliacao.js — reconciliação entre pagamentos marcados como
   pagos na Tesouraria e os movimentos bancários reais (Set/2026).

   Motor partilhado no molde do gioco-compromissos.js: uma factory que recebe
   getters para os dados que a página já tem em memória e devolve funções
   puras (classificar, procurar candidatos) mais três escritas mínimas
   (ligar automático, ligar manual, desligar) no nó reconciliacaoBancaria/.

   Uso (tesouraria.html):

     var RE = giocoReconciliacaoEngine({
       getPaymentRequests:      function(){ return allPaymentRequests; },
       getPagamentosConcluidos: function(){ return allPagamentosConcluidos; },
       getMovimentos:           function(){ return { abanca: movsAbanca, revolut: movsRevolut }; },
       getReconciliacao:        function(){ return allReconciliacao; },
       compromissos:            CE,                       // giocoCompromissosEngine
       ref:                     db.ref('reconciliacaoBancaria')
     });
     var res = RE.calcular();          // { itens, porEstado, contadores, autoNovas }
     RE.aplicarAutomaticas(res);       // escreve as ligações "auto" (uma por caminho)

   Nó: reconciliacaoBancaria/{chavePagamento} =
         { conta, movimentoKey, valor, dataMovimento, metodo: 'auto'|'manual', em,
           ligado?: false, desligadoEm?, excluidos?: { {movimentoKey}: ms } }
   Uma entrada só conta como ligada com ligado !== false E movimentoKey.
   Desligar NÃO apaga: é um update() que põe os campos da ligação a null,
   ligado:false, desligadoEm e regista o movimento em excluidos/{key} — o
   match automático nunca volta a propor um movimento excluído dessa
   entrada; a pesquisa manual mostra-o marcado, e ligar à mão a um excluído
   é permitido (o mesmo update tira-o de excluidos). Nunca há remove().
   Chaves: payreq:{ticketId}~{lineIdx}  |  fixo:{chave de pagamentosConcluidos}
   (a chave de pagamentosConcluidos é {compromissoId}_{ano}-{mes}, mês SEM zero,
   e o id pode trazer o sufixo ~cartao — fica tal e qual).

   REGRA DE MATCH (confirmada em 04/09/2026):
   - candidato = movimento DBIT de qualquer das duas contas, com os MESMOS
     cêntimos do pagamento, booking_date dentro da janela à volta da âncora,
     sem "INTERNA" no descritivo (transferência ABANCA↔Revolut) e ainda não
     ligado a outro pagamento;
   - âncora = dia local de concluidoEm, janela [−2, +7]. Débitos directos
     (compromisso com metodoPagamento 'debito'): âncora = dia esperado do
     compromisso no período (resolveDia), janela [−3, +5], concluidoEm ignorado;
   - liga automaticamente só com EXACTAMENTE 1 candidato, valor não estimado,
     e se nenhum outro pagamento reclama esse mesmo movimento;
   - um movimentoKey nunca aparece ligado em duas entradas. Desligar é
     sempre manual e nunca apaga a entrada (ver acima).

   ESTADOS: confirmado (há entrada) · aguarda (0 candidatos, dentro da janela)
   · semMovimento (0 candidatos, janela já passou) · ambiguo (2+ candidatos,
   ou 1 candidato disputado / com valor estimado) · semData (sem âncora:
   linha sem concluidoEm — só ligação manual).

   Não escreve em mais nó nenhum e nunca apaga nada (nem remove(), nem
   null fora dos seis campos da ligação ao desligar). */

function giocoReconciliacaoEngine(deps){
  'use strict';

  var CE = deps.compromissos;
  var JANELA_IBAN   = { antes: 2, depois: 7 };
  var JANELA_DEBITO = { antes: 3, depois: 5 };
  var JANELA_MANUAL_DIAS = 30;      // pesquisa manual: ±30 dias
  var TOLERANCIA_MANUAL = 0.10;     // pesquisa manual: 90 %–110 % do valor
  var RE_INTERNA = /INTERNA/i;

  function __PR(){ return deps.getPaymentRequests() || {}; }
  function __PC(){ return deps.getPagamentosConcluidos() || {}; }
  function __MOVS(){ return deps.getMovimentos() || {}; }
  function __REC(){ return deps.getReconciliacao() || {}; }

  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  // Cêntimos inteiros: "valor exacto" tem de ser exacto, não uma tolerância
  // disfarçada em floats (mesmo critério da reconciliação de depósitos).
  function centimos(v){
    if (v === null || v === undefined || v === '') return null;
    var n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : Math.round(Math.abs(n) * 100);
  }

  function diaLocal(ts){
    if (ts === null || ts === undefined || ts === '') return null;
    var d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function diaBanco(v){
    return (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) ? v.slice(0, 10) : null;
  }

  function diasEntre(diaA, diaB){
    var a = Date.parse(diaA + 'T00:00:00Z');
    var b = Date.parse(diaB + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function hojeISO(){ return diaLocal(Date.now()); }

  // Estado de uma linha de pedido, igual ao de tesouraria.html/pagamentos.html.
  function lineStatus(p, l){
    var status = p.status || 'pendente';
    if (status !== 'pendente') return status;
    return (l && l.status === 'concluido') ? 'concluido' : 'pendente';
  }

  // Chave de pagamentosConcluidos: {compromissoId}_{ano}-{mes}; o id pode
  // ter '_' (push ids), por isso corta-se no ÚLTIMO underscore.
  function parseChaveConcluido(chave){
    var i = String(chave).lastIndexOf('_');
    if (i === -1) return null;
    var id = String(chave).slice(0, i);
    var per = String(chave).slice(i + 1).split('-');
    if (per.length !== 2) return null;
    var ano = parseInt(per[0], 10), mes = parseInt(per[1], 10);
    if (isNaN(ano) || isNaN(mes)) return null;
    return { id: id, ano: ano, mes: mes };
  }

  function chavePedido(ticketId, lineIdx){ return 'payreq:' + ticketId + '~' + lineIdx; }
  function chaveFixo(chaveConcluido){ return 'fixo:' + chaveConcluido; }
  function idMovimento(conta, key){ return conta + '/' + key; }

  /* ---------- movimentos ---------- */

  // Todos os débitos das duas contas, achatados, sem transferências internas.
  function movimentosDebito(){
    var contas = __MOVS();
    var out = [];
    Object.keys(contas).forEach(function(conta){
      var movs = contas[conta] || {};
      Object.keys(movs).forEach(function(key){
        var m = movs[key];
        if (!m || m.credit_debit_indicator !== 'DBIT') return;
        var dia = diaBanco(m.booking_date);
        var cents = centimos(m.amount);
        if (!dia || cents === null) return;
        var desc = m.remittance_information || '';
        if (RE_INTERNA.test(desc)) return;
        out.push({
          conta: conta, key: key, id: idMovimento(conta, key),
          dia: dia, cents: cents, valor: cents / 100,
          desc: desc || m.creditor_name || '—',
          extra: m.creditor_name || ''
        });
      });
    });
    out.sort(function(a, b){ return a.dia < b.dia ? -1 : (a.dia > b.dia ? 1 : 0); });
    return out;
  }

  function movimentoPorId(conta, key){
    var contas = __MOVS();
    var m = contas[conta] && contas[conta][key];
    if (!m) return null;
    var cents = centimos(m.amount);
    return { conta: conta, key: key, id: idMovimento(conta, key), dia: diaBanco(m.booking_date),
             cents: cents, valor: cents === null ? null : cents / 100,
             desc: m.remittance_information || m.creditor_name || '—', extra: m.creditor_name || '' };
  }

  /* ---------- pagamentos concluídos ---------- */

  // Um item por linha de pedido paga e por ocorrência de compromisso marcada
  // como paga. `ancora` é o dia de referência do match (null = semData),
  // `estimado` marca valores que vêm de médias (só ligação manual).
  function pagamentosConcluidos(){
    var out = [];
    var pr = __PR();
    Object.keys(pr).forEach(function(id){
      var p = pr[id];
      if (!p || (p.status || 'pendente') === 'anulado') return;
      (p.lines || []).forEach(function(l, i){
        if (!l || lineStatus(p, l) !== 'concluido') return;
        out.push({
          chave: chavePedido(id, i), fonte: 'pedido', ticketId: id, lineIdx: i,
          ticketNumero: p.numeroReferencia || '',
          nome: l.fornecedor || 'Sem descrição',
          cents: centimos(l.montante),
          concluidoEm: l.concluidoEm || null,
          ancora: diaLocal(l.concluidoEm),
          prazo: l.prazo || '', referencia: l.referencia || '',
          metodo: 'iban', janela: JANELA_IBAN, estimado: false
        });
      });
    });

    var pc = __PC();
    Object.keys(pc).forEach(function(k){
      var parsed = parseChaveConcluido(k);
      if (!parsed) return;
      var c = CE.compromissoPorId(parsed.id);
      var reg = pc[k] || {};
      var base = {
        chave: chaveFixo(k), fonte: 'fixo', compromissoId: parsed.id,
        ano: parsed.ano, mes: parsed.mes, concluidoEm: reg.concluidoEm || null
      };
      if (!c){
        out.push(Object.assign(base, { nome: '(compromisso apagado) ' + parsed.id, cents: null,
          ancora: null, metodo: 'iban', janela: JANELA_IBAN, estimado: true }));
        return;
      }
      var sufixo = CE.ehOcorrenciaCartao(parsed.id) ? CE.SUFIXO_CARTAO : '';
      var saidas = CE.saidasCompromisso(c, parsed.ano, parsed.mes);
      var saida = null;
      for (var s = 0; s < saidas.length; s++){
        if (saidas.length === 1 || (saidas[s].destino === 'cartao') === !!sufixo){ saida = saidas[s]; break; }
      }
      var valor = CE.valorOcorrencia(parsed.id, parsed.ano, parsed.mes);
      var estado = saida ? saida.estado : '';
      var dia = CE.resolveDia(CE.diaDaSaida(c, sufixo), parsed.ano, parsed.mes);
      var esperado = dia ? parsed.ano + '-' + pad2(parsed.mes) + '-' + pad2(dia) : null;
      var debito = c.metodoPagamento === 'debito';
      out.push(Object.assign(base, {
        nome: CE.nomeOcorrencia(parsed.id, c.nome || parsed.id),
        cents: valor > 0 ? centimos(valor) : null,
        esperado: esperado,
        ancora: debito ? esperado : diaLocal(reg.concluidoEm),
        metodo: debito ? 'debito' : 'iban',
        janela: debito ? JANELA_DEBITO : JANELA_IBAN,
        estimado: /^estimado/.test(String(estado || '')),
        estadoValor: estado
      }));
    });
    return out;
  }

  /* ---------- classificação ---------- */

  // Uma entrada está ligada só com ligado !== false E movimentoKey — uma
  // entrada desligada fica no nó (com excluidos/) mas não conta.
  function entradaLigada(r){
    return !!(r && r.ligado !== false && r.conta && r.movimentoKey);
  }

  function excluidosDe(r){
    return (r && r.excluidos && typeof r.excluidos === 'object') ? r.excluidos : {};
  }

  // Movimentos ligados: id do movimento → chave do pagamento.
  function movimentosUsados(){
    var rec = __REC();
    var usados = {};
    Object.keys(rec).forEach(function(chave){
      var r = rec[chave];
      if (entradaLigada(r)) usados[idMovimento(r.conta, r.movimentoKey)] = chave;
    });
    return usados;
  }

  function candidatosDe(item, movs, usados){
    if (item.cents === null || !item.ancora) return [];
    var excluidos = excluidosDe(__REC()[item.chave]);
    return movs.filter(function(m){
      if (usados[m.id] || excluidos[m.key] || m.cents !== item.cents) return false;
      var d = diasEntre(item.ancora, m.dia);
      return d !== null && d >= -item.janela.antes && d <= item.janela.depois;
    });
  }

  function calcular(){
    var rec = __REC();
    var usados = movimentosUsados();
    var movs = movimentosDebito();
    var hoje = hojeISO();
    var itens = pagamentosConcluidos();

    // 1.ª passagem: candidatos e reclamações — dois pagamentos com o mesmo
    // único candidato não se ligam a ele (ficam os dois ambíguos).
    var reclamacoes = {};
    itens.forEach(function(it){
      it.registo = rec[it.chave] || null;
      it.ligacao = entradaLigada(it.registo) ? it.registo : null;
      it.excluidos = excluidosDe(it.registo);
      it.candidatos = it.ligacao ? [] : candidatosDe(it, movs, usados);
      if (!it.ligacao && it.candidatos.length === 1){
        reclamacoes[it.candidatos[0].id] = (reclamacoes[it.candidatos[0].id] || 0) + 1;
      }
    });

    var autoNovas = [];
    itens.forEach(function(it){
      if (it.ligacao){
        it.estado = 'confirmado';
        it.movimento = movimentoPorId(it.ligacao.conta, it.ligacao.movimentoKey);
        return;
      }
      if (!it.ancora){ it.estado = 'semData'; return; }
      var n = it.candidatos.length;
      if (n >= 2){ it.estado = 'ambiguo'; return; }
      if (n === 1){
        var disputado = reclamacoes[it.candidatos[0].id] > 1;
        if (disputado || it.estimado){
          it.estado = 'ambiguo';
          it.motivoAmbiguo = disputado ? 'outro pagamento com o mesmo candidato' : 'valor estimado — só ligação manual';
          return;
        }
        it.estado = 'aguarda'; // até a escrita automática confirmar
        it.autoProposta = it.candidatos[0];
        autoNovas.push(it);
        return;
      }
      var passados = diasEntre(it.ancora, hoje);
      it.estado = (passados !== null && passados > it.janela.depois) ? 'semMovimento' : 'aguarda';
    });

    var porEstado = { confirmado: [], aguarda: [], semMovimento: [], ambiguo: [], semData: [] };
    itens.forEach(function(it){ porEstado[it.estado].push(it); });
    var contadores = {};
    Object.keys(porEstado).forEach(function(k){ contadores[k] = porEstado[k].length; });

    return { itens: itens, porEstado: porEstado, contadores: contadores, autoNovas: autoNovas,
             movimentos: movs, usados: usados };
  }

  function itemPorChave(res, chave){
    for (var i = 0; i < res.itens.length; i++) if (res.itens[i].chave === chave) return res.itens[i];
    return null;
  }

  // Pesquisa manual (sem movimento / sem data): débitos livres a ±30 dias
  // da referência com valor entre 90 % e 110 %. Sem referência (linha sem
  // data nem prazo) vale a tolerância de valor sobre todo o histórico.
  function pesquisaManual(item, referenciaDia){
    var usados = movimentosUsados();
    var excluidos = excluidosDe(__REC()[item.chave]);
    var ref = referenciaDia || item.ancora || item.esperado || null;
    var cents = item.cents;
    var out = movimentosDebito().filter(function(m){
      if (usados[m.id]) return false;
      if (cents !== null){
        if (m.cents < Math.round(cents * (1 - TOLERANCIA_MANUAL)) ||
            m.cents > Math.round(cents * (1 + TOLERANCIA_MANUAL))) return false;
      }
      if (ref){
        var d = diasEntre(ref, m.dia);
        if (d === null || Math.abs(d) > JANELA_MANUAL_DIAS) return false;
      }
      return true;
    }).map(function(m){
      // Excluído por um Desligar anterior: mostra-se na mesma, marcado.
      return excluidos[m.key] ? Object.assign({}, m, { excluidoAntes: true }) : m;
    });
    if (ref){
      out.sort(function(a, b){
        var da = Math.abs(diasEntre(ref, a.dia)), db = Math.abs(diasEntre(ref, b.dia));
        return da - db || (a.dia < b.dia ? -1 : 1);
      });
    }
    return out;
  }

  /* ---------- escritas (as únicas do módulo) ---------- */

  function registo(mov, metodo){
    return { conta: mov.conta, movimentoKey: mov.key, valor: mov.valor, dataMovimento: mov.dia,
             metodo: metodo, em: Date.now(), ligado: true };
  }

  // PATCH no caminho específico. Recusa se o movimento já está ligado a
  // outro pagamento (lido da cópia em memória, que o listener mantém).
  // Ligar à mão a um movimento excluído é permitido: o mesmo update tira a
  // chave de excluidos/.
  function ligar(chave, mov, metodo){
    var usados = movimentosUsados();
    if (usados[mov.id] && usados[mov.id] !== chave){
      return Promise.reject(new Error('Este movimento já está ligado a outro pagamento (' + usados[mov.id] + ').'));
    }
    var atual = __REC()[chave];
    if (entradaLigada(atual)){
      return Promise.reject(new Error('Este pagamento já tem um movimento ligado.'));
    }
    var patch = registo(mov, metodo);
    if (excluidosDe(atual)[mov.key]) patch['excluidos/' + mov.key] = null;
    return deps.ref.child(chave).update(patch);
  }

  var aEscrever = false;

  // Grava as ligações automáticas de um calcular(), uma escrita por caminho,
  // em sequência. Uma segunda chamada enquanto a primeira corre é ignorada:
  // o listener de reconciliacaoBancaria volta a chamar calcular() no fim.
  function aplicarAutomaticas(res){
    if (aEscrever || !res.autoNovas.length) return Promise.resolve([]);
    aEscrever = true;
    var feitas = [];
    var fila = res.autoNovas.slice();
    function passo(){
      var it = fila.shift();
      if (!it) return Promise.resolve(feitas);
      return ligar(it.chave, it.autoProposta, 'auto')
        .then(function(){ feitas.push(it); })
        .catch(function(err){ console.warn('reconciliação automática falhou em ' + it.chave, err); })
        .then(passo);
    }
    return passo().then(function(r){ aEscrever = false; return r; },
                        function(e){ aEscrever = false; throw e; });
  }

  // Desligar = "este match está errado". Sempre manual e confirmado na UI.
  // NUNCA remove(): a entrada fica com ligado:false, desligadoEm e o
  // movimento em excluidos/{key}, para o match automático não o voltar a
  // propor. É a única situação em que se escreve null, e só nestes seis
  // campos da ligação.
  function desligar(chave){
    var atual = __REC()[chave];
    if (!entradaLigada(atual)){
      return Promise.reject(new Error('Este pagamento não tem movimento ligado.'));
    }
    var agora = Date.now();
    var patch = { conta: null, movimentoKey: null, valor: null, dataMovimento: null, metodo: null, em: null,
                  ligado: false, desligadoEm: agora };
    patch['excluidos/' + atual.movimentoKey] = agora;
    return deps.ref.child(chave).update(patch);
  }

  return {
    JANELA_IBAN: JANELA_IBAN, JANELA_DEBITO: JANELA_DEBITO,
    JANELA_MANUAL_DIAS: JANELA_MANUAL_DIAS, TOLERANCIA_MANUAL: TOLERANCIA_MANUAL,
    centimos: centimos, diaLocal: diaLocal, diasEntre: diasEntre,
    chavePedido: chavePedido, chaveFixo: chaveFixo, parseChaveConcluido: parseChaveConcluido,
    movimentosDebito: movimentosDebito, movimentoPorId: movimentoPorId,
    movimentosUsados: movimentosUsados, entradaLigada: entradaLigada, excluidosDe: excluidosDe,
    pagamentosConcluidos: pagamentosConcluidos,
    calcular: calcular, itemPorChave: itemPorChave, pesquisaManual: pesquisaManual,
    ligar: ligar, desligar: desligar, aplicarAutomaticas: aplicarAutomaticas
  };
}
