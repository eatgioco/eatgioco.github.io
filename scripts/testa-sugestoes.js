// Testes do módulo de sugestão de passos (gioco-sugestoes.js). Correr: node scripts/testa-sugestoes.js
// Sem rede: o fetch é simulado. A normalização é pura.
var assert = require('assert');
var S = require('../gioco-sugestoes.js');

// normalizarPassos: JSON limpo
var p = S.normalizarPassos('[{"titulo":"Definir orçamento","duracaoPrevista":60,"dependeDePasso":null},{"titulo":"Visitar espaços","duracaoPrevista":120,"dependeDePasso":0}]');
assert.strictEqual(p.length, 2);
assert.deepStrictEqual(p[1], { titulo: 'Visitar espaços', duracaoPrevista: 120, local: null, dependeDePasso: 0 });

// backticks à volta, duração inválida, dependência a si próprio e fora do intervalo
p = S.normalizarPassos('```json\n[{"titulo":" A ","duracaoPrevista":"x","dependeDePasso":0},{"titulo":"B","duracaoPrevista":-5,"dependeDePasso":9},{"titulo":"C","duracaoPrevista":"45","dependeDePasso":"1"}]\n```');
assert.deepStrictEqual(p, [
  { titulo: 'A', duracaoPrevista: 30, local: null, dependeDePasso: null },
  { titulo: 'B', duracaoPrevista: 30, local: null, dependeDePasso: null },
  { titulo: 'C', duracaoPrevista: 45, local: null, dependeDePasso: 1 }
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

// ---- Contexto de negócio (fonte única gioco-contexto.js) e regras de passo ----
var C = require('../gioco-contexto.js');
var bloco = C.texto();
assert.ok(bloco.indexOf('CONTEXTO DO NEGÓCIO') === 0 && bloco.indexOf('Rua de São Bento 154') > 0 && bloco.indexOf('518717186') > 0);
C.DADOS.equipa.forEach(function (p) { assert.ok(bloco.indexOf(p.nome) > 0, 'equipa no bloco: ' + p.nome); });
assert.ok(bloco.indexOf('ÚNICO decisor') > 0);
// os TRÊS prompts começam pelo bloco de negócio — sem duplicar nomes no gioco-sugestoes.js
[S.promptPassos('x'), S.promptPassos('x', 'ctx'), S.promptAtualizacao('x', 'ctx', { abertos: [] }), S.promptClassificarLocal(['a'])].forEach(function (pr) {
  assert.strictEqual(pr.indexOf(bloco), 0, 'prompt começa pelo bloco de negócio');
  assert.ok(pr.indexOf('Alfredo Giangaspero') > 0 && pr.indexOf('Leonor Borges') > 0);
});
assert.strictEqual(require('fs').readFileSync(__dirname + '/../gioco-sugestoes.js', 'utf8').indexOf('Giangaspero'), -1, 'nomes da equipa só no gioco-contexto.js');
// regras do bom passo nos dois prompts de passos, não no de local
assert.strictEqual(S.MAX_PASSOS, 8);
['VERIFICÁVEL', 'antes de decidir', 'passo PRÓPRIO', 'PRIMEIRO passo', 'nome real', 'complexidade REAL'].forEach(function (r) {
  assert.ok(S.promptPassos('x').indexOf(r) > 0, 'regra na sugestão: ' + r);
  assert.ok(S.promptAtualizacao('x', '', { abertos: [] }).indexOf(r) > 0, 'regra na atualização: ' + r);
});
assert.strictEqual(S.promptClassificarLocal(['a']).indexOf('REGRAS DE UM BOM PASSO'), -1);
assert.ok(S.promptPassos('x').indexOf('"pressupostos":["..."]') > 0 && S.promptPassos('x').indexOf('"passos":[') > 0);
// ---- Pressupostos: formato novo, retrocompatível com a lista nua ----
var r1 = S.normalizarResposta('{"passos":[{"titulo":"A","duracaoPrevista":10}],"pressupostos":["  Assumi que a loja está aberta ","",5,null,"b","c","d","e"]}');
assert.deepStrictEqual(r1.pressupostos, ['Assumi que a loja está aberta', 'b', 'c', 'd'], 'strings limpas, não-strings caem, tecto 4');
assert.strictEqual(r1.passos[0].titulo, 'A');
assert.deepStrictEqual(S.normalizarResposta('{"passos":[{"titulo":"A"}]}').pressupostos, []);
assert.deepStrictEqual(S.normalizarResposta('{"passos":[{"titulo":"A"}],"pressupostos":"não é lista"}').pressupostos, []);
assert.deepStrictEqual(S.normalizarResposta('[{"titulo":"A"}]').pressupostos, [], 'lista nua (formato antigo) → sem pressupostos');
assert.strictEqual(S.normalizarResposta('```json\n{"passos":[{"titulo":"A"}],"pressupostos":["p"]}\n```').pressupostos[0], 'p');
assert.strictEqual(S.normalizarResposta('Aqui: {"passos":[{"titulo":"A [x]"}],"pressupostos":[]} fim').passos[0].titulo, 'A [x]');
assert.strictEqual(S.normalizarResposta(JSON.stringify({ passos: [{ titulo: 'A' }], pressupostos: [new Array(300).join('z')] })).pressupostos[0].length, 200);
assert.throws(function () { S.normalizarResposta('{"pressupostos":["p"]}'); }, function (e) { return e.codigo === 'resposta'; });
assert.throws(function () { S.normalizarResposta('{"passos":[]}'); }, function (e) { return e.codigo === 'vazio'; });

// ---- Local ----
assert.strictEqual(S.normalizarLocal(' Loja '), 'loja');
assert.strictEqual(S.normalizarLocal('escritório'), null);
assert.strictEqual(S.normalizarLocal(null), null);
assert.ok(S.promptPassos('x').indexOf('"local":"loja"') > 0);
p = S.normalizarPassos('[{"titulo":"A","duracaoPrevista":10,"local":"rua"},{"titulo":"B","duracaoPrevista":10,"local":"casa"},{"titulo":"C","duracaoPrevista":10}]');
assert.deepStrictEqual(p.map(function (x) { return x.local; }), ['rua', null, null]);
var pl = S.promptClassificarLocal(['Ligar ao senhorio', 'Limpar o forno']);
assert.ok(pl.indexOf('1. Ligar ao senhorio') > 0 && pl.indexOf('2. Limpar o forno') > 0 && pl.indexOf('nunca adivinhes') > 0);
// casa por título (ordem trocada), por posição quando o título não bate, null quando falta
assert.deepStrictEqual(S.normalizarLocais('[{"titulo":"Limpar o forno","local":"loja"},{"titulo":"Ligar ao senhorio","local":"telefone"}]', ['Ligar ao senhorio', 'Limpar o forno']), ['telefone', 'loja']);
assert.deepStrictEqual(S.normalizarLocais('[{"titulo":"?","local":"computador"},{"titulo":"?","local":"marte"}]', ['A', 'B', 'C']), ['computador', null, null]);
assert.deepStrictEqual(S.normalizarLocais('```json\n[{"titulo":"A","local":null}]\n```', ['A']), [null]);
assert.throws(function () { S.normalizarLocais('{}', ['A']); }, function (e) { return e.codigo === 'resposta'; });

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
assert.deepStrictEqual(alt.acrescentar[0], { titulo: 'Verificar extração de fumos', duracaoPrevista: 45, depoisDe: 'a1', local: null, porque: 'contexto refere fumos' });
assert.strictEqual(S.normalizarAlteracoes('{"acrescentar":[{"titulo":"Ir à CML","local":"rua"}]}', ABERTOS).acrescentar[0].local, 'rua');
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
    // o contexto vai no corpo do pedido, a seguir ao bloco de negócio; lista nua → pressupostos []
    var visto = null;
    var fc = function (url, init) { visto = JSON.parse(init.body).contents[0].parts[0].text; return Promise.resolve({ status: 200, text: function () { return Promise.resolve(ok); } }); };
    return S.sugerirPassos('Teste', { fetch: fc, modelos: ['a'], chave: 'k', contexto: 'senhorio já contactado' }).then(function (r) {
      assert.ok(visto.indexOf('senhorio já contactado') > 0 && visto.indexOf(bloco) === 0);
      assert.deepStrictEqual(r.pressupostos, []);
    });
  })
  .then(function () {
    // formato novo com pressupostos
    var okP = JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"passos":[{"titulo":"Pedir orçamento à Leonor Borges","duracaoPrevista":20}],"pressupostos":["Assumi que a sinalética é interior"]}' }] } }] });
    var fp = fetchFalso({ a: { status: 200, texto: okP } });
    return S.sugerirPassos('Teste', { fetch: fp, modelos: ['a'], chave: 'k' }).then(function (r) {
      assert.deepStrictEqual(r.pressupostos, ['Assumi que a sinalética é interior']);
      assert.strictEqual(r.passos[0].titulo, 'Pedir orçamento à Leonor Borges');
    });
  })
  .then(function () {
    // a atualização incremental e a classificação de local também levam o bloco de negócio
    var vistos = [];
    var fv = function (url, init) { vistos.push(JSON.parse(init.body).contents[0].parts[0].text); return Promise.resolve({ status: 200, text: function () { return Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: vistos.length === 1 ? '{}' : '[{"titulo":"x","local":null}]' }] } }] })); } }); };
    return S.sugerirAlteracoes('Teste', { fetch: fv, modelos: ['a'], chave: 'k', abertos: ABERTOS }).then(function () {
      return S.classificarLocal(['x'], { fetch: fv, modelos: ['a'], chave: 'k' });
    }).then(function () {
      assert.strictEqual(vistos.length, 2);
      vistos.forEach(function (v) { assert.strictEqual(v.indexOf(bloco), 0); });
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
  .then(function () {
    // classificarLocal: um pedido para N títulos, lista do mesmo tamanho; sem chave rejeita; lista vazia resolve sem rede
    var okLoc = JSON.stringify({ candidates: [{ content: { parts: [{ text: '[{"titulo":"Ligar ao senhorio","local":"telefone"},{"titulo":"Limpar o forno","local":"loja"}]' }] } }] });
    var fl = fetchFalso({ a: { status: 503, texto: '{}' }, b: { status: 200, texto: okLoc } });
    return S.classificarLocal(['Ligar ao senhorio', 'Limpar o forno'], { fetch: fl, modelos: ['a', 'b'], chave: 'k' }).then(function (r) {
      assert.deepStrictEqual(r.locais, ['telefone', 'loja']); assert.strictEqual(r.modelo, 'b'); assert.strictEqual(fl.chamadas.length, 2);
      return S.classificarLocal(['x'], { fetch: fl, modelos: ['a'] }).then(function () { throw new Error('devia falhar'); }, function (e) { assert.strictEqual(e.codigo, 'semChave'); });
    }).then(function () {
      return S.classificarLocal([], { fetch: fl, chave: 'k' }).then(function (r) { assert.deepStrictEqual(r.locais, []); });
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
