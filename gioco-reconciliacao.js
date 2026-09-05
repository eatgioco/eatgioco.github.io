/* gioco-reconciliacao.js — reconciliação entre o que a Tesouraria dá como
   pago/faturado e os movimentos bancários reais (Set/2026).

   Motor partilhado no molde do gioco-compromissos.js: uma factory que recebe
   getters para os dados que a página já tem em memória e devolve funções
   puras (classificar, procurar candidatos) mais três escritas mínimas
   (ligar automático, ligar manual, desligar) no nó reconciliacaoBancaria/.

   Duas famílias de itens correm no MESMO núcleo (reconciliar):
   - PAGAMENTOS (DBIT): linhas de pedidos pagas + ocorrências de compromissos
     marcadas como pagas — calcular();
   - RECEITAS (CRDT): faturação diária por meio de pagamento de
     vendasDiario/{mês}/{dia}/porPagamento contra os créditos do
     terminal — calcularReceitas().

   Uso (tesouraria.html):

     var RE = giocoReconciliacaoEngine({
       getPaymentRequests:      function(){ return allPaymentRequests; },
       getPagamentosConcluidos: function(){ return allPagamentosConcluidos; },
       getMovimentos:           function(){ return { abanca: movsAbanca, revolut: movsRevolut }; },
       getReconciliacao:        function(){ return allReconciliacao; },
       getVendasDiario:         function(){ return allVendasDiario; },   // só para receitas
       compromissos:            CE,                       // giocoCompromissosEngine
       ref:                     db.ref('reconciliacaoBancaria')
     });
     var res = RE.calcular();          // { itens, porEstado, contadores, autoNovas }
     RE.aplicarAutomaticas(res);       // escreve as ligações "auto" (uma por caminho)
     var rv  = RE.calcularReceitas();  // { itens, porEstado, contadores, autoNovas, porDia, orfaos }
     RE.aplicarAutomaticas(rv);

   Nó: reconciliacaoBancaria/{chave}
     pagamentos: { conta, movimentoKey, valor, dataMovimento, metodo: 'auto'|'manual', em,
                   ligado?: false, desligadoEm?, excluidos?: { {movimentoKey}: ms } }
     receitas:   { conta, movimentoKey, movimentoKeys?: [..] (regra B com soma), dataMovimento,
                   valorVenda, valorMovimento, diferenca (= movimento − venda), estado
                   ('confirmado'|'aproximado'), metodo, em, ligado, desligadoEm?, excluidos? }
   Uma entrada só conta como ligada com ligado !== false E movimentoKey.
   Desligar NÃO apaga: é um update() que põe os campos da ligação a null,
   ligado:false, desligadoEm e regista o(s) movimento(s) em excluidos/{key} —
   o match automático nunca volta a propor um movimento excluído dessa
   entrada; a pesquisa manual mostra-o marcado, e ligar à mão a um excluído
   é permitido (o mesmo update tira-o de excluidos). Nunca há remove().
   Chaves: payreq:{ticketId}~{lineIdx}  |  fixo:{chave de pagamentosConcluidos}
   (a chave de pagamentosConcluidos é {compromissoId}_{ano}-{mes}, mês SEM zero,
   e o id pode trazer o sufixo ~cartao — fica tal e qual)
   |  venda:{AAAA-MM-DD}~CD  |  venda:{AAAA-MM-DD}~OU.

   REGRA DE MATCH — PAGAMENTOS (confirmada em 04/09/2026):
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

   REGRA DE MATCH — RECEITAS (definitiva, 05/09/2026, ver relatório do Passo 1):
   Um item por dia e meio de pagamento com bruto > 0. Candidatos = créditos
   (CRDT) de qualquer conta (hoje é tudo ABANCA).
   A) venda:{dia}~CD ↔ INTERCARD (filtro /INTERCARD/i na remittance_information)
      1. exacto: |Δ| ≤ 0,10 €, booking_date ∈ [dia, dia+5], 1 candidato não
         disputado → confirmado;
      2. senão: 1 único crédito INTERCARD ainda livre na mesma janela com
         |Δ| ≤ 40 € → aproximado (ligado automaticamente, diferença registada);
      3. 2+ candidatos → ambiguo; 0 candidatos e hoje ≤ dia+5 → aguarda;
         0 candidatos e hoje > dia+5 → semMovimento.
   B) venda:{dia}~OU ↔ FECHO TPA (filtro /^FECHO TPA/i — NUNCA /TPA/i, que
      apanha compras "TPA-UBR…"). Modo "soma": candidato = soma de todos os
      créditos FECHO TPA livres com booking_date = dia (o fecho chega à noite
      do próprio dia); outros créditos desse dia ignoram-se.
      |Δ| ≤ 0,10 → confirmado · |Δ| ≤ TOLERANCIA_OU_PCT → aproximado ·
      acima → ambiguo (só manual). Sem fecho e hoje ≤ dia+1 → aguarda,
      senão semMovimento.
   Os DBIT dos pagamentos e os CRDT das receitas nunca colidem, mas "um
   movimento ligado não se reutiliza" aplica-se entre itens de receita.

   ESTADOS: confirmado (há entrada) · aproximado (entrada automática com
   diferença, só receitas) · aguarda (0 candidatos, dentro da janela)
   · semMovimento (0 candidatos, janela já passou) · ambiguo (2+ candidatos,
   ou 1 candidato disputado / com valor estimado / fora da tolerância)
   · semData (sem âncora: linha sem concluidoEm — só ligação manual).

   Não escreve em mais nó nenhum e nunca apaga nada (nem remove(), nem
   null fora dos campos da ligação ao desligar). */

