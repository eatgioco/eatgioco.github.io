// Testes do motor do dinheiro físico (gioco-caixa.js): saldoVivoCaixa (regressão)
// e reconciliarNumerario (check diário do numerário, 19 Set/2026).
// Correr: node scripts/testa-caixa.js   (mocks em memória — nunca toca no Firebase)
process.env.TZ = process.env.TZ || 'Europe/Lisbon';
var assert = require('assert');
var G = require('../gioco-caixa.js');

function round2(n){ return Math.round(n * 100) / 100; }

/* ---------- Regressão: saldoVivoCaixa com a fórmula antiga (float + round2) ---------- */
function saldoVivoAntigo(contagens, movs){
  var contagem = G.ultimaContagem(contagens);
  if (!contagem) return null;
  var all = movs || {};
  var saldo = parseFloat(contagem.total) || 0;
  var desde = new Date(contagem.dataHora).getTime();
  Object.keys(all).forEach(function(id){
    var m = all[id];
    if (!m || !G.dataHoraValida(m.dataHora)) return;
    var t = new Date(m.dataHora).getTime();
    if (t <= desde) return;
    if (m.tipo === 'entrada') saldo += (parseFloat(m.valor) || 0);
    else if (m.estado === 'acertado') saldo -= ((parseFloat(m.valor) || 0) - (parseFloat(m.valorDevolvido) || 0));
    else saldo -= (parseFloat(m.valor) || 0);
  });
  return round2(saldo);
}
// Fixture determinística: 2000 cenários aleatórios com valores a 2 casas.
var seed = 42;
function rnd(){ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
function val(){ return round2(Math.floor(rnd() * 20000) / 100); }
for (var s = 0; s < 2000; s++){
  var contagens = { c1: { dataHora: '2026-09-07T09:00:00.000Z', total: val() }, c2: { dataHora: '2026-09-08T09:00:00.000Z', total: val() } };
  if (rnd() < 0.2) contagens.c3 = { dataHora: 'ontem', total: 999 };
  var movs = {};
  for (var i = 0; i < 12; i++){
    var r = rnd();
    var h = 6 + Math.floor(rnd() * 40);
    var iso = new Date(Date.UTC(2026, 8, 7, h, 0, 0)).toISOString();
    if (r < 0.3) movs['m' + i] = { tipo: 'entrada', valor: val(), dataHora: iso };
    else if (r < 0.6) movs['m' + i] = { tipo: 'saida', estado: 'acertado', valor: val(), valorDevolvido: round2(val() / 2), dataHora: iso };
    else if (r < 0.9) movs['m' + i] = { tipo: 'saida', estado: 'aberto', valor: val(), dataHora: iso };
    else movs['m' + i] = { tipo: 'saida', valor: val(), dataHora: 'x' };
  }
  assert.strictEqual(G.saldoVivoCaixa(contagens, movs), saldoVivoAntigo(contagens, movs), 'regressão saldoVivoCaixa cenário ' + s);
}
assert.strictEqual(G.saldoVivoCaixa({}, {}), null, 'sem contagem → null');
assert.strictEqual(G.saldoVivoCaixa({ a: { dataHora: '2026-09-07T09:00:00Z', total: 100 } },
  { m: { tipo: 'saida', estado: 'acertado', valor: 64.5, valorDevolvido: 19.3, dataHora: '2026-09-07T10:00:00Z' } }), 54.8);

/* ---------- efeitoMovimentoCents ---------- */
assert.strictEqual(G.efeitoMovimentoCents({ tipo: 'entrada', valor: 0.1 }), 10);
assert.strictEqual(G.efeitoMovimentoCents({ tipo: 'saida', estado: 'acertado', valor: 64.5, valorDevolvido: 19.3 }), -4520);
assert.strictEqual(G.efeitoMovimentoCents({ tipo: 'saida', estado: 'aberto', valor: 64.5 }), -6450);
assert.strictEqual(G.efeitoMovimentoCents({ tipo: 'saida', valor: 'x' }), 0, 'texto não numérico conta 0 (como parseFloat no antigo)');

/* ---------- reconciliarNumerario ---------- */
function C(dataHora, total, extra){ return Object.assign({ dataHora: dataHora, total: total, pessoa: 'Alfredo' }, extra || {}); }

// 1. Fecha a 0 → ok; −0,01 → falta; +0,01 → sobra.
var base = {
  contagens: { a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 250) },
  movs: { m1: { tipo: 'saida', estado: 'acertado', valor: 30, valorDevolvido: 10, dataHora: '2026-09-07T12:00:00+01:00' } },
  nu: { '2026-09-07': 190 },
  pos: { '2026-09-07': { saidas: 20, entradas: 0 } }
};
var r = G.reconciliarNumerario(base.contagens, base.movs, base.nu, base.pos);
assert.strictEqual(r.linhas.length, 2);
assert.strictEqual(r.linhas[0].estado, 'ok');
assert.strictEqual(r.linhas[0].esperado, 250);
assert.strictEqual(r.linhas[0].delta, 0);
assert.strictEqual(r.linhas[0].chave, '2026-09-07~NU');
assert.strictEqual(r.linhas[1].estado, 'aberto', 'último dia sem âncora seguinte');
assert.strictEqual(r.linhas[1].delta, null);
var r2 = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 249.99) }, base.movs, base.nu, base.pos);
assert.strictEqual(r2.linhas[0].estado, 'falta'); assert.strictEqual(r2.linhas[0].delta, -0.01);
var r3 = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 250.01) }, base.movs, base.nu, base.pos);
assert.strictEqual(r3.linhas[0].estado, 'sobra'); assert.strictEqual(r3.linhas[0].delta, 0.01);
[0.005, 0.02, 1, 100].forEach(function(d){
  var rr = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 250 + d) }, base.movs, base.nu, base.pos);
  if (Math.round(d * 100) === 0) assert.strictEqual(rr.linhas[0].estado, 'ok', 'meio cêntimo no total arredonda a 0');
  else assert.notStrictEqual(rr.linhas[0].estado, 'ok', 'Δ ' + d + ' nunca é OK');
});

