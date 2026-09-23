/* Teste da vista "Analisar" da custos.html em Chromium (Playwright), com o shim
   do SDK do Firebase (scripts/testa-loja-app-shim.js) — store em memória, nunca
   toca no RTDB. Relógio fixo em 15/06/2099: os 6 meses são 2099-01 … 2099-06
   (Jun em curso). Dataset sintético à mão em custos/2099-xx (Mar NÃO gerado),
   valores a 0,01 € e múltiplos, com um fixo orçamentado, registos por validar,
   um Interno (fora do total) e um anulado (ignorado).
   Verifica: totais, % sobre vendas, média dos meses fechados, barra de
   fiabilidade, "não gerado", "em curso", expansão rubrica→despesa→entidade,
   clique → Validar com filtros, 1600 px e 375 px (scroll interno + coluna
   fixa), tema claro/escuro, ZERO escritas na vista Analisar, Regenerar ×3
   idempotente na própria página, e zero pedidos à rede do Firebase.
   Correr: NODE_PATH=$(npm root -g) node scripts/testa-custos-analise.js [pasta-das-capturas] */
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHIM = fs.readFileSync(__dirname + '/testa-loja-app-shim.js', 'utf8');
const OUT = process.argv[2] || null;
const PORTA = 8767;
const srv = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(f, (e, d) => {
    if (e){ res.writeHead(404); return res.end(); }
    const ct = f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.js') ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct }); res.end(d);
  });
});
let fail = 0; function ok(c, m){ console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; }

/* ---------- dataset ---------- */
function reg(id, mes, rubrica, despesa, ent, valor, fonte, extra){
  return Object.assign({ id: id, origem: 'manual', mesCompetencia: mes, data: mes + '-10', valor: valor, rubrica: rubrica, despesa: despesa,
    entidade: { tipo: 'fornecedor', id: null, nome: ent }, pagamento: { estado: 'pendente', movimentoIds: [] },
    validacao: { estado: 'auto' }, valorFonte: fonte, criadoEm: 1, atualizadoEm: 1 }, extra || {});
}
function mesNo(mes, lista){ const o = { _resumo: { total: -1 } }; lista.forEach(r => { o[r.id] = r; }); return o; }
const PV = { validacao: { estado: 'porValidar', motivo: 'teste' } };
function dados(){
  return {
    custos: {
      '2099-01': mesNo('2099-01', [
        reg('fat:a', '2099-01', 'cmv', 'ALIMENTAR', 'Forn A', 30.01, 'documento'),
        reg('fat:b', '2099-01', 'cmv', 'BEBIDAS', 'Forn B', 0.01, 'documento'),
        reg('rec:p1', '2099-01', 'pessoal', 'Pessoa 1', 'Pessoa 1', 25, 'documento'),
        reg('fixo:renda', '2099-01', 'fixos', 'Renda', 'Senhorio', 10, 'orcamentado'),
        reg('banco:x', '2099-01', null, null, 'Banco X', 0.99, 'movimento', PV),
        reg('banco:int', '2099-01', 'interno', 'Transferência', 'Conta própria', 5, 'movimento'),
        reg('fat:anul', '2099-01', 'cmv', 'ALIMENTAR', 'Forn A', 99.99, 'documento', { anulado: true, anuladoEm: 'x' })
      ]),
      '2099-02': mesNo('2099-02', [
        reg('fat:a', '2099-02', 'cmv', 'ALIMENTAR', 'Forn A', 40, 'documento'),
        reg('rec:p1', '2099-02', 'pessoal', 'Pessoa 1', 'Pessoa 1', 25, 'documento'),
        reg('fixo:renda', '2099-02', 'fixos', 'Renda', 'Senhorio', 10, 'movimento'),
        reg('tsu', '2099-02', 'pessoal', 'TSU patronal', 'Segurança Social', 5.94, 'documento'),
        reg('banco:imp', '2099-02', 'impostos', null, 'AT', 0.05, 'movimento')
      ]),
      // 2099-03: NÃO gerado
      '2099-04': mesNo('2099-04', [ reg('fat:a', '2099-04', 'cmv', 'ALIMENTAR', 'Forn A', 12.34, 'documento') ]),
      '2099-05': mesNo('2099-05', [
        reg('fat:a', '2099-05', 'cmv', 'ALIMENTAR', 'Forn A', 60, 'documento'),
        reg('rec:p1', '2099-05', 'pessoal', 'Pessoa 1', 'Pessoa 1', 25, 'documento'),
        reg('fixo:renda', '2099-05', 'fixos', 'Renda', 'Senhorio', 10, 'orcamentado'),
        reg('fat:serv', '2099-05', 'outros', 'SERVICOS', 'Contabilista', 20, 'documento', PV)
      ]),
      '2099-06': mesNo('2099-06', [ reg('fat:a', '2099-06', 'cmv', 'ALIMENTAR', 'Forn A', 5, 'documento') ])
    },
    vendas: {
      '2099-01': { resumo: { bruto: 100, liquido: 81.3 } }, '2099-02': { resumo: { bruto: 200, liquido: 162.6 } },
      '2099-03': { resumo: { bruto: 150, liquido: 1 } },    '2099-04': { resumo: { bruto: 40, liquido: 1 } },
      '2099-05': { resumo: { bruto: 300, liquido: 1 } },    '2099-06': { resumo: { bruto: 50, liquido: 1 } }
    }
  };
}

