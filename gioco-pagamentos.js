/* gioco-pagamentos.js — itens planos de pagamentos (Set/2026).

   Motor partilhado no molde do gioco-reconciliacao.js: uma factory que
   recebe getters para os dados que a página já tem em memória e devolve
   funções puras. SÓ LEITURA — não escreve em lado nenhum.

   Extraído VERBATIM da tesouraria.html (linhasPaymentRequestsTodas,
   linhasCompromissosDoMes, itensDoMes, chaveLinha, lineStatus,
   ddmmyyyyToDate, periodoCompromisso, compromissoPago, chaveReconciliacao)
   sem alterar uma linha de lógica. Usado pela tesouraria.html (calendário de
   saídas, "Ficou pago?", reconciliação, emails) e pela calendario.html
   (camada de pagamentos). Nunca reimplementar por página.

   Uso:

     var PG = giocoPagamentosEngine({
       getPaymentRequests:      function(){ return allPaymentRequests; },
       getPagamentosConcluidos: function(){ return allPagamentosConcluidos; },
       compromissos:            CE,        // giocoCompromissosEngine
       parseMontante: parseMontante, formatDateDDMMYYYY: formatDateDDMMYYYY,
       ordenaPorPrazo: ordenaPorPrazo,     // helpers da página (iguais nas duas)
       reconciliacao: RE                   // opcional; só para chaveReconciliacao
     });

   ITENS PLANOS (a forma que itensDoMes / linhasPaymentRequestsTodas /
   linhasCompromissosDoMes devolvem — não mudar sem mudar os consumidores):

     pedido:   { tipo:'pedido', ticketId, lineIdx, ticketNumero, origem,
                 fornecedor, montante (número), prazo ('DD/MM/AAAA' ou ''),
                 prazoDate (Date | null — linhas sem prazo NÃO são removidas
                 aqui, quem consome decide), dia (número | null),
                 referencia, iban, pago (bool) }
     fixo:     { tipo:'fixo', tipoCusto, compromissoId (com sufixo ~cartao
                 quando é a saída do cartão), fornecedor (nome), montante,
                 estado ('confirmado'|'estimado'|'estimado-base'|
                 'estimado-semente'|null), nota, derivaDe, prazo, prazoDate,
                 dia, categoria, referencia:'', metodoPagamento, iban,
                 pago (bool) }

   CHAVES:
     chaveLinha(l)         — identidade estável de UI:
                             'fixo|{compromissoId}|{AAAA-M}'  ou  '{ticketId}|{lineIdx}'
     chaveReconciliacao(l) — chave em reconciliacaoBancaria/:
                             'fixo:{compromissoId}_{AAAA-M}'  ou  'payreq:{ticketId}~{lineIdx}'
     periodoCompromisso(d) — 'AAAA-M' SEM zero à esquerda no mês: é o período
                             de pagamentosConcluidos ({compromissoId}_AAAA-M)
                             e o ÚNICO formato sem zero do OS (vendas, recibos
                             e contagens levam zero). Confundi-los é o erro
                             clássico deste modelo de dados.
     compromissoPago(id,d) — ocorrenciaPaga(pagamentosConcluidos[id + '_' + periodo])

   "ESTÁ PAGO?" — fonte ÚNICA de verdade (Set/2026): ocorrenciaPaga(reg),
   também exposta como giocoPagamentosEngine.ocorrenciaPaga para páginas e
   motores que não constroem o engine (mrn-dashboard.html, equipa.html,
   gioco-reconciliacao.js). Uma entrada de pagamentosConcluidos conta como
   paga se existir E anulado !== true. "Anular confirmação" (RE.anularConfirmacao
   no gioco-reconciliacao.js) nunca remove() a entrada: escreve anulado:true +
   anuladoEm e a ocorrência volta a pendente; reconfirmar escreve anulado:false
   + reconfirmadoEm por update(), preservando anuladoEm como rasto. NUNCA
   decidir "está pago" pela verdade booleana da chave — passa sempre por aqui.

   Datas dos pedidos vêm em texto 'DD/MM/AAAA' (lines[i].prazo);
   ddmmyyyyToDate devolve null para vazio/inválido. */