// 2. Vírgula flutuante: parcelas que em float não fecham (0,1 + 0,2 + 0,7 = 1,0000000000000002;
//    0,1 + 0,2 + 64,50 − 19,30) têm de fechar a 0 cêntimos.
var rf = G.reconciliarNumerario(
  { a: C('2026-09-07T08:00:00+01:00', 0.1), b: C('2026-09-08T08:00:00+01:00', 46.2) },
  { e1: { tipo: 'entrada', valor: 0.2, dataHora: '2026-09-07T09:00:00+01:00' },
    e2: { tipo: 'entrada', valor: 0.7, dataHora: '2026-09-07T09:30:00+01:00' },
    s1: { tipo: 'saida', estado: 'acertado', valor: 19.3, valorDevolvido: 0, dataHora: '2026-09-07T10:00:00+01:00' } },
  { '2026-09-07': 64.5 }, { '2026-09-07': { saidas: 0 } });
assert.strictEqual(rf.linhas[0].deltaCents, 0); assert.strictEqual(rf.linhas[0].estado, 'ok');
assert.notStrictEqual(0.1 + 0.2, 0.3, 'o caso é mesmo de float (0,1 + 0,2 ≠ 0,3 em float)');
// Parcelas que em float dão 0,30000000000000004 e 3,3000000000000003:
var rf2 = G.reconciliarNumerario(
  { a: C('2026-09-07T08:00:00+01:00', 0.1), b: C('2026-09-08T08:00:00+01:00', 0) },
  { s1: { tipo: 'saida', estado: 'aberto', valor: 0.3, dataHora: '2026-09-07T10:00:00+01:00' } },
  { '2026-09-07': 0.2 }, { '2026-09-07': { saidas: 0 } });