// Esperado, calculado à mão (ver o relatório). [valor, %] por mês Jan..Jun + média; 'ng' = não gerado.
const NG = 'ng';
const ESPERADO = {
  'Vendas do mês':  [['100,00 €'], ['200,00 €'], ['150,00 €'], ['40,00 €'], ['300,00 €'], ['50,00 €'], ['160,00 €']],
  'Total de custos':[['66,01 €', '66,0 %'], ['80,99 €', '40,5 %'], NG, ['12,34 €', '30,9 %'], ['115,00 €', '38,3 %'], ['5,00 €', '10,0 %'], ['68,59 €', '42,9 %']],
  'Prime cost':     [['55,02 €', '55,0 %'], ['70,94 €', '35,5 %'], NG, ['12,34 €', '30,9 %'], ['85,00 €', '28,3 %'], ['5,00 €', '10,0 %'], ['55,83 €', '34,9 %']],
  'Resultado':      [['33,99 €', '34,0 %'], ['119,01 €', '59,5 %'], NG, ['27,66 €', '69,2 %'], ['185,00 €', '61,7 %'], ['45,00 €', '90,0 %'], ['91,42 €', '57,1 %']],
  'CMV':            [['30,02 €', '30,0 %'], ['40,00 €', '20,0 %'], NG, ['12,34 €', '30,9 %'], ['60,00 €', '20,0 %'], ['5,00 €', '10,0 %'], ['35,59 €', '22,2 %']],
  'Pessoal':        [['25,00 €', '25,0 %'], ['30,94 €', '15,5 %'], NG, ['0,00 €', '0,0 %'], ['25,00 €', '8,3 %'], ['0,00 €', '0,0 %'], ['20,24 €', '12,6 %']],
  'Fixos':          [['10,00 €', '10,0 %'], ['10,00 €', '5,0 %'], NG, ['0,00 €', '0,0 %'], ['10,00 €', '3,3 %'], ['0,00 €', '0,0 %'], ['7,50 €', '4,7 %']],
  'Outros':         [['0,00 €', '0,0 %'], ['0,00 €', '0,0 %'], NG, ['0,00 €', '0,0 %'], ['20,00 €', '6,7 %'], ['0,00 €', '0,0 %'], ['5,00 €', '3,1 %']],
  'Impostos':       [['0,00 €', '0,0 %'], ['0,05 €', '0,0 %'], NG, ['0,00 €', '0,0 %'], ['0,00 €', '0,0 %'], ['0,00 €', '0,0 %'], ['0,01 €', '0,0 %']],
  'Sem rubrica':    [['0,99 €', '1,0 %'], ['0,00 €', '0,0 %'], NG, ['0,00 €', '0,0 %'], ['0,00 €', '0,0 %'], ['0,00 €', '0,0 %'], ['0,25 €', '0,2 %']],
  'Interno':        [['5,00 €', '5,0 %'], ['0,00 €', '0,0 %'], NG, ['0,00 €', '0,0 %'], ['0,00 €', '0,0 %'], ['0,00 €', '0,0 %'], ['1,25 €', '0,8 %']]
};
const FIAB = { '2099-01': [5502, 1000, 99, '83,4 % · 15,1 % · 1,5 %'], '2099-02': [8099, 0, 0, '100,0 % · 0,0 % · 0,0 %'],
               '2099-04': [1234, 0, 0, '100,0 % · 0,0 % · 0,0 %'], '2099-05': [8500, 1000, 2000, '73,9 % · 8,7 % · 17,4 %'],
               '2099-06': [500, 0, 0, '100,0 % · 0,0 % · 0,0 %'] };

