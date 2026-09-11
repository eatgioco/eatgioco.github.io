/* testa-custos-canonico.js — testes do gioco-custos-canonico.js (Node).
   Corre: node scripts/testa-custos-canonico.js
   Dataset SINTÉTICO em memória (mês 2099-01, valores de 0,01 €), com um
   caso de cada origem, um movimento bancário já ligado a uma fatura (não
   pode gerar registo banco:) e um registo validado à mão. O "Firebase" é
   um store em memória com a mesma API mínima (child/set/update) — nenhum
   teste toca no RTDB real. Exporta dataset() para o harness de browser. */
'use strict';
var assert = require('assert');
var engineFactory = require('../gioco-custos-canonico.js');

function dataset(){
  return {
    suppliers: { sup1: { nome: 'Fornecedor Teste 0,01' } },
    faturasProcessadas: {
      fatA: { fornecedorIdEncontrado: 'sup1', fornecedorTexto: 'Fornecedor Teste', montante: 0.01, data: '2099-01-05', paymentRequestId: 'prA', criadoEm: 4070995200000 },
      fatB: { fornecedorIdEncontrado: null, fornecedorTexto: 'Desconhecido Lda', montante: null, data: '2099-01-06', criadoEm: 4070995200000 }
    },
    paymentRequests: {
      prA: { status: 'concluido', lines: [ { fornecedor: 'Fornecedor Teste 0,01', montante: '0,01', status: 'concluido', concluidoEm: '2099-01-08T10:00:00Z' } ] },
      prX: { status: 'pendente', lines: [ { fornecedor: 'Pedido sem fatura', montante: '0,01', status: 'pendente' } ] }
    },
    caixaMovimentos: {
      cx1: { tipo: 'saida', motivo: 'Compra', valor: 0.02, valorDevolvido: 0.01, estado: 'acertado', dataHora: '2099-01-07T12:00:00Z',
             fatura: { montante: 0.01, data: '2099-01-07', fornecedorIdEncontrado: 'sup1', fornecedorTexto: 'Fornecedor Teste', erroLeitura: null } },
      cx2: { tipo: 'saida', motivo: 'Compra', valor: 0.01, valorDevolvido: 0, estado: 'acertado', dataHora: '2099-01-09T12:00:00Z', semFatura: true, semFaturaDeclaradoPor: 'Teste' },
      cx3: { tipo: 'saida', motivo: 'Depósito bancário', valor: 0.01, dataHora: '2099-01-10T12:00:00Z' },
      cx4: { tipo: 'saida', motivo: 'Adiantamento Subash', valor: 0.01, valorDevolvido: 0, estado: 'acertado', dataHora: '2099-01-11T12:00:00Z', semFatura: true },
      cx5: { tipo: 'entrada', motivo: 'Reforço de caixa', valor: 0.01, dataHora: '2099-01-11T12:00:00Z' }
    },
    recibos: { p1: { '2099-01': { pessoa: { nome: 'Pessoa Teste' }, totais: { sujeito: 0.04, naoSujeito: 0.01 } } } },
    compromissosFixos: {
      sal1: { nome: 'Salário — PT', pessoaId: 'p1', parteRecibo: 'conta', ativo: true, dia: 28 },
      tsu1: { nome: 'Segurança Social', derivaDe: 'tsu', ativo: true, dia: 10 },
      fx1:  { nome: 'Renda Teste', valor: 0.01, dia: 1, ativo: true },
      fx2:  { nome: 'EPAL Teste', valor: 0.01, dia: 15, valorVariavel: true, metodoPagamento: 'debito', ativo: true },
      fx3:  { nome: 'Subsídio Teste', valorDiario: 0.01, dia: 31, ativo: true },
      fx0:  { nome: 'Inativo', valor: 0.01, ativo: false }
    },
    pagamentosConcluidos: { 'sal1_2099-1': { concluidoEm: '2099-01-28T09:00:00Z' }, 'fx1_2099-1': { concluidoEm: '2099-01-02T09:00:00Z' } },
    reconciliacaoBancaria: {
      'payreq:prA~0':  { conta: 'abanca', movimentoKey: 'mA', valor: 0.01, dataMovimento: '2099-01-09', metodo: 'auto', em: 1 },
      'fixo:sal1_2099-1': { conta: 'abanca', movimentoKey: 'mS', valor: 0.05, dataMovimento: '2099-01-28', metodo: 'auto', em: 1 },
      'fixo:fx1_2099-1':  { conta: 'abanca', movimentoKey: 'mG', valor: 0.01, dataMovimento: '2099-02-02', metodo: 'manual', em: 1 },
      'fixo:tsu1_2099-2': { conta: 'abanca', movimentoKey: 'mT', valor: 0.01, dataMovimento: '2099-02-10', metodo: 'auto', em: 1 },
      'payreq:prX~0':  { conta: 'revolut', movimentoKey: 'rX', valor: 0.01, dataMovimento: '2099-01-21', metodo: 'manual', em: 1 }
    },
    movimentos: {
      abanca: {
        mA: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-01-09', remittance_information: 'TRF FORNECEDOR TESTE', creditor_name: 'Fornecedor Teste' },
        mB: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-01-12', remittance_information: 'PAG.TSU 12/2098' },
        mC: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-01-15', remittance_information: 'FACEBK *8XK2LQ' },
        mD: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-01-20', remittance_information: 'ZZ DESCONHECIDO 0,01' },
        mE: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-01-20', remittance_information: 'TRF INTERNA REVOLUT' },
        mF: { credit_debit_indicator: 'CRDT', amount: 0.01, booking_date: '2099-01-20', remittance_information: 'INTERCARD' },
        mS: { credit_debit_indicator: 'DBIT', amount: -0.05, booking_date: '2099-01-28', remittance_information: 'TRF SALARIO PT' },
        mG: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-02-02', remittance_information: 'RENDA TESTE' },
        mT: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-02-10', remittance_information: 'PAG.TSU 01/2099' },
        mH: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-02-14', remittance_information: 'OUTRO FEV' }
      },
      revolut: {
        rX: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-01-21', remittance_information: 'Pedido sem fatura Lda' },
        rO: { credit_debit_indicator: 'DBIT', amount: -0.01, booking_date: '2099-01-22', remittance_information: 'Override Teste' }
      }
    },
    classificacaoRegras: { r1: { padrao: 'FACEBK', rubrica: 'outros', despesa: 'Meta Ads' } },
    classificacaoMovimentos: { 'revolut~rO': { rubrica: 'fixos', manual: true, despesa: 'Override Despesa' } },
    custos: {}
  };
}

