// Testes da deteção de ambiente do gioco-outlook.js — correr com:
//   node scripts/testa-outlook-ambiente.js
// detetarAmbiente(ua, plataforma, toques) é pura: recebe o user agent em vez
// de o ir buscar ao navigator, precisamente para ser testável com strings
// reais. É esta função que escolhe entre popup, redirect e "abre no Safari",
// por isso um engano aqui é um login que nunca funciona no telemóvel.
var O = require('../gioco-outlook.js');
var assert = require('assert');
var amb = O.detetarAmbiente;

var falhas = 0;
function caso(nome, fn) {
  try { fn(); console.log('ok  ' + nome); }
  catch (e) { falhas++; console.log('ERR ' + nome + '\n    ' + (e && e.message)); }
}

/* User agents reais (Set/2026). */
var UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  iphoneWebview: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/468.0.0.42.107;FBBV/606213704]',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.3.28.103',
  whatsapp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.24.11.79',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  androidFacebook: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/468.0.0.36.109;]',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
};

/* ---------- Desktop: nada muda, continua no caminho do popup ---------- */

caso('Windows/Chrome → nem iOS nem webview', function () {
  var a = amb(UA.win, 'Win32', 0);
  assert.strictEqual(a.ios, false);
  assert.strictEqual(a.webview, false);
});

caso('macOS/Safari (sem toque) → nem iOS nem webview', function () {
  var a = amb(UA.macSafari, 'MacIntel', 0);
  assert.strictEqual(a.ios, false);
  assert.strictEqual(a.webview, false);
});

/* ---------- iOS a sério: redirect, mas login permitido ---------- */

caso('iPhone Safari → ios, NÃO webview', function () {
  var a = amb(UA.iphoneSafari, 'iPhone', 5);
  assert.strictEqual(a.ios, true);
  assert.strictEqual(a.webview, false);
});

caso('iPhone Chrome (CriOS) → ios, NÃO webview', function () {
  // CriOS tem "Safari" no UA e é um browser a sério: tem de poder ligar.
  var a = amb(UA.iphoneChrome, 'iPhone', 5);
  assert.strictEqual(a.ios, true);
  assert.strictEqual(a.webview, false);
});

caso('iPad Pro (iPadOS mente e diz-se Macintosh) → ios pelo maxTouchPoints', function () {
  var a = amb(UA.macSafari, 'MacIntel', 5);
  assert.strictEqual(a.ios, true);
  assert.strictEqual(a.webview, false);
});

/* ---------- Webviews: não tentar login ---------- */

caso('WKWebView em iOS (sem "Safari" no UA) → webview', function () {
  var a = amb(UA.iphoneWebview, 'iPhone', 5);
  assert.strictEqual(a.ios, true);
  assert.strictEqual(a.webview, true);
  assert.strictEqual(a.motivo, 'ios-webview');
});

caso('Facebook iOS → webview (motivo app)', function () {
  var a = amb(UA.facebook, 'iPhone', 5);
  assert.strictEqual(a.webview, true);
  assert.strictEqual(a.motivo, 'app');
});

caso('Instagram iOS → webview', function () {
  assert.strictEqual(amb(UA.instagram, 'iPhone', 5).webview, true);
});

caso('WhatsApp iOS → webview', function () {
  assert.strictEqual(amb(UA.whatsapp, 'iPhone', 5).webview, true);
});

caso('Facebook ANDROID → webview mesmo com "Safari" no UA', function () {
  // O UA do Android tem sempre "Safari"; só a marca da app o denuncia.
  var a = amb(UA.androidFacebook, 'Linux armv8l', 5);
  assert.strictEqual(a.ios, false);
  assert.strictEqual(a.webview, true);
  assert.strictEqual(a.motivo, 'app');
});

caso('Android Chrome normal → NÃO webview', function () {
  var a = amb(UA.androidChrome, 'Linux armv8l', 5);
  assert.strictEqual(a.ios, false);
  assert.strictEqual(a.webview, false);
});

/* ---------- Robustez ---------- */

caso('UA vazio não rebenta', function () {
  var a = amb('', '', 0);
  assert.strictEqual(a.ios, false);
  assert.strictEqual(a.webview, false);
});

console.log(falhas ? '\n' + falhas + ' caso(s) falhado(s)' : '\ntodos os casos passaram');
process.exit(falhas ? 1 : 0);
