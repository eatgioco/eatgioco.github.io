// Testes do backfill de NIFs (gioco-nif-backfill.js). Correr: node scripts/testa-nif-backfill.js
// Store em memória — nunca toca no RTDB.
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var ctx = { window: {}, document: {}, fetch: function(){}, Image: function(){}, FileReader: function(){} };
ctx.window = ctx;
vm.runInNewContext(fs.readFileSync(__dirname + '/../gioco-faturas.js', 'utf8'), ctx);
var GF = ctx.GiocoFaturas;
var NB = require('../gioco-nif-backfill.js')(GF);

var NIF_A = '500697256', NIF_B = '501442600', NIF_C = '123456789';

function cenario() {
  var store = {
    suppliers: {
      sA: { nome: 'Alfa' },                       // sem nif, fatura com nifTexto → grátis
      sB: { nome: 'Beta' },                       // sem nif, fatura só com ficheiro → releitura
      sC: { nome: 'Gama', nif: '505050505' },     // já tem nif → fora
      sD: { nome: 'Delta' },                      // sem nif, fatura sem ficheiro → manual
      sE: { nome: 'Epsilon' },                    // releitura que falha no Azure
      sF: { nome: 'Fi' },                         // releitura, o Azure devolve 2 candidatos → manual
      sG: { nome: 'Gee', nif: '' },               // nif vazio conta como sem nif; sem faturas → manual
      sH: { nome: 'Aga' },                        // releitura que encontra NIF → gravado
      sI: { nome: 'Iota' },                       // nifTexto de origem genérica, sem ficheiro → manual
      sJ: { nome: 'Jota' }                        // nifTexto sem origem (antigo) mas com ficheiro → releitura
    },
    faturasProcessadas: {
      f1: { fornecedorIdEncontrado: 'sA', criadoEm: 10, fornecedorTexto: 'ALFA LDA', montante: 5 },
      f2: { fornecedorIdEncontrado: 'sA', criadoEm: 20, fornecedorTexto: 'ALFA LDA', nifTexto: NIF_A, nifOrigem: 'etiqueta', montante: 7, linhas: [{ d: 1 }] },
      f3: { fornecedorIdEncontrado: 'sB', criadoEm: 5, fornecedorTexto: 'BETA', montante: 1 },
      f4: { fornecedorIdEncontrado: 'sB', criadoEm: 9, fornecedorTexto: 'BETA', montante: 2 },
      f5: { fornecedorIdEncontrado: 'sC', criadoEm: 9, fornecedorTexto: 'GAMA' },
      f6: { fornecedorIdEncontrado: 'sD', criadoEm: 9, fornecedorTexto: 'DELTA' },
      f7: { fornecedorIdEncontrado: 'sE', criadoEm: 9, fornecedorTexto: 'EPS' },
      f8: { fornecedorIdEncontrado: 'sF', criadoEm: 9, fornecedorTexto: 'FI' },
      f9: { fornecedorIdEncontrado: 'sH', criadoEm: 9, fornecedorTexto: 'AGA SA' },
      f10: { fornecedorIdEncontrado: null, criadoEm: 99, fornecedorTexto: 'SOLTA' },
      f11: { fornecedorIdEncontrado: 'sI', criadoEm: 9, fornecedorTexto: 'IOTA', nifTexto: NIF_B, nifOrigem: 'generico' },
      f12: { fornecedorIdEncontrado: 'sJ', criadoEm: 9, fornecedorTexto: 'JOTA', nifTexto: NIF_B }
    },
    faturasArquivo: { f1: 'data:image/jpeg;base64,QUJD', f3: 'data:image/jpeg;base64,QUJD', f4: 'data:application/pdf;base64,QUJD',
                      f7: 'data:image/jpeg;base64,QUJD', f8: 'data:image/jpeg;base64,QUJD', f9: 'data:image/jpeg;base64,QUJD', f12: 'data:image/jpeg;base64,QUJD' }
  };
  return store;
}

var store = cenario();
var antes = JSON.parse(JSON.stringify(store.faturasProcessadas));
var plano = NB.planear(store.suppliers, store.faturasProcessadas, function (id) { return !!store.faturasArquivo[id]; });

