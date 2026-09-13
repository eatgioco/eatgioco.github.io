/* gioco-custos-canonico.js — nó canónico custos/ (Set/2026).

   custos/ é a FONTE ÚNICA dos custos do negócio. A resultados.html ia
   buscar custos a quatro sítios e somava-os em runtime; aqui cada custo é
   um registo com id determinístico, gerado a partir das fontes e
   regenerável N vezes com o mesmo resultado.

   Motor no molde do gioco-reconciliacao.js: factory com getters para os
   nós já em memória, funções PURAS de geração (gerar) e escritas mínimas
   (regenerar, validar) — SÓ em custos/. Nunca escreve noutro nó e nunca
   faz remove(): um registo cuja origem deixou de o produzir fica
   anulado:true + anuladoEm.

   Uso (custos.html):

     var CC = giocoCustosCanonicoEngine({
       getFaturas:                function(){ return allFaturas; },            // faturasProcessadas
       getCaixaMovimentos:        function(){ return allCaixa; },
       getRecibos:                function(){ return allRecibos; },
       getCompromissos:           function(){ return allCompromissos; },       // compromissosFixos
       getPagamentosConcluidos:   function(){ return allConcluidos; },
       getPaymentRequests:        function(){ return allPaymentRequests; },
       getMovimentos:             function(){ return { abanca: movsA, revolut: movsR }; },
       getReconciliacao:          function(){ return allReconciliacao; },      // reconciliacaoBancaria
       getSuppliers:              function(){ return allSuppliers; },
       getClassificacaoRegras:    function(){ return allRegras; },
       getClassificacaoMovimentos:function(){ return allOverrides; },
       getCustos:                 function(){ return allCustos; },             // custos/ inteiro
       ref: db.ref('custos')
     });
     var plano = CC.gerar('2026-08');   // puro: { registos, anular, resumo, mes }
     CC.regenerar('2026-08')            // escreve: set() por registo + anulações + _resumo
     CC.validar('2026-08', id, { rubrica, despesa, validadoPor })

   ÓTICA: COMPETÊNCIA. O mês (mesCompetencia) é o mês da DATA DO DOCUMENTO
   (fatura, recibo, débito) — nunca o do pagamento; dataPagamento fica em
   pagamento.dataPagamento para a tesouraria. Valores COM IVA, 2 casas.

   ESQUEMA custos/{AAAA-MM}/{id} = {
     id, origem, origemRef, mesCompetencia, data ('AAAA-MM-DD'), valor,
     rubrica (cmv|pessoal|fixos|outros|impostos|interno — ou null quando
     ninguém a sabe: fica porValidar), despesa (nome da entidade concreta ou
     null), entidade { tipo (fornecedor|pessoa|entidade|banco), id?, nome },
     pagamento { estado ('pago'|'pendente'), movimentoIds [ '{conta}~{ref}' ],
     dataPagamento?, inferido? (true quando a ligação veio da cascata de
     fallback e não de reconciliacaoBancaria), nivel? (1–4) }, validacao { estado ('auto'|'porValidar'|'validado'),
     validadoPor?, validadoEm?, motivo? }, duplicaDe?, anulado?, anuladoEm?,
     criadoEm, atualizadoEm }
   custos/{AAAA-MM}/_resumo = { porRubrica:{}, total, porValidar, geradoEm }
   ('_resumo' não é um id de registo — quem lê o mês salta chaves que
   comecem por '_').

   IDS DETERMINÍSTICOS (nunca push):
     fat:{pushId de faturasProcessadas}     origem 'fatura'
     cxf:{id de caixaMovimentos}            origem 'faturaCaixa'
     rec:{pessoaId}                          origem 'recibo'
     tsu                                     origem 'tsu'
     fixo:{id de compromissosFixos}         origem 'compromisso'
     banco:{conta}~{ref}                     origem 'banco'
   A '~' é chave válida no RTDB e é o mesmo separador do idEstavel da
   resultados.html ({conta}~{ref}); ':' também é válido.

   REGRAS POR ORIGEM:
   - fatura: valor = montante, data = data da fatura, rubrica e despesa pela
     CATEGORIA do fornecedor (suppliers/{id}/categoria, array; ver
     categoriaFornecedor: Serviços → outros/SERVICOS, Alimentar|Bebidas|
     Packaging → cmv/ALIMENTAR|BEBIDAS|PACKAGING, precedência Serviços >
     Alimentar > Bebidas > Packaging). montante null, data null, fornecedor
     não encontrado ou sem categoria → porValidar. Sem data a fatura cai no mês de criadoEm (senão não tinha
     onde viver) e o motivo diz porquê. Pagamento: pela linha do
     paymentRequests apontado por paymentRequestId (só as linhas com o mesmo
     montante; se nenhuma bater, todas) → reconciliacaoBancaria/payreq:… .
     Um paymentRequests NUNCA gera registo: é só evento de pagamento.
   - faturaCaixa: saídas de caixaMovimentos com fatura OU semFatura:true;
     valor = valor − valorDevolvido (gasto real); data = fatura.data se
     válida, senão o dia local de dataHora. Rubrica cmv, excepto motivo que
     case RE_CAIXA_PESSOAL (a regex de sempre da resultados.html) →
     pessoal. Pago em dinheiro no próprio dia (movimentoIds vazio).
     semFatura:true, fatura.erroLeitura ou montante em falta → porValidar.
   - recibo: valor = totais.sujeito + totais.naoSujeito (o cartão refeição já
     está dentro do bruto — nunca somar por cima); data = último dia do mês;
     pagamento pelos compromissos da pessoa (parteRecibo conta/cartão, ou
     modelo antigo com ~cartao) no período do mesmo mês.
   - tsu: 23,75 % × Σ totais.sujeito do mês, arredondado UMA vez no
     agregado (TSU_TAXA_PATRONAL do gioco-compromissos.js quando carregado);
     competência no mês dos recibos. O PAG.TSU do banco é do mês SEGUINTE e
     não gera registo próprio: liga-se a este pelo compromisso derivaDe:'tsu'
     no período seguinte.
   - compromisso: compromissosFixos ativos sem pessoaId, sem parteRecibo e
     que não sejam TSU. Com movimento ligado em reconciliacaoBancaria/
     fixo:{id}_{AAAA-M} o valor é o do movimento; senão o orçamentado
     (valor, ou valorDiario × dias úteis) e fica porValidar se valorVariavel.
   - banco: qualquer DBIT sem INTERNA de contasBancarias/{abanca,revolut}
     que não esteja em pagamento.movimentoIds de nenhum outro registo do
     mês, do anterior ou do seguinte (ANTI-DUPLICAÇÃO — pagamentos atravessam
     meses). Rubrica: override de classificacaoMovimentos > regra mais longa
     de classificacaoRegras > 'impostos' se o descritivo casar RE_IMPOSTO >
     RE_BANCO_PESSOAL (subash|adiantamento|prestador — sem "mattia" nem
     "prestação": ficam porValidar) > ligado a uma linha de paymentRequests:
     RE_BANCO_PESSOAL → pessoal, senão a categoria do fornecedor da linha (procurado por nome em suppliers);
     sem ficha ou sem categoria → porValidar > senão rubrica null e
     porValidar. 'fixos' NUNCA vem por via de fornecedor.
   - classificacaoDespesas/{ALIMENTAR,BEBIDAS,PACKAGING,SERVICOS}: a única
     escrita fora de custos/ — criadas por regenerar() SÓ quando faltam
     (garantirDespesas), para o autocomplete da resultados.html.

   REGENERAÇÃO IDEMPOTENTE: para cada registo, set() no path determinístico.
   Se o registo existente tiver validacao.estado === 'validado', preservam-se
   rubrica, despesa, entidade e validacao (decisão humana) e só se
   actualizam valor, pagamento e atualizadoEm. criadoEm é sempre o do
   registo existente. Um registo idêntico ao que já está (fora atualizadoEm)
   não é reescrito. Um registo existente que a origem já não produz leva
   anulado:true + anuladoEm por update() — nunca remove(); origem 'manual'
   nunca é anulada pelo motor.

   _resumo: total = soma dos valores das rubricas excepto 'interno' (que
   sai da reconciliação por definição); porRubrica inclui 'interno' e
   'semRubrica' para conferência; porValidar = nº de registos porValidar. */

