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
   diferença, só receitas) · semDados (só receitas: dia anterior ao primeiro
   booking_date em memória, primeiroDiaBanco(); sem proposta, sem escrita,
   sem acções; uma entrada antiga desse dia sem ligação fica como está) ·
   aguarda (0 candidatos, dentro da janela)
   · semMovimento (0 candidatos, janela já passou) · ambiguo (2+ candidatos,
   ou 1 candidato disputado / com valor estimado / fora da tolerância)
   · semData (sem âncora: linha sem concluidoEm — só ligação manual).

   Não escreve em mais nó nenhum e nunca apaga nada (nem remove(), nem
   null fora dos campos da ligação ao desligar).

   MOTOR DE CORRESPONDÊNCIA (Set/2026): a procura de candidatos em modo
   único (pagamentos e receitas CD) e a dos débitos directos delegam no
   gioco-correspondencia.js (função pura, carregada ANTES deste ficheiro):
   pagamentos ['exacto','soma2'] — dois débitos do mesmo dia e conta que
   somam o valor ligam-se juntos (Mensalidade Abanca 10,00 + 0,40);
   receitas CD só ['exacto']; débitos fixos ['exacto','soma2']; débitos
   variáveis ['descritivo']. A soma-de-N das receitas OU e a regra A2
   ficaram fora do motor. Uma ligação com 2 movimentos grava movimentoKey
   (o primeiro) + movimentoKeys[] + valor (soma) + estrategia — aditivo,
   em qualquer família de chave; entradas antigas não mudam.

   DÉBITO DIRETO — confirmação ANTES do clique (Set/2026, só tesouraria.html):
   calcularDebitos()/aplicarDebitosAutomaticos() correm a par de calcular()/
   aplicarAutomaticas(), mas sobre ocorrências de compromissos
   metodoPagamento:'debito' que AINDA NÃO estão em pagamentosConcluidos —
   um passo antes da reconciliação normal, que só vê o que já foi marcado
   como pago. Valor fixo (sem compromissosFixos/{id}/valorVariavel): match
   exacto de cêntimos na JANELA_DEBITO, confirma sozinho. Valor variável
   (valorVariavel:true — Eletricidade, EPAL): sem valor para comparar, usa o
   descritivo bancário e aprende-o em historicoDescritivos/ (array só
   acrescentado); com padrão aprendido (3+ confirmações consistentes)
   confirma sozinho, senão fica só como sugestão de 1 clique
   (confirmarSugestaoDebito). Ver o comentário de cabeçalho dessa secção
   mais abaixo para o detalhe. Escreve pagamentosConcluidos/{chave} (set,
   {concluidoEm, auto, confirmadoManualmente?}) e, só nos de valor
   variável, compromissosFixos/{id}/historicoDescritivos (set do array
   completo lido de memória — a única forma de "acrescentar" um campo no
   RTDB sem update() multi-chave). Nunca remove(). */

