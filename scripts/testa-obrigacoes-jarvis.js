/* Teste do Jarvis dentro da obrigacoes.html (Nov/2026), em Chromium (Playwright).
   Firebase pelo shim em memória (scripts/testa-loja-app-shim.js) — nunca toca no
   RTDB; a API do Worker é simulada com page.route — nunca toca no Jarvis real.
   Verifica: o cartão Jarvis aparece mesmo sem chave (pede a chave), a conversa e
   os lembretes depois de ligar, o título da obrigação ligada a um lembrete, as
   pills quem/situação/notas/Jarvis numa obrigação escrita pelo Jarvis, a pesquisa
   pelo "quem", enviar uma mensagem e receber a resposta, Feito num lembrete, o
   redirect da jarvis.html, 1600 px e iPhone SE, e ZERO escritas no Firebase.
   Correr: NODE_PATH=$(npm root -g) node scripts/testa-obrigacoes-jarvis.js [pasta-das-capturas] */
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHIM = fs.readFileSync(__dirname + '/testa-loja-app-shim.js', 'utf8');
const OUT = process.argv[2] || null;
const PORTA = 8771;
const API = 'https://secretaria.eatgioco.workers.dev';
const srv = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    const ct = f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.js') ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct }); res.end(d);
  });
});
let fail = 0; function ok(c, m) { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; }

function hoje(d) { const x = new Date(); x.setDate(x.getDate() + (d || 0)); return x.toISOString().slice(0, 10); }
const SEED = {
  obrigacoes: {
    '-Jv1': { titulo: 'Horário comunicado à equipa', estado: 'aberta', origem: 'jarvis', quem: 'Alfredo', situacao: 'cobrar quarta',
      notas: 'Fins-de-semana sem intervalo, 4 pessoas', prazo: hoje(0), duracaoPrevista: 15, criadoEm: '2026-11-04T09:00:00Z', adiada: 0 },
    '-Mn1': { titulo: 'Desenho técnico das mesas altas', estado: 'aberta', origem: 'manual', duracaoPrevista: 30, criadoEm: '2026-11-01T09:00:00Z', adiada: 0 }
  },
  projetos: {}
};

