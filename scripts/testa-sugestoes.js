// Testes do módulo de sugestão de passos (gioco-sugestoes.js). Correr: node scripts/testa-sugestoes.js
// Sem rede: o fetch é simulado. A normalização é pura.
var assert = require('assert');
var S = require('../gioco-sugestoes.js');

// normalizarPassos: JSON limpo
var p = S.normalizarPassos('[{"titulo":"Definir orçamento","duracaoPrevista":60,"dependeDePasso":null},{"titulo":"Visitar espaços","duracaoPrevista":120,"dependeDePasso":0}]');
assert.strictEqual(p.length, 2);
assert.deepStrictEqual(p[1], { titulo: 'Visitar espaços', duracaoPrevista: 120, dependeDePasso: 0 });

// backticks à volta, duração inválida, dependência a si próprio e fora do intervalo
p = S.normalizarPassos('```json\n[{"titulo":" A ","duracaoPrevista":"x","dependeDePasso":0},{"titulo":"B","duracaoPrevista":-5,"dependeDePasso":9},{"titulo":"C","duracaoPrevista":"45","dependeDePasso":"1"}]\n```');
assert.deepStrictEqual(p, [
  { titulo: 'A', duracaoPrevista: 30, dependeDePasso: null },
  { titulo: 'B', duracaoPrevista: 30, dependeDePasso: null },
  { titulo: 'C', duracaoPrevista: 45, dependeDePasso: 1 }
]);

// passo sem título cai e as dependências são remapeadas para os índices finais
p = S.normalizarPassos('[{"titulo":"","duracaoPrevista":10},{"titulo":"X","duracaoPrevista":10},{"titulo":"Y","duracaoPrevista":10,"dependeDePasso":1}]');
assert.strictEqual(p.length, 2);
assert.strictEqual(p[1].dependeDePasso, 0, 'índice bruto 1 → índice final 0');

// texto com preâmbulo apesar do pedido
p = S.normalizarPassos('Aqui tens: [{"titulo":"Z","duracaoPrevista":15}] fim');
assert.strictEqual(p[0].titulo, 'Z');

// tecto de passos e título cortado a 200
var muitos = []; for (var i = 0; i < 20; i++) muitos.push({ titulo: 'p' + i, duracaoPrevista: 5 });
assert.strictEqual(S.normalizarPassos(JSON.stringify(muitos)).length, S.MAX_PASSOS);
assert.strictEqual(S.normalizarPassos(JSON.stringify([{ titulo: new Array(300).join('a'), duracaoPrevista: 5 }]))[0].titulo.length, 200);

// erros
assert.throws(function () { S.normalizarPassos('não é json'); }, function (e) { return e.codigo === 'resposta'; });
assert.throws(function () { S.normalizarPassos('{"titulo":"x"}'); }, function (e) { return e.codigo === 'resposta'; });
assert.throws(function () { S.normalizarPassos('[]'); }, function (e) { return e.codigo === 'vazio'; });
assert.throws(function () { S.normalizarPassos('[{"titulo":""}]'); }, function (e) { return e.codigo === 'vazio'; });

// prompt
assert.ok(S.promptPassos('Loja Chiado').indexOf('«Loja Chiado»') > 0);
assert.ok(S.promptPassos('x').indexOf('dependeDePasso') > 0);
// contexto: vazio/espaços = prompt só com o nome; com texto entra como fonte principal, cortado a MAX_CONTEXTO
assert.strictEqual(S.promptPassos('x', '   '), S.promptPassos('x'));
assert.strictEqual(S.promptPassos('x', null), S.promptPassos('x'));
var pc = S.promptPassos('x', 'Já falei com o senhorio. Não sei se contrato mais uma pessoa.');
assert.ok(pc.indexOf('FONTE PRINCIPAL') > 0 && pc.indexOf('Já falei com o senhorio') > 0 && pc.indexOf('Decidir') > 0);
assert.ok(S.promptPassos('x', new Array(6000).join('a')).length < S.promptPassos('x').length + S.MAX_CONTEXTO + 800);

