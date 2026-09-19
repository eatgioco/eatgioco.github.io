// Fase 1 do check do numerário (19 Set/2026): tabela real, SÓ LEITURA, a partir
// do Firebase por REST. Correr: node scripts/fase1-numerario.js [AAAA-MM-DD desde]
// Não escreve nada. Precisa de rede para o RTDB (falha com um erro claro sem ela).
// Sem Fecho de Caixa ZS: as linhas saem "Provisório" e o Δ é SEM saídas do POS —
// é exactamente o que a Fase 1 pede (esperado: Δ negativo ≈ gratificações).
process.env.TZ = process.env.TZ || 'Europe/Lisbon';
var G = require('../gioco-caixa.js');
var DB = 'https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app';
var desde = process.argv[2] || '2026-09-07';

function le(caminho){
  return fetch(DB + '/' + caminho + '.json').then(function(r){
    if (!r.ok) throw new Error(caminho + ': HTTP ' + r.status);
    return r.json();
  });
}
function euro(n){ return n == null ? '—' : (n < 0 ? '−' : (n > 0 ? '+' : '')) + Math.abs(n).toFixed(2).replace('.', ','); }
function mesesDesde(d){
  var out = [], m = d.slice(0, 7), hoje = G.dayKeyLocal(new Date()).slice(0, 7), guard = 0;
  while (m <= hoje && guard++ < 36){ out.push(m); var p = m.split('-'); var a = +p[0], mm = +p[1] + 1; if (mm > 12){ mm = 1; a++; } m = a + '-' + (mm < 10 ? '0' : '') + mm; }
  return out;
}
Promise.all([le('caixaContagens'), le('caixaMovimentos')].concat(mesesDesde(desde).map(function(m){ return le('vendasDiario/' + m); })))
  .then(function(res){
    var contagens = res[0] || {}, movs = res[1] || {};
    var nu = {}, semNu = 0, comNu = 0;
    res.slice(2).forEach(function(mes){
      Object.keys(mes || {}).forEach(function(dia){
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return;
        var p = mes[dia] && mes[dia].porPagamento && mes[dia].porPagamento.NU;
        if (p && p.bruto != null){ nu[dia] = parseFloat(p.bruto); comNu++; } else { nu[dia] = 0; semNu++; }
      });
    });
    console.log('Caminho do NU: vendasDiario/{AAAA-MM}/{dia}/porPagamento/NU/bruto — dias com NU: ' + comNu + ', dias importados sem NU: ' + semNu);
    var r = G.reconciliarNumerario(contagens, movs, nu, null);
    console.log('Contagens: ' + Object.keys(contagens).length + ' (inválidas: ' + r.contagensInvalidas.length + ') · movimentos inválidos: ' + r.movimentosInvalidos.length);
    console.log('');
    console.log('| Dia(s) | Âncora D | NU | Entradas OS | Saídas OS | Âncora seguinte | Δ sem saídas POS | Porquê? |');
    console.log('|---|---|---|---|---|---|---|---|');
    var soma = 0, n = 0;
    r.linhas.filter(function(l){ return l.dias[l.dias.length - 1] >= desde; }).forEach(function(l){
      var dias = l.dias.length === 1 ? l.dias[0].slice(5) : l.dias[0].slice(5) + '–' + l.dias[l.dias.length - 1].slice(5);
      var de = l.ancoraDe.dataHora.slice(11, 16) + ' ' + euro(l.ancoraDe.total).replace('+', '') + ' (' + l.ancoraDe.pessoa + ')';
      var ate = l.ancoraAte ? l.ancoraAte.dataHora.slice(11, 16) + ' ' + euro(l.ancoraAte.total).replace('+', '') + ' (' + l.ancoraAte.pessoa + ')' : '— (em aberto)';
      console.log('| ' + dias + ' | ' + de + ' | ' + euro(l.nu).replace('+', '') + ' | ' + euro(l.entradasOs).replace('+', '') + ' | ' + euro(l.saidasOs).replace('+', '') + ' | ' + ate + ' | ' + euro(l.delta) + ' | ' + (l.motivoDiferenca || '') + ' |');
      if (l.delta != null){ soma += l.delta; n++; }
    });
    console.log('');
    console.log('Média do Δ (sem saídas POS) nas ' + n + ' janelas fechadas: ' + euro(n ? Math.round(soma / n * 100) / 100 : null) + ' €');
  })
  .catch(function(e){ console.error('Falhou: ' + e.message); process.exit(1); });