function giocoPagamentosEngine(deps){
  'use strict';
  var ocorrenciaPaga = giocoPagamentosEngine.ocorrenciaPaga;
  var CE = deps.compromissos;
  var parseMontante = deps.parseMontante;
  var formatDateDDMMYYYY = deps.formatDateDDMMYYYY;
  var ordenaPorPrazo = deps.ordenaPorPrazo;
  var compromissoPorId = CE.compromissoPorId;
  var tipoDe = CE.tipoDe;
  var ocorrenciasCompromissos = CE.ocorrenciasCompromissos;
  function allPaymentRequestsGet(){ return deps.getPaymentRequests() || {}; }
  function allPagamentosConcluidosGet(){ return deps.getPagamentosConcluidos() || {}; }

  function ddmmyyyyToDate(str){
    if (!str) return null;
    var parts = String(str).split('/');
    if (parts.length !== 3) return null;
    var d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // Estado de uma linha, igual ao de pagamentos.html (páginas standalone, sem
  // módulos partilhados). Pedidos criados antes do estado por linha não têm
  // `status` nas linhas: quando o pedido inteiro está concluído ou anulado,
  // todas as linhas herdam esse estado. Só num pedido pendente é que cada
  // linha decide por si (campo ausente = pendente).
  function lineStatus(p, l) {
    var status = p.status || 'pendente';
    if (status !== 'pendente') return status;
    return (l && l.status === 'concluido') ? 'concluido' : 'pendente';
  }

  // Desdobra TODOS os pedidos (pendentes e já pagos, exceto anulados) num
  // array plano de linhas individuais, ordenado por prazo ascendente.
  // 'pago' distingue o estado de cada linha; 'dia' é o dia-do-mês do prazo,
  // para agrupar no calendário. Base comum para a lista de "todos os
  // prazos" (só pendentes, via linhasPendentes) e para o calendário de
  // Tesouraria (pendentes + pagos, via itensDoMes).
  function linhasPaymentRequestsTodas(){
    var out = [];
    var allPaymentRequests = allPaymentRequestsGet();
    Object.keys(allPaymentRequests).forEach(function(id){
      var p = allPaymentRequests[id];
      if ((p.status || 'pendente') === 'anulado') return;
      (p.lines || []).forEach(function(l, idx){
        var prazoDate = ddmmyyyyToDate(l.prazo);
        out.push({
          tipo: 'pedido',
          ticketId: id,
          lineIdx: idx,
          ticketNumero: p.numeroReferencia || '',
          origem: p.origem || 'fornecedor',
          fornecedor: l.fornecedor || 'Sem descrição',
          montante: parseMontante(l.montante),
          prazo: l.prazo || '',
          prazoDate: prazoDate,
          dia: prazoDate ? prazoDate.getDate() : null,
          referencia: l.referencia || '',
          iban: l.iban || '',
          pago: lineStatus(p, l) === 'concluido'
        });
      });
    });
    return ordenaPorPrazo(out);
  }

  // Identifica o período mensal de uma ocorrência de compromisso, no mesmo
  // formato já usado por chaveLinha ("ano-mes", mes 1-indexado).
  function periodoCompromisso(d){
    return d.getFullYear() + '-' + (d.getMonth() + 1);
  }

  function compromissoPago(compromissoId, prazoDate){
    return ocorrenciaPaga(allPagamentosConcluidosGet()[compromissoId + '_' + periodoCompromisso(prazoDate)]);
  }

  // Achata as ocorrências de compromissos fixos ativos de um mês, no mesmo
  // formato de linha usado pelos pedidos, para poderem aparecer misturadas
  // na mesma lista. Inclui pagas e pendentes — 'pago' distingue o estado;
  // quem só quer pendentes filtra depois (ver linhasCompromissosFixos).
  function linhasCompromissosDoMes(ano, mes){
    var out = [];
    ocorrenciasCompromissos(ano, mes).forEach(function(o){
      var d = new Date(ano, mes - 1, o.dia);
      d.setHours(0, 0, 0, 0);
      var c = compromissoPorId(o.id) || {};
      out.push({
        tipo: 'fixo',
        tipoCusto: tipoDe(c),
        compromissoId: o.id,
        fornecedor: o.nome,
        montante: o.montante,
        estado: o.estado,
        nota: o.nota,
        derivaDe: o.derivaDe,
        prazo: formatDateDDMMYYYY(d),
        prazoDate: d,
        dia: o.dia,
        categoria: c.categoria || 'Outros',
        referencia: '',
        metodoPagamento: c.metodoPagamento || 'iban',
        iban: c.iban || '',
        pago: compromissoPago(o.id, d)
      });
    });
    return out;
  }

  // Pedidos (pendentes + pagos) e compromissos fixos (pendentes + pagos)
  // do mês, ordenados por dia. Alimenta o calendário (heatmap e lista de
  // dia) — ao contrário de linhasCombinadas(), não exclui os já pagos: o
  // calendário reflete tudo o que se passa nesse dia, não só o que falta.
  function itensDoMes(ano, mes){
    var out = [];

    linhasPaymentRequestsTodas().forEach(function(l){
      if (!l.prazoDate) return;
      if (l.prazoDate.getFullYear() !== ano) return;
      if (l.prazoDate.getMonth() + 1 !== mes) return;
      out.push(l);
    });

    out = out.concat(linhasCompromissosDoMes(ano, mes));

    out.sort(function(a, b){ return a.dia - b.dia; });
    return out;
  }

  // Identifica uma linha de forma estável entre re-renders (o pedido pode
  // ser regravado pelo Firebase a qualquer momento). Uma ocorrência de
  // compromisso fixo é identificada pelo id do compromisso + o mês da
  // ocorrência, já que o mesmo compromisso gera uma linha por mês.
  function chaveLinha(l){
    if (l.tipo === 'fixo'){
      return 'fixo|' + l.compromissoId + '|' + periodoCompromisso(l.prazoDate);
    }
    return l.ticketId + '|' + l.lineIdx;
  }

  // Chave de reconciliação de uma linha plana (itensDoMes / linhasCombinadas).
  // Com o motor de reconciliação injetado usa as funções dele; sem ele (a
  // calendario.html não o carrega) escreve o mesmo formato documentado no
  // cabeçalho do gioco-reconciliacao.js.
  function chaveReconciliacao(l){
    var RE = deps.reconciliacao;
    if (l.tipo === 'fixo'){
      var kFixo = l.compromissoId + '_' + periodoCompromisso(l.prazoDate);
      return RE ? RE.chaveFixo(kFixo) : 'fixo:' + kFixo;
    }
    return RE ? RE.chavePedido(l.ticketId, l.lineIdx) : 'payreq:' + l.ticketId + '~' + l.lineIdx;
  }

  return {
    ddmmyyyyToDate: ddmmyyyyToDate,
    lineStatus: lineStatus,
    periodoCompromisso: periodoCompromisso,
    compromissoPago: compromissoPago,
    ocorrenciaPaga: ocorrenciaPaga,
    linhasPaymentRequestsTodas: linhasPaymentRequestsTodas,
    linhasCompromissosDoMes: linhasCompromissosDoMes,
    itensDoMes: itensDoMes,
    chaveLinha: chaveLinha,
    chaveReconciliacao: chaveReconciliacao
  };
}

// "Está pago?" — a ÚNICA definição do OS (ver cabeçalho). Estática na
// factory para poder ser usada sem construir o engine. reg = a entrada de
// pagamentosConcluidos/{chave} (ou undefined/null quando não existe).
giocoPagamentosEngine.ocorrenciaPaga = function(reg){
  return !!(reg && reg.anulado !== true);
};