// sugerirPassos com fetch simulado: 503 no 1.º modelo passa ao 2.º; 400 de chave pára logo
function fetchFalso(respostas) {
  var chamadas = [];
  var f = function (url) {
    var modelo = /models\/([^:]+):/.exec(url)[1];
    chamadas.push(modelo);
    var r = respostas[modelo];
    return Promise.resolve({ status: r.status, text: function () { return Promise.resolve(r.texto); } });
  };
  f.chamadas = chamadas;
  return f;
}
var ok = JSON.stringify({ candidates: [{ content: { parts: [{ text: '[{"titulo":"Passo","duracaoPrevista":20}]' }] } }] });
var f1 = fetchFalso({ a: { status: 503, texto: '{"error":{"message":"high demand"}}' }, b: { status: 200, texto: ok } });
var f2 = fetchFalso({ a: { status: 400, texto: '{"error":{"message":"API key not valid."}}' }, b: { status: 200, texto: ok } });
var f3 = fetchFalso({ a: { status: 429, texto: '{"error":{"message":"quota"}}' }, b: { status: 200, texto: ok } });
var f4 = fetchFalso({ a: { status: 503, texto: '{}' }, b: { status: 404, texto: '{}' } });

// sem chave (Node não tem localStorage) → semChave sem tocar no fetch
var f0 = fetchFalso({ a: { status: 200, texto: ok } });
assert.strictEqual(S.temChave(), false);
Promise.resolve()
  .then(function () {
    return S.sugerirPassos('Teste', { fetch: f0, modelos: ['a'] }).then(function () { throw new Error('devia falhar'); }, function (e) {
      assert.strictEqual(e.codigo, 'semChave'); assert.deepStrictEqual(f0.chamadas, []);
    });
  })
  .then(function () {
    // o contexto vai no corpo do pedido
    var visto = null;
    var fc = function (url, init) { visto = JSON.parse(init.body).contents[0].parts[0].text; return Promise.resolve({ status: 200, text: function () { return Promise.resolve(ok); } }); };
    return S.sugerirPassos('Teste', { fetch: fc, modelos: ['a'], chave: 'k', contexto: 'senhorio já contactado' }).then(function () {
      assert.ok(visto.indexOf('senhorio já contactado') > 0);
    });
  })
  .then(function () { return S.sugerirPassos('Teste', { fetch: f1, modelos: ['a', 'b'], chave: 'k' }); })
  .then(function (r) {
    assert.strictEqual(r.modelo, 'b');
    assert.deepStrictEqual(f1.chamadas, ['a', 'b']);
    assert.strictEqual(r.passos[0].titulo, 'Passo');
    return S.sugerirPassos('Teste', { fetch: f2, modelos: ['a', 'b'], chave: 'k' }).then(function () { throw new Error('devia falhar'); }, function (e) {
      assert.strictEqual(e.codigo, 'chave');
      assert.deepStrictEqual(f2.chamadas, ['a'], 'chave inválida não tenta o modelo seguinte');
    });
  })
  .then(function () {
    return S.sugerirPassos('Teste', { fetch: f3, modelos: ['a', 'b'], chave: 'k' }).then(function () { throw new Error('devia falhar'); }, function (e) {
      assert.strictEqual(e.codigo, 'quota');
      assert.deepStrictEqual(f3.chamadas, ['a']);
    });
  })
  .then(function () {
    return S.sugerirPassos('Teste', { fetch: f4, modelos: ['a', 'b'], chave: 'k' }).then(function () { throw new Error('devia falhar'); }, function (e) {
      assert.strictEqual(e.codigo, 'indisponivel');
      assert.deepStrictEqual(f4.chamadas, ['a', 'b']);
    });
  })
  .then(function () {
    return S.sugerirPassos('   ', { fetch: f1, chave: 'k' }).then(function () { throw new Error('devia falhar'); }, function (e) { assert.strictEqual(e.codigo, 'vazio'); });
  })
  .then(function () { console.log('testa-sugestoes: OK'); })
  .catch(function (e) { console.error(e); process.exit(1); });
