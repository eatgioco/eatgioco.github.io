/* gioco-jarvis.js — o Jarvis dentro do GIOCO OS (Nov/2026).

   O Jarvis (assistente pessoal do Manel) vive num Cloudflare Worker
   (secretaria.eatgioco.workers.dev) e fala pelo Telegram. A LISTA de tudo o que
   há para fazer é UMA SÓ: as Obrigações (nós obrigacoes/ e projetos/ do
   Firebase). O Jarvis lê e escreve lá directamente; este módulo NÃO toca no
   Firebase — mostra só a conversa (o MESMO fio do Telegram) e os lembretes,
   que vivem no Worker porque são ele que os dispara à hora certa.

   API do Worker (cabeçalho X-Chave-OS; a chave NUNCA está no repo, que é
   público — vive só no localStorage 'jarvis.os.chave' deste browser):
     GET  /api/os/estado?conversa=N → { agora, lembretes[], conversa[], a_pensar }
     POST /api/os/acao     { nome, input }  (cancelar_lembrete, resolver_lembrete)
     POST /api/os/mensagem { texto }        (entra no fio como se viesse do Telegram)

   Uso:  GiocoJarvis.montar(elemento, { tituloItem: function (id) { return '...' } })
   tituloItem traduz o item_id de um lembrete (a chave da obrigação) no título. */
