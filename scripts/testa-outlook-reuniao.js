// Testes da deteção do link de videochamada do gioco-outlook.js — correr com:
//   node scripts/testa-outlook-reuniao.js
// Sem Firebase, sem MSAL, sem browser: detetarLinkReuniao é uma função pura
// que recebe um evento do Graph. Falha com exit 1 no primeiro caso errado.
var O = require('../gioco-outlook.js');
var assert = require('assert');
var det = O.detetarLinkReuniao;

var falhas = 0;
function caso(nome, fn) {
  try { fn(); console.log('ok  ' + nome); }
  catch (e) { falhas++; console.log('ERR ' + nome + '\n    ' + (e && e.message)); }
}

/* ---------- Prioridade dos campos ---------- */

caso('1. onlineMeeting.joinUrl ganha a tudo o resto', function () {
  var r = det({
    onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc' },
    onlineMeetingProvider: 'teamsForBusiness',
    location: { displayName: 'https://meet.google.com/xxx-yyyy-zzz' },
    bodyPreview: 'entra em https://zoom.us/j/123'
  });
  assert.strictEqual(r.servico, 'Teams');
  assert.strictEqual(r.url, 'https://teams.microsoft.com/l/meetup-join/abc');
});

caso('1b. joinUrl de host desconhecido cai no onlineMeetingProvider', function () {
  var r = det({
    onlineMeeting: { joinUrl: 'https://reunioes.exemplo.pt/j/1' },
    onlineMeetingProvider: 'teamsForBusiness'
  });
  assert.strictEqual(r.servico, 'Teams');
});

caso('1c. joinUrl sem provider conhecido → Videochamada', function () {
  var r = det({ onlineMeeting: { joinUrl: 'https://reunioes.exemplo.pt/j/1' } });
  assert.strictEqual(r.servico, 'Videochamada');
});

caso('2. location.displayName com Google Meet', function () {
  var r = det({ location: { displayName: 'https://meet.google.com/abc-defg-hij' } });
  assert.strictEqual(r.servico, 'Google Meet');
  assert.strictEqual(r.url, 'https://meet.google.com/abc-defg-hij');
});

caso('2b. location ganha ao bodyPreview', function () {
  var r = det({
    location: { displayName: 'https://whereby.com/gioco' },
    bodyPreview: 'https://meet.google.com/abc-defg-hij'
  });
  assert.strictEqual(r.servico, 'Whereby');
});

caso('3. locations[] quando o location principal não tem link', function () {
  var r = det({
    location: { displayName: 'Escritório' },
    locations: [{ displayName: 'Sala 2' }, { displayName: 'https://meet.jit.si/gioco' }]
  });
  assert.strictEqual(r.servico, 'Jitsi');
});

caso('4. bodyPreview como último recurso', function () {
  var r = det({ bodyPreview: 'Olá! Link: https://zoom.us/j/9876543210 até já' });
  assert.strictEqual(r.servico, 'Zoom');
  assert.strictEqual(r.url, 'https://zoom.us/j/9876543210');
});

/* ---------- Hosts: sufixo exacto, nunca includes() ---------- */

caso('subdomínio de zoom.us conta', function () {
  assert.strictEqual(det({ location: { displayName: 'https://eatgioco.zoom.us/j/1' } }).servico, 'Zoom');
});

caso('subdomínio de webex.com conta', function () {
  assert.strictEqual(det({ location: { displayName: 'https://gioco.webex.com/meet/manel' } }).servico, 'Webex');
});

caso('PHISHING: zoom.us.phishing.com NÃO é Zoom', function () {
  // Cai na regra "o local é só um URL" e fica como Videochamada genérica,
  // mas nunca com o nome de um serviço que não é.
  var r = det({ location: { displayName: 'https://zoom.us.phishing.com/j/1' } });
  assert.strictEqual(r.servico, 'Videochamada');
});

caso('PHISHING: no corpo do convite, host não conhecido é ignorado', function () {
  assert.strictEqual(det({ bodyPreview: 'clica https://meet.google.com.mau.example/x' }), null);
});

caso('xmeet.google.com não conta como Google Meet', function () {
  var r = det({ bodyPreview: 'https://xmeet.google.com.evil/x' });
  assert.strictEqual(r, null);
});

/* ---------- Só https ---------- */

caso('http:// é ignorado', function () {
  assert.strictEqual(det({ location: { displayName: 'http://meet.google.com/abc-defg-hij' } }), null);
});

caso('URL malformado não rebenta', function () {
  assert.strictEqual(det({ location: { displayName: 'https://' } }), null);
});

/* ---------- Regra "o local é só um URL" ---------- */

caso('local só com URL desconhecido → Videochamada', function () {
  var r = det({ location: { displayName: '  https://vc.exemplo.pt/sala/1  ' } });
  assert.strictEqual(r.servico, 'Videochamada');
  assert.strictEqual(r.url, 'https://vc.exemplo.pt/sala/1');
});

caso('local com texto à volta de URL desconhecido → não conta', function () {
  assert.strictEqual(det({ location: { displayName: 'Sala 2 · https://vc.exemplo.pt/sala/1' } }), null);
});

caso('local com texto à volta de URL CONHECIDO → conta na mesma', function () {
  var r = det({ location: { displayName: 'Sala 2 · https://meet.google.com/abc-defg-hij' } });
  assert.strictEqual(r.servico, 'Google Meet');
});

caso('pontuação final é aparada', function () {
  var r = det({ bodyPreview: 'Entra em https://meet.google.com/abc-defg-hij.' });
  assert.strictEqual(r.url, 'https://meet.google.com/abc-defg-hij');
});

/* ---------- Ausências e cancelados ---------- */

caso('evento sem link nenhum → null', function () {
  assert.strictEqual(det({ subject: 'Almoço', location: { displayName: 'Cantina' } }), null);
});

caso('evento vazio → null', function () {
  assert.strictEqual(det({}), null);
  assert.strictEqual(det(null), null);
});

caso('evento CANCELADO nunca dá link, mesmo com joinUrl', function () {
  assert.strictEqual(det({
    isCancelled: true,
    onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc' }
  }), null);
});

console.log(falhas ? '\n' + falhas + ' caso(s) falhado(s)' : '\ntodos os casos passaram');
process.exit(falhas ? 1 : 0);
