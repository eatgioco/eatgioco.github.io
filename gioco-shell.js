/* ==========================================================================
   GIOCO OS — gioco-shell.js
   Fase 0 do design system. Ficheiro autónomo: nenhuma página existente o usa.

   Contém:
     - sprite de ícones SVG injectado no <body>
     - giocoIcon(nome, {size, cls})   → markup de um ícone
     - giocoToast(msg, tipo)          → notificação temporária
     - giocoModal({...})              → modal com fecho por Escape e clique fora
     - giocoSkeleton(linhas)          → placeholder de carregamento
     - giocoEmptyState({...})         → estado vazio com acção
     - giocoNavSidebar / giocoNavBottom → navegação DEFINIDA MAS NÃO ACTIVA

   Ícones: Lucide (https://lucide.dev) — licença ISC/MIT,
   © 2022 Lucide Contributors, derivado de Feather Icons © 2013-2022 Cole Bemis.
   Os paths abaixo são reproduzidos ao abrigo dessa licença.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------
     1. ÍCONES — paths Lucide, viewBox 0 0 24 24, traço em currentColor
     ------------------------------------------------------------------ */
  var ICONS = {
    'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'trash-2': '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    'calendar': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'euro': '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
    'package': '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    'truck': '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'bar-chart-2': '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
    'line-chart': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
    'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    'printer': '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    'coffee': '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'star': '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    'list': '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    'grid': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    'menu': '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    'chef-hat': '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.041-7.605 3.5 3.5 0 0 0-6.72-.99A3.5 3.5 0 0 0 4.32 6.004a4 4 0 0 0-2.04 7.605c.411.197.72.583.72 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
    'store': '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>'
  };

  var ICON_NAMES = Object.keys(ICONS);

  function injectSprite() {
    if (document.getElementById('gioco-icon-sprite')) return;
    var parts = ['<svg id="gioco-icon-sprite" aria-hidden="true" style="display:none">'];
    ICON_NAMES.forEach(function (name) {
      parts.push(
        '<symbol id="icon-' + name + '" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        ICONS[name] + '</symbol>'
      );
    });
    parts.push('</svg>');
    var holder = document.createElement('div');
    holder.innerHTML = parts.join('');
    document.body.insertBefore(holder.firstChild, document.body.firstChild);
  }

  /**
   * Devolve o markup de um ícone do sprite.
   * giocoIcon('home')                → <svg class="icon">…</svg>
   * giocoIcon('euro', {size:32})     → tamanho explícito
   * giocoIcon('x', {cls:'icon-lg'})  → classes extra
   */
  function giocoIcon(name, opts) {
    opts = opts || {};
    if (!ICONS[name]) {
      console.warn('[gioco-shell] ícone desconhecido:', name);
      name = 'alert-circle';
    }
    var cls = 'icon' + (opts.cls ? ' ' + opts.cls : '');
    var style = opts.size ? ' style="width:' + opts.size + 'px;height:' + opts.size + 'px"' : '';
    return '<svg class="' + cls + '"' + style + ' aria-hidden="true"><use href="#icon-' + name + '"/></svg>';
  }

  function iconEl(name, opts) {
    var wrap = document.createElement('div');
    wrap.innerHTML = giocoIcon(name, opts);
    return wrap.firstChild;
  }

  /* ------------------------------------------------------------------
     2. TOAST
     ------------------------------------------------------------------ */
  var TOAST_ICON = {
    sucesso: 'check',
    erro: 'alert-circle',
    aviso: 'alert-triangle',
    info: 'info'
  };

  function toastStack() {
    var el = document.querySelector('.gioco-toast-stack');
    if (!el) {
      el = document.createElement('div');
      el.className = 'gioco-toast-stack';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * giocoToast('Fornecedor guardado', 'sucesso')
   * tipos: 'sucesso' | 'erro' | 'aviso' | 'info'   (default: 'info')
   */
  function giocoToast(mensagem, tipo, duracaoMs) {
    tipo = TOAST_ICON[tipo] ? tipo : 'info';
    var stack = toastStack();

    var toast = document.createElement('div');
    toast.className = 'gioco-toast gioco-toast--' + tipo;
    toast.innerHTML =
      giocoIcon(TOAST_ICON[tipo]) +
      '<span class="gioco-toast-msg"></span>' +
      '<button type="button" class="gioco-toast-x" aria-label="Fechar">' + giocoIcon('x') + '</button>';
    toast.querySelector('.gioco-toast-msg').textContent = mensagem;

    var timer;
    function close() {
      clearTimeout(timer);
      if (!toast.parentNode) return;
      toast.classList.add('is-out');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 160);
    }
    toast.querySelector('.gioco-toast-x').addEventListener('click', close);

    stack.appendChild(toast);
    timer = setTimeout(close, typeof duracaoMs === 'number' ? duracaoMs : 4000);
    return close;
  }

  /* ------------------------------------------------------------------
     3. MODAL — fecha com Escape e com clique fora do painel
     ------------------------------------------------------------------ */
  /**
   * giocoModal({
   *   titulo: 'Apagar fornecedor',
   *   corpo: '<p>…</p>',            // string HTML ou elemento
   *   acoes: [ {texto:'Cancelar', estilo:'secondary'},
   *            {texto:'Apagar', estilo:'danger', onClick:fn} ],
   *   aoFechar: fn
   * })
   * Devolve { fechar, overlay }.
   */
  function giocoModal(cfg) {
    cfg = cfg || {};

    var overlay = document.createElement('div');
    overlay.className = 'gioco-modal-overlay';

    var painel = document.createElement('div');
    painel.className = 'gioco-modal';
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-modal', 'true');

    var head = document.createElement('div');
    head.className = 'gioco-modal-head';
    var titulo = document.createElement('h2');
    titulo.className = 'text-h2';
    titulo.textContent = cfg.titulo || '';
    var botaoX = document.createElement('button');
    botaoX.type = 'button';
    botaoX.className = 'gioco-modal-close';
    botaoX.setAttribute('aria-label', 'Fechar');
    botaoX.innerHTML = giocoIcon('x');
    head.appendChild(titulo);
    head.appendChild(botaoX);

    var body = document.createElement('div');
    body.className = 'gioco-modal-body';
    if (cfg.corpo instanceof Node) body.appendChild(cfg.corpo);
    else body.innerHTML = cfg.corpo || '';

    painel.appendChild(head);
    painel.appendChild(body);

    if (cfg.acoes && cfg.acoes.length) {
      var foot = document.createElement('div');
      foot.className = 'gioco-modal-foot';
      cfg.acoes.forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-' + (a.estilo || 'secondary');
        b.textContent = a.texto || 'OK';
        b.addEventListener('click', function () {
          var manter = a.onClick && a.onClick() === false;
          if (!manter) fechar();
        });
        foot.appendChild(b);
      });
      painel.appendChild(foot);
    }

    overlay.appendChild(painel);

    function onKey(e) { if (e.key === 'Escape') fechar(); }

    function fechar() {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('gioco-modal-open');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (cfg.aoFechar) cfg.aoFechar();
    }

    botaoX.addEventListener('click', fechar);
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) fechar();   // clique fora do painel
    });
    document.addEventListener('keydown', onKey);

    document.body.classList.add('gioco-modal-open');
    document.body.appendChild(overlay);
    (painel.querySelector('button, [href], input, select, textarea') || painel).focus();

    return { fechar: fechar, overlay: overlay };
  }

  /* ------------------------------------------------------------------
     4. SKELETON e EMPTY STATE
     ------------------------------------------------------------------ */
  /** giocoSkeleton(3) → markup de 3 linhas shimmer, para usar durante o load. */
  function giocoSkeleton(linhas) {
    var n = linhas || 3;
    var larguras = ['skeleton-line-lg', 'skeleton-line-md', 'skeleton-line-sm'];
    var out = '';
    for (var i = 0; i < n; i++) out += '<span class="skeleton ' + larguras[i % 3] + '"></span>';
    return '<div class="gioco-skeleton-group" aria-hidden="true">' + out + '</div>';
  }

  /**
   * giocoEmptyState({icone:'package', titulo:'Sem encomendas',
   *                  descricao:'…', acao:{texto:'Nova encomenda', href:'#'}})
   */
  function giocoEmptyState(cfg) {
    cfg = cfg || {};
    var acao = '';
    if (cfg.acao) {
      acao = '<a class="btn-primary" href="' + (cfg.acao.href || '#') + '">' +
             giocoIcon(cfg.acao.icone || 'plus') + escapeHtml(cfg.acao.texto || '') + '</a>';
    }
    return '<div class="empty-state">' +
      giocoIcon(cfg.icone || 'package', { cls: 'icon-xl' }) +
      '<p class="empty-state-title">' + escapeHtml(cfg.titulo || '') + '</p>' +
      '<p class="empty-state-desc">' + escapeHtml(cfg.descricao || '') + '</p>' +
      acao +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------------------------------------------
     5. NAVEGAÇÃO — DEFINIDA, AINDA NÃO ACTIVA
     Nenhuma página do OS chama estas funções. Só estilo.html as usa,
     e apenas para pré-visualização. Fica disponível para a Fase 1.
     ------------------------------------------------------------------ */
  var NAV_ITENS = [
    { id: 'home',         label: 'Home',          href: 'index.html',           icone: 'home' },
    { id: 'compras',      label: 'Compras',       href: 'compras.html',         icone: 'truck' },
    { id: 'receitas',     label: 'Receitas',      href: 'receitas.html',        icone: 'chef-hat' },
    { id: 'loja',         label: 'Loja',          href: 'loja-sao-bento.html',  icone: 'store' },
    { id: 'pagamentos',   label: 'Pagamentos',    href: 'pagamentos.html',      icone: 'receipt' },
    { id: 'caixa',        label: 'Caixa',         href: 'caixa.html',           icone: 'euro' },
    { id: 'equipa',       label: 'Equipa',        href: 'equipa.html',          icone: 'users' },
    { id: 'contabilidade',label: 'Contabilidade', href: 'contabilidade.html',   icone: 'bar-chart-2' }
  ];

  function normalizaAtivos(itensAtivos) {
    if (!itensAtivos) return null;
    return Array.isArray(itensAtivos) ? itensAtivos : [itensAtivos];
  }

  /**
   * giocoNavSidebar(itensAtivos) → elemento <nav> de sidebar (desktop).
   * itensAtivos: id ou array de ids a marcar como página actual.
   */
  function giocoNavSidebar(itensAtivos) {
    var ativos = normalizaAtivos(itensAtivos) || [];
    var nav = document.createElement('nav');
    nav.className = 'gioco-sidebar';
    nav.setAttribute('aria-label', 'Navegação principal');

    var brand = document.createElement('div');
    brand.className = 'gioco-sidebar-brand';
    brand.innerHTML = '<span class="dot">&#9679;</span> GIOCO&reg;';
    nav.appendChild(brand);

    NAV_ITENS.forEach(function (it) {
      var a = document.createElement('a');
      a.href = it.href;
      a.innerHTML = giocoIcon(it.icone) + '<span>' + escapeHtml(it.label) + '</span>';
      if (ativos.indexOf(it.id) !== -1) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    return nav;
  }

  /**
   * giocoNavBottom(itensAtivos) → elemento <nav> de barra inferior (mobile).
   * Alvos de toque de 56px. Mostra os 5 primeiros destinos.
   */
  function giocoNavBottom(itensAtivos) {
    var ativos = normalizaAtivos(itensAtivos) || [];
    var nav = document.createElement('nav');
    nav.className = 'gioco-bottomnav';
    nav.setAttribute('aria-label', 'Navegação principal');

    NAV_ITENS.slice(0, 5).forEach(function (it) {
      var a = document.createElement('a');
      a.href = it.href;
      a.innerHTML = giocoIcon(it.icone) + '<span>' + escapeHtml(it.label) + '</span>';
      if (ativos.indexOf(it.id) !== -1) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    return nav;
  }

  /* ------------------------------------------------------------------
     6. ARRANQUE
     ------------------------------------------------------------------ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSprite);
  } else {
    injectSprite();
  }

  /* API pública */
  global.giocoIcon       = giocoIcon;
  global.giocoIconEl     = iconEl;
  global.giocoIconNames  = ICON_NAMES;
  global.giocoToast      = giocoToast;
  global.giocoModal      = giocoModal;
  global.giocoSkeleton   = giocoSkeleton;
  global.giocoEmptyState = giocoEmptyState;
  global.giocoNavSidebar = giocoNavSidebar;
  global.giocoNavBottom  = giocoNavBottom;
  global.giocoNavItens   = NAV_ITENS;

})(window);