assert.strictEqual(rf2.linhas[0].deltaCents, 0); assert.strictEqual(rf2.linhas[0].estado, 'ok');
var rf3 = G.reconciliarNumerario(
  { a: C('2026-09-07T08:00:00+01:00', 1.1), b: C('2026-09-08T08:00:00+01:00', 3.3) },
  {}, { '2026-09-07': 2.2 }, { '2026-09-07': { saidas: 0 } });
assert.strictEqual(rf3.linhas[0].deltaCents, 0); assert.strictEqual(rf3.linhas[0].estado, 'ok');

// 3. Manhã sem contagem → uma linha agregada de dois dias.
var ra = G.reconciliarNumerario(
  { a: C('2026-09-12T08:00:00+01:00', 100), b: C('2026-09-14T08:00:00+01:00', 400) },
  {}, { '2026-09-12': 150, '2026-09-13': 160 }, { '2026-09-12': { saidas: 5 }, '2026-09-13': { saidas: 5 } });
assert.deepStrictEqual(ra.linhas[0].dias, ['2026-09-12', '2026-09-13']);
assert.strictEqual(ra.linhas[0].nu, 310); assert.strictEqual(ra.linhas[0].saidasPos, 10);
assert.strictEqual(ra.linhas[0].esperado, 400); assert.strictEqual(ra.linhas[0].estado, 'ok');
assert.strictEqual(ra.linhas[0].chave, '2026-09-12_2026-09-13~NU');

// 4. Duas contagens no mesmo dia → só a primeira é âncora; a segunda é ignorada.
var rd = G.reconciliarNumerario(
  { tarde: C('2026-09-07T15:00:00+01:00', 999), manha: C('2026-09-07T08:30:00+01:00', 100), seg: C('2026-09-08T08:00:00+01:00', 200) },
  {}, { '2026-09-07': 100 }, { '2026-09-07': { saidas: 0 } });
assert.strictEqual(rd.linhas.length, 2);
assert.strictEqual(rd.linhas[0].ancoraDe.id, 'manha');
assert.strictEqual(rd.linhas[0].ancoraAte.id, 'seg');
assert.strictEqual(rd.linhas[0].estado, 'ok');
// Contagem às 00:30 é a primeira do dia LOCAL seguinte (dayKeyLocal, não a fatia UTC).
assert.strictEqual(G.dayKeyLocal('2026-09-07T23:30:00Z'), '2026-09-08', 'TZ Lisboa (verão): 23:30Z é dia 8 local');

// 5. Saída 'aberto', saída 'acertado' com valorDevolvido, entrada do cofre.
var rm = G.reconciliarNumerario(
  { a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 0) },
  { ab: { tipo: 'saida', estado: 'aberto', valor: 40, dataHora: '2026-09-07T09:00:00+01:00', motivo: 'Compra' },
    ac: { tipo: 'saida', estado: 'acertado', valor: 30, valorDevolvido: 12.5, dataHora: '2026-09-07T10:00:00+01:00', motivo: 'Compra' },
    co: { tipo: 'entrada', estado: 'acertado', valorDevolvido: 0, valor: 25, dataHora: '2026-09-07T11:00:00+01:00', motivo: 'Entrada do cofre' },
    fora: { tipo: 'entrada', valor: 1000, dataHora: '2026-09-07T07:59:59+01:00' },
    limite: { tipo: 'entrada', valor: 1, dataHora: '2026-09-08T08:00:00+01:00' } },
  { '2026-09-07': 50 }, { '2026-09-07': { saidas: 3, entradas: 2 } });
var l = rm.linhas[0];
assert.strictEqual(l.saidasOs, 57.5, '40 + (30 − 12,5)');
assert.strictEqual(l.entradasOs, 26, 'cofre 25 + a entrada exactamente à hora da âncora seguinte (inclusive, como o saldoVivo)');
assert.strictEqual(l.movimentos.length, 4);
assert.strictEqual(l.esperado, round2(100 + 50 + 26 - 57.5 - 3 + 2));
assert.strictEqual(l.estado, 'falta'); assert.strictEqual(l.delta, -117.5);

