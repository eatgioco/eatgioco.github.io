// Testes do motor de obrigações (gioco-obrigacoes.js). Correr: node scripts/testa-obrigacoes.js
var assert = require('assert');
var G = require('../gioco-obrigacoes.js');

var HOJE = '2026-09-11';

// diasEntre / grupoPrazo
assert.strictEqual(G.diasEntre('2026-09-01', HOJE), 10);
assert.strictEqual(G.diasEntre('2026-09-11T23:59:00', HOJE), 0, 'mesma data local = 0');
assert.strictEqual(G.diasEntre('ontem', HOJE), null);
assert.strictEqual(G.grupoPrazo({ prazo: '2026-09-10' }, HOJE), 0, 'vencida');
assert.strictEqual(G.grupoPrazo({ prazo: '2026-09-11' }, HOJE), 0, 'hoje');
assert.strictEqual(G.grupoPrazo({ prazo: '2026-09-12' }, HOJE), 1, 'futura');
assert.strictEqual(G.grupoPrazo({}, HOJE), 2, 'sem prazo');
assert.strictEqual(G.grupoPrazo({ prazo: 'x' }, HOJE), 2, 'prazo inválido = sem prazo');

// dependências e próxima ação
var projs = {
  P1: { nome: 'Site', estado: 'ativo', criadoEm: '2026-08-01T10:00:00.000Z', ultimoAvancoEm: '2026-08-20T10:00:00.000Z' },
  P2: { nome: 'Menu', estado: 'ativo', criadoEm: '2026-09-05T10:00:00.000Z', ultimoAvancoEm: '2026-09-05T10:00:00.000Z' },
  P3: { nome: 'Anulado', estado: 'anulado', anulado: true, criadoEm: '2026-01-01T00:00:00.000Z' },
  P4: { nome: 'Bloqueado', estado: 'ativo', criadoEm: '2026-09-01T00:00:00.000Z', ultimoAvancoEm: '2026-09-01T00:00:00.000Z' },
  P5: { nome: 'Vazio', estado: 'ativo', criadoEm: '2026-09-01T00:00:00.000Z', ultimoAvancoEm: '2026-09-10T00:00:00.000Z' }
};
var obrs = {
  a: { titulo: 'Escolher domínio', projetoId: 'P1', ordem: 1, estado: 'concluida', criadoEm: '2026-08-01T10:00:00.000Z' },
  b: { titulo: 'Comprar domínio', projetoId: 'P1', ordem: 2, estado: 'aberta', dependeDe: ['a'], criadoEm: '2026-08-01T10:01:00.000Z' },
  c: { titulo: 'Publicar', projetoId: 'P1', ordem: 3, estado: 'aberta', dependeDe: ['b'], criadoEm: '2026-08-01T10:02:00.000Z' },
  d: { titulo: 'Passo 0 anulado', projetoId: 'P1', ordem: 0, estado: 'anulada', anulado: true, criadoEm: '2026-08-01T09:00:00.000Z' },
  e: { titulo: 'Novo menu', projetoId: 'P2', ordem: 1, estado: 'aberta', prazo: '2026-09-15', criadoEm: '2026-09-05T10:00:00.000Z' },
  f: { titulo: 'Solta vencida', estado: 'aberta', prazo: '2026-09-01', criadoEm: '2026-09-02T10:00:00.000Z' },
  g: { titulo: 'Solta sem prazo antiga', estado: 'aberta', criadoEm: '2026-07-01T10:00:00.000Z' },
  h: { titulo: 'Solta sem prazo nova', estado: 'aberta', criadoEm: '2026-09-10T10:00:00.000Z' },
  i: { titulo: 'Do projeto anulado', projetoId: 'P3', ordem: 1, estado: 'aberta', criadoEm: '2026-09-01T10:00:00.000Z' },
  j: { titulo: 'Circular 1', projetoId: 'P4', ordem: 1, estado: 'aberta', dependeDe: ['k'], criadoEm: '2026-09-01T10:00:00.000Z' },
  k: { titulo: 'Circular 2', projetoId: 'P4', ordem: 2, estado: 'aberta', dependeDe: ['j'], criadoEm: '2026-09-01T10:00:00.000Z' },
  l: { titulo: 'Dep anulada não bloqueia', projetoId: 'P2', ordem: 2, estado: 'aberta', dependeDe: ['d', 'inexistente'], criadoEm: '2026-09-06T10:00:00.000Z' },
  m: { titulo: 'Concluída solta', estado: 'concluida', criadoEm: '2026-09-01T10:00:00.000Z' }
};

assert.strictEqual(G.proximaAcao('P1', obrs).id, 'b', 'a menor ordem aberta com deps concluídas');
assert.strictEqual(G.proximaAcao('P4', obrs), null, 'dependências circulares → nenhuma');
assert.strictEqual(G.proximaAcao('P5', obrs), null, 'sem passos');
assert.strictEqual(G.dependenciasSatisfeitas(obrs.l, obrs), true, 'anulada/inexistente não bloqueia');
assert.strictEqual(G.dependenciasSatisfeitas(obrs.c, obrs), false);
assert.deepStrictEqual(G.passosDoProjeto('P1', obrs).map(function(o){ return o.id; }), ['d', 'a', 'b', 'c']);

var v = G.vistaProximaAcao(obrs, projs, HOJE);
assert.strictEqual(v.totalAbertas, 10, 'todas as abertas contam, incluindo bloqueadas e as de projeto anulado');
assert.deepStrictEqual(v.projetos.map(function(x){ return x.obr.id; }), ['e', 'b'], 'com prazo primeiro; depois parado há mais tempo');
assert.strictEqual(v.projetos[1].diasParado, 22);
assert.deepStrictEqual(v.soltas.map(function(x){ return x.obr.id; }), ['f', 'g', 'i', 'h'],
  'vencida primeiro; sem prazo por antiguidade (i, passo aberto de projeto anulado, é inconsistência de dados: o motor NUNCA a esconde — a anulação em cascata da obrigacoes.html e o scripts/corrige-passos-projetos-anulados.js garantem que não existe)');
assert.deepStrictEqual(v.bloqueados.map(function(x){ return x.projeto.id + ':' + x.abertas; }), ['P4:2']);
assert.deepStrictEqual(v.semPassos.map(function(x){ return x.projeto.id; }), ['P5']);
assert.deepStrictEqual(v.parados.map(function(x){ return x.projeto.id; }), ['P1'], 'P1 parado há 22 dias > 14; P2 não');

// ordenar: uma obrigação vencida sobe acima de uma com prazo futuro e de uma sem prazo
function ci(id){ var o = Object.assign({}, obrs[id]); o.id = id; return { obr: o }; }
var ord = G.ordenar([ci('h'), ci('e'), ci('f')], HOJE).map(function(x){ return x.obr.id; });
assert.deepStrictEqual(ord, ['f', 'e', 'h']);

// dependeDe como objeto (RTDB pode devolver arrays esparsos como objeto)
assert.strictEqual(G.dependenciasSatisfeitas({ dependeDe: { 0: 'a' } }, obrs), true);
assert.strictEqual(G.dependenciasSatisfeitas({ dependeDe: { 0: 'b' } }, obrs), false);

console.log('testa-obrigacoes: OK');