async function novaPagina(browser, opcoes, seed){
  const ctx = await browser.newContext(opcoes);
  const pedidosFirebase = [];
  await ctx.route(/gstatic\.com\/firebasejs/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: r.request().url().includes('firebase-app') ? SHIM : '/*shim*/' }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route(/firebaseio\.com|firebasedatabase\.app|googleapis\.com\/identitytoolkit|securetoken/, r => { pedidosFirebase.push(r.request().url()); r.abort(); });
  await ctx.addInitScript(s => { try { localStorage.setItem('__fbshim', JSON.stringify(s)); } catch (e) {} }, seed);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2099-06-15T12:00:00'));
  page.on('pageerror', e => { console.log('PAGEERROR', e.message); fail++; });
  page.on('console', m => { if (m.type() === 'error') console.log('console.error:', m.text()); });
  await page.goto('http://localhost:' + PORTA + '/custos.html');
  return { ctx, page, pedidosFirebase };
}

async function lerTabela(page){
  return page.$$eval('#cuAnTabela tbody tr', trs => trs.map(tr => {
    const tds = Array.from(tr.children);
    const lab = tds[0].textContent.replace(/[▸▾]/g, '').replace(/\(.*\)/, '').trim();
    return { lab, cls: tr.className, cel: tds.slice(1).map(td => {
      if (td.querySelector('.ng')) return 'ng';
      return Array.from(td.querySelectorAll('.v, .p')).map(e => e.textContent.trim());
    }) };
  }));
}