// 6. dataHora inválida → fora do cálculo, devolvida à parte.
var ri = G.reconciliarNumerario(
  { a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 100), x: C('ontem', 5), y: C(null, 5), z: C(0, 5) },
  { ok: { tipo: 'entrada', valor: 10, dataHora: '2026-09-07T09:00:00+01:00' }, mau: { tipo: 'entrada', valor: 999, dataHora: '2026-13-45T00:00' }, nulo: { tipo: 'saida', valor: 1, dataHora: null } },
  { '2026-09-07': 0 }, { '2026-09-07': { saidas: 10 } });
assert.deepStrictEqual(ri.contagensInvalidas.sort(), ['x', 'y', 'z']);
assert.deepStrictEqual(ri.movimentosInvalidos.sort(), ['mau', 'nulo']);
assert.strictEqual(ri.linhas.length, 2); assert.strictEqual(ri.linhas[0].estado, 'ok');

// 7. Sem Fecho ZS → provisório (Δ calculado sem saídas POS); com ele → estado final. Três casas.
var rp = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 180.7) }, {}, { '2026-09-07': 100 });
assert.strictEqual(rp.linhas[0].estado, 'provisorio'); assert.strictEqual(rp.linhas[0].saidasPos, null);
assert.strictEqual(rp.linhas[0].delta, -19.3); assert.deepStrictEqual(rp.linhas[0].semPos, ['2026-09-07']);
var rp2 = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 180.7) }, {}, { '2026-09-07': 100 }, { '2026-09-07': { saidas: 19.305, entradas: null } });
assert.strictEqual(rp2.linhas[0].saidasPos, 19.31, '19,305 arredondado ao cêntimo à entrada');
assert.strictEqual(rp2.linhas[0].estado, 'sobra'); assert.strictEqual(rp2.linhas[0].deltaCents, 1, 'esperado 180,69 vs contado 180,70');
var rp3 = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 180.7) }, {}, { '2026-09-07': 100 }, { '2026-09-07': { saidas: 19.3 } });
assert.strictEqual(rp3.linhas[0].estado, 'ok');
// Dia sem NU importado → também provisório, com o dia em semNu.
var rn = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100), b: C('2026-09-08T08:00:00+01:00', 100) }, {}, {}, { '2026-09-07': { saidas: 0 } });
assert.strictEqual(rn.linhas[0].estado, 'provisorio'); assert.deepStrictEqual(rn.linhas[0].semNu, ['2026-09-07']);
// Janela de dois dias com Fecho só de um → provisório com o dia em falta.
var rp4 = G.reconciliarNumerario({ a: C('2026-09-12T08:00:00+01:00', 100), b: C('2026-09-14T08:00:00+01:00', 100) }, {}, { '2026-09-12': 0, '2026-09-13': 0 }, { '2026-09-12': { saidas: 0 } });
assert.strictEqual(rp4.linhas[0].estado, 'provisorio'); assert.deepStrictEqual(rp4.linhas[0].semPos, ['2026-09-13']);

// motivoDiferenca vem da âncora SEGUINTE.
var rmot = G.reconciliarNumerario({ a: C('2026-09-07T08:00:00+01:00', 100, { motivoDiferenca: 'da manhã' }), b: C('2026-09-08T08:00:00+01:00', 90, { motivoDiferenca: 'faltam 10' }) }, {}, { '2026-09-07': 0 }, { '2026-09-07': { saidas: 0 } });
assert.strictEqual(rmot.linhas[0].motivoDiferenca, 'faltam 10');

// Sem contagens → sem linhas; nada inventado.
assert.deepStrictEqual(G.reconciliarNumerario({}, {}, {}, {}).linhas, []);

console.log('testa-caixa.js: OK');
