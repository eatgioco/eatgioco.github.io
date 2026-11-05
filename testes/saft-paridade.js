#!/usr/bin/env node
/* Teste de PARIDADE da importação do SAF-T (Nov/2026) — bloqueia o merge.
 *
 *   cd testes && npm install        (uma vez: jsdom e jszip, só para este teste)
 *   node testes/saft-paridade.js    [pasta-com-SAF-T ...]
 *
 * Para CADA ficheiro SAF-T real, compara o que QUATRO caminhos gravariam no
 * Firebase com o mesmo ficheiro e o mesmo estado de partida:
 *
 *   a) a vendas.html ANTERIOR ao gioco-saft.js (commit BASE, com DOMParser e
 *      JSZip) — a referência: é "o que a página sempre fez";
 *   b) GiocoSaft.construirPayload() chamado directamente;
 *   c) o Worker do Jarvis (secretaria/src/saft.mjs): ficheiro recebido, resumo,
 *      botão "Gravar";
 *   d) a vendas.html ACTUAL, que consome o gioco-saft.js.
 *
 * As páginas correm inteiras em jsdom, com os cliques nos botões. As escritas
 * são interceptadas na fronteira (set() do SDK na página, PUT por REST no
 * Worker) e comparadas depois de serialização canónica: mesmos caminhos,
 * mesmas chaves, mesmos valores. Uma diferença de um cêntimo é falha.
 *
 * NADA aqui toca no Firebase: a base é um objecto em memória, que imita o que
 * o Firebase faz aos dados (deita fora null e vazios; devolve listas quando as
 * chaves são números — ao SDK sem os buracos, por REST com null neles).
 *
 * Cenários por ficheiro:
 *   vazio      base vazia, sem catálogo: páginas (a = d) classificam os
 *              produtos pela sugestão; o Jarvis NÃO grava e lista os produtos.
 *   novo       só o catálogo: primeira importação do ficheiro.
 *   histórico  os ficheiros entram uns a seguir aos outros, pela ordem em que
 *              foram exportados, sobre o estado que os anteriores deixaram
 *              (reimportações parciais, madrugadas, dias substituídos).
 *   repetido   o mesmo ficheiro outra vez, logo a seguir: zero documentos
 *              novos, variação zero, totais iguais.
 * Mais: ficheiros sem faturas e ficheiros corrompidos — nenhuma escrita.
 *
 * Variáveis: SAFT_DIR (pasta dos SAF-T), SECRETARIA_DIR (pasta do Worker),
 * SAFT_BASE (commit da vendas.html de referência).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

const RAIZ = path.join(__dirname, '..');
const BASE_COMMIT = process.env.SAFT_BASE || '25f27cb';
const SECRETARIA = process.env.SECRETARIA_DIR ||
  'C:/Users/Manel - GIOCO®/GIOCO/GIOCOHQ - Documents/00. HQ/00. Admin/Claude/secretaria';
const PASTAS = process.argv.slice(2).length ? process.argv.slice(2) : [process.env.SAFT_DIR ||
  'C:/Users/Manel - GIOCO®/GIOCO/GIOCOHQ - Documents/00. HQ/00. Admin/Claude/Relatorios Externos/Zone Soft'];
const INSTANTE = Date.parse('2026-11-05T12:00:00.000Z');   // "agora" fixo, igual nos quatro caminhos

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
  require.resolve('jszip');
} catch (e) {
  console.error('Faltam as dependências do teste: corre "npm install" dentro de testes/.');
  process.exit(2);
}
const GiocoSaft = require(path.join(RAIZ, 'gioco-saft.js'));

let falhas = 0, verificacoes = 0;
function falha(msg){ falhas++; console.error('  ✗ ' + msg); }
function ok(cond, msg){ verificacoes++; if (!cond) falha(msg); return !!cond; }

/* ---------- serialização canónica ---------- */
function canon(v){
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canon);
  const out = {};
  Object.keys(v).sort().forEach(function(k){ out[k] = canon(v[k]); });
  return out;
}
function texto(v){ return JSON.stringify(canon(v)); }
function primeiraDiferenca(a, b, caminho){
  caminho = caminho || '';
  if (a === b) return null;
  const oa = a !== null && typeof a === 'object', ob = b !== null && typeof b === 'object';
  if (!oa || !ob) return caminho + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b);
  const ks = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort();
  for (const k of ks){
    if (!(k in a)) return caminho + '/' + k + ': falta no primeiro';
    if (!(k in b)) return caminho + '/' + k + ': falta no segundo';
    const d = primeiraDiferenca(a[k], b[k], caminho + '/' + k);
    if (d) return d;
  }
  return null;
}
function iguais(nome, a, b, ctx){
  verificacoes++;
  if (texto(a) === texto(b)) return true;
  falha(ctx + ' — ' + nome + ' diferem: ' + primeiraDiferenca(canon(a), canon(b)));
  return false;
}

