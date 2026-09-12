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
assert.strictEqual(r.nif, '500697256', '2 etiquetas → ganha a que aparece primeiro (regra Set/2026)');
assert.strictEqual(r.origem, 'etiqueta');
assert.deepStrictEqual(r.candidatos, ['500697256', '501442600']);

// ===== Fixtures de faturas reais (Set/2026) =====
['518252000', '502030712', '516179934', '514430869', '517034573'].forEach(function (n) {
  assert.strictEqual(G.nifValido(n), true, n + ' válido');
});
assert.strictEqual(G.nifValido('518717186'), true, 'o próprio é válido (excluído noutro sítio)');
assert.deepStrictEqual(G.extrairNifs({ content: 'NIF 518717186' }, {}).candidatos, [], 'o próprio nunca é candidato');
['938916861', '214609400', '210515578'].forEach(function (n) {
  assert.strictEqual(G.nifValido(n), false, 'telefone ' + n + ' inválido');
});
assert.strictEqual(G.nifValido('123456789'), true, '123456789 passa no dígito de controlo');

// O TESTE CENTRAL: o IBAN nunca dá NIF.
var bocconcino = 'IL BOCCONCINO LDA\nNIF 516179934\nRua X\nIBAN CGD - PT50 0035 0325 0001 3261 130 97\nTotal 206,10';
assert.strictEqual(G.nifValido('500035032'), true, 'o falso positivo passa no check digit — daí a limpeza');
assert.ok(G.limparContentParaNifs(bocconcino).indexOf('0035 0325') === -1, 'IBAN removido');
r = G.extrairNifs({ content: bocconcino }, {});
assert.strictEqual(r.nif, '516179934');
assert.strictEqual(r.candidatos.indexOf('500035032'), -1, 'NUNCA 500035032');
assert.strictEqual(r.origem, 'etiqueta');

// IBAN genérico, ATCUD, EAN
var lixo = 'ES91 2100 0418 4502 0005 1332\nATCUD: JFZ7T4NP-500697256\nEAN 5603722502361\nNIPC 502030712';
r = G.extrairNifs({ content: lixo }, {});
assert.deepStrictEqual(r.candidatos, ['502030712'], 'ATCUD e IBAN estrangeiro e EAN fora');

// N/ vs V/
r = G.extrairNifs({ content: 'N/Contribuinte 518252000\nV/Contribuinte 518717186' }, {});
assert.strictEqual(r.nif, '518252000'); assert.strictEqual(r.origem, 'etiqueta');
r = G.extrairNifs({ content: 'V/Contribuinte 502030712\nN/Contribuinte 518252000' }, {});
assert.strictEqual(r.nif, '518252000', 'V/ nunca é principal mesmo aparecendo antes');
assert.deepStrictEqual(r.candidatos, ['502030712', '518252000']);

// "do Cliente" com PT colado
r = G.extrairNifs({ content: 'N.I.F. do Cliente : PT518717186\nNº Contribuinte: 502030712' }, {});
assert.strictEqual(r.nif, '502030712'); assert.strictEqual(r.origem, 'etiqueta');

// Dois NIFs válidos: topo (emissor) vs rodapé (licenciado do software)
r = G.extrairNifs({ content: 'Contribuinte 516179934\n...\nLicenciado a Sage - NIF 514430869' }, {});
assert.strictEqual(r.nif, '516179934'); assert.strictEqual(r.origem, 'etiqueta');
assert.deepStrictEqual(r.candidatos, ['516179934', '514430869']);

// PT colado vs "PT " com espaço
r = G.extrairNifs({ content: 'Emitente PT517034573' }, {});
assert.strictEqual(r.nif, '517034573'); assert.strictEqual(r.origem, 'pt');
r = G.extrairNifs({ content: 'Emitente PT 517034573' }, {});
assert.strictEqual(r.origem, 'generico', 'PT com espaço já não é etiqueta: cai na genérica (1 candidato)');
r = G.extrairNifs({ content: 'Emitente 517034573 e outro 502030712' }, {});
assert.strictEqual(r.nif, null, '2 genéricos → null'); assert.strictEqual(r.origem, null);
assert.deepStrictEqual(r.candidatos, ['517034573', '502030712']);
r = G.extrairNifs({ content: 'Contribuinte 516179934' }, { VendorTaxId: { valueString: 'PT502030712' } });
assert.strictEqual(r.nif, '502030712'); assert.strictEqual(r.origem, 'vendorTaxId');
assert.strictEqual(G.nifOrigemConfiavel('pt'), true); assert.strictEqual(G.nifOrigemConfiavel('generico'), false); assert.strictEqual(G.nifOrigemConfiavel(null), false);

// ===== Unidades =====
[['Uni','un'],['UNI','un'],['KG','kg'],['BX','cx'],['PC','un'],['MO','mo'],['EM','emb'],['UN','un'],['Cx.','cx']].forEach(function (par) {
  assert.strictEqual(G.normalizarUnidade(par[0]).unidade, par[1], par[0] + ' → ' + par[1]);
});
assert.deepStrictEqual(G.normalizarUnidade('ZZ'), { unidade: null, unidadeBruta: 'zz' }, 'desconhecida guarda a bruta');
assert.deepStrictEqual(G.normalizarUnidade(null), { unidade: null, unidadeBruta: null });

assert.deepStrictEqual(G.inferirUnidadeDaDescricao('FARINHA 0 NUVOLA 5KG CAPUTO'), { unidade: 'kg', tamanhoEmbalagem: 5, unidadesPorCaixa: null });
assert.deepStrictEqual(G.inferirUnidadeDaDescricao('AGUA CALDAS PENACOVA 24X50CL'), { unidade: 'cl', tamanhoEmbalagem: 50, unidadesPorCaixa: 24 });
assert.deepStrictEqual(G.inferirUnidadeDaDescricao('LT UHT MG 1LT*6 ESTR ATLANTICO'), { unidade: 'l', tamanhoEmbalagem: 1, unidadesPorCaixa: 6 });
assert.deepStrictEqual(G.inferirUnidadeDaDescricao('Stracciatella by Artigiana 500g *10'), { unidade: 'g', tamanhoEmbalagem: 500, unidadesPorCaixa: 10 });
assert.deepStrictEqual(G.inferirUnidadeDaDescricao('MOZZARELLA FIOR DI LATTE 125GR*8'), { unidade: 'g', tamanhoEmbalagem: 125, unidadesPorCaixa: 8 });
assert.strictEqual(G.inferirUnidadeDaDescricao('PORCHETTA 1/2'), null, 'sem unidade → null');

// Multi-página
assert.strictEqual(G.detetarMultiPagina(2, ''), true);
assert.strictEqual(G.detetarMultiPagina(1, 'Folha Nº 1 de 2\nA transportar 206,10'), true);
assert.strictEqual(G.detetarMultiPagina(1, 'Total 10,00'), false);

r = G.extrairNifs(null, null);
assert.deepStrictEqual(r, { nif: null, candidatos: [], origem: null }, 'sem nada não rebenta');

r = G.extrairNifs({ content: 'NIF 518717186' }, { VendorTaxId: { valueString: '518717186' } });
assert.deepStrictEqual(r, { nif: null, candidatos: [], origem: null }, 'só o próprio → nada');

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
