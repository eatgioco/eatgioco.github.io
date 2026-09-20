/* Teste da loja-app-teste.html em Chromium (Playwright) com um shim do SDK do
   Firebase que regista TODAS as escritas: PIN errado/certo, temperatura gravada
   e visível depois de reabrir, fila offline com a hora original, checklist,
   picagem, pedidos, e ZERO escritas fora de testeLojaApp/. Nunca toca no RTDB.
   Correr: NODE_PATH=$(npm root -g) node scripts/testa-loja-app.js */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const SHIM=fs.readFileSync(__dirname+'/testa-loja-app-shim.js','utf8');
const srv=http.createServer((req,res)=>{const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));
 fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});res.end(d);});});
function sha256(s){return require('crypto').createHash('sha256').update(s).digest('hex');}
let fail=0;function ok(c,m){console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;}
(async()=>{
 await new Promise(r=>srv.listen(8765,r));
 const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium/chrome',args:['--no-sandbox']}).catch(async e=>{return chromium.launch({args:['--no-sandbox']});});
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 await ctx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({status:200,contentType:'application/javascript',body:r.request().url().includes('firebase-app')?SHIM:'/*shim*/'}));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
 const page=await ctx.newPage();
 page.on('pageerror',e=>{console.log('PAGEERROR',e.message);fail++;});
 page.on('console',m=>{if(m.type()==='error')console.log('console.error:',m.text());});
 // seed antes de carregar: pessoas reais + equipamentos + pin do Alfredo
 await page.addInitScript(({hash})=>{window.addEventListener('DOMContentLoaded',()=>{});
  const orig=window.__seed=()=>{window.__FB.seed('pessoas',{pA:{nome:'Alfredo',funcao:'Head of Operations',cor:'#1D5C8A',ativo:true},pB:{nome:'Beatriz',funcao:'Balcão',cor:'#D91124',ativo:true},pX:{nome:'Antigo',ativo:false}});
   window.__FB.seed('equipamentos',{camarafrigorifica:{nome:'Câmara Frigorífica horizontal',zona:'Área técnica',ordem:2,tipo:'refrigeracao',limiteMin:0,limiteMax:5,registaTemperatura:true,ativo:true},forno:{nome:'Forno',tipo:'outro',registaTemperatura:false,ativo:true},friohorizcongelados:{nome:'1 - Frio horizontal congelados',zona:'Zona de preparações',ordem:1,tipo:'congelacao',limiteMin:-25,limiteMax:-18,registaTemperatura:true,ativo:true}});
   window.__FB.seed('testeLojaApp/pins/pA',{hash:hash});};
 },{hash:sha256('pA:'+'246813')});
 await page.goto('http://localhost:8765/loja-app-teste.html');
 await page.evaluate(()=>window.__seed());
 await page.waitForTimeout(300);
 // 1. pessoas reais
 const pessoas=await page.$$eval('#people .p-row .p-n b',els=>els.map(e=>e.textContent));
 ok(JSON.stringify(pessoas)==='["Alfredo","Beatriz"]','pessoas reais, sem inativos: '+pessoas);
 ok((await page.textContent('.aviso-teste')).trim()==='Versão de teste · os registos são gravados','faixa do topo');
 // 2. PIN errado
 const kp=async s=>{for(const c of s){await page.evaluate(k=>kp(k),c);}await page.waitForTimeout(400);};
 await page.evaluate(()=>escolhe('pA'));
 await kp('000000');
 ok(!(await page.$eval('#login',e=>e.classList.contains('hidden'))),'PIN errado não entra');
 await page.waitForTimeout(700);
 await kp('246813');
 ok(await page.$eval('#login',e=>e.classList.contains('hidden')),'PIN certo entra');
 ok((await page.textContent('#gTitle')).includes('Alfredo'),'entra como a pessoa certa: '+(await page.textContent('#gTitle')));
 // 3. registar temperatura (com foto simulada por dataUrl) fora da janela -> usar simulação 11:00
 await page.evaluate(()=>{DEMO.ativo=true;DEMO.dia=new Date().getDay();DEMO.hora=11;DEMO.min=0;render();});
 await page.evaluate(()=>abrirTemp('camarafrigorifica'));
 await page.evaluate(()=>{tk('3');tk('2');});
 ok(await page.$eval('#tsave',b=>b.disabled),'sem foto o botão fica bloqueado');
 await page.evaluate(()=>{tmp.foto='data:image/jpeg;base64,/9j/4AAQ';tk('');});
 ok(!(await page.$eval('#tsave',b=>b.disabled)),'com foto e valor desbloqueia');
 await page.evaluate(()=>salvaTemp());
 await page.waitForTimeout(200);
 let w=await page.evaluate(()=>window.__FB.writes);
 const t=w.find(x=>/testeLojaApp\/registos\/\d{4}-\d\d-\d\d\/temperaturas\//.test(x.path));
 ok(!!t,'temperatura gravada em testeLojaApp/registos/{dia}/temperaturas/');
 ok(t&&t.valor.temperatura===3.2&&t.valor.pessoa==='Alfredo'&&t.valor.pessoaId==='pA'&&t.valor.temFoto===true&&t.valor.foraLimite===false&&t.valor.ronda==='manha','conteúdo: '+JSON.stringify(t&&t.valor));
 ok(w.some(x=>x.path.startsWith('testeLojaApp/fotos/')),'foto gravada em testeLojaApp/fotos/');
 // 4. reabrir (reload) e confirmar valor + nome
 await page.reload();await page.evaluate(()=>window.__seed());await page.waitForTimeout(400);
 ok(await page.$eval('#login',e=>e.classList.contains('hidden')),'sessão retomada ao reabrir');
 await page.evaluate(()=>{DEMO.ativo=true;DEMO.hora=11;DEMO.min=0;render();});
 const reg=await page.textContent('#sc-registos');
 ok(reg.includes('3.2°')&&reg.includes('Alfredo'),'depois de reabrir: 3.2° por Alfredo visível');
 // 5. modo avião
 await page.evaluate(()=>window.__FB.setOnline(false));await page.waitForTimeout(100);
 await page.evaluate(()=>abrirTemp('friohorizcongelados'));
 await page.evaluate(()=>{tk('−');tk('1');tk('9');tk('5');tmp.foto='data:image/jpeg;base64,/9j/4AAQ';tk('');salvaTemp();});
 await page.waitForTimeout(200);
 const fila=await page.evaluate(()=>JSON.parse(localStorage.getItem('testeLojaApp.fila')));
 ok(fila.length===2,'sem rede: 2 itens (registo+foto) em fila local: '+fila.length);
 ok((await page.textContent('#sc-registos')).includes('por enviar'),'lista mostra "por enviar"');
 ok((await page.textContent('#sc-hoje')).includes('guardados no telemóvel'),'netbar avisa');
 const horaOriginal=fila[0].valor.dataHora;
 // fechar e reabrir ainda sem rede: fila persiste e registo aparece
 await page.reload();await page.evaluate(()=>{window.__FB.setOnline(false);window.__seed();});await page.waitForTimeout(400);
 await page.evaluate(()=>{DEMO.ativo=true;DEMO.hora=11;DEMO.min=0;render();});
 ok((await page.textContent('#sc-registos')).includes('-19.5°'),'reaberto sem rede: -19.5° visível a partir da fila');
 await page.waitForTimeout(1500);
 await page.evaluate(()=>window.__FB.setOnline(true));await page.waitForTimeout(500);
 w=await page.evaluate(()=>window.__FB.writes);
 const t2=w.find(x=>x.path.includes('/temperaturas/')&&x.valor.temperatura===-19.5);
 ok(!!t2&&t2.valor.dataHora===horaOriginal&&t2.valor.registadoOffline===true,'subiu com a hora original '+horaOriginal+' (enviado '+(t2&&new Date(t2.em).toISOString())+')');
 const filaDepois=await page.evaluate(()=>JSON.parse(localStorage.getItem('testeLojaApp.fila')));
 ok(filaDepois.length===0,'fila vazia depois de subir');
 // 6. checklist, picagem, ruptura, pedido, férias
 await page.evaluate(()=>{picar();});await page.waitForTimeout(100);
 const mod=await page.$eval('#modal',m=>m.classList.contains('aberto'));
 if(mod)await page.evaluate(()=>okMotivo('in','Cheguei mais cedo'));
 await page.evaluate(()=>{tog('abertura',0);fecharChk('abertura');});
 await page.evaluate(()=>{abrirRuptura();document.getElementById('rI').value='papel vegetal';salvaRuptura();});
 await page.evaluate(()=>{abrirPedido();document.getElementById('qT').value='torneira a pingar';salvaPedido();});
 await page.waitForTimeout(200);
 w=await page.evaluate(()=>window.__FB.writes);
 ok(w.some(x=>x.path.includes('/picagens/')&&x.valor.tipo==='entrada'),'picagem de entrada gravada');
 ok((await page.textContent('#sc-hoje')).includes('Picar saída'),'estado em turno derivado das picagens');
 ok(w.some(x=>/\/checklists\/abertura\/itens\/0$/.test(x.path)&&x.valor===true),'visto de checklist gravado folha a folha');
 ok(w.some(x=>/\/checklists\/abertura\/concluidoEm$/.test(x.path)),'checklist concluída');
 ok(w.some(x=>x.path.includes('/pedidos/')&&x.valor.tipo==='ruptura'),'ruptura gravada');
 ok(w.some(x=>x.path.includes('/pedidos/')&&x.valor.tipo==='pedido'),'pedido gravado');
 ok((await page.textContent('#sc-pedidos')).includes('papel vegetal'),'pedidos aparecem na lista');
 // 7. NADA fora de testeLojaApp/
 const fora=w.filter(x=>!x.path.startsWith('testeLojaApp/'));
 ok(fora.length===0,'zero escritas fora de testeLojaApp/ ('+w.length+' escritas no total)'+(fora.length?' FORA: '+fora.map(x=>x.path):''));
 // 8. definir PIN pela primeira vez (Beatriz)
 await page.evaluate(()=>sair());await page.evaluate(()=>escolhe('pB'));
 ok((await page.textContent('#pMsg')).includes('Ainda não tens PIN'),'pessoa sem PIN → definir');
 await kp('111111');
 ok((await page.textContent('#pMsg')).includes('Ainda não tens PIN'),'PIN repetido recusado');
 await page.waitForTimeout(700);await kp('135790');await kp('135790');await page.waitForTimeout(300);
 const pinW=(await page.evaluate(()=>window.__FB.writes)).find(x=>x.path==='testeLojaApp/pins/pB');
 ok(!!pinW&&pinW.valor.hash===sha256('pB:135790')&&!JSON.stringify(pinW.valor).includes('135790'),'PIN da Beatriz guardado como hash, sem PIN em claro');
 ok((await page.textContent('#gTitle')).includes('Beatriz'),'entra como Beatriz');
 // 9. sha256 JS puro == subtle
 const js=await page.evaluate(()=>sha256Js(new TextEncoder().encode('pA:246813')));
 ok(js===sha256('pA:246813'),'sha256Js bate com o node');
 await browser.close();srv.close();
 console.log(fail?('\n'+fail+' FALHAS'):'\nTUDO OK');process.exit(fail?1:0);
})();