function giocoReconciliacaoEngine(deps){
  'use strict';

  var CE = deps.compromissos;
  // Motor de correspondência valor ↔ movimentos (gioco-correspondencia.js,
  // carregado antes deste ficheiro). Injectável para testes sem browser.
  var CORR = deps.correspondencia || (typeof giocoCorrespondencia === 'function' ? giocoCorrespondencia : null);
  if (!CORR) throw new Error('gioco-correspondencia.js tem de ser carregado antes do gioco-reconciliacao.js');
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

  // Primeiro booking_date presente em qualquer conta (DBIT ou CRDT), calculado
  // dos movimentos em memória — nunca fixo. null sem movimentos.
  function primeiroDiaBanco(){
    var min = null;
    var contas = __MOVS();
    Object.keys(contas).forEach(function(conta){
      var movs = contas[conta] || {};
      Object.keys(movs).forEach(function(key){
        var dia = movs[key] && diaBanco(movs[key].booking_date);
        if (dia && (min === null || dia < min)) min = dia;
      });
    });
    return min;
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

  /* ---------- débito direto: confirmação antes do clique (Set/2026) ----------
     calcular()/aplicarAutomaticas() só reconciliam ocorrências JÁ marcadas
     como pagas (pagamentosConcluidos). Isto aqui corre um passo ANTES: sobre
     as ocorrências de compromissos de débito direto que ainda NÃO estão em
     pagamentosConcluidos, para os confirmar sozinhas quando o banco já
     mostra o débito — só chamado a partir da tesouraria.html.
     Dois comportamentos, decididos por compromissosFixos/{id}/valorVariavel:
     - ausente/false (valor fixo — Mensalidade Abanca, NOS, ZoneSoft POS):
       match exacto de cêntimos na JANELA_DEBITO; 1 candidato confirma
       sozinho, escrevendo pagamentosConcluidos + reconciliacaoBancaria numa
       só passagem, antes de qualquer clique.
     - true (valor variável — Eletricidade, EPAL): sem valor para comparar,
       usa o descritivo bancário. compromissosFixos/{id}/historicoDescritivos
       (array só ACRESCENTADO, nunca substituído) aprende o texto real; com
       3+ entradas cujas últimas 3 raízes normalizadas batem, um candidato
       encontrado pelo HISTÓRICO confirma sozinho, tal como o de valor fixo.
       Com menos de 3, ou quando o único candidato só bate pela regex de
       arranque (fallback, sem histórico ainda, ou porque o descritivo mudou
       e deixou de bater com o histórico aprendido), fica só como SUGESTÃO
       de um clique (confirmarSugestaoDebito) — nunca escreve sozinho. */

  var FALLBACK_DEBITO_VARIAVEL = [
    { teste: /eletric/i, regex: /eletric|edp|ibelectra/i },
    { teste: /epal/i,    regex: /epal/i }
  ];

  // Raiz comparável de um descritivo bancário ("IBELECTRA FT202609123" →
  // "IBELECTRA FT"). A implementação vive no gioco-correspondencia.js — a
  // única versão no OS; aqui é só um alias para os consumidores antigos.
  var normalizarDescritivo = CORR.normalizarDescritivo;

  // 'aprendendo' (< 3 confirmações, ou as últimas 3 raízes não batem entre
  // si) ou 'aprendido' (3+, últimas 3 com a mesma raiz).
  function estadoAprendizagemDebito(historico){
    var lista = Array.isArray(historico) ? historico : [];
    if (lista.length < 3) return 'aprendendo';
    var raizes = lista.slice(-3).map(normalizarDescritivo);
    var primeira = raizes[0];
    return raizes.every(function(r){ return r === primeira; }) ? 'aprendido' : 'aprendendo';
  }

  function regexFallbackDebito(nome){
    for (var i = 0; i < FALLBACK_DEBITO_VARIAVEL.length; i++){
      if (FALLBACK_DEBITO_VARIAVEL[i].teste.test(nome || '')) return FALLBACK_DEBITO_VARIAVEL[i].regex;
    }
    return null;
  }

  function mesesJanelaDebito(){
    var hoje = new Date();
    var ano1 = hoje.getFullYear(), mes1 = hoje.getMonth() + 1;
    var ano2 = ano1, mes2 = mes1 + 1;
    if (mes2 > 12){ mes2 = 1; ano2++; }
    return [{ ano: ano1, mes: mes1 }, { ano: ano2, mes: mes2 }];
  }

  // Ocorrências de compromissos de débito direto AINDA sem entrada em
  // pagamentosConcluidos, nos meses indicados — mesma âncora (dia esperado)
  // e mesma janela (JANELA_DEBITO) da reconciliação normal de débitos.
  function ocorrenciasDebitoPendentes(meses){
    var pc = __PC();
    var out = [];
    CE.idsCompromissos().forEach(function(id){
      var c = CE.compromissoPorId(id);
      if (!c || !c.ativo || c.metodoPagamento !== 'debito') return;
      var mesesLista = CE.mesesArray(c.meses);
      meses.forEach(function(per){
        if (mesesLista.length && mesesLista.indexOf(per.mes) === -1) return;
        var chaveConcluido = id + '_' + per.ano + '-' + per.mes;
        if (pc[chaveConcluido]) return;
        var dia = CE.resolveDia(CE.diaDaSaida(c, ''), per.ano, per.mes);
        if (dia === null) return;
        var cents = centimos(CE.valorOcorrencia(id, per.ano, per.mes));
        if (!c.valorVariavel && !cents) return; // valor fixo sem valor definido: nada a comparar
        out.push({
          compromissoId: id, ano: per.ano, mes: per.mes,
          chaveConcluido: chaveConcluido, chaveReconciliacao: chaveFixo(chaveConcluido),
          nome: c.nome || id,
          esperado: per.ano + '-' + pad2(per.mes) + '-' + pad2(dia),
          cents: cents, valorVariavel: !!c.valorVariavel, historico: c.historicoDescritivos || []
        });
      });
    });
    return out;
  }

  function livres(movs, usados){
    return movs.filter(function(m){ return !usados[m.id]; });
  }

  // Valor fixo (Mensalidade Abanca, NOS, ZoneSoft): motor com 'exacto' e
  // 'soma2', âncora no dia esperado, JANELA_DEBITO, sobre os débitos livres
  // das duas contas. O soma2 é o que resolve a Mensalidade Abanca (10,00 €
  // + 0,40 € de imposto de selo no mesmo dia) sem código próprio.
  function candidatosDebitoFixo(item, movs, usados){
    return CORR({ cents: item.cents, dia: item.esperado, janela: JANELA_DEBITO,
                  movimentos: livres(movs, usados), estrategias: ['exacto', 'soma2'] });
  }

  // Valor variável (Eletricidade, EPAL): sem valor para comparar, motor só
  // com 'descritivo' — histórico aprendido primeiro, regex de arranque
  // depois. aprendido = 3+ confirmações cujas últimas 3 raízes batem.
  function candidatosDebitoVariavel(item, movs, usados){
    return CORR({ cents: null, dia: item.esperado, janela: JANELA_DEBITO,
                  movimentos: livres(movs, usados), estrategias: ['descritivo'],
                  descritivosConhecidos: (item.historico || []).map(normalizarDescritivo),
                  regexFallback: regexFallbackDebito(item.nome),
                  aprendido: estadoAprendizagemDebito(item.historico) === 'aprendido' });
  }

  // Classifica as pendências de débito direto dos meses dados em dois
  // grupos: autoConfirmar (escreve sozinho) e sugestoes (só um clique).
  // Estado do motor → comportamento: confirmado → automático · sugestao →
  // clique · ambiguo / semCandidato → nada (fica pendente, manual). Aqui
  // ambiguo PÁRA de propósito — ao contrário do dashboard de depósitos,
  // que escolhe sozinho o mais antigo (ver mrn-dashboard.html).
  function calcularDebitos(meses){
    var movs = movimentosDebito();
    var usados = Object.assign({}, movimentosUsados());
    var itens = ocorrenciasDebitoPendentes(meses || mesesJanelaDebito());
    var autoConfirmar = [];
    var sugestoes = [];
    itens.forEach(function(item){
      var r = item.valorVariavel ? candidatosDebitoVariavel(item, movs, usados)
                                 : candidatosDebitoFixo(item, movs, usados);
      item.correspondencia = r;
      if (r.estado !== 'confirmado' && r.estado !== 'sugestao') return;
      // mov = o primeiro (formato de sempre, usado pela UI da sugestão);
      // movs = todos (1, ou 2 no soma2) — é o que se liga.
      var par = { item: item, mov: r.movimentos[0], movs: r.movimentos, estrategia: r.estrategia };
      if (r.estado === 'confirmado'){
        autoConfirmar.push(par);
        r.movimentos.forEach(function(m){ usados[m.id] = item.chaveReconciliacao; });
      } else {
        sugestoes.push(par);
      }
    });
    return { itens: itens, autoConfirmar: autoConfirmar, sugestoes: sugestoes };
  }

  function sugestaoDebitoPara(res, compromissoId, periodo){
    if (!res) return null;
    for (var i = 0; i < res.sugestoes.length; i++){
      var it = res.sugestoes[i].item;
      if (it.compromissoId === compromissoId && (it.ano + '-' + it.mes) === periodo) return res.sugestoes[i];
    }
    return null;
  }

  // Acrescenta ao histórico de descritivos do compromisso — nunca substitui
  // o array todo. Lido de memória via CE porque o RTDB não tem um "array
  // push" atómico; só chamado para compromissos de valor variável.
  function acrescentarHistoricoDescritivo(compromissoId, desc){
    if (!deps.refCompromissos) return Promise.resolve();
    var c = CE.compromissoPorId(compromissoId) || {};
    var historico = (c.historicoDescritivos || []).concat([desc]);
    return deps.refCompromissos.child(compromissoId).child('historicoDescritivos').set(historico);
  }

  // Escreve os dois destinos de sempre (pagamentosConcluidos +
  // reconciliacaoBancaria) para uma ocorrência de débito direto e, só nas
  // de valor variável, acrescenta o descritivo ao histórico de
  // aprendizagem. auto:true marca sempre a origem; confirmadoManualmente:
  // true só quando veio de um clique na sugestão (nunca da automática).
  // mov: um movimento ou um array (soma2 → 2 movimentos ligados juntos).
  function confirmarDebito(item, mov, opts){
    if (!deps.refPagamentos) return Promise.reject(new Error('refPagamentos em falta na configuração do motor.'));
    opts = opts || {};
    var movs = Array.isArray(mov) ? mov : [mov];
    var patchPC = { concluidoEm: Date.parse(movs[0].dia + 'T12:00:00') || Date.now(), auto: true };
    if (opts.confirmadoManualmente) patchPC.confirmadoManualmente = true;
    var escritas = [
      deps.refPagamentos.child(item.chaveConcluido).set(patchPC),
      ligar(item.chaveReconciliacao, movs, 'auto', null, null, opts.estrategia)
    ];
    if (item.valorVariavel) escritas.push(acrescentarHistoricoDescritivo(item.compromissoId, movs[0].desc));
    return Promise.all(escritas);
  }

  var aEscreverDebitos = false;

  // Grava as confirmações automáticas de calcularDebitos() — chamado a par
  // de aplicarAutomaticas(), sempre a partir de tesouraria.html. Uma
  // segunda chamada enquanto a primeira corre é ignorada, tal como
  // aplicarAutomaticas: o listener volta a chamar no fim.
  function aplicarDebitosAutomaticos(res){
    if (aEscreverDebitos || !res.autoConfirmar.length) return Promise.resolve([]);
    aEscreverDebitos = true;
    var feitas = [];
    var fila = res.autoConfirmar.slice();
    function passo(){
      var par = fila.shift();
      if (!par) return Promise.resolve(feitas);
      return confirmarDebito(par.item, par.movs || par.mov, { estrategia: par.estrategia })
        .then(function(){ feitas.push(par); })
        .catch(function(err){ console.warn('confirmação automática de débito falhou em ' + par.item.chaveConcluido, err); })
        .then(passo);
    }
    return passo().then(function(r){ aEscreverDebitos = false; return r; },
                        function(e){ aEscreverDebitos = false; throw e; });
  }

  // Clique na sugestão de 1 clique (débito de valor variável ainda a
  // aprender, ou cujo descritivo deixou de bater com o padrão aprendido):
  // confirma exactamente como a automática, só que marcada
  // confirmadoManualmente — e conta para o histórico de aprendizagem.
  function confirmarSugestaoDebito(res, compromissoId, periodo){
    var s = sugestaoDebitoPara(res, compromissoId, periodo);
    if (!s) return Promise.reject(new Error('Sugestão já não é válida — os dados mudaram entretanto.'));
    return confirmarDebito(s.item, s.movs || s.mov, { confirmadoManualmente: true, estrategia: s.estrategia });
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

  // Correspondência de um item em modo único pelo motor partilhado
  // (gioco-correspondencia.js): pagamentos com 'exacto' + 'soma2' (dois
  // débitos do mesmo dia que somam o valor — Mensalidade Abanca), receitas
  // CD só 'exacto' com a tolerância do item (a regra A2 fica fora do
  // motor, mais abaixo). Só recebe movimentos livres e não excluídos.
  function correspondenciaDe(item, movs, usados){
    if (item.cents === null || !item.ancora) return null;
    var excluidos = excluidosDe(__REC()[item.chave]);
    return CORR({
      cents: item.cents, dia: item.ancora, janela: item.janela,
      toleranciaCents: item.tolerancia || 0,
      movimentos: movs.filter(function(m){ return !usados[m.id] && !excluidos[m.key]; }),
      estrategias: item.fonte === 'venda' ? ['exacto'] : ['exacto', 'soma2']
    });
  }

  // Lista plana (sem repetidos) dos movimentos de todos os grupos candidatos.
  function achatarGrupos(grupos){
    var vistos = {}, out = [];
    (grupos || []).forEach(function(g){ g.forEach(function(m){ if (!vistos[m.id]){ vistos[m.id] = true; out.push(m); } }); });
    return out;
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
  function reconciliar(itens, movs, hoje, primeiroDiaBanco){
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
      it.correspondencia = (it.ligacao || it.modo === 'soma') ? null : correspondenciaDe(it, it.movs, usados);
      it.candidatosGrupos = it.correspondencia ? it.correspondencia.candidatos : [];
      it.candidatos = achatarGrupos(it.candidatosGrupos);
      // Reclamação = o motor propôs estes movimentos (1, ou 2 no soma2) a
      // este item; dois itens a reclamar o mesmo ficam ambos ambíguos.
      if (it.correspondencia && it.correspondencia.estado === 'confirmado'){
        it.correspondencia.movimentos.forEach(function(m){ reclamacoes[m.id] = (reclamacoes[m.id] + 1) || 1; });
      }
    });
    // Movimentos que são candidato exacto (ou metade de um par soma2) de
    // algum item: a passagem aproximada (A2) não os pode levar.
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
      // Dia anterior ao primeiro movimento bancário em memória: não há com
      // que reconciliar. Sem proposta, sem escrita, sem acções na UI.
      if (primeiroDiaBanco && it.ancora < primeiroDiaBanco){ it.estado = 'semDados'; it.candidatos = []; return; }

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

      // Decisão do motor (exacto / soma2). Ambiguo PÁRA e pede ligação
      // manual — regra dos pagamentos, ao contrário do dashboard de depósitos.
      var corr = it.correspondencia;
      if (corr && corr.estado === 'ambiguo'){
        it.estado = 'ambiguo';
        if (corr.estrategia === 'soma2') it.motivoAmbiguo = 'vários pares de movimentos somam o valor';
        return;
      }
      if (corr && corr.estado === 'confirmado'){
        var disputado = corr.movimentos.some(function(m){ return reclamacoes[m.id] > 1; });
        if (disputado || it.estimado){
          it.estado = 'ambiguo';
          it.motivoAmbiguo = disputado ? 'outro pagamento com o mesmo candidato' : 'valor estimado — só ligação manual';
          return;
        }
        it.estado = 'aguarda'; // até a escrita automática confirmar
        // Pagamentos: a proposta é o movimento (formato de sempre) ou o
        // par (soma2); receitas: { movs, estado }, o formato das regras A2 e B.
        it.autoProposta = it.fonte === 'venda' ? { movs: corr.movimentos, estado: 'confirmado' }
                                               : (corr.movimentos.length === 1 ? corr.movimentos[0] : corr.movimentos);
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
    var r = reconciliar(itens, movs, hojeISO(), primeiroDiaBanco());
    var g = agruparPorEstado(itens, ['confirmado', 'aproximado', 'aguarda', 'semMovimento', 'ambiguo', 'semDados']);

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

  // Entrada de pagamento: 1 movimento (formato de sempre — movimentoKey,
  // valor) ou vários (soma2): movimentoKey = o primeiro, movimentoKeys[] =
  // todos, valor = a soma. As 17 entradas antigas não mudam de forma; quem
  // lê usa chavesDaEntrada(), que junta as duas. estrategia é metadado
  // ('exacto' | 'soma2' | 'descritivo'), só quando o motor a deu.
  function registo(movs, metodo, estrategia){
    movs = Array.isArray(movs) ? movs : [movs];
    var total = movs.reduce(function(a, m){ return a + m.cents; }, 0);
    var r = { conta: movs[0].conta, movimentoKey: movs[0].key, valor: total / 100, dataMovimento: movs[0].dia,
              metodo: metodo, em: Date.now(), ligado: true };
    if (movs.length > 1) r.movimentoKeys = movs.map(function(m){ return m.key; });
    if (estrategia) r.estrategia = estrategia;
    return r;
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
  // Pagamentos: ligar(chave, mov ou [movs], metodo, null, null, estrategia?).
  // Receitas: ligar(chave, mov ou [movs], metodo, item, estado) — item
  // obrigatório (dá o valor faturado). Vários movimentos numa chave
  // qualquer gravam movimentoKeys[] além do movimentoKey singular.
  function ligar(chave, mov, metodo, item, estado, estrategia){
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
    var patch = (item && item.fonte === 'venda') ? registoReceita(movs, metodo, item, estado) : registo(movs, metodo, estrategia);
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
        : ligar(it.chave, it.autoProposta, 'auto', null, null, it.correspondencia && it.correspondencia.estrategia);
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
    // Todas as chaves da entrada (movimentoKey e, se existir, movimentoKeys[])
    // vão para excluidos/ — em qualquer família de chave.
    chavesDaEntrada(atual).forEach(function(k){ patch['excluidos/' + k] = agora; });
    if (Array.isArray(atual.movimentoKeys)) patch.movimentoKeys = null;
    if (atual.estrategia) patch.estrategia = null;
    if (/^venda:/.test(chave)){
      delete patch.valor;
      patch.movimentoKeys = null; patch.valorVenda = null; patch.valorMovimento = null;
      patch.diferenca = null; patch.estado = null;
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
    movimentoPorId: movimentoPorId, primeiroDiaBanco: primeiroDiaBanco,
    movimentosUsados: movimentosUsados, entradaLigada: entradaLigada, excluidosDe: excluidosDe,
    chavesDaEntrada: chavesDaEntrada,
    pagamentosConcluidos: pagamentosConcluidos, receitasDiarias: receitasDiarias,
    calcular: calcular, calcularReceitas: calcularReceitas, itemPorChave: itemPorChave,
    pesquisaManual: pesquisaManual,
    ligar: ligar, desligar: desligar, aplicarAutomaticas: aplicarAutomaticas,
    normalizarDescritivo: normalizarDescritivo, estadoAprendizagemDebito: estadoAprendizagemDebito,
    mesesJanelaDebito: mesesJanelaDebito, calcularDebitos: calcularDebitos,
    sugestaoDebitoPara: sugestaoDebitoPara, aplicarDebitosAutomaticos: aplicarDebitosAutomaticos,
    confirmarSugestaoDebito: confirmarSugestaoDebito
  };
}