function giocoReconciliacaoEngine(deps){
  'use strict';

  var CE = deps.compromissos;
  var JANELA_IBAN   = { antes: 2, depois: 7 };
  var JANELA_DEBITO = { antes: 3, depois: 5 };
  var JANELA_MANUAL_DIAS = 30;      // pesquisa manual: ±30 dias
  var TOLERANCIA_MANUAL = 0.10;     // pesquisa manual: 90 %–110 % do valor
  var RE_INTERNA = /INTERNA/i;

  // ---- receitas (regras A e B) ----
  var JANELA_CD = { antes: 0, depois: 5 };   // INTERCARD credita no dia útil seguinte (sex → seg; feriados)
  var JANELA_OU = { antes: 0, depois: 0 };   // FECHO TPA credita na noite do próprio dia
  var AGUARDA_OU_DIAS = 1;                   // sem fecho: aguarda até dia+1
  var TOLERANCIA_EXACTA_CENTS = 10;          // |Δ| ≤ 0,10 € conta como exacto (arredondamentos do terminal)
  var TOLERANCIA_APROX_CD_CENTS = 4000;      // regra A2: 1 crédito livre com |Δ| ≤ 40 € → aproximado
  // Tolerância PROVISÓRIA da regra B (aproximado até 5 % do faturado):
  // rever após 4 semanas de dados OU. Acima disto fica ambiguo (só manual).
  var TOLERANCIA_OU_PCT = 0.05;
  var RE_INTERCARD = /INTERCARD/i;
  var RE_FECHO_TPA = /^FECHO TPA/i;
  var MEIOS_RECEITA = {
    CD: { rotulo: 'Cartão débito', filtro: RE_INTERCARD, familia: 'INTERCARD', janela: JANELA_CD,
          aguardaDias: JANELA_CD.depois, modo: 'unico', tolerancia: TOLERANCIA_EXACTA_CENTS,
          toleranciaAproxCents: TOLERANCIA_APROX_CD_CENTS },
    OU: { rotulo: 'Outro / TPA', filtro: RE_FECHO_TPA, familia: 'FECHO TPA', janela: JANELA_OU,
          aguardaDias: AGUARDA_OU_DIAS, modo: 'soma', tolerancia: TOLERANCIA_EXACTA_CENTS,
          toleranciaAproxPct: TOLERANCIA_OU_PCT }
  };

  function __PR(){ return deps.getPaymentRequests() || {}; }
  function __PC(){ return deps.getPagamentosConcluidos() || {}; }
  function __MOVS(){ return deps.getMovimentos() || {}; }
  function __REC(){ return deps.getReconciliacao() || {}; }
  function __VD(){ return (deps.getVendasDiario && deps.getVendasDiario()) || {}; }

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
  function chaveVenda(dia, meio){ return 'venda:' + dia + '~' + meio; }
  function idMovimento(conta, key){ return conta + '/' + key; }

  /* ---------- movimentos ---------- */

  // Movimentos das duas contas, achatados, com o indicador pedido ('DBIT' |
  // 'CRDT') e, opcionalmente, só os cuja remittance_information casa
  // filtroRegex e não casa excluirRegex (ambos testados na
  // remittance_information crua, antes de qualquer fallback).
  function movimentos(indicador, filtroRegex, excluirRegex){
    var contas = __MOVS();
    var out = [];
    Object.keys(contas).forEach(function(conta){
      var movs = contas[conta] || {};
      Object.keys(movs).forEach(function(key){
        var m = movs[key];
        if (!m || m.credit_debit_indicator !== indicador) return;
        var dia = diaBanco(m.booking_date);
        var cents = centimos(m.amount);
        if (!dia || cents === null) return;
        var desc = m.remittance_information || '';
        if (excluirRegex && excluirRegex.test(desc)) return;
        if (filtroRegex && !filtroRegex.test(desc)) return;
        out.push({
          conta: conta, key: key, id: idMovimento(conta, key),
          dia: dia, cents: cents, valor: cents / 100,
          desc: desc || m.creditor_name || '—',
          extra: m.creditor_name || '',
          remit: desc
        });
      });
    });
    out.sort(function(a, b){ return a.dia < b.dia ? -1 : (a.dia > b.dia ? 1 : 0); });
    return out;
  }

  // Todos os débitos das duas contas, sem transferências internas — a fonte
  // dos pagamentos, tal como antes da generalização.
  function movimentosDebito(){
    return movimentos('DBIT', null, RE_INTERNA);
  }

  // Todos os créditos das duas contas (receitas; pesquisa manual de receitas).
  function movimentosCredito(filtroRegex){
    return movimentos('CRDT', filtroRegex);
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

  /* ---------- receitas (vendasDiario) ---------- */

  // Um item por dia e meio de pagamento (CD, OU) com bruto > 0. Cada item
  // traz a sua janela, tolerâncias, modo e filtro — o núcleo não sabe de
  // meios de pagamento, só lê estes parâmetros.
  function receitasDiarias(){
    var vd = __VD();
    var out = [];
    Object.keys(vd).forEach(function(mes){
      var dias = vd[mes] || {};
      Object.keys(dias).forEach(function(dia){
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return;
        var pp = dias[dia] && dias[dia].porPagamento;
        if (!pp) return;
        Object.keys(MEIOS_RECEITA).forEach(function(meio){
          var cents = pp[meio] ? centimos(pp[meio].bruto) : null;
          if (!cents) return; // ausente ou 0 → não há item
          var cfg = MEIOS_RECEITA[meio];
          out.push({
            chave: chaveVenda(dia, meio), fonte: 'venda', indicador: 'CRDT',
            dia: dia, meio: meio, familia: cfg.familia,
            nome: cfg.rotulo + ' ' + dia, cents: cents, docs: pp[meio].docs || 0,
            ancora: dia, janela: cfg.janela, aguardaDias: cfg.aguardaDias,
            modo: cfg.modo, filtro: cfg.filtro,
            tolerancia: cfg.tolerancia,
            toleranciaAproxCents: cfg.toleranciaAproxCents || 0,
            toleranciaAproxPct: cfg.toleranciaAproxPct || 0,
            estimado: false
          });
        });
      });
    });
    out.sort(function(a, b){ return a.chave < b.chave ? -1 : 1; });
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

  // Todas as chaves de movimento de uma entrada (1 ou, na regra B, várias).
  function chavesDaEntrada(r){
    var ks = [];
    if (r && r.movimentoKey) ks.push(r.movimentoKey);
    if (r && Array.isArray(r.movimentoKeys)) r.movimentoKeys.forEach(function(k){ if (k && ks.indexOf(k) === -1) ks.push(k); });
    return ks;
  }

  // Movimentos ligados: id do movimento → chave do item.
  function movimentosUsados(){
    var rec = __REC();
    var usados = {};
    Object.keys(rec).forEach(function(chave){
      var r = rec[chave];
      if (entradaLigada(r)) chavesDaEntrada(r).forEach(function(k){ usados[idMovimento(r.conta, k)] = chave; });
    });
    return usados;
  }

  // Candidatos exactos: mesmos cêntimos (ou dentro de item.tolerancia,
  // quando o item a define) dentro da janela do item, livres e não excluídos.
  function candidatosDe(item, movs, usados){
    if (item.cents === null || !item.ancora) return [];
    var excluidos = excluidosDe(__REC()[item.chave]);
    var tol = item.tolerancia || 0;
    return movs.filter(function(m){
      if (usados[m.id] || excluidos[m.key]) return false;
      if (tol ? Math.abs(m.cents - item.cents) > tol : m.cents !== item.cents) return false;
      var d = diasEntre(item.ancora, m.dia);
      return d !== null && d >= -item.janela.antes && d <= item.janela.depois;
    });
  }

  // Todos os movimentos livres na janela do item, sem olhar ao valor
  // (regra A2 e modo soma).
  function livresNaJanela(item, movs, usados){
    if (!item.ancora) return [];
    var excluidos = excluidosDe(__REC()[item.chave]);
    return movs.filter(function(m){
      if (usados[m.id] || excluidos[m.key]) return false;
      var d = diasEntre(item.ancora, m.dia);
      return d !== null && d >= -item.janela.antes && d <= item.janela.depois;
    });
  }

  function movsDoItem(item, movsBase){
    return item.filtro ? movsBase.filter(function(m){ return item.filtro.test(m.remit || ''); }) : movsBase;
  }

  // Núcleo comum: classifica uma lista de itens contra uma lista de
  // movimentos. Cada item traz ancora, janela, cents, estimado e,
  // opcionalmente, filtro / tolerancia / modo ('unico'|'soma') /
  // toleranciaAproxCents / toleranciaAproxPct / aguardaDias.
  function reconciliar(itens, movs, hoje){
    var rec = __REC();
    var usados = movimentosUsados();

    // 1.ª passagem: candidatos e reclamações — dois itens com o mesmo
    // único candidato não se ligam a ele (ficam os dois ambíguos).
    var reclamacoes = {};
    itens.forEach(function(it){
      it.registo = rec[it.chave] || null;
      it.ligacao = entradaLigada(it.registo) ? it.registo : null;
      it.excluidos = excluidosDe(it.registo);
      it.movs = movsDoItem(it, movs);
      it.candidatos = it.ligacao ? [] : candidatosDe(it, it.movs, usados);
      if (!it.ligacao && it.candidatos.length === 1){
        reclamacoes[it.candidatos[0].id] = (reclamacoes[it.candidatos[0].id] + 1) || 1;
      }
    });
    // Movimentos que são candidato exacto de algum item: a passagem
    // aproximada (A2) não os pode levar.
    var reservados = {};
    itens.forEach(function(it){ it.candidatos.forEach(function(m){ reservados[m.id] = true; }); });

    var autoNovas = [];
    var aproxReclamacoes = {};
    itens.forEach(function(it){
      if (it.ligacao){
        it.estado = it.ligacao.estado === 'aproximado' ? 'aproximado' : 'confirmado';
        it.movimento = movimentoPorId(it.ligacao.conta, it.ligacao.movimentoKey);
        it.movimentos = chavesDaEntrada(it.ligacao).map(function(k){ return movimentoPorId(it.ligacao.conta, k); }).filter(Boolean);
        return;
      }
      if (!it.ancora){ it.estado = 'semData'; return; }

      if (it.modo === 'soma'){
        // Regra B: candidato = soma de todos os créditos livres da família
        // na janela (o próprio dia). Sem tolerância → ambiguo, só manual.
        var soma = livresNaJanela(it, it.movs, usados);
        if (!soma.length){
          var passou = diasEntre(it.ancora, hoje);
          it.estado = (passou !== null && passou > (it.aguardaDias != null ? it.aguardaDias : it.janela.depois)) ? 'semMovimento' : 'aguarda';
          return;
        }
        var total = soma.reduce(function(a, m){ return a + m.cents; }, 0);
        var delta = total - it.cents;
        it.candidatos = soma;
        it.somaCents = total;
        it.diferencaCents = delta;
        if (Math.abs(delta) <= (it.tolerancia || 0)){
          it.estado = 'aguarda';
          it.autoProposta = { movs: soma, estado: 'confirmado' };
          autoNovas.push(it);
        } else if (it.toleranciaAproxPct && Math.abs(delta) <= Math.round(it.cents * it.toleranciaAproxPct)){
          it.estado = 'aguarda';
          it.autoProposta = { movs: soma, estado: 'aproximado' };
          autoNovas.push(it);
        } else {
          it.estado = 'ambiguo';
          it.motivoAmbiguo = 'diferença acima de ' + Math.round((it.toleranciaAproxPct || 0) * 100) + ' % — só ligação manual';
        }
        return;
      }

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
        // Pagamentos: a proposta é o movimento (formato de sempre);
        // receitas: { movs, estado }, o formato das regras A2 e B.
        it.autoProposta = it.fonte === 'venda' ? { movs: [it.candidatos[0]], estado: 'confirmado' } : it.candidatos[0];
        autoNovas.push(it);
        return;
      }
      // 0 candidatos exactos. Regra A2: um único crédito livre, não
      // reservado por outro item, dentro da tolerância aproximada.
      if (it.toleranciaAproxCents){
        var aprox = livresNaJanela(it, it.movs, usados).filter(function(m){
          return !reservados[m.id] && Math.abs(m.cents - it.cents) <= it.toleranciaAproxCents;
        });
        if (aprox.length >= 2){ it.estado = 'ambiguo'; it.candidatos = aprox; it.motivoAmbiguo = 'vários créditos próximos do valor'; return; }
        if (aprox.length === 1){
          it.candidatos = aprox;
          it.diferencaCents = aprox[0].cents - it.cents;
          aproxReclamacoes[aprox[0].id] = (aproxReclamacoes[aprox[0].id] || []).concat([it]);
          return; // decide-se abaixo, depois de ver se outro item quer o mesmo
        }
      }
      var passados = diasEntre(it.ancora, hoje);
      it.estado = (passados !== null && passados > (it.aguardaDias != null ? it.aguardaDias : it.janela.depois)) ? 'semMovimento' : 'aguarda';
    });

    // Aproximados (A2): só liga se nenhum outro item reclama o mesmo crédito.
    Object.keys(aproxReclamacoes).forEach(function(id){
      var lista = aproxReclamacoes[id];
      lista.forEach(function(it){
        if (lista.length > 1){
          it.estado = 'ambiguo';
          it.motivoAmbiguo = 'outro dia com o mesmo crédito aproximado';
          return;
        }
        it.estado = 'aguarda';
        it.autoProposta = { movs: [it.candidatos[0]], estado: 'aproximado' };
        autoNovas.push(it);
      });
    });

    return { autoNovas: autoNovas, usados: usados };
  }

  function agruparPorEstado(itens, estados){
    var porEstado = {};
    estados.forEach(function(e){ porEstado[e] = []; });
    itens.forEach(function(it){ (porEstado[it.estado] || (porEstado[it.estado] = [])).push(it); });
    var contadores = {};
    Object.keys(porEstado).forEach(function(k){ contadores[k] = porEstado[k].length; });
    return { porEstado: porEstado, contadores: contadores };
  }

  // Pagamentos (DBIT). Resultado igual ao de antes da generalização.
  function calcular(){
    var movs = movimentosDebito();
    var itens = pagamentosConcluidos();
    var r = reconciliar(itens, movs, hojeISO());
    var g = agruparPorEstado(itens, ['confirmado', 'aguarda', 'semMovimento', 'ambiguo', 'semData']);
    return { itens: itens, porEstado: g.porEstado, contadores: g.contadores, autoNovas: r.autoNovas,
             movimentos: movs, usados: r.usados };
  }

  // Receitas (CRDT): um item por dia e meio, agrupados também por dia para
  // a tabela, mais os créditos das famílias sem venda a que pertencer.
  function calcularReceitas(){
    var movs = movimentosCredito();
    var itens = receitasDiarias();
    var r = reconciliar(itens, movs, hojeISO());
    var g = agruparPorEstado(itens, ['confirmado', 'aproximado', 'aguarda', 'semMovimento', 'ambiguo']);

    var porDia = {};
    itens.forEach(function(it){
      var d = porDia[it.dia] || (porDia[it.dia] = { dia: it.dia });
      d[it.meio] = it;
    });

    // Créditos sem venda: da família (INTERCARD / FECHO TPA), livres, e
    // fora da janela de qualquer item desse meio — só para listar.
    var usados = movimentosUsados();
    var orfaos = [];
    Object.keys(MEIOS_RECEITA).forEach(function(meio){
      var cfg = MEIOS_RECEITA[meio];
      var doMeio = itens.filter(function(it){ return it.meio === meio; });
      movsDoItem({ filtro: cfg.filtro }, movs).forEach(function(m){
        if (usados[m.id]) return;
        var coberto = doMeio.some(function(it){
          var d = diasEntre(it.ancora, m.dia);
          return d !== null && d >= -cfg.janela.antes && d <= cfg.janela.depois;
        });
        if (!coberto) orfaos.push(Object.assign({ meio: meio, familia: cfg.familia }, m));
      });
    });
    orfaos.sort(function(a, b){ return a.dia < b.dia ? -1 : (a.dia > b.dia ? 1 : 0); });

    return { itens: itens, porEstado: g.porEstado, contadores: g.contadores, autoNovas: r.autoNovas,
             porDia: porDia, orfaos: orfaos, movimentos: movs, usados: r.usados };
  }

  function itemPorChave(res, chave){
    for (var i = 0; i < res.itens.length; i++) if (res.itens[i].chave === chave) return res.itens[i];
    return null;
  }

  // Pesquisa manual (sem movimento / sem data / ambíguo): movimentos livres
  // a ±30 dias da referência com valor entre 90 % e 110 %. Sem referência
  // (linha sem data nem prazo) vale a tolerância de valor sobre todo o
  // histórico. Pagamentos pesquisam nos débitos; receitas em TODOS os
  // créditos (só CRDT, sem filtro de família — a escolha é do utilizador).
  function pesquisaManual(item, referenciaDia){
    var usados = movimentosUsados();
    var excluidos = excluidosDe(__REC()[item.chave]);
    var ref = referenciaDia || item.ancora || item.esperado || null;
    var cents = item.cents;
    var base = item.indicador === 'CRDT' ? movimentosCredito() : movimentosDebito();
    var out = base.filter(function(m){
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

  // Entrada de receita: um ou vários movimentos (regra B), valor faturado,
  // valor creditado, diferença e o estado que a ligação representa.
  function registoReceita(movs, metodo, item, estado){
    var total = movs.reduce(function(a, m){ return a + m.cents; }, 0);
    var r = { conta: movs[0].conta, movimentoKey: movs[0].key, dataMovimento: movs[0].dia,
              valorVenda: item.cents / 100, valorMovimento: total / 100,
              diferenca: (total - item.cents) / 100,
              estado: estado || 'confirmado', metodo: metodo, em: Date.now(), ligado: true };
    if (movs.length > 1) r.movimentoKeys = movs.map(function(m){ return m.key; });
    return r;
  }

  // PATCH no caminho específico. Recusa se o movimento já está ligado a
  // outro item (lido da cópia em memória, que o listener mantém).
  // Ligar à mão a um movimento excluído é permitido: o mesmo update tira a
  // chave de excluidos/.
  // Pagamentos: ligar(chave, mov, metodo). Receitas: ligar(chave, mov ou
  // [movs], metodo, item, estado) — item obrigatório (dá o valor faturado).
  function ligar(chave, mov, metodo, item, estado){
    var movs = Array.isArray(mov) ? mov : [mov];
    var usados = movimentosUsados();
    for (var i = 0; i < movs.length; i++){
      if (usados[movs[i].id] && usados[movs[i].id] !== chave){
        return Promise.reject(new Error('Este movimento já está ligado a outro pagamento (' + usados[movs[i].id] + ').'));
      }
      if (movs[i].conta !== movs[0].conta){
        return Promise.reject(new Error('Os movimentos de uma ligação têm de ser da mesma conta.'));
      }
    }
    var atual = __REC()[chave];
    if (entradaLigada(atual)){
      return Promise.reject(new Error('Este pagamento já tem um movimento ligado.'));
    }
    var patch = (item && item.fonte === 'venda') ? registoReceita(movs, metodo, item, estado) : registo(movs[0], metodo);
    var excl = excluidosDe(atual);
    movs.forEach(function(m){ if (excl[m.key]) patch['excluidos/' + m.key] = null; });
    return deps.ref.child(chave).update(patch);
  }

  var aEscrever = false;

  // Grava as ligações automáticas de um calcular() / calcularReceitas(),
  // uma escrita por caminho, em sequência. Uma segunda chamada enquanto a
  // primeira corre é ignorada: o listener de reconciliacaoBancaria volta a
  // chamar calcular() no fim.
  function aplicarAutomaticas(res){
    if (aEscrever || !res.autoNovas.length) return Promise.resolve([]);
    aEscrever = true;
    var feitas = [];
    var fila = res.autoNovas.slice();
    function passo(){
      var it = fila.shift();
      if (!it) return Promise.resolve(feitas);
      var p = (it.fonte === 'venda')
        ? ligar(it.chave, it.autoProposta.movs, 'auto', it, it.autoProposta.estado)
        : ligar(it.chave, it.autoProposta, 'auto');
      return p
        .then(function(){ feitas.push(it); })
        .catch(function(err){ console.warn('reconciliação automática falhou em ' + it.chave, err); })
        .then(passo);
    }
    return passo().then(function(r){ aEscrever = false; return r; },
                        function(e){ aEscrever = false; throw e; });
  }

  // Desligar = "este match está errado". Sempre manual e confirmado na UI.
  // NUNCA remove(): a entrada fica com ligado:false, desligadoEm e o(s)
  // movimento(s) em excluidos/{key}, para o match automático não os voltar
  // a propor. É a única situação em que se escreve null, e só nos campos
  // da ligação (os seis dos pagamentos; nas receitas também os campos
  // próprios da entrada de receita).
  function desligar(chave){
    var atual = __REC()[chave];
    if (!entradaLigada(atual)){
      return Promise.reject(new Error('Este pagamento não tem movimento ligado.'));
    }
    var agora = Date.now();
    var patch = { conta: null, movimentoKey: null, valor: null, dataMovimento: null, metodo: null, em: null,
                  ligado: false, desligadoEm: agora };
    if (/^venda:/.test(chave)){
      delete patch.valor;
      patch.movimentoKeys = null; patch.valorVenda = null; patch.valorMovimento = null;
      patch.diferenca = null; patch.estado = null;
      chavesDaEntrada(atual).forEach(function(k){ patch['excluidos/' + k] = agora; });
    } else {
      patch['excluidos/' + atual.movimentoKey] = agora;
    }
    return deps.ref.child(chave).update(patch);
  }

  return {
    JANELA_IBAN: JANELA_IBAN, JANELA_DEBITO: JANELA_DEBITO,
    JANELA_MANUAL_DIAS: JANELA_MANUAL_DIAS, TOLERANCIA_MANUAL: TOLERANCIA_MANUAL,
    JANELA_CD: JANELA_CD, JANELA_OU: JANELA_OU, AGUARDA_OU_DIAS: AGUARDA_OU_DIAS,
    TOLERANCIA_EXACTA_CENTS: TOLERANCIA_EXACTA_CENTS, TOLERANCIA_APROX_CD_CENTS: TOLERANCIA_APROX_CD_CENTS,
    TOLERANCIA_OU_PCT: TOLERANCIA_OU_PCT, MEIOS_RECEITA: MEIOS_RECEITA,
    centimos: centimos, diaLocal: diaLocal, diasEntre: diasEntre,
    chavePedido: chavePedido, chaveFixo: chaveFixo, chaveVenda: chaveVenda, parseChaveConcluido: parseChaveConcluido,
    movimentos: movimentos, movimentosDebito: movimentosDebito, movimentosCredito: movimentosCredito,
    movimentoPorId: movimentoPorId,
    movimentosUsados: movimentosUsados, entradaLigada: entradaLigada, excluidosDe: excluidosDe,
    chavesDaEntrada: chavesDaEntrada,
    pagamentosConcluidos: pagamentosConcluidos, receitasDiarias: receitasDiarias,
    calcular: calcular, calcularReceitas: calcularReceitas, itemPorChave: itemPorChave,
    pesquisaManual: pesquisaManual,
    ligar: ligar, desligar: desligar, aplicarAutomaticas: aplicarAutomaticas
  };
}
