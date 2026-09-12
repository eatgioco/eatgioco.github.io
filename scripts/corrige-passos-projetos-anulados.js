// Correção pontual (Set/2026): passos ABERTOS cujo projetoId aponta para um
// projeto com anulado:true — ficaram órfãos porque, antes da anulação em cascata
// da obrigacoes.html, anular um projeto deixava os passos abertos como soltas.
//
// Correr: node scripts/corrige-passos-projetos-anulados.js            (só relatório)
//         node scripts/corrige-passos-projetos-anulados.js --aplicar  (grava)
//
// Escreve, por passo, UM PATCH (= update()) em obrigacoes/{id} com
// { estado:'anulada', anulado:true, anuladoEm: <o anuladoEm do projeto>,
//   anuladoPorProjeto:true }. Passos concluídos ou já anulados nunca são tocados.
// Nunca remove(). Sem auth (RTDB em modo de teste, como o resto do OS).
var https = require('https');
var DB = 'https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app';
var APLICAR = process.argv.indexOf('--aplicar') >= 0;

function pedir(metodo, path, corpo) {
  return new Promise(function (res, rej) {
    var u = new URL(DB + path);
    var req = https.request({ method: metodo, hostname: u.hostname, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json' } }, function (r) {
      var s = ''; r.on('data', function (c) { s += c; });
      r.on('end', function () { if (r.statusCode >= 300) rej(new Error(metodo + ' ' + path + ' → ' + r.statusCode + ' ' + s)); else res(s ? JSON.parse(s) : null); });
    });
    req.on('error', rej);
    if (corpo !== undefined) req.write(JSON.stringify(corpo));
    req.end();
  });
}

// Pura, exportada para teste: devolve os passos a corrigir e o que se grava em cada um.
function planear(projs, obrs) {
  projs = projs || {}; obrs = obrs || {};
  return Object.keys(obrs).filter(function (id) {
    var o = obrs[id];
    if (!o || o.estado !== 'aberta' || o.anulado === true || !o.projetoId) return false;
    var p = projs[o.projetoId];
    return !!p && p.anulado === true;
  }).map(function (id) {
    var o = obrs[id]; var p = projs[o.projetoId];
    return { id: id, titulo: o.titulo, projetoNome: p.nome,
      patch: { estado: 'anulada', anulado: true, anuladoEm: p.anuladoEm || new Date().toISOString(), anuladoPorProjeto: true } };
  });
}
module.exports = { planear: planear };

if (require.main === module) {
  Promise.all([pedir('GET', '/projetos.json'), pedir('GET', '/obrigacoes.json')]).then(function (r) {
    var plano = planear(r[0], r[1]);
    console.log(plano.length + ' passo(s) aberto(s) de projeto(s) anulado(s):');
    plano.forEach(function (x) { console.log('  · ' + x.id + '  «' + x.titulo + '»  (projeto «' + x.projetoNome + '», anuladoEm ' + x.patch.anuladoEm + ')'); });
    if (!plano.length) return;
    if (!APLICAR) { console.log('Só relatório. Para gravar: --aplicar'); return; }
    var seq = Promise.resolve();
    plano.forEach(function (x) { seq = seq.then(function () { return pedir('PATCH', '/obrigacoes/' + x.id + '.json', x.patch).then(function () { console.log('  ✓ ' + x.id); }); }); });
    return seq.then(function () { console.log('Corrigidos: ' + plano.length); });
  }).catch(function (e) { console.error(e.message || e); process.exit(1); });
}
