/* Teste da gestão de PINs da app de loja: equipa.html define/repõe/remove o
   PIN em testeLojaApp/pins/ (hash SHA-256, nunca o PIN em claro) e a
   loja-app-teste.html só verifica — sem auto-registo. Chromium + o mesmo shim
   do SDK do testa-loja-app.js. Nunca toca no RTDB.
   Correr: NODE_PATH=$(npm root -g) node scripts/testa-loja-app-pins.js */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const SHIM=fs.readFileSync(__dirname+'/testa-loja-app-shim.js','utf8');
const srv=http.createServer((req,res)=>{const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));
 fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':(f.endsWith('.js')?'application/javascript':'application/octet-stream')});res.end(d);});});
function sha256(s){return require('crypto').createHash('sha256').update(s).digest('hex');}
let fail=0;function ok(c,m){console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;}
(async()=>{
 await new Promise(r=>srv.listen(8766,r));
 const browser=await chromium.launch({args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:1200,height:900}});
 await ctx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({status:200,contentType:'application/javascript',body:r.request().url().includes('firebase-app')?SHIM:'/*shim*/'}));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdnjs|pdf\.js|pdfjs/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
 const page=await ctx.newPage();
 page.on('pageerror',e=>{console.log('PAGEERROR',e.message);fail++;});
 page.on('dialog',d=>{ if(d.type()==='prompt') d.accept('gioco2026'); else d.accept(); });
 await page.addInitScript(()=>{window.__seed=()=>{window.__FB.seed('pessoas',{pA:{nome:'Alfredo',funcao:'Head of Operations',cor:'#1D5C8A',ativo:true},pB:{nome:'Beatriz',funcao:'Balcão',cor:'#D91124',ativo:true}});};});
 // ===== equipa.html =====
 await page.goto('http://localhost:8766/equipa.html');
 await page.evaluate(()=>window.__seed());await page.waitForTimeout(600);
 await page.click('#tabPessoas');
 let t=await page.textContent('#pessoasList');
 ok(t.includes('PIN loja: sem PIN')&&!t.includes('definido'),'cartões mostram "sem PIN"');
 const w0=(await page.evaluate(()=>window.__FB.writes)).length;
 // definir PIN da Beatriz
 await page.evaluate(()=>abrirPinLoja('pB'));
 await page.fill('#pinLoja1','111111');await page.fill('#pinLoja2','111111');await page.click('#btnGuardarPinLoja');
 ok((await page.textContent('#pinLojaErro')).includes('óbvio'),'recusa 111111');
 await page.fill('#pinLoja1','123456');await page.fill('#pinLoja2','123456');await page.click('#btnGuardarPinLoja');
 ok((await page.textContent('#pinLojaErro')).includes('óbvio'),'recusa 123456');
 await page.fill('#pinLoja1','000000');await page.fill('#pinLoja2','000000');await page.click('#btnGuardarPinLoja');
 ok((await page.textContent('#pinLojaErro')).includes('óbvio'),'recusa 000000');
 await page.fill('#pinLoja1','246813');await page.fill('#pinLoja2','246814');await page.click('#btnGuardarPinLoja');
 ok((await page.textContent('#pinLojaErro')).includes('coincidem'),'recusa PINs diferentes');
 await page.fill('#pinLoja1','246813');await page.fill('#pinLoja2','246813');await page.click('#btnGuardarPinLoja');
 await page.waitForTimeout(400);
 let w=await page.evaluate(()=>window.__FB.writes);
 let pw=w.filter(x=>x.path==='testeLojaApp/pins/pB');
 ok(pw.length===1&&pw[0].valor.hash===sha256('pB:246813'),'hash gravado = sha256(pB:246813)');
 ok(!JSON.stringify(w).includes('246813'),'PIN em claro não aparece em nenhuma escrita');
 ok(!JSON.stringify(await page.evaluate(()=>Object.assign({},localStorage))).includes('246813'),'PIN em claro não está no localStorage');
 ok(!(await page.$eval('#pinLojaModal',e=>e.classList.contains('open'))),'modal fecha ao guardar');
 t=await page.textContent('#pessoasList');
 ok(t.includes('PIN loja: definido')&&t.includes('Repor PIN')&&t.includes('Remover PIN'),'cartão passa a "definido" com Repor/Remover');
 ok(!t.includes('246813')&&!t.includes(sha256('pB:246813')),'nem PIN nem hash no cartão');
 // repor
 await page.evaluate(()=>abrirPinLoja('pB'));
 ok((await page.textContent('#pinLojaTitulo')).startsWith('Repor PIN'),'título Repor');
 await page.fill('#pinLoja1','135790');await page.fill('#pinLoja2','135790');await page.click('#btnGuardarPinLoja');await page.waitForTimeout(300);
 const hashNovo=(await page.evaluate(()=>window.__FB.get('testeLojaApp/pins/pB'))).hash;
 ok(hashNovo===sha256('pB:135790'),'repor grava hash novo');
 w=await page.evaluate(()=>window.__FB.writes);
 const fora=w.filter(x=>!x.path.startsWith('testeLojaApp/')&&!/^(pessoas|turnos|admissoesTemplate|padroes|ferias|fechados)\b/.test(x.path));
 ok(fora.length===0,'equipa.html: fora das sementes que já existiam, só testeLojaApp/ ('+w.length+' escritas'+(fora.length?' FORA: '+fora.map(x=>x.path):'')+')');
 // ===== app: PIN novo entra, antigo não =====
 const store=await page.evaluate(()=>JSON.stringify(window.__FB.store));
 const app=await ctx.newPage();
 app.on('pageerror',e=>{console.log('PAGEERROR app',e.message);fail++;});
 await app.addInitScript((st)=>{if(!sessionStorage.getItem('__seeded')){sessionStorage.setItem('__seeded','1');localStorage.setItem('__fbshim',st);localStorage.removeItem('testeLojaApp.sessao');}},store);
 await app.goto('http://localhost:8766/loja-app-teste.html');await app.waitForTimeout(400);
 const kp=async s=>{for(const c of s){await app.evaluate(k=>kp(k),c);}await app.waitForTimeout(400);};
 await app.evaluate(()=>escolhe('pB'));
 await kp('246813');
 ok(!(await app.$eval('#login',e=>e.classList.contains('hidden'))),'app: PIN antigo já não entra');
 await app.waitForTimeout(700);await kp('135790');
 ok(await app.$eval('#login',e=>e.classList.contains('hidden')),'app: PIN novo entra');
 ok((await app.textContent('#gTitle')).includes('Beatriz'),'app: entra como Beatriz');
 // sem PIN (Alfredo) não entra nem define
 await app.evaluate(()=>sair());await app.evaluate(()=>escolhe('pA'));
 ok((await app.textContent('#pMsg')).includes('pede ao Manel')||(await app.textContent('#pMsg')).includes('Pede ao Manel'),'app: mensagem "pede ao Manel"');
 ok((await app.$eval('#pinPad',e=>e.children.length))===0,'app: sem teclado para quem não tem PIN');
 await kp('135790');await kp('135790');
 ok(!(await app.$eval('#login',e=>e.classList.contains('hidden'))),'app: sem PIN não entra mesmo com teclas');
 const wa=await app.evaluate(()=>window.__FB.writes);
 ok(!wa.some(x=>x.path.startsWith('testeLojaApp/pins')),'app: zero escritas em testeLojaApp/pins');
 const src=fs.readFileSync(ROOT+'/loja-app-teste.html','utf8');
 ok(!/pins\/'\+.*\.set\(|\/pins\/.*set\(/.test(src)&&!src.includes("pinModo"),'app: sem caminho de definir PIN no código');
 // remover PIN na equipa → app deixa de entrar
 await page.evaluate(()=>removerPinLoja('pB'));await page.waitForTimeout(300);
 ok((await page.evaluate(()=>window.__FB.get('testeLojaApp/pins/pB')))===null,'remover apaga a chave');
 ok((await page.textContent('#pessoasList')).includes('sem PIN'),'cartão volta a "sem PIN"');
 const st2=await page.evaluate(()=>JSON.stringify(window.__FB.store));
 await app.evaluate((s)=>{localStorage.setItem('__fbshim',s);},st2);await app.reload();await app.waitForTimeout(400);
 await app.evaluate(()=>escolhe('pB'));
 //console.log('DEBUG PINS',await app.evaluate(()=>JSON.stringify(PINS)),'store',await app.evaluate(()=>JSON.stringify(window.__FB.get('testeLojaApp/pins'))),'msg',await app.textContent('#pMsg'),'login hidden',await app.$eval('#login',e=>e.classList.contains('hidden')));
 ok((await app.textContent('#pMsg')).toLowerCase().includes('pede ao manel'),'app: depois de remover, Beatriz vê a mensagem');
 await kp('135790');
 ok(!(await app.$eval('#login',e=>e.classList.contains('hidden'))),'app: depois de remover, não entra');
 await browser.close();srv.close();
 console.log(fail?('\n'+fail+' FALHAS'):'\nTUDO OK');process.exit(fail?1:0);
})();
