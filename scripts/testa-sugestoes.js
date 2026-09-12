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

// ---- Atualização incremental ----
var ABERTOS = [
  { id: 'a1', titulo: 'Visitar espaços', ordem: 2, duracaoPrevista: 120, dependeDe: null },
  { id: 'a2', titulo: 'Assinar contrato', ordem: 3, duracaoPrevista: 60, dependeDe: ['a1'] }
];
var pa = S.promptAtualizacao('Loja', 'Já visitei três espaços e escolhi o da Rua Garrett.', { abertos: ABERTOS, concluidos: [{ titulo: 'Definir orçamento' }], anulados: ['Contratar arquiteto'] });
assert.ok(pa.indexOf('"id":"a1"') > 0 && pa.indexOf('- Definir orçamento') > 0 && pa.indexOf('- Contratar arquiteto') > 0 && pa.indexOf('Rua Garrett') > 0);
assert.ok(S.promptAtualizacao('Loja', '', { abertos: [] }).indexOf('(nenhum)') > 0);
// normalizarAlteracoes: ids fora dos abertos caem (concluído c1, inventado zz), alterar sem mudança real cai,
// remover e alterar do mesmo id → fica o remover; depoisDe inválido → null; depoisDe a um removido → null
var alt = S.normalizarAlteracoes(JSON.stringify({
  acrescentar: [
    { titulo: 'Verificar extração de fumos', duracaoPrevista: 45, depoisDe: 'a1', porque: 'contexto refere fumos' },
    { titulo: 'Depois do removido', duracaoPrevista: 'x', depoisDe: 'a2', porque: '' },
    { titulo: 'Fim', depoisDe: 'c1', porque: 'x' },
    { titulo: '', porque: 'sem título' }
  ],
  remover: [{ id: 'a2', porque: 'contrato já assinado' }, { id: 'c1', porque: 'concluído!' }, { id: 'zz', porque: 'inventado' }, { id: 'a2', porque: 'dup' }],
  alterar: [{ id: 'a1', titulo: 'Visitar espaços', duracaoPrevista: 120, porque: 'igual' }, { id: 'a2', titulo: 'x', porque: 'já removido' }, { id: 'a1', duracaoPrevista: '90', porque: 'menos espaços' }, { id: 'c1', titulo: 'y', porque: 'concluído' }]
}), ABERTOS);
assert.deepStrictEqual(alt.remover, [{ id: 'a2', porque: 'contrato já assinado' }]);
assert.deepStrictEqual(alt.alterar, [{ id: 'a1', porque: 'menos espaços', duracaoPrevista: 90 }]);
assert.strictEqual(alt.acrescentar.length, 3);
assert.deepStrictEqual(alt.acrescentar[0], { titulo: 'Verificar extração de fumos', duracaoPrevista: 45, depoisDe: 'a1', porque: 'contexto refere fumos' });
assert.strictEqual(alt.acrescentar[1].depoisDe, null, 'depoisDe a um passo removido cai');
assert.strictEqual(alt.acrescentar[1].duracaoPrevista, 30);
assert.strictEqual(alt.acrescentar[2].depoisDe, null, 'depoisDe a um concluído cai');
// três listas vazias é válido; backticks; JSON inválido/array → resposta
assert.deepStrictEqual(S.normalizarAlteracoes('```json\n{"acrescentar":[],"remover":[],"alterar":[]}\n```', ABERTOS), { acrescentar: [], remover: [], alterar: [] });
assert.deepStrictEqual(S.normalizarAlteracoes('{}', ABERTOS), { acrescentar: [], remover: [], alterar: [] });
assert.throws(function () { S.normalizarAlteracoes('[]', ABERTOS); }, function (e) { return e.codigo === 'resposta'; });
assert.throws(function () { S.normalizarAlteracoes('nada', ABERTOS); }, function (e) { return e.codigo === 'resposta'; });

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
  .then(function () {
    // sugerirAlteracoes: mesma cadeia (503 → modelo seguinte), resposta normalizada contra os abertos
    var okAlt = JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"acrescentar":[],"remover":[{"id":"a1","porque":"p"},{"id":"c1","porque":"q"}],"alterar":[]}' }] } }] });
    var fa = fetchFalso({ a: { status: 503, texto: '{}' }, b: { status: 200, texto: okAlt } });
    return S.sugerirAlteracoes('Teste', { fetch: fa, modelos: ['a', 'b'], chave: 'k', abertos: ABERTOS, concluidos: [], anulados: [] }).then(function (r) {
      assert.strictEqual(r.modelo, 'b');
      assert.deepStrictEqual(r.alteracoes, { acrescentar: [], remover: [{ id: 'a1', porque: 'p' }], alterar: [] });
      return S.sugerirAlteracoes('Teste', { fetch: fa, modelos: ['a'] }).then(function () { throw new Error('devia falhar'); }, function (e) { assert.strictEqual(e.codigo, 'semChave'); });
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
