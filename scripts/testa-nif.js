// Testes do NIF e do match de fornecedor (gioco-faturas.js). Correr: node scripts/testa-nif.js
var assert = require('assert');
// O módulo corre noutro realm do vm: comparar estruturas por JSON, não por protótipo.
var _deep = assert.deepStrictEqual; assert.deepStrictEqual = function(a, b, m){ return assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m); };
var fs = require('fs');
var vm = require('vm');
var ctx = { window: {}, document: {}, fetch: function(){}, Image: function(){}, FileReader: function(){} };
ctx.window = ctx;
vm.runInNewContext(fs.readFileSync(__dirname + '/../gioco-faturas.js', 'utf8'), ctx);
var G = ctx.GiocoFaturas;

// nifValido
assert.strictEqual(G.nifValido('518717186'), true, 'NIF próprio é válido');
assert.strictEqual(G.nifValido('500697256'), true, 'NIF real (CGD) válido');
assert.strictEqual(G.nifValido('123456789'), true, '123456789 tem check digit correcto (9) — é válido pela regra');
assert.strictEqual(G.nifValido('123456780'), false, 'check digit inválido');
assert.strictEqual(G.nifValido('418717186'), false, '1.º dígito 4 rejeitado');
assert.strictEqual(G.nifValido('51871718'), false, '8 dígitos');
assert.strictEqual(G.nifValido('PT 518 717 186'), true, 'aceita separadores via soDigitos');
assert.strictEqual(G.soDigitos('PT 518.717-186'), '518717186');

// extrairNifs
var r = G.extrairNifs({ content: 'Cliente NIF: 518717186\nFornecedor NIPC 500697256 Tel 213456780' }, {});
assert.strictEqual(r.nif, '500697256', 'único candidato passa a principal (próprio excluído, telefone inválido)');
assert.deepStrictEqual(r.candidatos, ['500697256']);

r = G.extrairNifs({ content: 'NIF 518717186' }, { VendorTaxId: { valueString: 'PT500697256' } });
assert.strictEqual(r.nif, '500697256', 'VendorTaxId é o principal');

r = G.extrairNifs({ content: 'NIF 500 697 256 e VAT PT501442600' }, {});
assert.strictEqual(r.nif, null, '2 candidatos → sem principal');
assert.deepStrictEqual(r.candidatos, ['500697256', '501442600']);

r = G.extrairNifs(null, null);
assert.deepStrictEqual(r, { nif: null, candidatos: [] }, 'sem nada não rebenta');

r = G.extrairNifs({ content: 'NIF 518717186' }, { VendorTaxId: { valueString: '518717186' } });
assert.deepStrictEqual(r, { nif: null, candidatos: [] }, 'só o próprio → nada');

// findMatchingSupplierDetalhe
var sup = {
  a: { nome: 'Makro Cash & Carry', nif: '500 697 256' },
  b: { nome: 'Padaria', aliases: ['PANIFICADORA XPTO LDA'] },
  c: { nome: 'Outro' }
};
assert.deepStrictEqual(G.findMatchingSupplierDetalhe('Lixo OCR', sup, { nif: '500697256' }), { id: 'a', via: 'nif' });
assert.deepStrictEqual(G.findMatchingSupplierDetalhe('Lixo OCR', sup, { nif: null, nifCandidatos: ['501442600', '500697256'] }), { id: 'a', via: 'nif' });
assert.deepStrictEqual(G.findMatchingSupplierDetalhe('Panificadora Xpto Lda', sup), { id: 'b', via: 'nome' }, 'alias');
assert.deepStrictEqual(G.findMatchingSupplierDetalhe('MAKRO CASH', sup, { nif: '518717186' }), { id: 'a', via: 'nome' }, 'próprio ignorado, cai para nome');
assert.deepStrictEqual(G.findMatchingSupplierDetalhe('Nada', sup), { id: null, via: null });
assert.deepStrictEqual(G.findMatchingSupplierDetalhe('', sup), { id: null, via: null });
assert.strictEqual(G.findMatchingSupplier('Padaria', sup), 'b', 'wrapper retrocompatível');
assert.strictEqual(G.findMatchingSupplier('x', null), null);

console.log('testa-nif: OK');
