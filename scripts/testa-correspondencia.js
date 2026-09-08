// Testes do motor puro gioco-correspondencia.js — correr com:
//   node scripts/testa-correspondencia.js
// Sem Firebase, sem browser. Falha com exit 1 no primeiro caso errado.
var C = require('../gioco-correspondencia.js');
var assert = require('assert');

function mov(id, dia, cents, desc, conta){
  return { id: id, dia: dia, cents: cents, desc: desc || '', conta: conta || 'abanca' };
}
var J = { antes: 3, depois: 5 };
var falhas = 0;
function caso(nome, fn){
  try { fn(); console.log('ok  ' + nome); }
  catch (e){ falhas++; console.log('ERR ' + nome + '\n    ' + (e && e.message)); }
}

caso('exacto: 1 candidato → confirmado/alta', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, movimentos: [mov('a', '2026-09-06', 1040), mov('b', '2026-09-06', 500)] });
  assert.strictEqual(r.estado, 'confirmado');
  assert.strictEqual(r.estrategia, 'exacto');
  assert.strictEqual(r.confianca, 'alta');
  assert.deepStrictEqual(r.movimentos.map(function(m){ return m.id; }), ['a']);
});

caso('exacto: 2 iguais → ambiguo, candidatos ordenados por data', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, movimentos: [mov('x', '2026-09-08', 1040), mov('y', '2026-09-06', 1040)] });
  assert.strictEqual(r.estado, 'ambiguo');
  assert.deepStrictEqual(r.candidatos.map(function(g){ return g[0].id; }), ['y', 'x']);
  assert.deepStrictEqual(r.movimentos, []);
});

caso('exacto: fora da janela não conta', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, movimentos: [mov('a', '2026-09-11', 1040)] });
  assert.strictEqual(r.estado, 'semCandidato');
});

caso('exacto com tolerância', function(){
  var r = C({ cents: 1000, dia: '2026-09-05', janela: J, toleranciaCents: 10, movimentos: [mov('a', '2026-09-05', 1007)] });
  assert.strictEqual(r.estado, 'confirmado');
});

caso('soma2: Mensalidade Abanca 10,00 + 0,40 no mesmo dia → confirmado', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, estrategias: ['exacto', 'soma2'],
              movimentos: [mov('a', '2026-09-06', 1000), mov('b', '2026-09-06', 40), mov('c', '2026-09-06', 2000)] });
  assert.strictEqual(r.estado, 'confirmado');
  assert.strictEqual(r.estrategia, 'soma2');
  assert.deepStrictEqual(r.movimentos.map(function(m){ return m.id; }), ['a', 'b']);
});

caso('soma2: dias diferentes não formam par', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, estrategias: ['exacto', 'soma2'],
              movimentos: [mov('a', '2026-09-06', 1000), mov('b', '2026-09-07', 40)] });
  assert.strictEqual(r.estado, 'semCandidato');
});

caso('soma2: contas diferentes não formam par', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, estrategias: ['exacto', 'soma2'],
              movimentos: [mov('a', '2026-09-06', 1000, '', 'abanca'), mov('b', '2026-09-06', 40, '', 'revolut')] });
  assert.strictEqual(r.estado, 'semCandidato');
});

caso('soma2: nunca 3+', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, estrategias: ['exacto', 'soma2'],
              movimentos: [mov('a', '2026-09-06', 500), mov('b', '2026-09-06', 500), mov('c', '2026-09-06', 40)] });
  assert.strictEqual(r.estado, 'semCandidato');
});

caso('soma2: 2 pares → ambiguo', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, estrategias: ['exacto', 'soma2'],
              movimentos: [mov('a', '2026-09-06', 1000), mov('b', '2026-09-06', 40), mov('c', '2026-09-07', 540), mov('d', '2026-09-07', 500)] });
  assert.strictEqual(r.estado, 'ambiguo');
  assert.strictEqual(r.candidatos.length, 2);
});