assert.strictEqual(plano.totalSemNif, 9, 'sC tem nif; sG com nif vazio conta');
assert.deepStrictEqual(plano.semCusto.map(function (a) { return a.supplierId + ':' + a.fatura.id; }), ['sA:f2'], 'grátis: a mais recente com NIF gravado');
assert.deepStrictEqual(plano.releitura.map(function (a) { return a.supplierId + ':' + a.fatura.id; }).sort(), ['sB:f4', 'sE:f7', 'sF:f8', 'sH:f9', 'sJ:f12'], 'releitura: a mais recente com ficheiro (sJ: NIF sem origem relê)');
assert.deepStrictEqual(plano.manuais.map(function (a) { return a.supplierId + ':' + a.motivo; }).sort(), ['sD:sem ficheiro arquivado', 'sG:sem faturas ligadas', 'sI:NIF ' + NIF_B + ' sem etiqueta na fatura (origem genérica) — confirmar à mão']);
assert.ok(!plano.semCusto.concat(plano.releitura, plano.manuais).some(function (a) { return a.supplierId === 'sC'; }), 'fornecedor com nif saltado');
// Um alvo por fornecedor
var ids = plano.semCusto.concat(plano.releitura, plano.manuais).map(function (a) { return a.supplierId; });
assert.strictEqual(new Set(ids).size, ids.length, 'um alvo por fornecedor');

// Sem informação de arquivo (temArquivo → null): tudo entra na fila e a execução decide.
var planoSemInfo = NB.planear(store.suppliers, store.faturasProcessadas, null);
assert.ok(planoSemInfo.releitura.some(function (a) { return a.supplierId === 'sD' && a.fatura.id === 'f6'; }), 'sem shallow, sD vai à fila');

// ---- execução ----
var chamadasAzure = [], escritasFatura = [], aprendidos = [];
var azurePorFicheiro = {
  'fatura-f4.pdf': { nif: NIF_B, nifCandidatos: [NIF_B], nifOrigem: 'vendorTaxId' },
  'fatura-f7.jpg': null, // erro
  'fatura-f8.jpg': { nif: null, nifCandidatos: [NIF_A, NIF_C], nifOrigem: null },
  'fatura-f9.jpg': { nif: NIF_C, nifCandidatos: [NIF_C], nifOrigem: 'pt' },
  'fatura-f12.jpg': { nif: NIF_B, nifCandidatos: [NIF_B], nifOrigem: 'generico' }, // relida: continua genérica → manual
  'fatura-f6.jpg': { nif: NIF_C, nifCandidatos: [NIF_C], nifOrigem: 'etiqueta' }
};
function FileShim(parts, name, opts) { this.name = name; this.type = opts.type; }
var deps = {
  getSuppliers: function () { return store.suppliers; },
  lerArquivo: function (id) { return Promise.resolve(store.faturasArquivo[id] || null); },
  dataUrlParaFile: function (dataUrl, nome) {
    var m = /^data:([^;]+);base64,/.exec(dataUrl || '');
    return m ? new FileShim([], nome + (m[1] === 'application/pdf' ? '.pdf' : '.jpg'), { type: m[1] }) : null;
  },
  ler: function (file) {
    chamadasAzure.push(file.name);
    var r = azurePorFicheiro[file.name];
    if (!r) return Promise.reject(new Error('429 quota'));
    return Promise.resolve(Object.assign({ fornecedorTexto: 'X', montante: 1 }, r));
  },
  gravarNif: function (id, campos) {
    escritasFatura.push({ id: id, campos: campos });
    Object.keys(campos).forEach(function (k) { if (campos[k] === null) delete store.faturasProcessadas[id][k]; else store.faturasProcessadas[id][k] = campos[k]; });
    return Promise.resolve();
  },
  aprender: function (sid, fatura) {
    aprendidos.push(sid);
    var nif = NB.nifDaFatura(fatura);
    if (nif && !store.suppliers[sid].nif) store.suppliers[sid].nif = nif;
    return Promise.resolve();
  }
};