(function () {
  'use strict';

  var ENDERECO_PADRAO = 'https://secretaria.eatgioco.workers.dev';
  var K_CHAVE = 'jarvis.os.chave';
  var K_ENDERECO = 'jarvis.os.endereco';
  var INTERVALO_NORMAL = 30000;
  var INTERVALO_ATIVO = 4000;
  var TECTO_ATIVO = 5 * 60000;

  function ls(k, v) {
    try {
      if (v === undefined) return window.localStorage.getItem(k);
      if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v);
    } catch (e) { return null; }
    return null;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function endereco() { return (ls(K_ENDERECO) || ENDERECO_PADRAO).replace(/\/+$/, ''); }
  function chave() { return ls(K_CHAVE) || ''; }

  function api(metodo, caminho, corpo) {
    var opts = { method: metodo, headers: { 'X-Chave-OS': chave() } };
    if (corpo !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(corpo); }
    return fetch(endereco() + caminho, opts).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
        if (!r.ok) { var err = new Error((j && (j.erro || j.error)) || ('HTTP ' + r.status)); err.status = r.status; throw err; }
        return j || {};
      });
    }, function () { var err = new Error('Sem ligação ao Jarvis'); err.status = 0; err.rede = true; throw err; });
  }

  // ---------- Datas (hora de Lisboa, sem fuso, tal como o Worker grava) ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function diasAte(iso) {
    var a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    var h = isoLocal(new Date());
    var b = Date.UTC(+h.slice(0, 4), +h.slice(5, 7) - 1, +h.slice(8, 10));
    return Math.round((a - b) / 86400000);
  }
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function partes(s) {
    if (!s) return null;
    s = String(s);
    var m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(s);
    if (!m) return null;
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
      var d = new Date(s);
      if (isNaN(d)) return null;
      return { data: isoLocal(d), hora: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
    }
    return { data: m[1], hora: m[2] + ':' + m[3] };
  }
  function rotuloDia(iso) {
    var n = diasAte(iso);
    if (n === 0) return 'Hoje';
    if (n === 1) return 'Amanhã';
    if (n === -1) return 'Ontem';
    var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    if (n > 1 && n < 7) return DIAS[d.getDay()];
    return d.getDate() + ' ' + MESES[d.getMonth()];
  }
  function rotuloQuando(s) { var p = partes(s); return p ? rotuloDia(p.data) + ' ' + p.hora : ''; }

  // ---------- Painel ----------
  function montar(raiz, opts) {
    opts = opts || {};
    var tituloItem = opts.tituloItem || function () { return ''; };
    var estado = null, pendentes = [], esperaAte = 0, timer = null, aCarregar = false, ultimo = null;

    raiz.innerHTML =
      '<div class="jv-ligar" data-j="ligar" hidden>' +
        '<p data-j="ligarTxt"></p>' +
        '<div class="jv-ligar-row"><input class="jv-in" data-j="chaveIn" type="password" autocomplete="off" spellcheck="false" placeholder="Chave de acesso do OS">' +
        '<button type="button" class="btn-add" data-j="guardar">Ligar</button></div>' +
      '</div>' +
      '<div class="jv-corpo" data-j="corpo" hidden>' +
        '<div class="jv-conv">' +
          '<div class="jv-msgs" data-j="msgs"></div>' +
          '<div class="jv-pensar" data-j="pensar">O Jarvis está a tratar disso…</div>' +
          '<form class="jv-escrever" data-j="form" autocomplete="off">' +
            '<textarea class="jv-in" data-j="texto" rows="1" placeholder="Escrever ao Jarvis…" maxlength="4000"></textarea>' +
            '<button type="submit" class="btn-add" data-j="enviar">Enviar</button>' +
          '</form>' +
          '<div class="jv-erro" data-j="erro"></div>' +
        '</div>' +
        '<div class="jv-lems"><div class="jv-sub">Lembretes <span class="n" data-j="nLem"></span></div><div data-j="lems"></div></div>' +
      '</div>' +
      '<div class="jv-estado"><span class="dot" data-j="dot"></span><span data-j="estadoTxt">A ligar…</span>' +
        '<button type="button" class="jv-lnk" data-j="chaveBtn">Chave de acesso</button></div>';
    function q(n) { return raiz.querySelector('[data-j="' + n + '"]'); }

    function marcar(tipo, txt) { q('dot').className = 'dot' + (tipo ? ' ' + tipo : ''); q('estadoTxt').textContent = txt; }
    function pedirChave(txt) { q('ligarTxt').textContent = txt; q('ligar').hidden = false; q('corpo').hidden = true; }

    function renderLembretes() {
      var lem = (estado && estado.lembretes) || [];
      q('nLem').textContent = lem.length ? '· ' + lem.length : '';
      if (!lem.length) { q('lems').innerHTML = '<div class="jv-vazio">Sem lembretes marcados.</div>'; return; }
      var ord = lem.slice().sort(function (a, b) {
        var sa = a.estado === 'sem_resposta' ? 0 : 1, sb = b.estado === 'sem_resposta' ? 0 : 1;
        return sa - sb || String(a.quando).localeCompare(String(b.quando));
      });
      q('lems').innerHTML = ord.map(function (l) {
        var sem = l.estado === 'sem_resposta';
        var tit = l.item_id ? tituloItem(String(l.item_id)) : '';
        return '<div class="jv-lem' + (sem ? ' alerta' : '') + '" data-id="' + esc(l.id) + '">' +
          '<div class="jv-lem-q">' + (sem ? 'À espera · ' : '') + esc(rotuloQuando(l.quando)) + '</div>' +
          '<div class="jv-lem-t">' + esc(l.texto) + (tit ? '<span class="jv-lem-o">↳ ' + esc(tit) + '</span>' : '') + '</div>' +
          '<div class="jv-lem-a">' + (sem
            ? '<button type="button" class="b" data-acao="feito">Feito</button><button type="button" class="jv-lnk" data-acao="largar">Cancelar</button>'
            : '<button type="button" class="jv-lnk" data-acao="cancelar">Cancelar</button>') + '</div></div>';
      }).join('');
    }

    function renderConversa() {
      var conv = ((estado && estado.conversa) || []).slice();
      var vistos = {};
      conv.forEach(function (m) { if (m.de === 'manel') vistos[String(m.texto).trim()] = true; });
      pendentes = pendentes.filter(function (p) { return !vistos[p.texto.trim()]; });
      var box = q('msgs');
      var perto = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      var html = conv.map(function (m) {
        var h = rotuloQuando(m.quando);
        return '<div class="jv-msg ' + (m.de === 'manel' ? 'manel' : 'jarvis') + '">' + esc(m.texto) +
          (h ? '<span class="h">' + esc(h) + (m.canal === 'os' ? ' · OS' : '') + '</span>' : '') + '</div>';
      }).join('') + pendentes.map(function (p) {
        return '<div class="jv-msg manel pendente">' + esc(p.texto) + '<span class="h">a enviar…</span></div>';
      }).join('');
      box.innerHTML = html || '<div class="jv-vazio">Ainda sem conversa.</div>';
      var u = (conv.length ? String(conv[conv.length - 1].id || conv.length) : '') + '|' + pendentes.length;
      if (perto || u !== ultimo) box.scrollTop = box.scrollHeight;
      ultimo = u;
      q('pensar').classList.toggle('on', !!(estado && estado.a_pensar) || pendentes.length > 0);
    }

    function carregar() {
      if (!chave()) {
        marcar('', 'Sem chave de acesso');
        pedirChave('Para falar com o Jarvis aqui, cola a chave de acesso do OS (uma vez por browser; fica só neste dispositivo).');
        return Promise.resolve();
      }
      if (aCarregar) return Promise.resolve();
      aCarregar = true;
      return api('GET', '/api/os/estado?conversa=60').then(function (j) {
        estado = {
          lembretes: Array.isArray(j.lembretes) ? j.lembretes : [],
          conversa: Array.isArray(j.conversa) ? j.conversa : [],
          a_pensar: !!j.a_pensar
        };
        q('ligar').hidden = true; q('corpo').hidden = false;
        var d = new Date();
        marcar('ok', 'Ligado · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
        renderConversa(); renderLembretes();
      }).catch(function (e) {
        if (e.status === 401 || e.status === 403) { marcar('erro', 'Chave recusada'); pedirChave('O Jarvis recusou a chave guardada neste browser. Cola a chave de acesso do OS outra vez.'); }
        else if (e.status === 404) { marcar('erro', 'O Jarvis ainda não tem a ligação ao OS instalada'); q('ligar').hidden = true; }
        else marcar('erro', e.rede ? 'Sem ligação ao Jarvis — a tentar de novo' : 'Erro do Jarvis (' + e.message + ') — a tentar de novo');
      }).then(function () { aCarregar = false; });
    }
    function agendar() {
      clearTimeout(timer);
      var rapido = Date.now() < esperaAte && ((estado && estado.a_pensar) || pendentes.length);
      timer = setTimeout(function () { if (document.hidden) { agendar(); return; } carregar().then(agendar); },
        rapido ? INTERVALO_ATIVO : INTERVALO_NORMAL);
    }

    function ajustar() { var t = q('texto'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 4, 160) + 'px'; }
    function enviar() {
      var txt = q('texto').value.trim();
      if (!txt) return;
      q('erro').classList.remove('on');
      pendentes.push({ texto: txt });
      q('texto').value = ''; ajustar(); renderConversa();
      q('enviar').disabled = true;
      api('POST', '/api/os/mensagem', { texto: txt }).then(function () {
        esperaAte = Date.now() + TECTO_ATIVO;
        carregar().then(agendar);
      }, function (e) {
        pendentes = pendentes.filter(function (p) { return p.texto !== txt; });
        q('texto').value = txt; ajustar(); renderConversa();
        q('erro').textContent = 'Não foi entregue ao Jarvis (' + e.message + '). O texto voltou para a caixa.';
        q('erro').classList.add('on');
      }).then(function () { q('enviar').disabled = false; });
    }
    q('form').addEventListener('submit', function (ev) { ev.preventDefault(); enviar(); });
    q('texto').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey && !document.body.classList.contains('shell-touch')) { ev.preventDefault(); enviar(); }
    });
    q('texto').addEventListener('input', ajustar);

    q('lems').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-acao]'); if (!b) return;
      var id = b.closest('.jv-lem').getAttribute('data-id');
      var a = b.getAttribute('data-acao'), p;
      if (a === 'cancelar') { if (!confirm('Cancelar este lembrete?')) return; p = api('POST', '/api/os/acao', { nome: 'cancelar_lembrete', input: { id: id } }); }
      else p = api('POST', '/api/os/acao', { nome: 'resolver_lembrete', input: { id: id, acao: a === 'feito' ? 'feito' : 'cancelar' } });
      b.disabled = true;
      p.then(carregar, function (e) { b.disabled = false; alert('Não foi possível gravar: ' + e.message); });
    });

    q('guardar').addEventListener('click', function () {
      var k = q('chaveIn').value.trim();
      if (!k) { q('chaveIn').focus(); return; }
      ls(K_CHAVE, k); q('chaveIn').value = '';
      marcar('', 'A ligar…');
      carregar().then(agendar);
    });
    q('chaveIn').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') q('guardar').click(); });
    q('chaveBtn').addEventListener('click', function () {
      if (chave() && !confirm('Esquecer a chave guardada neste browser e colar outra?')) return;
      ls(K_CHAVE, null); carregar();
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) carregar().then(agendar); });

    carregar().then(agendar);
    return { atualizar: function () { renderLembretes(); }, recarregar: carregar };
  }

  window.GiocoJarvis = { montar: montar, rotuloQuando: rotuloQuando };
})();