/* ---------- Firebase em memória ---------- */
function temUndefined(v){
  if (v === undefined) return true;
  if (v === null || typeof v !== 'object') return false;
  return Object.keys(v).some(function(k){ return temUndefined(v[k]); });
}
// Como o Firebase guarda: sem null, sem vazios; as listas são mapas de índices.
function guardado(v){
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'object') return v;
  const out = {};
  let tem = false;
  Object.keys(v).forEach(function(k){
    const f = guardado(v[k]);
    if (f !== undefined){ out[k] = f; tem = true; }
  });
  return tem ? out : undefined;
}
// Regra do Firebase para devolver uma lista: todas as chaves inteiras e a maior < 2 × nº de chaves.
function eLista(o){
  const ks = Object.keys(o);
  if (!ks.length) return false;
  let max = -1;
  for (const k of ks){
    if (!/^(0|[1-9]\d*)$/.test(k)) return false;
    max = Math.max(max, Number(k));
  }
  return max < 2 * ks.length;
}
function vistaSdk(v){            // snap.val(): lista SEM os índices em falta
  if (v === undefined || v === null) return null;
  if (typeof v !== 'object') return v;
  const out = eLista(v) ? [] : {};
  Object.keys(v).forEach(function(k){ out[k] = vistaSdk(v[k]); });
  return out;
}
function vistaRest(v){           // GET .json: lista COM null nos buracos
  if (v === undefined || v === null) return null;
  if (typeof v !== 'object') return v;
  if (eLista(v)){
    const max = Math.max.apply(null, Object.keys(v).map(Number));
    const arr = [];
    for (let i = 0; i <= max; i++) arr.push(i in v ? vistaRest(v[i]) : null);
    return arr;
  }
  const out = {};
  Object.keys(v).forEach(function(k){ out[k] = vistaRest(v[k]); });
  return out;
}

function Base(dados){
  this.raiz = dados ? JSON.parse(JSON.stringify(dados)) : {};
  this.escritas = [];
  this.outras = [];              // qualquer operação que não devia existir (update, remove, push…)
}
Base.prototype.no = function(caminho){
  let n = this.raiz;
  const partes = caminho.split('/').filter(Boolean);
  for (const p of partes){
    if (n === undefined || n === null || typeof n !== 'object') return undefined;
    n = n[p];
  }
  return n;
};
Base.prototype.set = function(caminho, valor){
  if (temUndefined(valor)) throw new Error('set() com undefined em ' + caminho + ' — o SDK rejeitava');
  const limpo = JSON.parse(JSON.stringify(valor));
  this.escritas.push({ path: caminho, valor: limpo });
  const partes = caminho.split('/').filter(Boolean);
  let n = this.raiz;
  for (let i = 0; i < partes.length - 1; i++){
    if (!n[partes[i]] || typeof n[partes[i]] !== 'object') n[partes[i]] = {};
    n = n[partes[i]];
  }
  const g = guardado(limpo);
  if (g === undefined) delete n[partes[partes.length - 1]];
  else n[partes[partes.length - 1]] = g;
};
Base.prototype.clone = function(){ return new Base(this.raiz); };

function firebaseFalso(base){
  function ref(caminho){
    caminho = String(caminho || '').replace(/^\/+|\/+$/g, '');
    const r = {
      child: function(k){ return ref(caminho ? caminho + '/' + k : String(k)); },
      once: function(){ return Promise.resolve({ val: function(){ return vistaSdk(base.no(caminho)); } }); },
      set: function(v){
        try { base.set(caminho, v); } catch (e){ return Promise.reject(e); }
        return Promise.resolve();
      },
      on: function(ev, cb){ Promise.resolve().then(function(){ cb({ val: function(){ return vistaSdk(base.no(caminho)); } }); }); },
      off: function(){}
    };
    ['update', 'remove', 'push', 'transaction'].forEach(function(op){
      r[op] = function(){ base.outras.push(op + ' ' + caminho); return Promise.reject(new Error(op + ' não esperado')); };
    });
    ['orderByKey', 'orderByChild', 'limitToLast', 'limitToFirst', 'startAt', 'endAt', 'equalTo'].forEach(function(q){
      r[q] = function(){ return r; };
    });
    return r;
  }
  return {
    initializeApp: function(){},
    auth: function(){ return { signInAnonymously: function(){ return Promise.resolve(); } }; },
    database: function(){ return { ref: ref }; }
  };
}