(async () => {
  await new Promise(r => srv.listen(PORTA, r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));

  /* ===== 1. desktop 1600 px ===== */
  let { ctx, page, pedidosFirebase } = await novaPagina(browser, { viewport: { width: 1600, height: 1000 } }, dados());
  await page.waitForSelector('#cuAnTabela');
  ok(await page.$eval('#cuPainelAnalisar', e => !e.classList.contains('off')) && await page.$eval('#cuPainelValidar', e => e.classList.contains('off')), 'Analisar abre por omissão; Validar escondido');
  const cab = await page.$$eval('#cuAnTabela thead th', ths => ths.map(t => t.querySelector('.mes') ? t.querySelector('.mes').textContent + (t.querySelector('.emcurso') ? '|' + t.querySelector('.emcurso').textContent : '') : t.textContent));
  console.log('cabeçalho:', cab.join(' · '));
  ok(JSON.stringify(cab.slice(1)) === JSON.stringify(['Jan 2099', 'Fev 2099', 'Mar 2099', 'Abr 2099', 'Mai 2099', 'Jun 2099|em curso', 'Média|4 meses fechados']), 'seis meses até ao corrente, Jun "em curso", média de 4 meses fechados');
  ok(await page.$eval('#cuAnTabela thead th[data-mes="2099-06"]', t => t.classList.contains('corrente')), 'coluna do mês corrente marcada .corrente (cinzento)');
  const tab = await lerTabela(page);
  Object.keys(ESPERADO).forEach(lab => {
    const linha = tab.find(t => t.lab.indexOf(lab) === 0);
    if (!linha){ ok(false, 'linha "' + lab + '" existe'); return; }
    const esp = ESPERADO[lab].map(c => c === NG ? 'ng' : c);
    const igual = JSON.stringify(linha.cel) === JSON.stringify(esp);
    ok(igual, 'linha ' + lab + ': ' + linha.cel.map(c => c === 'ng' ? 'não gerado' : c.join(' / ')).join(' | '));
    if (!igual) console.log('   esperado: ' + esp.map(c => c === 'ng' ? 'não gerado' : c.join(' / ')).join(' | '));
  });
  ok(tab.find(t => t.lab === 'Interno').cls.indexOf('fora') !== -1, 'Interno marcado fora do total');
  ok(!tab.some(t => /99,99/.test(JSON.stringify(t.cel))), 'registo anulado ignorado');
  // fiabilidade
  const fiab = await page.$$eval('#cuAnTabela thead th[data-mes]', ths => ths.map(t => { const b = t.querySelector('.cu-fiab'); return { m: t.getAttribute('data-mes'), l: b.getAttribute('data-lido'), o: b.getAttribute('data-orc'), p: b.getAttribute('data-pv'), txt: t.querySelector('.cu-fiab-txt').textContent, title: b.getAttribute('title') }; }));
  fiab.forEach(f => {
    const e = FIAB[f.m];
    if (!e){ ok(f.txt === 'não gerado' && f.l === null, f.m + ' barra: não gerado'); return; }
    ok(+f.l === e[0] && +f.o === e[1] && +f.p === e[2] && f.txt === e[3], f.m + ' fiabilidade lido/orç/pv = ' + f.l + '/' + f.o + '/' + f.p + ' cênt. → ' + f.txt);
  });
  const t01 = fiab.find(f => f.m === '2099-01').title;
  console.log('   title Jan:', t01);
  ok(/Lido 55,02 € .*Orçamentado 10,00 € .*Por validar 0,99 €/.test(t01), 'hover da barra mostra os € por categoria');
  // expansão
  await page.click('#cuAnTabela [data-toggle="r:cmv"].cu-an-seta');
  await page.click('#cuAnTabela [data-toggle="d:cmv|ALIMENTAR"].cu-an-seta');
  await page.click('#cuAnTabela [data-toggle="r:pessoal"].cu-an-seta');
  await page.click('#cuAnTabela [data-toggle="r:impostos"].cu-an-seta');
  const tab2 = await lerTabela(page);
  const lin = n => tab2.find(t => t.lab === n);
  ok(lin('ALIMENTAR') && JSON.stringify(lin('ALIMENTAR').cel[6]) === JSON.stringify(['35,59 €', '22,2 %']), 'CMV → ALIMENTAR: média 35,59 € / 22,2 % (142,35 € ÷ 4; 14235/64000)');
  ok(lin('BEBIDAS') && JSON.stringify(lin('BEBIDAS').cel[0]) === JSON.stringify(['0,01 €', '0,0 %']), 'CMV → BEBIDAS 0,01 € em Jan');
  ok(lin('Forn A') && lin('Forn A').cls.indexOf('nv-e') !== -1 && JSON.stringify(lin('Forn A').cel[4]) === JSON.stringify(['60,00 €', '20,0 %']), 'ALIMENTAR → entidade Forn A');
  ok(lin('Pessoa 1') && lin('TSU patronal') && JSON.stringify(lin('TSU patronal').cel[1]) === JSON.stringify(['5,94 €', '3,0 %']), 'Pessoal → despesas Pessoa 1 e TSU patronal');
  ok(lin('Sem despesa') && JSON.stringify(lin('Sem despesa').cel[1]) === JSON.stringify(['0,05 €', '0,0 %']), 'Impostos → "Sem despesa"');
  if (OUT){ await page.screenshot({ path: path.join(OUT, 'analisar-1600-claro.png'), fullPage: true }); }
  // tema escuro
  await page.click('#toggleTrack');
  await page.waitForTimeout(300);
  const escuro = await page.evaluate(() => {
    const td = document.querySelector('#cuAnTabela tbody tr.nv-r td:nth-child(2) .v');
    const lab = document.querySelector('#cuAnTabela tbody tr.nv-r td.lab');
    return { tema: document.body.getAttribute('data-theme'), cor: getComputedStyle(td).color, fundo: getComputedStyle(lab).backgroundColor };
  });
  console.log('   escuro:', JSON.stringify(escuro));
  const lum = s => { const m = s.match(/[\d.]+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
  ok(escuro.tema === 'dark' && lum(escuro.cor) > 0.6 && lum(escuro.fundo) < 0.25, 'tema escuro: texto claro sobre superfície escura na tabela');
  if (OUT){ await page.screenshot({ path: path.join(OUT, 'analisar-1600-escuro.png'), fullPage: true }); }
  await page.click('#toggleTrack');
  await page.waitForTimeout(200);
  const claro = await page.evaluate(() => getComputedStyle(document.querySelector('#cuAnTabela tbody tr.nv-r td:nth-child(2) .v')).color);
  ok(lum(claro) < 0.3, 'tema claro: texto escuro');

  // clique → Validar
  async function cliqueEVer(alvo, mes, esperado, nome){
    await page.click('#cuAnTabela td[data-mes="' + mes + '"][data-alvo=\'' + JSON.stringify(alvo) + '\']');
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => ({
      validar: !document.getElementById('cuPainelValidar').classList.contains('off'),
      mes: document.getElementById('cuMes').value, rub: document.getElementById('cuFiltroRubrica').value,
      desp: document.getElementById('cuFiltroDespesa').value, ent: document.getElementById('cuFiltroEntidade').value,
      est: document.getElementById('cuFiltroEstado').value,
      linhas: Array.from(document.querySelectorAll('#cuLista tbody tr')).map(tr => tr.children[1].querySelector('.cu-ent').textContent + ' ' + tr.children[2].textContent)
    }));
    const okk = st.validar && st.mes === esperado.mes && st.rub === esperado.rub && st.desp === esperado.desp && st.ent === esperado.ent && st.est === '' && JSON.stringify(st.linhas) === JSON.stringify(esperado.linhas);
    ok(okk, nome + ' → Validar ' + st.mes + ' rubrica=' + st.rub + ' despesa=' + st.desp + ' entidade=' + st.ent + ' · ' + st.linhas.join(' ; '));
    if (!okk) console.log('   esperado', JSON.stringify(esperado));
    await page.click('.cu-tab[data-tab="analisar"]');
    await page.waitForTimeout(100);
  }
  await cliqueEVer({ rubrica: 'cmv' }, '2099-02', { mes: '2099-02', rub: 'cmv', desp: '', ent: '', linhas: ['Forn A 40,00 €'] }, 'CMV × Fev');
  await cliqueEVer({ rubrica: 'cmv', despesa: 'ALIMENTAR', entidade: 'Forn A' }, '2099-05', { mes: '2099-05', rub: 'cmv', desp: 'ALIMENTAR', ent: 'Forn A', linhas: ['Forn A 60,00 €'] }, 'Forn A (ALIMENTAR) × Mai');
  await cliqueEVer({ rubrica: 'impostos', despesa: '__sem__' }, '2099-02', { mes: '2099-02', rub: 'impostos', desp: '__sem__', ent: '', linhas: ['AT 0,05 €'] }, 'Impostos/Sem despesa × Fev');
  await cliqueEVer({ rubrica: 'pessoal', despesa: 'TSU patronal' }, '2099-02', { mes: '2099-02', rub: 'pessoal', desp: 'TSU patronal', ent: '', linhas: ['Segurança Social 5,94 €'] }, 'Pessoal/TSU × Fev');
  await cliqueEVer({}, '2099-01', { mes: '2099-01', rub: '', desp: '', ent: '', linhas: ['Banco X 0,99 €', 'Forn A 30,01 €', 'Pessoa 1 25,00 €', 'Senhorio 10,00 €', 'Conta própria 5,00 €', 'Forn B 0,01 €'] }, 'Total × Jan (sem filtros)');
  await cliqueEVer({ rubrica: 'semRubrica' }, '2099-01', { mes: '2099-01', rub: 'semRubrica', desp: '', ent: '', linhas: ['Banco X 0,99 €'] }, 'Sem rubrica × Jan');
  await cliqueEVer({ rubrica: 'cmv' }, '2099-03', { mes: '2099-03', rub: 'cmv', desp: '', ent: '', linhas: [] }, 'CMV × Mar (não gerado)');
  const writesA = await page.evaluate(() => window.__FB.writes.length);
  ok(writesA === 0, 'Analisar + cliques: ZERO escritas (' + writesA + ')');
  ok(pedidosFirebase.length === 0, 'zero pedidos à rede do Firebase (' + pedidosFirebase.length + ')');
  await ctx.close();

  /* ===== 2. telemóvel 375 px ===== */
  ({ ctx, page, pedidosFirebase } = await novaPagina(browser, Object.assign({}, devices['iPhone 12 Mini'], { viewport: { width: 375, height: 812 } }), dados()));
  await page.waitForSelector('#cuAnTabela');
  const m375 = await page.evaluate(() => {
    const sc = document.getElementById('cuAnScroll');
    const doc = document.scrollingElement;
    const lab0 = document.querySelector('#cuAnTabela tbody tr.nv-r td.lab').getBoundingClientRect().left;
    const col0 = document.querySelector('#cuAnTabela tbody tr.nv-r td:nth-child(2)').getBoundingClientRect().left;
    sc.scrollLeft = 400;
    const lab1 = document.querySelector('#cuAnTabela tbody tr.nv-r td.lab').getBoundingClientRect().left;
    const col1 = document.querySelector('#cuAnTabela tbody tr.nv-r td:nth-child(2)').getBoundingClientRect().left;
    return { touch: document.body.classList.contains('shell-touch'), vw: window.innerWidth, scW: sc.scrollWidth, scC: sc.clientWidth, scL: sc.scrollLeft,
             docW: doc.scrollWidth, lab0, lab1, col0, col1 };
  });
  console.log('   375:', JSON.stringify(m375));
  ok(m375.vw === 375, 'viewport de 375 px (device-width)');
  ok(m375.touch, 'body.shell-touch ao toque');
  ok(m375.scW > m375.scC && m375.scL > 0, 'a tabela faz scroll horizontal dentro do seu contentor');
  ok(m375.docW <= 375, 'a página não faz scroll horizontal (' + m375.docW + ')');
  ok(Math.abs(m375.lab1 - m375.lab0) < 1 && m375.col1 < m375.col0 - 300, 'coluna das rubricas fica fixa enquanto os meses deslizam');
  if (OUT){ await page.screenshot({ path: path.join(OUT, 'analisar-375-claro.png'), fullPage: false }); }
  await page.evaluate(() => { document.getElementById('cuAnScroll').scrollLeft = 0; });
  await page.tap('#toggleTrack'); await page.waitForTimeout(300);
  if (OUT){ await page.screenshot({ path: path.join(OUT, 'analisar-375-escuro.png'), fullPage: false }); }
  ok(await page.evaluate(() => window.__FB.writes.length) === 0 && pedidosFirebase.length === 0, '375: zero escritas, zero pedidos ao Firebase');
  await ctx.close();

  /* ===== 3. Regenerar ×3 na página (motor com valorFonte) ===== */
  const ds = require('./testa-custos-canonico.js').dataset();
  const fontes = { faturasProcessadas: ds.faturasProcessadas, caixaMovimentos: ds.caixaMovimentos, recibos: ds.recibos, compromissosFixos: ds.compromissosFixos,
    pagamentosConcluidos: ds.pagamentosConcluidos, paymentRequests: ds.paymentRequests, contasBancarias: { abanca: { movimentos: ds.movimentos.abanca }, revolut: { movimentos: ds.movimentos.revolut } },
    reconciliacaoBancaria: ds.reconciliacaoBancaria, suppliers: ds.suppliers, classificacaoRegras: ds.classificacaoRegras, classificacaoMovimentos: ds.classificacaoMovimentos,
    classificacaoDespesas: ds.classificacaoDespesas };
  ({ ctx, page, pedidosFirebase } = await novaPagina(browser, { viewport: { width: 1600, height: 1000 } }, fontes));
  await page.waitForFunction(() => !document.getElementById('cuRegenerar').disabled);
  await page.click('.cu-tab[data-tab="validar"]');
  await page.selectOption('#cuMes', '2099-01');
  const estados = [];
  for (let i = 0; i < 3; i++){
    await page.click('#cuRegenerar');
    await page.waitForFunction(() => /escritos/.test(document.getElementById('cuEstadoRegen').textContent));
    estados.push(await page.textContent('#cuEstadoRegen'));
    await page.evaluate(() => { document.getElementById('cuEstadoRegen').textContent = ''; });
  }
  estados.forEach((e, i) => console.log('   regenerar #' + (i + 1) + ': ' + e));
  ok(/^51 registos · 51 escritos · 0 anulados/.test(estados[0]) && /^51 registos · 0 escritos/.test(estados[1]) && /^51 registos · 0 escritos/.test(estados[2]), 'Regenerar ×3: 51 → 0 → 0 escritas, sem duplicar');
  const vf = await page.evaluate(() => { const n = window.__FB.get('custos/2099-01'); const c = {}; Object.keys(n).forEach(k => { if (k[0] !== '_') c[n[k].valorFonte] = (c[n[k].valorFonte] || 0) + 1; }); return c; });
  console.log('   valorFonte gravado:', JSON.stringify(vf));
  ok(vf.documento && vf.movimento && vf.orcamentado && !vf.undefined, 'todos os registos gravados com valorFonte');
  const fora = await page.evaluate(() => window.__FB.writes.filter(w => !/^(custos\/2099-01|classificacaoDespesas)\//.test(w.path)).map(w => w.path));
  ok(fora.length === 0, 'escritas só em custos/2099-01 e classificacaoDespesas/ (' + fora.join(', ') + ')');
  ok(pedidosFirebase.length === 0, 'zero pedidos à rede do Firebase');
  // limpeza do store sintético (em memória + localStorage do contexto)
  const antes = await page.evaluate(() => Object.keys(window.__FB.get('custos/2099-01') || {}).length);
  await page.evaluate(() => { localStorage.removeItem('__fbshim'); });
  const depois = await page.evaluate(() => localStorage.getItem('__fbshim'));
  ok(depois === null, 'limpeza: store sintético (' + antes + ' chaves em custos/2099-01) apagado do localStorage do contexto');
  await ctx.close();

  await browser.close(); srv.close();
  console.log(fail ? ('\n' + fail + ' FALHA(S)') : '\nOK — todos os testes passaram');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