caso('exacto vence soma2 quando existe', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J,
              movimentos: [mov('a', '2026-09-06', 1000), mov('b', '2026-09-06', 40), mov('c', '2026-09-06', 1040)] });
  assert.strictEqual(r.estrategia, 'exacto');
  assert.deepStrictEqual(r.movimentos.map(function(m){ return m.id; }), ['c']);
});

caso('estrategias sem soma2 ignora o par', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, estrategias: ['exacto'],
              movimentos: [mov('a', '2026-09-06', 1000), mov('b', '2026-09-06', 40)] });
  assert.strictEqual(r.estado, 'semCandidato');
});

caso('descritivo: cents null, histórico aprendido → confirmado', function(){
  var r = C({ cents: null, dia: '2026-09-10', janela: J, descritivosConhecidos: ['IBELECTRA FT202608091', 'IBELECTRA FT202607011'],
              aprendido: true, movimentos: [mov('a', '2026-09-09', 8123, 'IBELECTRA FT202609123'), mov('b', '2026-09-09', 300, 'NOS')] });
  assert.strictEqual(r.estado, 'confirmado');
  assert.strictEqual(r.estrategia, 'descritivo');
  assert.strictEqual(r.confianca, 'alta');
  assert.strictEqual(r.movimentos[0].id, 'a');
});

caso('descritivo: histórico não aprendido → sugestao/media', function(){
  var r = C({ cents: null, dia: '2026-09-10', janela: J, descritivosConhecidos: ['IBELECTRA FT202608091'],
              aprendido: false, movimentos: [mov('a', '2026-09-09', 8123, 'IBELECTRA FT202609123')] });
  assert.strictEqual(r.estado, 'sugestao');
  assert.strictEqual(r.confianca, 'media');
});

caso('descritivo: só regex fallback → sugestao/baixa mesmo aprendido', function(){
  var r = C({ cents: null, dia: '2026-09-10', janela: J, descritivosConhecidos: ['IBELECTRA FT'], regexFallback: /eletric|edp|ibelectra/i,
              aprendido: true, movimentos: [mov('a', '2026-09-09', 8123, 'EDP COMERCIAL 123')] });
  assert.strictEqual(r.estado, 'sugestao');
  assert.strictEqual(r.confianca, 'baixa');
});

caso('descritivo: 2 pelo histórico → ambiguo', function(){
  var r = C({ cents: null, dia: '2026-09-10', janela: J, descritivosConhecidos: ['IBELECTRA FT1'], aprendido: true,
              movimentos: [mov('a', '2026-09-09', 8123, 'IBELECTRA FT2'), mov('b', '2026-09-11', 9000, 'IBELECTRA FT3')] });
  assert.strictEqual(r.estado, 'ambiguo');
  assert.strictEqual(r.candidatos.length, 2);
});

caso('descritivo só corre quando exacto/soma2 dão zero', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, descritivosConhecidos: ['NOS'], aprendido: true,
              movimentos: [mov('a', '2026-09-06', 1040, 'OUTRO'), mov('b', '2026-09-06', 999, 'NOS')] });
  assert.strictEqual(r.estrategia, 'exacto');
  var r2 = C({ cents: 1040, dia: '2026-09-05', janela: J, descritivosConhecidos: ['NOS'], aprendido: true,
               movimentos: [mov('b', '2026-09-06', 999, 'NOS 2026')] });
  assert.strictEqual(r2.estrategia, 'descritivo');
  assert.strictEqual(r2.estado, 'confirmado');
});

caso('nada → semCandidato', function(){
  var r = C({ cents: 1040, dia: '2026-09-05', janela: J, movimentos: [] });
  assert.strictEqual(r.estado, 'semCandidato');
  assert.strictEqual(r.estrategia, null);
  assert.strictEqual(r.confianca, null);
});

caso('normalizarDescritivo', function(){
  assert.strictEqual(C.normalizarDescritivo('IBELECTRA FT202609123'), 'IBELECTRA FT');
  assert.strictEqual(C.normalizarDescritivo('  epal, s.a. 12/08 '), 'EPAL S A');
});

console.log(falhas ? '\n' + falhas + ' caso(s) falhado(s)' : '\ntodos os casos passaram');
process.exit(falhas ? 1 : 0);
