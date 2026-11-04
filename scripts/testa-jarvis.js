// testa-jarvis.js — testa a jarvis.html com a API do Worker SIMULADA (nunca toca
// no Worker real nem no Firebase). Correr na raiz do clone: node scripts/testa-jarvis.js
const { chromium, devices } = require('playwright');
const path = require('path');
const assert = require('assert');

const URL_PAGINA = 'file://' + path.resolve(__dirname, '..', 'jarvis.html');
const API = 'https://secretaria.eatgioco.workers.dev';

function hoje(d) {
  const x = new Date(); x.setDate(x.getDate() + (d || 0));
  return x.toISOString().slice(0, 10);
}

(async () => {
  const browser = await chromium.launch();
  const falhas = [];
  for (const modo of ['desktop', 'telemovel']) {
    const ctx = modo === 'desktop'
      ? await browser.newContext({ viewport: { width: 1600, height: 1000 } })
      : await browser.newContext(Object.assign({}, devices['iPhone SE']));
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', e => erros.push(e.message));

    const db = {
      itens: [
        { id: 1, titulo: 'Enviar resumo ao Alfredo', quem: 'Alfredo', prazo: hoje(-1) },
        { id: 2, titulo: 'Fotografar a batata-doce', prazo: hoje(0), detalhe: 'Para a Glovo' },
        { id: 3, titulo: 'Decidir Campo Novo' }
      ],
      lembretes: [
        { id: 10, texto: 'Cobrar horário ao Alfredo', quando: hoje(0) + 'T10:00', estado: 'sem_resposta' },
        { id: 11, texto: 'IVA trimestral', quando: hoje(3) + 'T09:00', estado: 'agendado' }
      ]
    };
    const pedidos = [];
    let chaveValida = 'segredo-teste';

    await page.route('https://fonts.googleapis.com/**', r => r.abort());
    await page.route('https://fonts.gstatic.com/**', r => r.abort());
    await page.route(API + '/**', async route => {
      const req = route.request();
      const u = new URL(req.url());
      const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
      if (req.headers()['x-chave-os'] !== chaveValida) return route.fulfill({ status: 401, headers: cors, body: '{"erro":"chave"}' });
      const corpo = req.postData() ? JSON.parse(req.postData()) : null;
      pedidos.push({ metodo: req.method(), caminho: u.pathname, corpo });
      if (u.pathname === '/api/os/estado') return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(db) });
      if (u.pathname === '/api/os/acao') {
        const { nome, input } = corpo;
        if (nome === 'concluir_item' || nome === 'anular_item') db.itens = db.itens.filter(i => i.id !== input.id);
        if (nome === 'adicionar_item') db.itens.push(Object.assign({ id: 100 + db.itens.length }, input));
        if (nome === 'resolver_lembrete' || nome === 'cancelar_lembrete') db.lembretes = db.lembretes.filter(l => String(l.id) !== String(input.id));
        return route.fulfill({ status: 200, headers: cors, body: '{"ok":true}' });
      }
      return route.fulfill({ status: 404, headers: cors, body: '{}' });
    });

    page.on('dialog', d => d.accept());
    await page.goto(URL_PAGINA);

    // 1. Sem chave: pede a chave e não mostra a grelha.
    await page.waitForSelector('#jvLigar:not([hidden])');
    assert(await page.isHidden('#jvGrid'), 'grelha visível sem chave');

    // 2. Chave errada → recusada.
    await page.fill('#jvChaveIn', 'errada');
    await page.click('#jvGuardarChave');
    await page.waitForFunction(() => document.getElementById('jvEstadoTxt').textContent.includes('recusada'));

    // 3. Chave certa → caderno e lembretes, sem conversa.
    await page.fill('#jvChaveIn', chaveValida);
    await page.click('#jvGuardarChave');
    await page.waitForSelector('#jvGrid:not([hidden])');
    const grupos = await page.$$eval('.jv-grupo-t', els => els.map(e => e.textContent));
    assert(grupos.some(g => g.startsWith('Prazo passado')), 'falta grupo prazo passado: ' + grupos);
    assert(grupos.some(g => g.startsWith('Hoje')), 'falta grupo hoje');
    assert(grupos.some(g => g.startsWith('Sem prazo')), 'falta grupo sem prazo');
    assert(grupos.some(g => g.startsWith('À espera de resposta')), 'falta lembrete sem resposta');
    assert.strictEqual(await page.$$eval('#jvMsgs, #jvTexto, #jvEnviar, .jv-conversa-card', e => e.length), 0, 'a conversa continua na página');

    // 4. Concluir um item → acao concluir_item.
    await page.click('.jv-item[data-id="2"] [data-acao="concluir"]');
    await page.waitForFunction(() => !document.querySelector('.jv-item[data-id="2"]'));
    assert(pedidos.some(p => p.corpo && p.corpo.nome === 'concluir_item' && p.corpo.input.id === 2));

    // 5. Desfazer → adicionar_item com os mesmos dados.
    await page.click('#jvDesfazer');
    await page.waitForFunction(() => [...document.querySelectorAll('.jv-item-t')].some(e => e.textContent === 'Fotografar a batata-doce'));
    const re = pedidos.filter(p => p.corpo && p.corpo.nome === 'adicionar_item').pop();
    assert.strictEqual(re.corpo.input.detalhe, 'Para a Glovo');

    // 6. Anotar novo.
    await page.fill('#jvNovoTitulo', 'Ligar ao serralheiro');
    await page.fill('#jvNovoQuem', 'Serralheiro');
    await page.click('#jvNovo button[type=submit]');
    await page.waitForFunction(() => [...document.querySelectorAll('.jv-item-t')].some(e => e.textContent === 'Ligar ao serralheiro'));

    // 7. Lembrete sem resposta → Feito.
    await page.click('.jv-lem[data-id="10"] [data-acao="lem-feito"]');
    await page.waitForFunction(() => !document.querySelector('.jv-lem[data-id="10"]'));
    assert(pedidos.some(p => p.corpo && p.corpo.nome === 'resolver_lembrete' && p.corpo.input.acao === 'feito'));

    // 8. Nunca pede nem envia conversa.
    assert(!pedidos.some(p => p.caminho === '/api/os/mensagem'), 'enviou uma mensagem');

    // 9. Sem transbordo horizontal ao telemóvel.
    if (modo === 'telemovel') {
      const larg = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(larg <= 376, 'transborda: ' + larg);
    }
    await page.screenshot({ path: '/tmp/jarvis-' + modo + '.png', fullPage: true });

    if (erros.length) falhas.push(modo + ': ' + erros.join(' | '));
    await ctx.close();
    console.log('ok', modo);
  }
  await browser.close();
  if (falhas.length) { console.error(falhas.join('\n')); process.exit(1); }
  console.log('testa-jarvis: tudo ok');
})().catch(e => { console.error(e); process.exit(1); });