// Store em memória com a API mínima usada pelo motor.
function fakeRef(store, path){
  path = path || [];
  function alvo(criar){
    var n = store;
    for (var i = 0; i < path.length - 1; i++){ if (n[path[i]] === undefined){ if (!criar) return null; n[path[i]] = {}; } n = n[path[i]]; }
    return n;
  }
  return {
    child: function(k){ return fakeRef(store, path.concat(String(k).split('/'))); },
    set: function(v){ store.__escritas = (store.__escritas || 0) + 1; var n = alvo(true); var k = path[path.length - 1];
      if (v === null) delete n[k]; else n[k] = JSON.parse(JSON.stringify(v)); return Promise.resolve(); },
    update: function(o){ store.__escritas = (store.__escritas || 0) + 1; var n = alvo(true); var k = path[path.length - 1]; n[k] = n[k] || {};
      Object.keys(o).forEach(function(c){ if (o[c] === null) delete n[k][c]; else n[k][c] = o[c]; }); return Promise.resolve(); },
    remove: function(){ throw new Error('remove() proibido'); }
  };
}

function engine(d, store){
  return engineFactory({
    getFaturas: function(){ return d.faturasProcessadas; }, getCaixaMovimentos: function(){ return d.caixaMovimentos; },
    getRecibos: function(){ return d.recibos; }, getCompromissos: function(){ return d.compromissosFixos; },
    getPagamentosConcluidos: function(){ return d.pagamentosConcluidos; }, getPaymentRequests: function(){ return d.paymentRequests; },
    getMovimentos: function(){ return d.movimentos; }, getReconciliacao: function(){ return d.reconciliacaoBancaria; },
    getSuppliers: function(){ return d.suppliers; }, getClassificacaoRegras: function(){ return d.classificacaoRegras; },
    getClassificacaoMovimentos: function(){ return d.classificacaoMovimentos; },
    getCustos: function(){ return store.custos; }, ref: fakeRef(store, ['custos'])
  });
}