/* ---------- as duas páginas ---------- */
function embutir(html, nome, fonte){
  const tag = '<script src="' + nome + '"></script>';
  if (html.indexOf(tag) < 0) throw new Error('a página não carrega ' + nome);
  return html.replace(tag, function(){ return '<script>' + fonte.replace(/<\/script/gi, '<\\/script') + '</script>'; });
}
function semExternos(html){
  return html.replace(/<script src="https:\/\/[^"]*"><\/script>/g, '')
             .replace(/<link[^>]+href="https:\/\/[^"]*"[^>]*>/g, '');
}
function lerRaiz(f){ return fs.readFileSync(path.join(RAIZ, f), 'utf8'); }
function lerBase(f){
  return execSync('git show ' + BASE_COMMIT + ':' + f, { cwd: RAIZ, maxBuffer: 1 << 28 }).toString('utf8');
}

function prepararPaginaAntiga(){
  let html = lerBase('vendas.html');
  const tagZip = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>';
  if (html.indexOf(tagZip) < 0) throw new Error('a página de referência não carrega o JSZip 3.10.1');
  const jszip = fs.readFileSync(require.resolve('jszip/dist/jszip.min.js'), 'utf8');
  if (require('jszip/package.json').version !== '3.10.1') throw new Error('o teste precisa do JSZip 3.10.1, o mesmo da página');
  html = html.replace(tagZip, function(){ return '<script>' + jszip.replace(/<\/script/gi, '<\\/script') + '</script>'; });
  html = embutir(html, 'gioco-shell.js', lerBase('gioco-shell.js'));
  html = embutir(html, 'gioco-charts.js', lerBase('gioco-charts.js'));
  return semExternos(html);
}
function prepararPaginaNova(){
  let html = lerRaiz('vendas.html');
  if (/jszip|DOMParser/i.test(html.replace(/\/\*[\s\S]*?\*\//g, ''))) throw new Error('a vendas.html ainda refere JSZip ou DOMParser');
  html = embutir(html, 'gioco-shell.js', lerRaiz('gioco-shell.js'));
  html = embutir(html, 'gioco-charts.js', lerRaiz('gioco-charts.js'));
  html = embutir(html, 'gioco-saft.js', lerRaiz('gioco-saft.js'));
  return semExternos(html);
}

const tique = function(){ return new Promise(function(r){ setTimeout(r, 0); }); };

/* Corre a página inteira: escolhe o ficheiro, aceita as categorias sugeridas
   se o formulário aparecer, e carrega em "Gravar" no resumo. */
async function correrPagina(html, base, ficheiro){
  const vc = new VirtualConsole();           // o ruído do jsdom (canvas, CSS) não interessa
  const errosPagina = [];
  vc.on('jsdomError', function(e){ if (!/Not implemented|Could not parse CSS/i.test(e.message)) errosPagina.push(e.message + (e.detail ? ' ' + (e.detail.stack || e.detail) : '')); });
  vc.on('error', function(e){ errosPagina.push(String(e)); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://eatgioco.github.io/vendas.html',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse: function(w){
      w.firebase = firebaseFalso(base);
      w.TextDecoder = TextDecoder;
      w.TextEncoder = TextEncoder;
      // O JSZip da página de referência precisa de um setImmediate a sério (no browser usa MessageChannel).
      w.setImmediate = function(fn){ var a = [].slice.call(arguments, 1); return setImmediate(function(){ fn.apply(null, a); }); };
      w.clearImmediate = clearImmediate;
      w.__confirmacoes = 0;
      w.confirm = function(){ w.__confirmacoes++; return true; };
      w.alert = function(){};
      w.matchMedia = w.matchMedia || function(){ return { matches: false, addListener: function(){}, removeListener: function(){}, addEventListener: function(){}, removeEventListener: function(){} }; };
      w.eval('(function(){ var R = Date; function D(){ var a = arguments; ' +
             'if (!(this instanceof D)) return new R(' + INSTANTE + ').toString(); ' +
             'var d = a.length === 0 ? new R(' + INSTANTE + ') : new (Function.prototype.bind.apply(R, [null].concat([].slice.call(a))))(); ' +
             'Object.setPrototypeOf(d, D.prototype); return d; } ' +
             'D.prototype = Object.create(R.prototype); D.prototype.constructor = D; ' +
             'D.now = function(){ return ' + INSTANTE + '; }; D.UTC = R.UTC; D.parse = R.parse; window.Date = D; })()');
    }
  });
  const w = dom.window;
  const res = { erro: null, resumo: null, plano: null, verificacaoFalhou: false, confirmacoes: 0, nadaGravado: false, catalogoPedido: false };
  try {
    for (let i = 0; i < 200 && !w.__vendas; i++) await tique();
    if (!w.__vendas) throw new Error('a página não arrancou' + (errosPagina.length ? ': ' + errosPagina[0] : ''));
    for (let i = 0; i < 20; i++) await tique();

    const ab = new w.ArrayBuffer(ficheiro.bytes.length);
    new w.Uint8Array(ab).set(ficheiro.bytes);
    const doc = w.document;
    const visivel = function(id){ const n = doc.getElementById(id); return !!n && !n.classList.contains('hidden'); };
    const msg = function(id){ const n = doc.getElementById(id); return n && n.classList.contains('on') ? n.textContent : ''; };

    const antes = base.escritas.length;
    w.__vendas.tratarFicheiro({ name: ficheiro.nome, arrayBuffer: function(){ return Promise.resolve(ab); } });

    let cliqueCategorias = false, cliqueGravar = false, fim = false;
    for (let i = 0; i < 20000 && !fim; i++){
      await tique();
      const erro = msg('msgErro');
      if (erro){ res.erro = erro; break; }
      if (!cliqueGravar && visivel('resumoCard')){
        res.plano = JSON.parse(JSON.stringify(w.__vendas.estado.planoImport.res.plano));
        res.verificacao = JSON.parse(JSON.stringify(w.__vendas.estado.planoImport.res.verificacao));
        res.avisos = JSON.parse(JSON.stringify(w.__vendas.estado.planoImport.res.avisos));
        if (doc.getElementById('btnConfirmarImport').disabled){ res.verificacaoFalhou = true; break; }
        cliqueGravar = true;
        doc.getElementById('btnConfirmarImport').click();
        continue;
      }
      if (!cliqueGravar && !cliqueCategorias && visivel('catalogoCard')){
        cliqueCategorias = true;
        res.catalogoPedido = true;
        doc.getElementById('btnGravar').click();
        continue;
      }
      if (cliqueGravar){
        if (/^Gravados /.test(msg('msgOk'))){ res.resumo = msg('msgOk'); fim = true; }
        else if (/^Nada gravado/.test(msg('msgAviso'))){ res.nadaGravado = true; fim = true; }
      }
    }
    if (!fim && !res.erro && !res.verificacaoFalhou) throw new Error('a página não chegou ao fim da importação — ok: "' + msg('msgOk') + '" aviso: "' + msg('msgAviso') + '" progresso: "' + ((doc.getElementById('progressText')||{}).textContent||'') + '" catálogo: ' + visivel('catalogoCard') + ' resumo: ' + visivel('resumoCard') + ' cliques: ' + cliqueCategorias + '/' + cliqueGravar + ' erros: ' + errosPagina.join(' | '));
    for (let i = 0; i < 30; i++) await tique();         // deixa o carregarDados() final assentar
    const erroTardio = msg('msgErro');
    if (erroTardio && !res.erro) res.erro = erroTardio;
    res.confirmacoes = w.__confirmacoes;
    res.escritas = base.escritas.slice(antes);
  } finally {
    w.close();
  }
  return res;
}

/* ---------- b) GiocoSaft directo ---------- */
function correrBiblioteca(base, ficheiro){
  const lido = GiocoSaft.lerFicheiro(ficheiro.bytes, ficheiro.nome);
  const parsed = GiocoSaft.parse(lido.texto);
  const l = GiocoSaft.leiturasNecessarias(parsed);
  const estado = { catalogo: vistaSdk(base.no('vendas/catalogo')) || {}, dias: {}, meses: {} };
  l.dias.forEach(function(d){ estado.dias[d] = vistaSdk(base.no('vendasDiario/' + d.slice(0, 7) + '/' + d)) || null; });
  l.meses.forEach(function(m){
    estado.meses[m] = { dias: vistaSdk(base.no('vendasDiario/' + m)) || null, resumo: vistaSdk(base.no('vendas/' + m + '/resumo')) || null };
  });
  const r = GiocoSaft.construirPayload(parsed, estado, { importadoEm: new Date(INSTANTE).toISOString(), ficheiro: ficheiro.nome });
  return { parsed: parsed, resumo: r.resumo,
           escritas: JSON.parse(JSON.stringify(r.escritas.map(function(e){ return { path: e.path, valor: e.valor }; }))) };
}

/* ---------- c) Worker do Jarvis ---------- */
let Saft = null;
async function correrWorker(base, ficheiro, opcoes){
  opcoes = opcoes || {};
  const URL_BASE = 'https://firebase.exemplo';
  const estado = {};
  const enviadas = [], pedidos = [];
  const antes = base.escritas.length;
  const d = {
    tg: async function(){ return { ok: true, result: {} }; },
    enviar: async function(env, chatId, txt, teclado){
      enviadas.push({ texto: txt, teclado: teclado || null });
      return { ok: true, result: { message_id: enviadas.length } };
    },
    getEstado: async function(env, k){ return k in estado ? estado[k] : null; },
    setEstado: async function(env, k, v){ estado[k] = v; },
    guardarMensagem: async function(){},
    agora: function(){ return new Date(INSTANTE + (opcoes.atrasoMs || 0) * (d.relogioAvancado ? 1 : 0)); },
    urlBase: function(){ return URL_BASE; },
    baixar: async function(){ return new Uint8Array(ficheiro.bytes); },
    fetch: async function(url, o){
      o = o || {};
      if (url.indexOf(URL_BASE + '/') !== 0 || !/\.json$/.test(url)) throw new Error('pedido inesperado: ' + url);
      const caminho = decodeURIComponent(url.slice(URL_BASE.length + 1, -5));
      const metodo = (o.method || 'GET').toUpperCase();
      pedidos.push(metodo + ' ' + caminho);
      if (metodo === 'GET') return { ok: true, status: 200, json: async function(){ return vistaRest(base.no(caminho)); } };
      if (metodo === 'PUT'){
        if (!/^vendasDiario\/\d{4}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(caminho) && !/^vendas\/\d{4}-\d{2}$/.test(caminho)){
          throw new Error('o Worker tentou escrever fora dos caminhos-folha: ' + caminho);
        }
        base.set(caminho, JSON.parse(o.body));
        return { ok: true, status: 200, json: async function(){ return {}; } };
      }
      throw new Error('o Worker usou ' + metodo + ' em ' + caminho);
    }
  };
  const msg = { document: { file_name: ficheiro.nome, file_id: 'F1', file_size: ficheiro.bytes.length } };
  const tratado = await Saft.tratarDocumentoSaft({}, msg, '1', d);
  const comBotoes = enviadas.filter(function(m){ return m.teclado; });
  const res = { tratado: tratado, enviadas: enviadas, ofereceuGravar: comBotoes.length > 0, pedidos: pedidos };
  if (comBotoes.length && !opcoes.semClique){
    const dados = comBotoes[comBotoes.length - 1].teclado.inline_keyboard[0][0].callback_data.split(':');
    d.relogioAvancado = true;
    await Saft.tratarBotaoSaft({}, { id: 'cq', data: dados.join(':'), message: { chat: { id: 1 }, message_id: 1 } }, dados[1], dados[2], d);
  }
  if (opcoes.expirar){
    d.relogioAvancado = true;
    await Saft.expirarSaft({}, d);
  }
  res.estadoFinal = estado;
  res.escritas = base.escritas.slice(antes);
  return res;
}

/* ---------- ficheiros ---------- */
function carimbo(nome){ const m = /_(\d{14})(?: \d+)?\.zip$/i.exec(nome); return m ? m[1] : nome; }
function listarFicheiros(){
  const lista = [];
  PASTAS.forEach(function(p){
    fs.readdirSync(p).filter(function(f){ return /\.(zip|xml)$/i.test(f); }).forEach(function(f){
      lista.push({ nome: f, caminho: path.join(p, f) });
    });
  });
  lista.sort(function(a, b){ return carimbo(a.nome) < carimbo(b.nome) ? -1 : (carimbo(a.nome) > carimbo(b.nome) ? 1 : (a.nome < b.nome ? -1 : 1)); });
  return lista;
}

function semCarimbos(v){     // o estado sem os campos que mudam em cada import
  return JSON.parse(JSON.stringify(v || null, function(k, x){
    return (k === 'importadoEm' || k === 'ultimoImportEm' || k === 'ficheiro') ? undefined : x;
  }));
}

/* Corre os quatro caminhos sobre o mesmo estado e compara. Devolve a base
   depois de gravada (a da página de referência). */
async function quatroVias(ctx, baseInicial, f, antiga, nova){
  const bA = baseInicial.clone(), bC = baseInicial.clone(), bD = baseInicial.clone();
  const a = await correrPagina(antiga, bA, f);
  const d = await correrPagina(nova, bD, f);
  const b = correrBiblioteca(baseInicial, f);
  const c = await correrWorker(bC, f);

  ok(!a.erro, ctx + ' — a página de referência deu erro: ' + a.erro);
  ok(!d.erro, ctx + ' — a página nova deu erro: ' + d.erro);
  ok(!bA.outras.length && !bD.outras.length, ctx + ' — a página usou update/remove/push: ' + bA.outras.concat(bD.outras).join(', '));
  ok(!a.catalogoPedido && !d.catalogoPedido, ctx + ' — a página pediu categorias com o catálogo completo');

  iguais('plano (página antiga vs GiocoSaft)', a.plano, b.resumo.plano, ctx);
  iguais('plano (página antiga vs página nova)', a.plano, d.plano, ctx);
  iguais('verificação (página antiga vs GiocoSaft)', a.verificacao, b.resumo.verificacao, ctx);
  iguais('avisos (página antiga vs GiocoSaft)', a.avisos, b.resumo.avisos, ctx);

  if (a.verificacaoFalhou || a.confirmacoes){
    // A página tranca o botão (ou pergunta "Recalcular à mesma?"): o Jarvis tem de recusar.
    ok(!c.ofereceuGravar && !c.escritas.length, ctx + ' — o Jarvis ofereceu "Gravar" onde a página trava');
    ok(!b.resumo.podeGravar, ctx + ' — GiocoSaft diz podeGravar onde a página trava');
    if (a.verificacaoFalhou) ok(d.verificacaoFalhou && !d.escritas.length, ctx + ' — a página nova não trancou como a antiga');
    else iguais('escritas (página antiga vs página nova)', a.escritas, d.escritas, ctx);
    return { base: bA, a: a, b: b, c: c, d: d };
  }

  iguais('escritas (página antiga vs GiocoSaft)', a.escritas, b.escritas, ctx);
  iguais('escritas (página antiga vs página nova)', a.escritas, d.escritas, ctx);
  if (a.escritas.length){
    ok(c.ofereceuGravar, ctx + ' — o Jarvis não ofereceu "Gravar"');
    iguais('escritas (página antiga vs Jarvis)', a.escritas, c.escritas, ctx);
  } else {
    ok(a.nadaGravado && d.nadaGravado, ctx + ' — sem escritas mas a página não disse "Nada gravado"');
    ok(!c.ofereceuGravar && !c.escritas.length, ctx + ' — o Jarvis ofereceu "Gravar" sem nada para gravar');
  }
  iguais('estado final (página antiga vs Jarvis)', bA.raiz, bC.raiz, ctx);
  iguais('estado final (página antiga vs página nova)', bA.raiz, bD.raiz, ctx);
  ok(c.estadoFinal.saft_pendente === '' || c.estadoFinal.saft_pendente === undefined, ctx + ' — o Jarvis deixou um pedido pendente');
  return { base: bA, a: a, b: b, c: c, d: d };
}

async function semEscritas(ctx, f, antiga, nova, compararMensagem){
  const bA = new Base(), bD = new Base(), bC = new Base();
  const a = await correrPagina(antiga, bA, f);
  const d = await correrPagina(nova, bD, f);
  const c = await correrWorker(bC, f);
  let erroB = null;
  try { correrBiblioteca(new Base(), f); } catch (e){ erroB = e.message; }
  ok(!!a.erro && !bA.escritas.length, ctx + ' — a página de referência devia dar erro sem gravar');
  ok(!!d.erro && !bD.escritas.length, ctx + ' — a página nova devia dar erro sem gravar (deu: ' + d.erro + ')');
  ok(!!erroB, ctx + ' — GiocoSaft devia rejeitar o ficheiro');
  ok(c.tratado && !c.escritas.length && !c.ofereceuGravar, ctx + ' — o Jarvis devia responder com erro e não gravar');
  ok(c.pedidos.every(function(p){ return /^GET /.test(p); }), ctx + ' — o Jarvis fez pedidos de escrita');
  if (compararMensagem){
    ok(a.erro === d.erro, ctx + ' — mensagem de erro mudou: "' + a.erro + '" → "' + d.erro + '"');
    ok(a.erro === erroB, ctx + ' — GiocoSaft dá outra mensagem: "' + erroB + '"');
    ok(c.enviadas.length === 1 && c.enviadas[0].texto.indexOf(a.erro) >= 0, ctx + ' — o Jarvis não repetiu a mensagem da página');
  }
}

/* ---------- principal ---------- */
(async function(){
  Saft = await import(pathToFileURL(path.join(SECRETARIA, 'src', 'saft.mjs')).href);

  // A cópia do Worker tem de ser byte a byte a do repositório.
  const h = function(p){ return require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex'); };
  ok(h(path.join(RAIZ, 'gioco-saft.js')) === h(path.join(SECRETARIA, 'src', 'gioco-saft.js')),
     'gioco-saft.js do Worker difere do do repositório (SHA-256)');

  const antiga = prepararPaginaAntiga();
  const nova = prepararPaginaNova();
  const ficheiros = listarFicheiros().map(function(f){
    return { nome: f.nome, bytes: new Uint8Array(fs.readFileSync(f.caminho)) };
  });
  console.log(ficheiros.length + ' ficheiros SAF-T; referência: vendas.html @ ' + BASE_COMMIT);

  // Lê tudo uma vez: separa os que não têm faturas e monta o catálogo de teste (sugestões).
  const validos = [], vazios = [], catalogo = {};
  ficheiros.forEach(function(f){
    try {
      const p = GiocoSaft.parse(GiocoSaft.lerFicheiro(f.bytes, f.nome).texto);
      GiocoSaft.produtosNovos(p, catalogo).forEach(function(n){
        catalogo[n.key] = { desc: n.desc, categoria: n.sugestao.categoria, subcategoria: n.sugestao.subcategoria || null };
      });
      f.parsed = p;
      validos.push(f);
    } catch (e){ f.erroLeitura = e.message; vazios.push(f); }
  });
  console.log(validos.length + ' com faturas, ' + vazios.length + ' sem faturas (' + vazios.map(function(f){ return f.erroLeitura; }).join(' | ') + ')');
  const comMadrugada = validos.filter(function(f){
    return Object.keys(f.parsed.dias).some(function(d){ return f.parsed.dias[d].madrugada.docs > 0; });
  });
  console.log(comMadrugada.length + ' com documentos fechados depois da meia-noite; ' +
              validos.filter(function(f){ return f.parsed.anuladas > 0; }).length + ' com documentos anulados');

  const baseCatalogo = new Base({ vendas: { catalogo: catalogo } });
  let historico = baseCatalogo.clone();
  let n = 0;

  for (const f of validos){
    n++;
    const t0 = Date.now();
    const antesFalhas = falhas;

    /* vazio: sem catálogo. As páginas aceitam as sugestões; o Jarvis recusa. */
    {
      const ctx = f.nome + ' [vazio]';
      const bA = new Base(), bD = new Base(), bC = new Base();
      const a = await correrPagina(antiga, bA, f);
      const d = await correrPagina(nova, bD, f);
      const c = await correrWorker(bC, f);
      ok(!a.erro && !d.erro, ctx + ' — erro na página: ' + (a.erro || d.erro));
      ok(a.catalogoPedido && d.catalogoPedido, ctx + ' — a página não pediu as categorias');
      iguais('escritas (página antiga vs página nova)', a.escritas, d.escritas, ctx);
      iguais('estado final (página antiga vs página nova)', bA.raiz, bD.raiz, ctx);
      ok(c.tratado && !c.ofereceuGravar && !c.escritas.length, ctx + ' — o Jarvis devia recusar (produtos fora do catálogo)');
      ok(c.enviadas.length === 1 && /Não importei nada/.test(c.enviadas[0].texto) && /catálogo/.test(c.enviadas[0].texto),
         ctx + ' — o Jarvis não explicou a recusa');
      const nNovos = GiocoSaft.produtosNovos(f.parsed, {}).length;
      ok((c.enviadas[0].texto.match(/^• /gm) || []).length === nNovos, ctx + ' — a lista de produtos do Jarvis está incompleta');
    }

    /* novo: só o catálogo. */
    await quatroVias(f.nome + ' [novo]', baseCatalogo, f, antiga, nova);

    /* histórico: sobre o que os ficheiros anteriores deixaram. */
    const r3 = await quatroVias(f.nome + ' [histórico]', historico, f, antiga, nova);
    historico = r3.base;
    historico.escritas = [];

    /* repetido: o mesmo ficheiro outra vez. */
    {
      const ctx = f.nome + ' [repetido]';
      const antes = semCarimbos(historico.raiz);
      const r4 = await quatroVias(ctx, historico, f, antiga, nova);
      const v = r4.b.resumo.verificacao;
      ok(v.novosDocs === 0 && v.novosTotal === 0 && v.deltaTotal === 0 && v.retiradosTotal === 0,
         ctx + ' — a reimportação criou ou retirou documentos: ' + JSON.stringify(v));
      ok(r4.b.resumo.plano.every(function(e){ return e.delta === 0 && e.docsNovos === 0; }), ctx + ' — algum dia mudou de valor');
      iguais('totais depois de reimportar', antes, semCarimbos(r4.base.raiz), ctx);
      const txt = r4.c.enviadas.map(function(m){ return m.texto; }).join('\n');
      ok(/Documentos novos para a OS: 0 /.test(txt) && !/: [1-9]\d* novos?,/.test(txt), ctx + ' — o resumo do Jarvis não diz "0 novos"');
      ok(/já existentes?/.test(txt), ctx + ' — o resumo do Jarvis não diz "já existentes"');
    }

    console.log((falhas === antesFalhas ? '  ✓ ' : '  ✗ ') + n + '/' + validos.length + ' ' + f.nome +
      ' (' + f.parsed.totalFaturas + ' faturas, ' + Object.keys(f.parsed.dias).length + ' dias) ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }

  /* ---------- ficheiros que não podem gravar nada ---------- */
  console.log('\nFicheiros sem faturas e corrompidos');
  for (const f of vazios) await semEscritas(f.nome + ' [sem faturas]', f, antiga, nova, true);

  const real = validos[validos.length - 1];
  const xmlReal = GiocoSaft.extrairXml(real.bytes, real.nome).buffer;
  const enc = function(s){ return new Uint8Array(Buffer.from(s, 'latin1')); };
  const JSZip = require('jszip');
  const zipSemXml = new Uint8Array(await new JSZip().file('leia-me.txt', 'nada').generateAsync({ type: 'uint8array' }));
  const zipXmlPartido = new Uint8Array(await new JSZip().file('saft.xml', Buffer.from(xmlReal.subarray(0, Math.floor(xmlReal.length / 2))))
    .generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
  const corrompidos = [
    { nome: '518717186_xml_cortado_a_meio.xml', bytes: xmlReal.subarray(0, Math.floor(xmlReal.length / 2)), msg: true },
    { nome: '518717186_lixo.xml', bytes: enc('isto não é XML nenhum { "a": 1 }'), msg: true },
    { nome: '518717186_outra_raiz.xml', bytes: enc('<?xml version="1.0" encoding="windows-1252"?><Fatura><Total>1</Total></Fatura>'), msg: true },
    { nome: '518717186_so_cabecalho.xml', bytes: enc('<?xml version="1.0" encoding="windows-1252"?><AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01"><Header><CompanyName>X</CompanyName></Header></AuditFile>'), msg: true },
    { nome: '518717186_entidade_invalida.xml', bytes: enc('<?xml version="1.0"?><AuditFile><Header>&naoexiste;</Header></AuditFile>'), msg: true },
    { nome: '518717186_zip_com_xml_partido.zip', bytes: zipXmlPartido, msg: true },
    { nome: '518717186_zip_sem_xml.zip', bytes: zipSemXml, msg: true },
    { nome: '518717186_zip_cortado.zip', bytes: real.bytes.subarray(0, Math.floor(real.bytes.length / 2)), msg: false },
    { nome: '518717186_zip_adulterado.zip', bytes: (function(){ const b = new Uint8Array(real.bytes); for (let i = 200; i < 260; i++) b[i] ^= 0x5A; return b; })(), msg: false }
  ];
  for (const f of corrompidos) await semEscritas(f.nome, f, antiga, nova, f.msg);

  /* Um .xml ou .zip que não é SAF-T nem tem nome de exportação segue o caminho normal do Jarvis. */
  {
    const c = await correrWorker(new Base(), { nome: 'fatura-fornecedor.xml', bytes: enc('<?xml version="1.0"?><Invoice><Total>1</Total></Invoice>') });
    ok(c.tratado === false && !c.enviadas.length && !c.escritas.length, 'um XML que não é SAF-T devia seguir o caminho normal do Jarvis');
    const c2 = await correrWorker(new Base(), { nome: 'documentos.zip', bytes: zipSemXml });
    ok(c2.tratado === false && !c2.enviadas.length, 'um ZIP qualquer devia seguir o caminho normal do Jarvis');
    const c3 = await correrWorker(baseCatalogo.clone(), { nome: 'export.xml', bytes: xmlReal });
    ok(c3.tratado === true && c3.escritas.length > 0, 'um SAF-T com outro nome devia ser reconhecido pelo elemento raiz');
  }

  /* O pedido de gravação não fica eterno. */
  {
    const semClique = await correrWorker(baseCatalogo.clone(), real, { semClique: true, expirar: true, atrasoMs: 16 * 60000 });
    ok(semClique.ofereceuGravar && !semClique.escritas.length, 'sem "Gravar" não pode haver escritas');
    ok(semClique.estadoFinal.saft_pendente === '' && /expirou/.test(semClique.enviadas[semClique.enviadas.length - 1].texto),
       'o pedido não expirou (ou não avisou) ao fim de 16 minutos');
    const tarde = await correrWorker(baseCatalogo.clone(), real, { atrasoMs: 16 * 60000 });
    ok(!tarde.escritas.length && /expirou/.test(tarde.enviadas[tarde.enviadas.length - 1].texto),
       '"Gravar" carregado depois de expirar não pode gravar');
    const aTempo = await correrWorker(baseCatalogo.clone(), real, { atrasoMs: 14 * 60000 });
    ok(aTempo.escritas.length > 0, '"Gravar" dentro do prazo devia gravar');
  }

  console.log('\n' + verificacoes + ' verificações, ' + falhas + ' falha' + (falhas === 1 ? '' : 's'));
  process.exit(falhas ? 1 : 0);
})().catch(function(e){
  console.error('\nERRO NO TESTE: ' + (e && e.stack ? e.stack : e));
  process.exit(2);
});