NB.executar(plano, deps).then(function (rel) {
  assert.deepStrictEqual(chamadasAzure.sort(), ['fatura-f12.jpg', 'fatura-f4.pdf', 'fatura-f7.jpg', 'fatura-f8.jpg', 'fatura-f9.jpg'], 'Azure só nas releituras; sA (nifTexto gravado) não chama');
  assert.strictEqual(rel.paginasAzure, 5);
  assert.ok(rel.manuais.some(function (m) { return m.supplierId === 'sJ' && /origem genérica/.test(m.motivo); }), 'relida e ainda genérica → manual');
  assert.ok(!('nif' in store.suppliers.sJ) && !('nif' in store.suppliers.sI), 'origem genérica nunca chega à ficha');
  assert.deepStrictEqual(rel.gravados.map(function (g) { return g.supplierId + ':' + g.nif; }).sort(), ['sA:' + NIF_A, 'sB:' + NIF_B, 'sH:' + NIF_C]);
  assert.strictEqual(store.suppliers.sA.nif, NIF_A);
  assert.strictEqual(store.suppliers.sB.nif, NIF_B);
  assert.strictEqual(store.suppliers.sH.nif, NIF_C);
  assert.deepStrictEqual(rel.falhados.map(function (f) { return f.supplierId + ':' + f.motivo; }), ['sE:429 quota'], 'erro do Azure a meio: fila continua');
  assert.ok(rel.manuais.some(function (m) { return m.supplierId === 'sF' && /2 NIFs candidatos/.test(m.motivo); }), '2 candidatos sem desempate → manual');
  assert.ok(!('nif' in store.suppliers.sF), 'nada gravado na ficha do sF');
  assert.deepStrictEqual(aprendidos.sort(), ['sA', 'sB', 'sH'], 'aprender só com NIF determinado (sem alias no sF)');
  assert.strictEqual(rel.saltados.length, 0);
  assert.strictEqual(rel.parado, false);

  // Só nifTexto/nifCandidatos mudaram nas faturas relidas; tudo o resto igual.
  var depois = store.faturasProcessadas;
  Object.keys(antes).forEach(function (id) {
    var a = Object.assign({}, antes[id]), d = Object.assign({}, depois[id]);
    delete a.nifTexto; delete a.nifCandidatos; delete a.nifOrigem; delete d.nifTexto; delete d.nifCandidatos; delete d.nifOrigem;
    assert.deepStrictEqual(d, a, 'fatura ' + id + ': outros campos intactos');
  });
  assert.strictEqual(escritasFatura.length, 4, 'update em f4, f8, f9, f12 (f7 falhou antes de gravar)');
  assert.deepStrictEqual(escritasFatura.find(function (e) { return e.id === 'f8'; }).campos, { nifTexto: null, nifCandidatos: [NIF_A, NIF_C], nifOrigem: null });
  assert.strictEqual(Object.keys(store.faturasProcessadas).length, 12, 'nenhuma fatura criada ou apagada');

  // Rule 7: fornecedor que entretanto aprendeu o NIF é saltado sem Azure.
  var store2 = cenario();
  var plano2 = NB.planear(store2.suppliers, store2.faturasProcessadas, function (id) { return !!store2.faturasArquivo[id]; });
  var azure2 = 0;
  var deps2 = Object.assign({}, deps, {
    getSuppliers: function () { return store2.suppliers; },
    lerArquivo: function (id) { return Promise.resolve(store2.faturasArquivo[id] || null); },
    ler: function (file) { azure2++; return Promise.resolve({ nif: NIF_B, nifCandidatos: [NIF_B], nifOrigem: 'etiqueta' }); },
    gravarNif: function () { return Promise.resolve(); },
    aprender: function (sid) { store2.suppliers[sid].nif = NIF_B; return Promise.resolve(); },
    onProgresso: function (p) { if (p.nome === 'Beta') store2.suppliers.sE.nif = '505050505'; } // alguém preencheu o sE a meio
  });
  return NB.executar(plano2, deps2).then(function (rel2) {
    assert.ok(rel2.saltados.some(function (s) { return s.supplierId === 'sE'; }), 'sE saltado (reavaliado a cada iteração)');
    assert.strictEqual(azure2, 4, 'sB, sF, sH, sJ — sem sE');

    // Botão "Parar": fica o já feito.
    var store3 = cenario();
    var plano3 = NB.planear(store3.suppliers, store3.faturasProcessadas, function (id) { return !!store3.faturasArquivo[id]; });
    var n = 0;
    var deps3 = Object.assign({}, deps2, {
      getSuppliers: function () { return store3.suppliers; },
      lerArquivo: function (id) { return Promise.resolve(store3.faturasArquivo[id] || null); },
      aprender: function (sid) { store3.suppliers[sid].nif = NIF_B; return Promise.resolve(); },
      onProgresso: function () { n++; },
      deveParar: function () { return n >= 2; }
    });
    return NB.executar(plano3, deps3);
  }).then(function (rel3) {
    assert.strictEqual(rel3.parado, true);
    assert.strictEqual(rel3.gravados.length, 2, 'os 2 primeiros ficaram gravados');
    console.log('testa-nif-backfill: OK');
  });
}).catch(function (e) { console.error(e); process.exit(1); });