function registos(store, mes){ var n = store.custos[mes] || {}; return Object.keys(n).filter(function(k){ return k.charAt(0) !== '_'; }); }

async function main(){
  var d = dataset();
  var store = { custos: {} };
  var CC = engine(d, store);

  // 1) geração pura
  var plano = CC.gerar('2099-01');
  var ids = plano.registos.map(function(r){ return r.id; }).sort();
  console.log('registos 2099-01:', ids.join(' '));
  var esperados = ['banco:abanca~mB', 'banco:abanca~mC', 'banco:abanca~mD', 'banco:revolut~rO', 'banco:revolut~rX',
                   'cxf:cx1', 'cxf:cx2', 'cxf:cx4', 'fat:fatA', 'fat:fatB', 'fixo:fx1', 'fixo:fx2', 'fixo:fx3', 'rec:p1', 'tsu'].sort();
  assert.deepStrictEqual(ids, esperados, 'conjunto de ids');
  var porId = {}; plano.registos.forEach(function(r){ porId[r.id] = r; });
  assert.ok(!porId['banco:abanca~mA'], 'mA está ligado à fatura: não gera banco:');
  assert.ok(!porId['banco:abanca~mS'], 'mS paga o recibo: não gera banco:');
  assert.ok(!porId['banco:abanca~mE'], 'INTERNA fora');
  assert.strictEqual(porId['fat:fatA'].pagamento.estado, 'pago');
  assert.deepStrictEqual(porId['fat:fatA'].pagamento.movimentoIds, ['abanca~mA']);
  assert.strictEqual(porId['fat:fatA'].pagamento.dataPagamento, '2099-01-09');
  assert.strictEqual(porId['fat:fatB'].validacao.estado, 'porValidar');
  assert.strictEqual(porId['fat:fatB'].valor, null);
  assert.strictEqual(porId['cxf:cx1'].valor, 0.01, 'gasto real = valor − devolvido');
  assert.strictEqual(porId['cxf:cx1'].rubrica, 'cmv');
  assert.strictEqual(porId['cxf:cx2'].validacao.estado, 'porValidar');
  assert.strictEqual(porId['cxf:cx4'].rubrica, 'pessoal');
  assert.strictEqual(porId['rec:p1'].valor, 0.05);
  assert.strictEqual(porId['rec:p1'].pagamento.estado, 'pago');
  assert.deepStrictEqual(porId['rec:p1'].pagamento.movimentoIds, ['abanca~mS']);
  assert.strictEqual(porId['tsu'].valor, 0.01, '23,75 % × 0,04 arredondado uma vez');
  assert.deepStrictEqual(porId['tsu'].pagamento.movimentoIds, ['abanca~mT'], 'TSU liga ao PAG.TSU do mês seguinte');
  assert.strictEqual(porId['fixo:fx1'].pagamento.estado, 'pago');
  assert.deepStrictEqual(porId['fixo:fx1'].pagamento.movimentoIds, ['abanca~mG']);
  assert.strictEqual(porId['fixo:fx2'].validacao.estado, 'porValidar', 'variável sem movimento');
  assert.strictEqual(porId['fixo:fx3'].valor, Math.round(CC.diasUteis('2099-01') * 0.01 * 100) / 100);
  assert.strictEqual(porId['banco:abanca~mB'].rubrica, 'impostos');
  assert.strictEqual(porId['banco:abanca~mC'].rubrica, 'outros');
  assert.strictEqual(porId['banco:abanca~mC'].despesa, 'Meta Ads');
  assert.strictEqual(porId['banco:abanca~mD'].rubrica, null);
  assert.strictEqual(porId['banco:abanca~mD'].validacao.estado, 'porValidar');
  assert.strictEqual(porId['banco:revolut~rO'].rubrica, 'fixos', 'override vence');
  assert.strictEqual(porId['banco:revolut~rX'].rubrica, 'cmv', 'ligado a linha de pedido → cmv com fornecedor');
  assert.strictEqual(porId['banco:revolut~rX'].entidade.nome, 'Pedido sem fatura');

  // 2) regenerar três vezes: mesmo nº de registos, mesmos totais, zero escritas depois da 1.ª
  var r1 = await CC.regenerar('2099-01');
  var n1 = registos(store, '2099-01').length, t1 = JSON.stringify(store.custos['2099-01']._resumo.porRubrica), tot1 = store.custos['2099-01']._resumo.total;
  var r2 = await CC.regenerar('2099-01');
  var r3 = await CC.regenerar('2099-01');
  console.log('regenerar ×3: escritos', r1.escritos, r2.escritos, r3.escritos, '| registos', n1, registos(store, '2099-01').length, '| total', tot1, '| porValidar', r3.resumo.porValidar);
  console.log('porRubrica:', t1);
  assert.strictEqual(r1.escritos, 15); assert.strictEqual(r2.escritos, 0); assert.strictEqual(r3.escritos, 0);
  assert.strictEqual(registos(store, '2099-01').length, n1);
  assert.strictEqual(JSON.stringify(store.custos['2099-01']._resumo.porRubrica), t1);
  assert.strictEqual(store.custos['2099-01']._resumo.total, tot1);
  assert.strictEqual(r3.resumo.porValidar, 5, 'fatB, cx2, cx4, fx2, mD');

  // 3) validado à mão sobrevive à regeneração
  await CC.validar('2099-01', 'banco:abanca~mD', { rubrica: 'outros', despesa: 'Despesa Humana', validadoPor: 'Teste' });
  assert.strictEqual(store.custos['2099-01']['banco:abanca~mD'].validacao.estado, 'validado');
  assert.strictEqual(store.custos['2099-01']._resumo.porValidar, 4);
  var r4 = await CC.regenerar('2099-01');
  var mD = store.custos['2099-01']['banco:abanca~mD'];
  assert.strictEqual(mD.rubrica, 'outros', 'rubrica humana preservada'); assert.strictEqual(mD.despesa, 'Despesa Humana');
  assert.strictEqual(mD.validacao.estado, 'validado'); assert.strictEqual(mD.validacao.validadoPor, 'Teste');
  assert.strictEqual(r4.escritos, 0, 'nada muda ao regenerar depois de validar');
  assert.strictEqual(r4.resumo.porValidar, 4);
  assert.strictEqual(r4.resumo.porRubrica.outros, 0.02);

  // 4) origem deixa de produzir → anulado:true, nunca remove; volta → anulado sai
  var fatB = d.faturasProcessadas.fatB; delete d.faturasProcessadas.fatB;
  var r5 = await CC.regenerar('2099-01');
  assert.strictEqual(r5.anulados, 1); assert.strictEqual(store.custos['2099-01']['fat:fatB'].anulado, true);
  assert.ok(store.custos['2099-01']['fat:fatB'].anuladoEm);
  assert.strictEqual(r5.resumo.porValidar, 3);
  d.faturasProcessadas.fatB = fatB;
  await CC.regenerar('2099-01');
  assert.strictEqual(store.custos['2099-01']['fat:fatB'].anulado, undefined);
  assert.strictEqual(store.custos['2099-01']._resumo.porValidar, 4);

  // 5) mês seguinte: os movimentos que pagam registos de Janeiro não geram banco: em Fevereiro
  var fev = CC.gerar('2099-02');
  var idsFev = fev.registos.map(function(r){ return r.id; }).sort();
  console.log('registos 2099-02:', idsFev.join(' '));
  assert.ok(idsFev.indexOf('banco:abanca~mG') === -1, 'mG paga fixo:fx1 de Janeiro');
  assert.ok(idsFev.indexOf('banco:abanca~mT') === -1, 'mT paga a TSU de Janeiro');
  assert.ok(idsFev.indexOf('banco:abanca~mH') !== -1, 'mH é residual de Fevereiro');

  // 6) nenhuma escrita fora de custos/
  assert.deepStrictEqual(Object.keys(store).filter(function(k){ return k !== '__escritas'; }), ['custos']);

  // 7) limpeza path a path (no store em memória; no RTDB real seria o mesmo ciclo)
  var chaves = Object.keys(store.custos['2099-01']);
  for (var i = 0; i < chaves.length; i++) await fakeRef(store, ['custos', '2099-01', chaves[i]]).set(null);
  assert.deepStrictEqual(store.custos['2099-01'], {});
  console.log('limpeza: ' + chaves.length + ' paths apagados de custos/2099-01 → nó vazio');
  console.log('OK — todos os testes passaram');
}

if (require.main === module) main().catch(function(e){ console.error('FALHOU:', e); process.exit(1); });
module.exports = { dataset: dataset };