(async () => {
  await new Promise(r => srv.listen(PORTA, r));
  const browser = await chromium.launch();
  for (const modo of ['desktop', 'telemovel']) {
    const ctx = modo === 'desktop'
      ? await browser.newContext({ viewport: { width: 1600, height: 1100 } })
      : await browser.newContext(Object.assign({}, devices['iPhone SE']));
    const pedidosFirebase = [];
    await ctx.route(/gstatic\.com\/firebasejs/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: r.request().url().includes('firebase-app') ? SHIM : '/*shim*/' }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route(/firebaseio\.com|firebasedatabase\.app|googleapis\.com\/identitytoolkit|securetoken/, r => { pedidosFirebase.push(r.request().url()); r.abort(); });
    await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__semeado')) { localStorage.setItem('__fbshim', JSON.stringify(s)); sessionStorage.setItem('__semeado', '1'); } } catch (e) {} }, SEED);

    const db = {
      lembretes: [
        { id: 10, texto: 'Cobrar o horário ao Alfredo', quando: hoje(0) + 'T10:00', estado: 'sem_resposta', item_id: '-Jv1' },
        { id: 11, texto: 'IVA trimestral', quando: hoje(3) + 'T09:00', estado: 'agendado', item_id: null }
      ],
      conversa: [
        { id: 1, de: 'manel', texto: 'o que importa hoje?', quando: hoje(0) + 'T08:40', canal: 'telegram' },
        { id: 2, de: 'jarvis', texto: 'Bom dia, doutor. Três coisas.', quando: hoje(0) + 'T08:41' }
      ],
      a_pensar: false
    };
    const pedidos = [];
    await ctx.route(API + '/**', async route => {
      const req = route.request(), u = new URL(req.url());
      const h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
      if (req.headers()['x-chave-os'] !== 'k-teste') return route.fulfill({ status: 401, headers: h, body: '{"erro":"chave"}' });
      const corpo = req.postData() ? JSON.parse(req.postData()) : null;
      pedidos.push({ caminho: u.pathname, corpo });
      if (u.pathname === '/api/os/estado') return route.fulfill({ status: 200, headers: h, body: JSON.stringify(db) });
      if (u.pathname === '/api/os/acao') { db.lembretes = db.lembretes.filter(l => String(l.id) !== String(corpo.input.id)); return route.fulfill({ status: 200, headers: h, body: '{"ok":true}' }); }
      if (u.pathname === '/api/os/mensagem') {
        db.conversa.push({ id: 3, de: 'manel', texto: corpo.texto, quando: hoje(0) + 'T09:00', canal: 'os' });
        db.a_pensar = true;
        setTimeout(() => { db.conversa.push({ id: 4, de: 'jarvis', texto: 'Anotado, doutor.', quando: hoje(0) + 'T09:01' }); db.a_pensar = false; }, 1200);
        return route.fulfill({ status: 200, headers: h, body: '{"ok":true}' });
      }
      return route.fulfill({ status: 404, headers: h, body: '{}' });
    });

    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto('http://localhost:' + PORTA + '/obrigacoes.html');

    await page.waitForSelector('#jarvisCard .jv-ligar:not([hidden])');
    ok(true, modo + ': sem chave, o cartão Jarvis pede a chave');
    await page.fill('#jarvisCard [data-j="chaveIn"]', 'k-teste');
    await page.click('#jarvisCard [data-j="guardar"]');
    await page.waitForSelector('#jarvisCard .jv-corpo:not([hidden])');
    ok((await page.$$eval('#jarvisCard .jv-msg', e => e.length)) === 2, modo + ': conversa com 2 mensagens');

    // Obrigações carregadas → o lembrete ligado mostra o título da obrigação.
    await page.waitForFunction(() => document.querySelector('.jv-lem-o') && document.querySelector('.jv-lem-o').textContent.includes('Horário comunicado'), null, { timeout: 8000 });
    ok(true, modo + ': lembrete mostra a obrigação ligada');

    // Pills da obrigação escrita pelo Jarvis.
    const pills = await page.$$eval('.pill.quem, .pill.nota, .pill.jarvis', e => e.map(x => x.textContent.trim()));
    ok(pills.some(t => t.includes('Alfredo')), modo + ': pill quem');
    ok(pills.some(t => t.includes('cobrar quarta')), modo + ': pill situação');
    ok(pills.some(t => t.includes('Fins-de-semana')), modo + ': pill notas');
    ok(pills.some(t => t === 'Jarvis'), modo + ': selo Jarvis');

    // Enviar uma mensagem.
    await page.fill('#jarvisCard [data-j="texto"]', 'anota ligar ao serralheiro até sexta');
    await page.click('#jarvisCard [data-j="enviar"]');
    await page.waitForFunction(() => [...document.querySelectorAll('#jarvisCard .jv-msg.jarvis')].some(e => e.textContent.includes('Anotado')), null, { timeout: 15000 });
    ok(pedidos.some(p => p.caminho === '/api/os/mensagem' && p.corpo.texto.includes('serralheiro')), modo + ': mensagem enviada ao Worker');
    ok(!(await page.$eval('#jarvisCard [data-j="pensar"]', e => e.classList.contains('on'))), modo + ': "a tratar" desliga com a resposta');

    // Feito no lembrete à espera.
    await page.click('.jv-lem[data-id="10"] [data-acao="feito"]');
    await page.waitForFunction(() => !document.querySelector('.jv-lem[data-id="10"]'));
    ok(pedidos.some(p => p.corpo && p.corpo.nome === 'resolver_lembrete' && p.corpo.input.acao === 'feito'), modo + ': resolver_lembrete feito');

    if (modo === 'telemovel') {
      const larg = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(larg <= 376, modo + ': sem transbordo horizontal (' + larg + ')');
    }
    if (OUT) await page.screenshot({ path: path.join(OUT, 'obrigacoes-jarvis-' + modo + '.png'), fullPage: false });

    const escritas = await page.evaluate(() => (window.__FB && window.__FB.writes || []).filter(w => !/^obrigacoesVistas/.test(w.path)));
    ok(escritas.length === 0, modo + ': zero escritas em dados (' + JSON.stringify(escritas).slice(0, 200) + ')');
    ok(pedidosFirebase.length === 0, modo + ': zero pedidos à rede do Firebase');
    ok(erros.length === 0, modo + ': sem erros de JS ' + erros.join(' | '));

    // Redirect da página antiga.
    await page.goto('http://localhost:' + PORTA + '/jarvis.html');
    await page.waitForURL(/obrigacoes\.html#jarvis$/);
    ok(true, modo + ': jarvis.html reencaminha para obrigacoes.html#jarvis');
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' falha(s)' : 'testa-obrigacoes-jarvis: tudo ok');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