function giocoCustosCanonicoEngine(deps){
  'use strict';

  var RUBRICAS = ['cmv', 'pessoal', 'fixos', 'outros', 'impostos', 'interno'];
  var ORIGENS  = ['fatura', 'faturaCaixa', 'recibo', 'tsu', 'compromisso', 'banco', 'manual'];
  var CONTAS   = ['abanca', 'revolut'];

  // As mesmas regex da resultados.html (decisão da auditoria): prestadores
  // e adiantamentos pagos pela caixa / por pedido são pessoal, não compras.
  // CAIXA: o motivo é escrito por quem lança e é fiável — mantém os quatro termos de sempre.
  var RE_CAIXA_PESSOAL = /subash|mattia|adiantamento|prestador/i;
  // BANCO (residuais e linhas de pedido ligadas): SEM "mattia" e SEM "prestação" (Set/2026,
  // revertido): um pagamento bancário ao Mattia pode ser margem (cmv) ou consultoria
  // (outros) e o descritivo não distingue — fica porValidar até o Manel validar, e a
  // regra aprendida trata das seguintes. "subash" é o único nome de rubrica fixa.
  var RE_BANCO_PESSOAL = /subash|adiantamento|prestador/i;
  var RE_IMPOSTO = /PAG\.TSU|PAG\.DUC|IMP\.SELO|PAGAMENTO POR CONTA|\bIVA\b|\bIRC\b|\bIUC\b|AUTORIDADE TRIBUT/i;
  var RE_INTERNA = /INTERNA/i;

  var TSU_TAXA_PATRONAL = (deps.compromissos && deps.compromissos.TSU_TAXA_PATRONAL) || 0.2375;
  // As parcelas conta/cartão de um recibo vêm SEMPRE do gioco-compromissos.js
  // (partesDoRecibo: valor lido, senão derivado de totais.liquido) — nunca
  // reimplementadas aqui. É por isso que o motor exige uma instância do CE.
  if (!deps.compromissos || typeof deps.compromissos.partesDoRecibo !== 'function') throw new Error('gioco-custos-canonico.js precisa de deps.compromissos (giocoCompromissosEngine) com partesDoRecibo');
  var partesDoRecibo = deps.compromissos.partesDoRecibo;
  var ocorrenciaPaga = (typeof giocoPagamentosEngine === 'function' && giocoPagamentosEngine.ocorrenciaPaga) ||
    function(reg){ return !!reg && reg.anulado !== true; };

  function g(nome){ var f = deps[nome]; return (f && f()) || {}; }
  function agora(){ return deps.agora ? deps.agora() : Date.now(); }

  /* ---------- helpers ---------- */
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function arred(v){ var n = Number(v); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }
  // Números já gravados como number passam intactos. Strings em formato
  // português ("2.062,50": ponto de milhares, vírgula decimal) e "2062.50"
  // (ponto decimal) são ambas aceites — antes "2.062,50" lia-se como 2,062.
  function num(v){
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isNaN(v) ? null : v;
    var t = String(v).trim().replace(/\s/g, '');
    if (t.indexOf(',') !== -1) t = t.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(t);
    return isNaN(n) ? null : n;
  }
  function centimos(v){ var n = num(v); return n === null ? null : Math.round(Math.abs(n) * 100); }
  function diaISO(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function diaLocal(ts){
    if (ts === null || ts === undefined || ts === '') return null;
    var d = new Date(ts);
    return isNaN(d.getTime()) ? null : diaISO(d);
  }
  function diaValido(s){ return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) && !isNaN(Date.parse(s.slice(0, 10) + 'T00:00:00Z'))) ? s.slice(0, 10) : null; }
  function mesValido(s){ return (typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s)) ? s : null; }
  function partesMes(mes){ var p = mes.split('-'); return { ano: parseInt(p[0], 10), mes: parseInt(p[1], 10) }; }
  function mesVizinho(mes, delta){
    var p = partesMes(mes);
    var d = new Date(p.ano, p.mes - 1 + delta, 1);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }
  function ultimoDia(mes){ var p = partesMes(mes); return mes + '-' + pad2(new Date(p.ano, p.mes, 0).getDate()); }
  function diasUteis(mes){
    var p = partesMes(mes), n = 0, nd = new Date(p.ano, p.mes, 0).getDate();
    for (var d = 1; d <= nd; d++){ var dow = new Date(p.ano, p.mes - 1, d).getDay(); if (dow >= 1 && dow <= 5) n++; }
    return n;
  }
  // Período de pagamentosConcluidos: AAAA-M SEM zero (o único do OS).
  function periodoSemZero(mes){ var p = partesMes(mes); return p.ano + '-' + p.mes; }
  function rubricaValida(r){ return RUBRICAS.indexOf(r) !== -1 ? r : null; }
  function normalizar(s){
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  }
  function idMov(conta, ref){ return conta + '~' + ref; }

  /* ---------- categoria do fornecedor → rubrica + despesa ----------
     suppliers/{id}/categoria é um ARRAY de strings ("Alimentar", "Bebidas",
     "Packaging", "Serviços"), comparado sem acentos nem maiúsculas. Com
     várias categorias vale a PRECEDÊNCIA FIXA Serviços > Alimentar >
     Bebidas > Packaging (nunca porValidar por isso; fica o rasto em motivo).
     porValidar só com array vazio/inexistente ou tudo fora dos quatro.
     É a ÚNICA via de rubrica para custos de fornecedor — 'fixos' é
     inatingível por aqui (só compromissosFixos). */
  var CATEGORIAS_FORNECEDOR = [
    { chave: 'servicos',  rubrica: 'outros', despesa: 'SERVICOS' },
    { chave: 'alimentar', rubrica: 'cmv',    despesa: 'ALIMENTAR' },
    { chave: 'bebidas',   rubrica: 'cmv',    despesa: 'BEBIDAS' },
    { chave: 'packaging', rubrica: 'cmv',    despesa: 'PACKAGING' }
  ];
  function normCat(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function categoriaFornecedor(s){
    var nome = (s && (s.nome || s.name)) || '—';
    var lista = s && s.categoria;
    if (typeof lista === 'string') lista = [lista];
    if (lista && !Array.isArray(lista) && typeof lista === 'object') lista = Object.keys(lista).map(function(k){ return lista[k]; });
    lista = Array.isArray(lista) ? lista.filter(Boolean) : [];
    if (!lista.length) return { rubrica: null, despesa: null, motivo: 'fornecedor "' + nome + '" sem categoria' };
    var normalizadas = lista.map(normCat), venc = null;
    for (var i = 0; i < CATEGORIAS_FORNECEDOR.length && !venc; i++) if (normalizadas.indexOf(CATEGORIAS_FORNECEDOR[i].chave) !== -1) venc = CATEGORIAS_FORNECEDOR[i];
    if (!venc) return { rubrica: null, despesa: null, motivo: 'fornecedor "' + nome + '" com categoria desconhecida: ' + lista.join(', ') };
    var out = { rubrica: venc.rubrica, despesa: venc.despesa, motivo: null };
    if (lista.length > 1) out.rasto = 'categorias ' + lista.join(', ') + ' → ' + venc.despesa;
    return out;
  }
  function fornecedorPorNome(nome){
    var sup = g('getSuppliers'), alvo = normalizar(nome);
    if (!alvo) return null;
    var ids = Object.keys(sup);
    for (var i = 0; i < ids.length; i++){ var s = sup[ids[i]]; if (s && normalizar(s.nome || s.name) === alvo) return { id: ids[i], s: s }; }
    return null;
  }

  /* ---------- índices sobre os nós em memória ---------- */
  function movimentoPorId(){
    var movs = g('getMovimentos'), out = {};
    CONTAS.forEach(function(conta){
      var m = movs[conta] || {};
      Object.keys(m).forEach(function(ref){ if (m[ref]) out[idMov(conta, ref)] = { conta: conta, ref: ref, mov: m[ref] }; });
    });
    return out;
  }

  // Ligação de uma chave de reconciliacaoBancaria → { movimentoIds, dataPagamento, valor }.
  function ligacao(chave){
    var r = g('getReconciliacao')[chave];
    if (!r || r.ligado === false || !r.conta || !r.movimentoKey) return null;
    var ks = [r.movimentoKey];
    if (Array.isArray(r.movimentoKeys)) r.movimentoKeys.forEach(function(k){ if (k && ks.indexOf(k) === -1) ks.push(k); });
    return {
      movimentoIds: ks.map(function(k){ return idMov(r.conta, k); }),
      dataPagamento: diaValido(r.dataMovimento),
      valor: num(r.valor)
    };
  }

  // Índice inverso: movimentoId → chave de reconciliacaoBancaria.
  function reconciliacaoPorMovimento(){
    var rec = g('getReconciliacao'), out = {};
    Object.keys(rec).forEach(function(chave){
      var l = ligacao(chave);
      if (l) l.movimentoIds.forEach(function(id){ out[id] = chave; });
    });
    return out;
  }

  function linhaPayReq(chave){
    var m = /^payreq:(.+)~(\d+)$/.exec(chave);
    if (!m) return null;
    var p = g('getPaymentRequests')[m[1]];
    var l = p && p.lines && p.lines[parseInt(m[2], 10)];
    return l ? { pedido: p, linha: l } : null;
  }

  function pagamentoDePayReq(prId, montante, mesFatura){
    var p = g('getPaymentRequests')[prId];
    var out = { estado: 'pendente', movimentoIds: [] };
    if (!p || (p.status || 'pendente') === 'anulado') return out;
    if (mesFatura){
      [mesVizinho(mesFatura, -1), mesFatura, mesVizinho(mesFatura, 1)].forEach(function(m){
        var inf = inferir(m).alvos;
        Object.keys(inf).forEach(function(k){ if (k.indexOf('payreq:' + prId + '~') === 0 && aplicarInferido(out, inf[k])) out.estado = 'pago'; });
      });
    }
    var linhas = (p.lines || []).map(function(l, i){ return { l: l, i: i }; });
    var cents = centimos(montante);
    var mesmas = cents === null ? [] : linhas.filter(function(x){ return centimos(x.l.montante) === cents; });
    (mesmas.length ? mesmas : linhas).forEach(function(x){
      var pago = (p.status === 'concluido') || (x.l.status === 'concluido');
      if (pago) out.estado = 'pago';
      var dp = diaLocal(x.l.concluidoEm || p.concluidoEm);
      var lig = ligacao('payreq:' + prId + '~' + x.i);
      if (lig){ lig.movimentoIds.forEach(function(id){ if (out.movimentoIds.indexOf(id) === -1) out.movimentoIds.push(id); }); dp = lig.dataPagamento || dp; }
      if (dp && (!out.dataPagamento || dp > out.dataPagamento)) out.dataPagamento = dp;
    });
    return out;
  }

  // Pagamento de uma ocorrência de compromisso no período: pagamentosConcluidos + reconciliacaoBancaria.
  function pagamentoDeOcorrencia(compromissoId, mes){
    var chave = compromissoId + '_' + periodoSemZero(mes);
    var reg = g('getPagamentosConcluidos')[chave];
    var lig = ligacao('fixo:' + chave);
    var out = { estado: (lig || ocorrenciaPaga(reg)) ? 'pago' : 'pendente', movimentoIds: lig ? lig.movimentoIds : [] };
    var dp = (lig && lig.dataPagamento) || (ocorrenciaPaga(reg) ? diaLocal(reg.concluidoEm) : null);
    if (dp) out.dataPagamento = dp;
    if (lig && lig.valor !== null) out.valorMovimento = lig.valor;
    return out;
  }

  function juntarPagamentos(lista){
    var out = { estado: lista.length ? 'pago' : 'pendente', movimentoIds: [] };
    lista.forEach(function(p){
      if (p.estado !== 'pago') out.estado = 'pendente';
      p.movimentoIds.forEach(function(id){ if (out.movimentoIds.indexOf(id) === -1) out.movimentoIds.push(id); });
      if (p.dataPagamento && (!out.dataPagamento || p.dataPagamento > out.dataPagamento)) out.dataPagamento = p.dataPagamento;
    });
    return out;
  }

  function ehTsu(id, c){
    return c.derivaDe === 'tsu' || id === 'tsu-001' || /^tsu$/i.test(c.nome || '');
  }

  /* ---------- ANTI-DUPLICAÇÃO POR FALLBACK (cascata de inferência) ----------
     reconciliacaoBancaria/ só existe desde Set/2026; nos meses anteriores um
     movimento que paga um recibo, um compromisso ou uma fatura não tem
     ligação registada e gerava um 'banco:' próprio (dupla contagem). Para
     cada DBIT do mês SEM ligação real, tenta-se pela ordem, parando no
     primeiro nível que resolva — toda a ligação daqui fica marcada
     pagamento.inferido:true + pagamento.nivel (1–4), e uma ligação real
     posterior substitui-a na regeneração seguinte (a real tem sempre
     prioridade: o movimento nem entra na cascata).
       N1 valor exacto (cêntimos) contra recibos (pagamento.conta e
          pagamento.cartao, separados — valor lido quando > 0, senão o
          derivado de totais.liquido por partesDoRecibo() do
          gioco-compromissos.js, que o motor exige em deps.compromissos) e
          compromissos do mês; consumo único.
          Só liga com EXACTAMENTE um alvo com esse valor — com vários,
          desce aos níveis seguintes (o nome desambigua) e, se nada
          resolver, fica porValidar com o motivo. Faturas não entram.
       N2 nome do compromisso (normalizado) como substring do descritivo E
          valor igual. Nome sem valor a bater não liga — EXCEPTO nos
          compromissos valorVariavel (decisão do Manel): aí basta o nome, o
          valor do registo passa a ser o do movimento, consumo único por mês;
          dois variáveis a casar o mesmo descritivo, ou o mesmo variável a
          casar dois movimentos → nenhum liga, porValidar com o motivo.
       N3 família pelo descritivo (CARTAO/CARTOES REFEICAO → cartões dos
          recibos; SAL/SALARIO → contas dos recibos) e valor = soma de um
          subconjunto dos alvos livres da família → liga a todos; mais do
          que um subconjunto com essa soma → porValidar com a ambiguidade.
       N4 paymentRequests não anulados com prazo/conclusão a ±45 dias do
          movimento e linha (ou total do pedido) com o montante exacto;
          consumo único. Um só pedido → liga às linhas e às faturas desse
          pedido (pagas na data do movimento), sem 'banco:'; 2+ pedidos →
          porValidar com a ambiguidade. DECISÃO: uma ambiguidade não põe
          porValidar um movimento cuja rubrica vem de override ou regra
          (decisão humana) — fica só como rasto em validacao.motivo.
          DECISÃO: um pedido SEM fatura em
          faturasProcessadas não consome o movimento (senão o custo
          desaparecia) — o 'banco:' é gerado com o fornecedor da linha a
          dar a rubrica pela categoria, como nas ligações reais.
     Os movimentos de um mês só se comparam com os alvos desse mês (recibos e
     compromissos) — um salário de Agosto pago a 1 de Setembro não é apanhado
     (limitação aceite; a reconciliação real resolve-o). */
  var RE_FAM_CARTAO = /CART(AO|OES) ?REFEICAO/;
  var RE_FAM_SAL    = /\bSAL(ARIOS?)?\b/;
  var JANELA_PAYREQ_DIAS = 45;
  var MAX_ALVOS_SUBCONJUNTO = 16;
  var memoInfer = {};

  function ddmmyyyyParaIso(s){
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim());
    return m ? (m[3] + '-' + m[2] + '-' + m[1]) : null;
  }
  function diasEntre(a, b){
    var x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z');
    return (isNaN(x) || isNaN(y)) ? null : Math.round((y - x) / 86400000);
  }

  // DBIT do mês sem INTERNA e sem ligação em reconciliacaoBancaria, por data e id.
  function movimentosResiduais(mes){
    var idx = movimentoPorId(), rec = reconciliacaoPorMovimento(), out = [];
    Object.keys(idx).forEach(function(id){
      var e = idx[id], m = e.mov;
      if (m.credit_debit_indicator !== 'DBIT') return;
      var data = diaValido(m.booking_date);
      if (!data || data.slice(0, 7) !== mes) return;
      if (RE_INTERNA.test(m.remittance_information || '')) return;
      if (rec[id]) return;
      var c = centimos(m.amount);
      if (!c) return;
      out.push({ id: id, data: data, cents: c, descN: normalizar((m.remittance_information || '') + ' ' + (m.creditor_name || '')) });
    });
    out.sort(function(a, b){ return a.data < b.data ? -1 : (a.data > b.data ? 1 : (a.id < b.id ? -1 : 1)); });
    return out;
  }

  function subconjuntosComSoma(lista, alvo){
    var res = [], n = lista.length;
    for (var mask = 1; mask < (1 << n); mask++){
      var soma = 0, sub = [];
      for (var i = 0; i < n; i++) if (mask & (1 << i)){ soma += lista[i].cents; sub.push(lista[i]); }
      if (soma === alvo) res.push(sub);
    }
    return res;
  }

  function alvosDoMes(mes){
    var alvos = [], rs = g('getRecibos'), cs = g('getCompromissos');
    Object.keys(rs).forEach(function(pid){
      var r = rs[pid] && rs[pid][mes];
      if (!r) return;
      r = Object.assign({}, r, { pagamento: r.pagamento || {} });
      var partes = { conta: null, cartao: null };
      compromissosDaPessoa(pid).forEach(function(cid){
        var c = cs[cid.replace(/~cartao$/, '')] || {};
        var parte = /~cartao$/.test(cid) ? 'cartao' : (c.parteRecibo || 'conta');
        if (ligacao('fixo:' + cid + '_' + periodoSemZero(mes))) partes[parte] = 'ligado';
      });
      var derivadas = partesDoRecibo(r) || {};
      ['conta', 'cartao'].forEach(function(parte){
        // valor explícito em pagamento quando > 0; senão o derivado de totais.liquido pelo CE
        var c = centimos(r.pagamento[parte]) || centimos(derivadas[parte]);
        if (!c || partes[parte] === 'ligado') return;
        alvos.push({ key: 'rec:' + pid + '|' + parte, cents: c, familia: parte, nome: null, consumido: false });
      });
    });
    Object.keys(cs).forEach(function(id){
      var c = cs[id]; if (!c || c.ativo === false) return;
      if (c.pessoaId || c.parteRecibo || ehTsu(id, c)) return;
      if (/^(sal[aá]rio|cart[aã]o refei[cç][aã]o)/i.test(c.nome || '')) return;
      if (ligacao('fixo:' + id + '_' + periodoSemZero(mes))) return;
      var orcado = (c.valorDiario !== null && c.valorDiario !== undefined && c.valorDiario !== '')
        ? diasUteis(mes) * (num(c.valorDiario) || 0) : (num(c.valor) || 0);
      var cents = centimos(orcado);
      var variavel = c.valorVariavel === true;
      if (!cents && !variavel) return;
      alvos.push({ key: 'fixo:' + id, cents: cents || 0, familia: 'compromisso', nome: normalizar(c.nome), variavel: variavel, consumido: false });
    });
    return alvos;
  }

  function alvosPayReq(){
    var prs = g('getPaymentRequests'), fats = g('getFaturas'), out = [];
    var comFatura = {};
    Object.keys(fats).forEach(function(fid){ var pr = fats[fid] && fats[fid].paymentRequestId; if (pr) comFatura[pr] = true; });
    Object.keys(prs).forEach(function(prId){
      var p = prs[prId]; if (!p || (p.status || 'pendente') === 'anulado') return;
      var linhas = p.lines || [], total = 0, dataRef = null;
      linhas.forEach(function(l, i){
        if (ligacao('payreq:' + prId + '~' + i)) return;
        var c = centimos(l.montante); if (!c) return;
        total += c;
        var d = ddmmyyyyParaIso(l.prazo) || diaLocal(l.concluidoEm || p.concluidoEm || p.criadoEm);
        if (d && (!dataRef || d > dataRef)) dataRef = d;
        out.push({ key: 'payreq:' + prId + '~' + i, pedido: prId, linha: l, cents: c, dataRef: d, temFatura: !!comFatura[prId], consumido: false });
      });
      if (linhas.length > 1 && total) out.push({ key: 'payreq:' + prId + '~*', pedido: prId, linha: linhas[0], cents: total, dataRef: dataRef, temFatura: !!comFatura[prId], consumido: false, total: true });
    });
    return out;
  }

  // Resultado por mês (memoizado por gerar()): porMovimento[id] = {nivel, alvos[]},
  // alvos[key] = {movimentoIds[], nivel, data}, ambiguos[id] = motivo,
  // linhaPedido[id] = linha (N4 sem fatura: só para classificar o 'banco:').
  function inferir(mes){
    if (memoInfer[mes]) return memoInfer[mes];
    var res = { porMovimento: {}, alvos: {}, ambiguos: {}, linhaPedido: {} };
    memoInfer[mes] = res;
    var alvos = alvosDoMes(mes), pedidos = alvosPayReq(), movs = movimentosResiduais(mes);
    function ligar(m, lista, nivel){
      res.porMovimento[m.id] = { nivel: nivel, alvos: lista.map(function(a){ return a.key; }) };
      lista.forEach(function(a){
        a.consumido = true;
        if (a.total) pedidos.forEach(function(x){ if (x.pedido === a.pedido) x.consumido = true; });
        var reg = res.alvos[a.key] || (res.alvos[a.key] = { movimentoIds: [], nivel: nivel, data: m.data, cents: 0 });
        if (reg.movimentoIds.indexOf(m.id) === -1){ reg.movimentoIds.push(m.id); reg.cents += m.cents; }
        if (m.data > reg.data) reg.data = m.data;
      });
    }
    // N2 variável: quantos movimentos do mês casam o nome de cada compromisso de
    // valor variável — mais do que um é ambiguidade nos dois sentidos.
    var casamVar = {};
    alvos.forEach(function(a){ if (a.variavel && a.nome) casamVar[a.key] = movs.filter(function(m){ return m.descN.indexOf(a.nome) !== -1; }).map(function(m){ return m.id; }); });
    movs.forEach(function(m){
      var c1 = alvos.filter(function(a){ return !a.consumido && a.cents === m.cents; });
      if (c1.length === 1) return ligar(m, c1, 1);
      // N2: fixos com nome no descritivo E valor igual; variáveis só com o nome (valor do registo = o do movimento)
      var c2 = c1.filter(function(a){ return a.familia === 'compromisso' && !a.variavel && a.nome && m.descN.indexOf(a.nome) !== -1; });
      var c2var = alvos.filter(function(a){ return !a.consumido && a.variavel && a.nome && m.descN.indexOf(a.nome) !== -1; });
      var varAmb = c2var.filter(function(a){ return casamVar[a.key].length > 1; });
      c2 = c2.concat(c2var.filter(function(a){ return casamVar[a.key].length === 1; }));
      if (c2.length === 1 && !varAmb.length) return ligar(m, c2, 2);
      if (c2.length + varAmb.length > 1){ res.ambiguos[m.id] = 'ambíguo (N2): ' + (c2.length + varAmb.length) + ' compromissos casam o descritivo (' + c2.concat(varAmb).map(function(a){ return a.key; }).join(', ') + ')'; return; }
      if (varAmb.length === 1){ res.ambiguos[m.id] = 'ambíguo (N2): o compromisso ' + varAmb[0].key + ' casa com ' + casamVar[varAmb[0].key].length + ' movimentos do mês'; return; }
      var fam = RE_FAM_CARTAO.test(m.descN) ? 'cartao' : (RE_FAM_SAL.test(m.descN) ? 'conta' : null);
      if (fam){
        var livres = alvos.filter(function(a){ return !a.consumido && a.familia === fam; });
        if (livres.length && livres.length <= MAX_ALVOS_SUBCONJUNTO){
          var subs = subconjuntosComSoma(livres, m.cents);
          if (subs.length === 1) return ligar(m, subs[0], 3);
          if (subs.length > 1){ res.ambiguos[m.id] = 'ambíguo (N3): ' + subs.length + ' combinações de ' + (fam === 'cartao' ? 'cartões de refeição' : 'salários') + ' somam este valor'; return; }
        }
      }
      var c4 = pedidos.filter(function(a){ return !a.consumido && a.cents === m.cents && a.dataRef && Math.abs(diasEntre(a.dataRef, m.data)) <= JANELA_PAYREQ_DIAS; });
      var porPedido = {}; c4.forEach(function(a){ porPedido[a.pedido] = a; });
      var ids = Object.keys(porPedido);
      if (ids.length === 1){
        var a4 = porPedido[ids[0]];
        if (a4.temFatura) return ligar(m, a4.total ? pedidos.filter(function(x){ return x.pedido === a4.pedido && !x.total; }) : [a4], 4);
        res.linhaPedido[m.id] = a4.linha;   // sem fatura: não consome, só classifica
        return;
      }
      if (ids.length > 1){ res.ambiguos[m.id] = 'ambíguo (N4): ' + ids.length + ' pedidos de pagamento com este montante a ±' + JANELA_PAYREQ_DIAS + ' dias'; return; }
      if (c1.length > 1) res.ambiguos[m.id] = 'ambíguo (N1): ' + c1.length + ' alvos com este valor (' + c1.map(function(a){ return a.key; }).join(', ') + ')';
    });
    return res;
  }

  // Aplica a inferência de um alvo a um objecto pagamento (mutação).
  function aplicarInferido(pag, reg){
    if (!reg) return false;
    reg.movimentoIds.forEach(function(id){ if (pag.movimentoIds.indexOf(id) === -1) pag.movimentoIds.push(id); });
    if (reg.data && (!pag.dataPagamento || reg.data > pag.dataPagamento)) pag.dataPagamento = reg.data;
    pag.inferido = true; pag.nivel = reg.nivel;
    return true;
  }

  /* ---------- alimentadores (puros) ---------- */
  function base(o){
    return {
      id: o.id, origem: o.origem, origemRef: o.origemRef, mesCompetencia: o.mes, data: o.data,
      valor: (o.valor === null || o.valor === undefined) ? null : arred(o.valor),
      rubrica: rubricaValida(o.rubrica), despesa: o.despesa || null,
      entidade: { tipo: o.entidade.tipo, id: o.entidade.id || null, nome: o.entidade.nome || '—' },
      pagamento: o.pagamento,
      validacao: o.motivo ? { estado: 'porValidar', motivo: o.motivo } : (o.rasto ? { estado: 'auto', motivo: o.rasto } : { estado: 'auto' })
    };
  }

  function faturas(mes){
    var fats = g('getFaturas'), sup = g('getSuppliers'), out = [];
    Object.keys(fats).forEach(function(fid){
      var f = fats[fid]; if (!f) return;
      var data = diaValido(f.data);
      var motivos = [];
      if (!data) motivos.push('fatura sem data');
      var mesF = data ? data.slice(0, 7) : (diaLocal(f.criadoEm) || '').slice(0, 7);
      if (mesF !== mes) return;
      var montante = num(f.montante);
      if (montante === null || montante <= 0) motivos.push('fatura sem montante');
      var s = f.fornecedorIdEncontrado ? sup[f.fornecedorIdEncontrado] : null;
      var cat = s ? categoriaFornecedor(s) : { rubrica: null, despesa: null, motivo: 'fornecedor não identificado' };
      if (cat.motivo) motivos.push(cat.motivo);
      var nome = (s && (s.nome || s.name)) || f.fornecedorTexto || '—';
      out.push(base({
        id: 'fat:' + fid, origem: 'fatura', origemRef: 'faturasProcessadas/' + fid, mes: mes,
        data: data || diaLocal(f.criadoEm) || ultimoDia(mes),
        valor: (montante !== null && montante > 0) ? montante : null,
        rubrica: cat.rubrica, despesa: cat.despesa,
        entidade: { tipo: 'fornecedor', id: f.fornecedorIdEncontrado || null, nome: nome },
        pagamento: f.paymentRequestId ? pagamentoDePayReq(f.paymentRequestId, montante, mes) : { estado: 'pendente', movimentoIds: [] },
        motivo: motivos.join('; ') || null, rasto: cat.rasto || null
      }));
    });
    return out;
  }

  function faturasCaixa(mes){
    var cx = g('getCaixaMovimentos'), sup = g('getSuppliers'), out = [];
    Object.keys(cx).forEach(function(id){
      var m = cx[id]; if (!m || m.tipo !== 'saida') return;
      if (!m.fatura && m.semFatura !== true) return;
      var diaMov = diaLocal(m.dataHora);
      var data = (m.fatura && diaValido(m.fatura.data)) || diaMov;
      if (!data || data.slice(0, 7) !== mes) return;
      var valor = arred((num(m.valor) || 0) - (num(m.valorDevolvido) || 0));
      var motivos = [];
      if (m.semFatura === true) motivos.push('sem fatura (declarado)');
      if (m.fatura && m.fatura.erroLeitura) motivos.push('fatura não lida: ' + m.fatura.erroLeitura);
      if (m.fatura && num(m.fatura.montante) === null && m.semFatura !== true) motivos.push('fatura sem montante');
      if (valor <= 0) motivos.push('gasto real ≤ 0');
      var fidE = m.fatura && m.fatura.fornecedorIdEncontrado;
      var s = fidE ? sup[fidE] : null;
      var nome = (s && (s.nome || s.name)) || (m.fatura && m.fatura.fornecedorTexto) || m.motivo || '—';
      // A regex de motivo (prestadores/adiantamentos → pessoal) tem prioridade
      // sobre a categoria do fornecedor; sem prestador, a categoria manda.
      var cat;
      if (RE_CAIXA_PESSOAL.test(m.motivo || '')) cat = { rubrica: 'pessoal', despesa: nome, motivo: null };
      else if (s) cat = categoriaFornecedor(s);
      else cat = { rubrica: null, despesa: null, motivo: 'fornecedor não identificado' };
      if (cat.motivo) motivos.push(cat.motivo);
      out.push(base({
        id: 'cxf:' + id, origem: 'faturaCaixa', origemRef: 'caixaMovimentos/' + id, mes: mes, data: data,
        valor: valor > 0 ? valor : null,
        rubrica: cat.rubrica, despesa: cat.despesa,
        entidade: { tipo: 'fornecedor', id: fidE || null, nome: nome },
        pagamento: { estado: 'pago', movimentoIds: [], dataPagamento: diaMov || data },
        motivo: motivos.join('; ') || null, rasto: cat.rasto || null
      }));
    });
    return out;
  }

  function compromissosDaPessoa(pid){
    var cs = g('getCompromissos'), out = [];
    Object.keys(cs).forEach(function(cid){
      var c = cs[cid]; if (!c || c.pessoaId !== pid || c.ativo === false) return;
      out.push(cid);
      if (!c.parteRecibo) out.push(cid + '~cartao');   // modelo antigo: duas saídas
    });
    return out;
  }

  function recibos(mes){
    var rs = g('getRecibos'), out = [], baseTsu = 0;
    Object.keys(rs).forEach(function(pid){
      var r = rs[pid] && rs[pid][mes];
      if (!r || !r.totais) return;
      var suj = num(r.totais.sujeito) || 0, nsuj = num(r.totais.naoSujeito) || 0;
      baseTsu += suj;
      var nome = (r.pessoa && r.pessoa.nome) || pid;
      var pag = juntarPagamentos(compromissosDaPessoa(pid).map(function(cid){ return pagamentoDeOcorrencia(cid, mes); }));
      var inf = inferir(mes).alvos, partes = 0, cobertas = 0;
      var derivadas = partesDoRecibo(r) || {};
      ['conta', 'cartao'].forEach(function(parte){
        if (!((r.pagamento && centimos(r.pagamento[parte])) || centimos(derivadas[parte]))) return;
        partes++;
        if (aplicarInferido(pag, inf['rec:' + pid + '|' + parte]) || pag.estado === 'pago') cobertas++;
      });
      if (partes && cobertas === partes) pag.estado = 'pago';
      var semParcelas = !partes;
      out.push(base({
        id: 'rec:' + pid, origem: 'recibo', origemRef: 'recibos/' + pid + '/' + mes, mes: mes, data: ultimoDia(mes),
        valor: suj + nsuj, rubrica: 'pessoal', despesa: nome,
        entidade: { tipo: 'pessoa', id: pid, nome: nome },
        pagamento: pag,
        motivo: (suj + nsuj) > 0 ? null : 'recibo sem totais',
        rasto: semParcelas ? 'recibo sem parcelas conta/cartão nem líquido — o banco não consegue ligar-se a ele' : null
      }));
    });
    if (baseTsu > 0){
      var cs = g('getCompromissos'), tsuIds = Object.keys(cs).filter(function(id){ return cs[id] && ehTsu(id, cs[id]); });
      var pag = juntarPagamentos(tsuIds.map(function(id){ return pagamentoDeOcorrencia(id, mesVizinho(mes, 1)); }));
      if (!tsuIds.length) pag = { estado: 'pendente', movimentoIds: [] };
      out.push(base({
        id: 'tsu', origem: 'tsu', origemRef: 'recibos/*/' + mes, mes: mes, data: ultimoDia(mes),
        valor: arred(baseTsu * TSU_TAXA_PATRONAL), rubrica: 'pessoal', despesa: 'TSU patronal',
        entidade: { tipo: 'entidade', id: null, nome: 'Segurança Social' },
        pagamento: pag, motivo: null
      }));
    }
    return out;
  }

  function compromissos(mes){
    var cs = g('getCompromissos'), out = [];
    Object.keys(cs).forEach(function(id){
      var c = cs[id]; if (!c || c.ativo === false) return;
      if (c.pessoaId || c.parteRecibo || ehTsu(id, c)) return;
      if (/^(sal[aá]rio|cart[aã]o refei[cç][aã]o)/i.test(c.nome || '')) return;
      var orcado = (c.valorDiario !== null && c.valorDiario !== undefined && c.valorDiario !== '')
        ? diasUteis(mes) * (num(c.valorDiario) || 0) : (num(c.valor) || 0);
      var pag = pagamentoDeOcorrencia(id, mes);
      var valor = (pag.valorMovimento !== undefined && pag.valorMovimento > 0) ? pag.valorMovimento : orcado;
      delete pag.valorMovimento;
      var infC = inferir(mes).alvos['fixo:' + id];
      if (!pag.movimentoIds.length && aplicarInferido(pag, infC)){ pag.estado = 'pago'; if (infC.cents) valor = infC.cents / 100; }
      if (!(valor > 0)) return;   // 0 € não é custo do mês
      var dia = parseInt(c.dia, 10);
      var ud = ultimoDia(mes), nd = parseInt(ud.slice(8), 10);
      var data = (dia >= 1 && dia <= nd) ? mes + '-' + pad2(dia) : ud;
      out.push(base({
        id: 'fixo:' + id, origem: 'compromisso', origemRef: 'compromissosFixos/' + id, mes: mes, data: data,
        valor: valor, rubrica: 'fixos', despesa: c.nome || id,
        entidade: { tipo: 'fornecedor', id: null, nome: c.fornecedor || c.nome || id },
        pagamento: pag,
        motivo: (c.valorVariavel === true && !pag.movimentoIds.length) ? 'valor variável sem movimento bancário' : null
      }));
    });
    return out;
  }

  function classificarBanco(conta, ref, mov){
    var alvo = normalizar((mov.remittance_information || '') + ' ' + (mov.creditor_name || ''));
    var regras = g('getClassificacaoRegras'), melhor = null;
    Object.keys(regras).forEach(function(rid){
      var r = regras[rid]; if (!r || !r.padrao || !r.rubrica) return;
      var p = normalizar(r.padrao);
      if (p && alvo.indexOf(p) !== -1 && (!melhor || p.length > melhor.plen)) melhor = { rubrica: r.rubrica, despesa: r.despesa || null, plen: p.length };
    });
    var ov = g('getClassificacaoMovimentos')[idMov(conta, ref)];
    if (ov && ov.rubrica) return { rubrica: ov.rubrica, despesa: ov.despesa || (melhor && melhor.despesa) || null, fonte: 'override' };
    if (melhor) return { rubrica: melhor.rubrica, despesa: melhor.despesa, fonte: 'regra' };
    if (RE_IMPOSTO.test(alvo)) return { rubrica: 'impostos', despesa: null, fonte: 'imposto' };
    return null;
  }

  function banco(mes, usados){
    var idx = movimentoPorId(), recPorMov = reconciliacaoPorMovimento(), out = [];
    var inf = inferir(mes);
    Object.keys(idx).forEach(function(id){
      var e = idx[id], m = e.mov;
      if (m.credit_debit_indicator !== 'DBIT') return;
      var data = diaValido(m.booking_date);
      if (!data || data.slice(0, 7) !== mes) return;
      if (RE_INTERNA.test(m.remittance_information || '')) return;
      if (usados[id]) return;   // já é o pagamento de outro registo
      if (inf.porMovimento[id]) return;   // ligado por inferência (N1–N4) a um registo deste mês
      var v = num(m.amount);
      if (v === null || v === 0) return;
      var desc = m.remittance_information || m.creditor_name || '—';
      var cls = classificarBanco(e.conta, e.ref, m);
      var ent = { tipo: 'banco', id: null, nome: m.creditor_name || desc };
      var despesa = cls ? cls.despesa : null;
      var motivo = null, rasto = null;
      // Prestadores / adiantamentos no descritivo → pessoal (a mesma regex da caixa), abaixo de override e regra.
      if (!cls && RE_BANCO_PESSOAL.test(desc + ' ' + (m.creditor_name || ''))){ cls = { rubrica: 'pessoal' }; despesa = m.creditor_name || desc; }
      if (!cls){
        var pr = linhaPayReq(recPorMov[id] || '') || (inf.linhaPedido[id] ? { linha: inf.linhaPedido[id] } : null);
        if (pr){
          // Ligado a uma linha de pedido: o fornecedor da linha (por nome →
          // suppliers) dá a rubrica pela categoria; prestadores → pessoal;
          // sem ficha ou sem categoria → porValidar, nunca cmv cego.
          var nomeL = pr.linha.fornecedor || '';
          var fr = fornecedorPorNome(nomeL);
          ent = { tipo: 'fornecedor', id: fr ? fr.id : null, nome: nomeL || desc };
          if (RE_BANCO_PESSOAL.test(nomeL)){ cls = { rubrica: 'pessoal' }; despesa = nomeL; }
          else {
            var catB = fr ? categoriaFornecedor(fr.s) : { rubrica: null, despesa: null, motivo: 'fornecedor "' + (nomeL || desc) + '" sem ficha em suppliers' };
            if (catB.rubrica){ cls = { rubrica: catB.rubrica }; despesa = catB.despesa; rasto = catB.rasto || null; }
            else motivo = catB.motivo;
          }
        } else motivo = 'movimento bancário sem classificação';
      }
      // Ambiguidade da cascata → porValidar, EXCEPTO quando a rubrica vem de
      // decisão humana (override ou regra aprendida): aí fica só como rasto.
      if (inf.ambiguos[id]){
        if (cls && (cls.fonte === 'override' || cls.fonte === 'regra')) rasto = inf.ambiguos[id] + (rasto ? '; ' + rasto : '');
        else motivo = inf.ambiguos[id] + (motivo ? '; ' + motivo : '');
      }
      out.push(base({
        id: 'banco:' + id, origem: 'banco', origemRef: 'contasBancarias/' + e.conta + '/movimentos/' + e.ref, mes: mes, data: data,
        valor: Math.abs(v), rubrica: cls ? cls.rubrica : null, despesa: despesa, entidade: ent,
        pagamento: { estado: 'pago', movimentoIds: [id], dataPagamento: data },
        motivo: motivo, rasto: rasto
      }));
    });
    return out;
  }

  function naoBancarios(mes){
    return [].concat(faturas(mes), faturasCaixa(mes), recibos(mes), compromissos(mes));
  }

  // Conjunto de movimentoIds já reclamados por registos (não-banco) do mês,
  // do anterior e do seguinte — gerados agora E já gravados em custos/
  // (inclui os manuais e os validados à mão).
  function movimentosReclamados(mes, geradosMes){
    var usados = {}, custos = g('getCustos');
    function marca(r){ if (r && r.origem !== 'banco' && r.anulado !== true && r.pagamento && Array.isArray(r.pagamento.movimentoIds)) r.pagamento.movimentoIds.forEach(function(id){ usados[id] = r.id || true; }); }
    [mesVizinho(mes, -1), mes, mesVizinho(mes, 1)].forEach(function(m){
      (m === mes ? geradosMes : naoBancarios(m)).forEach(marca);
      if (m === mes) return;   // o nó gravado do próprio mês vai ser reescrito agora: não conta
      var n = custos[m] || {};
      Object.keys(n).forEach(function(k){ if (k.charAt(0) !== '_') marca(n[k]); });
    });
    return usados;
  }

  function resumoDe(registos){
    var porRubrica = {}, total = 0, porValidar = 0;
    registos.forEach(function(r){
      if (r.anulado === true) return;
      if (r.validacao && r.validacao.estado === 'porValidar') porValidar++;
      var k = r.rubrica || 'semRubrica';
      var v = (typeof r.valor === 'number') ? r.valor : 0;
      porRubrica[k] = arred((porRubrica[k] || 0) + v);
      if (k !== 'interno') total += v;
    });
    return { porRubrica: porRubrica, total: arred(total), porValidar: porValidar, geradoEm: new Date(agora()).toISOString() };
  }

  /* ---------- gerar (puro) ---------- */
  function gerar(mes){
    mes = mesValido(mes);
    if (!mes) throw new Error('mês inválido (AAAA-MM)');
    memoInfer = {};
    var gerados = naoBancarios(mes);
    var usados = movimentosReclamados(mes, gerados);
    gerados = gerados.concat(banco(mes, usados));
    var existentes = g('getCustos')[mes] || {};
    var ts = agora();
    var porId = {};
    var registos = gerados.map(function(r){
      var ex = existentes[r.id];
      var novo = r;
      if (ex && ex.validacao && ex.validacao.estado === 'validado'){
        novo = { id: r.id, origem: r.origem, origemRef: r.origemRef, mesCompetencia: r.mesCompetencia, data: r.data,
                 valor: r.valor, rubrica: ex.rubrica || null, despesa: ex.despesa || null, entidade: ex.entidade || r.entidade,
                 pagamento: r.pagamento, validacao: ex.validacao };
      }
      if (ex && ex.duplicaDe) novo.duplicaDe = ex.duplicaDe;
      novo.criadoEm = (ex && ex.criadoEm) || ts;
      var igual = ex && ex.anulado !== true && mesmoConteudo(ex, novo);
      novo.atualizadoEm = igual ? ex.atualizadoEm : ts;
      novo.__inalterado = !!igual;
      porId[r.id] = novo;
      return novo;
    });
    var anular = [];
    Object.keys(existentes).forEach(function(id){
      if (id.charAt(0) === '_' || porId[id]) return;
      var ex = existentes[id];
      if (!ex || ex.origem === 'manual' || ex.anulado === true) return;
      anular.push(id);
    });
    var vivos = registos.slice();
    Object.keys(existentes).forEach(function(id){
      if (id.charAt(0) === '_' || porId[id]) return;
      var ex = existentes[id];
      if (ex && ex.origem === 'manual' && ex.anulado !== true) vivos.push(ex);
    });
    return { mes: mes, registos: registos, anular: anular, resumo: resumoDe(vivos) };
  }

  function mesmoConteudo(a, b){
    var ka = {}; Object.keys(a).forEach(function(k){ if (k !== 'atualizadoEm' && k !== 'anulado' && k !== 'anuladoEm') ka[k] = a[k]; });
    var kb = {}; Object.keys(b).forEach(function(k){ if (k !== 'atualizadoEm' && k.indexOf('__') !== 0) kb[k] = b[k]; });
    return JSON.stringify(ordena(ka)) === JSON.stringify(ordena(kb));
  }
  function ordena(o){
    if (Array.isArray(o)) return o.map(ordena);
    if (!o || typeof o !== 'object') return o;
    var r = {}; Object.keys(o).sort().forEach(function(k){ if (o[k] !== null && o[k] !== undefined) r[k] = ordena(o[k]); });
    return r;
  }
  function limpo(r){
    var o = {}; Object.keys(r).forEach(function(k){ if (k.indexOf('__') !== 0 && r[k] !== undefined) o[k] = r[k]; });
    return o;
  }

  /* ---------- escritas (só custos/) ---------- */
  function ref(){ if (!deps.ref) throw new Error('sem ref para custos/'); return deps.ref; }

  function sequencial(passos){
    return passos.reduce(function(p, f){ return p.then(f); }, Promise.resolve());
  }

  // classificacaoDespesas/{ALIMENTAR|BEBIDAS|PACKAGING|SERVICOS}: cria só as
  // que faltam (set() por entrada, id = nome normalizado como na
  // resultados.html), reaproveitando as existentes. Precisa de
  // getClassificacaoDespesas + refDespesas; sem eles não faz nada.
  function garantirDespesas(){
    if (!deps.refDespesas || !deps.getClassificacaoDespesas) return Promise.resolve(0);
    var cat = g('getClassificacaoDespesas'), n = 0, passos = [];
    CATEGORIAS_FORNECEDOR.forEach(function(c){
      if (cat[c.despesa]) return;
      var reg = { nome: c.despesa, criadoEm: new Date(agora()).toISOString() };
      passos.push(function(){ n++; cat[c.despesa] = reg; return deps.refDespesas.child(c.despesa).set(reg); });
    });
    return sequencial(passos).then(function(){ return n; });
  }

  // Regenerar: set() por registo (só os que mudaram), update() para anular,
  // set() do _resumo. Devolve o plano com contadores.
  function regenerar(mes){
    var plano = gerar(mes);
    var ts = new Date(agora()).toISOString();
    var escritos = 0, anulados = 0;
    var passos = [function(){ return garantirDespesas(); }];
    plano.registos.forEach(function(r){
      if (r.__inalterado) return;
      passos.push(function(){ escritos++; return ref().child(plano.mes).child(r.id).set(limpo(r)); });
    });
    plano.anular.forEach(function(id){
      passos.push(function(){ anulados++; return ref().child(plano.mes).child(id).update({ anulado: true, anuladoEm: ts, atualizadoEm: agora() }); });
    });
    passos.push(function(){ return ref().child(plano.mes).child('_resumo').set(plano.resumo); });
    return sequencial(passos).then(function(){
      return { mes: plano.mes, registos: plano.registos.length, escritos: escritos, anulados: anulados, resumo: plano.resumo };
    });
  }

  // Validar um registo: rubrica/despesa escolhidas pelo humano. Um set() por folha.
  function validar(mes, id, opts){
    mes = mesValido(mes);
    if (!mes || !id) return Promise.reject(new Error('mês ou id em falta'));
    var rubrica = rubricaValida(opts && opts.rubrica);
    if (!rubrica) return Promise.reject(new Error('rubrica inválida'));
    var node = ref().child(mes).child(id);
    var ts = agora();
    var validacao = { estado: 'validado', validadoPor: (opts && opts.validadoPor) || 'Manel', validadoEm: new Date(ts).toISOString() };
    var passos = [
      function(){ return node.child('rubrica').set(rubrica); },
      function(){ return node.child('despesa').set((opts && opts.despesa) ? String(opts.despesa) : null); },
      function(){ return node.child('validacao').set(validacao); },
      function(){ return node.child('atualizadoEm').set(ts); }
    ];
    return sequencial(passos).then(function(){ return atualizarResumo(mes, function(r){ if (r.id === id){ r.rubrica = rubrica; r.validacao = validacao; } }); });
  }

  // _resumo recalculado a partir do que está em memória (com a alteração
  // acabada de escrever aplicada, porque o listener pode ainda não ter voltado).
  function atualizarResumo(mes, ajuste){
    var n = g('getCustos')[mes] || {};
    var lista = Object.keys(n).filter(function(k){ return k.charAt(0) !== '_'; }).map(function(k){ return JSON.parse(JSON.stringify(n[k])); });
    if (ajuste) lista.forEach(ajuste);
    var resumo = resumoDe(lista);
    return ref().child(mes).child('_resumo').set(resumo).then(function(){ return resumo; });
  }

  return {
    RUBRICAS: RUBRICAS, ORIGENS: ORIGENS, TSU_TAXA_PATRONAL: TSU_TAXA_PATRONAL,
    RE_CAIXA_PESSOAL: RE_CAIXA_PESSOAL, RE_BANCO_PESSOAL: RE_BANCO_PESSOAL, RE_IMPOSTO: RE_IMPOSTO,
    CATEGORIAS_FORNECEDOR: CATEGORIAS_FORNECEDOR, categoriaFornecedor: categoriaFornecedor,
    inferir: inferir, gerar: gerar, regenerar: regenerar, validar: validar, atualizarResumo: atualizarResumo, garantirDespesas: garantirDespesas,
    resumoDe: resumoDe, mesVizinho: mesVizinho, diasUteis: diasUteis, ultimoDia: ultimoDia
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = giocoCustosCanonicoEngine;
