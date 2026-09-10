/* ==========================================================================
   GIOCO OS — gioco-shell.js
   Design system Fase 0. Extraído verbatim de _referencia-fase0.html.

   Carregar LOGO a seguir a <body> (antes de qualquer markup com <use href="#i-...">)
   para o sprite já estar no DOM quando o browser resolve as referências:

     <body>
     <script src="gioco-shell.js"></script>
     ...

   Sem dependências externas. Os ícones são SVG local, de propósito:
   falhar um CDN de ícones numa loja sem rede é inaceitável.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Sprite: filtro liquidDistort + 44 símbolos ----------
     (Set/2026, cartão Música do centro-de-controlo.html: music, play, pause,
     skip-back, skip-forward, volume-2 e volume-x, traço Feather — eram 37.)
     (Set/2026, calendario.html: chevron-left, calendar e clock, traço
     Feather — eram 34.)
     (O i-phone entrou em Set/2026 para os Contactos, traço Feather.)
     (Eram 23 — o comentário antigo dizia 22, contagem errada. O
     clipboard-check foi acrescentado em Set/2026 para as Contagens, no
     mesmo traço Feather dos restantes.)
     Cada <symbol> tem o seu próprio viewBox="0 0 24 24" — NÃO usar <g>,
     foi uma correção feita porque cortava os ícones. */
  var GIOCO_SPRITE = [
    '<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false" id="gioco-sprite">',
    '<filter id="liquidDistort" x="-20%" y="-20%" width="140%" height="140%">',
    '<feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="1" seed="7" result="noise"/>',
    '<feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G"/>',
    '</filter>',
    '<defs>',
    '<symbol id="i-bar-chart-2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></symbol>',
    '<symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></symbol>',
    '<symbol id="i-chef-hat" viewBox="0 0 24 24"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></symbol>',
    '<symbol id="i-chevron-down" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></symbol>',
    '<symbol id="i-chevron-right" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></symbol>',
    '<symbol id="i-clipboard-check" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></symbol>',
    '<symbol id="i-layout-dashboard" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></symbol>',
    '<symbol id="i-log-out" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></symbol>',
    '<symbol id="i-message-square" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></symbol>',
    '<symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></symbol>',
    '<symbol id="i-more-vertical" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></symbol>',
    '<symbol id="i-menu" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></symbol>',
    '<symbol id="i-panel-left" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></symbol>',
    '<symbol id="i-pencil" viewBox="0 0 24 24"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></symbol>',
    '<symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></symbol>',
    '<symbol id="i-plus" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>',
    '<symbol id="i-receipt" viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></symbol>',
    '<symbol id="i-scan" viewBox="0 0 24 24"><path d="M4 7V5a2 2 0 0 1 2-2h2"/><path d="M16 3h2a2 2 0 0 1 2 2v2"/><path d="M20 17v2a2 2 0 0 1-2 2h-2"/><path d="M8 21H6a2 2 0 0 1-2-2v-2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="8" y1="16" x2="14" y2="16"/></symbol>',
    '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>',
    '<symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></symbol>',
    '<symbol id="i-shopping-cart" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></symbol>',
    '<symbol id="i-store" viewBox="0 0 24 24"><path d="M4.5 4h15l1.5 5H3Z"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 13v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/><path d="M9 21v-5h6v5"/></symbol>',
    '<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></symbol>',
    '<symbol id="i-trash-2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></symbol>',
    '<symbol id="i-trending-down" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></symbol>',
    '<symbol id="i-trending-up" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></symbol>',
    '<symbol id="i-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol>',
    '<symbol id="i-droplet" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></symbol>',
    '<symbol id="i-flame" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></symbol>',
    '<symbol id="i-refresh-cw" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></symbol>',
    '<symbol id="i-sliders" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></symbol>',
    '<symbol id="i-snowflake" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><line x1="3.34" y1="7" x2="20.66" y2="17"/><line x1="3.34" y1="17" x2="20.66" y2="7"/><polyline points="9 4.5 12 7 15 4.5"/><polyline points="9 19.5 12 17 15 19.5"/><polyline points="3.6 11.2 6.9 12 5.4 15.1"/><polyline points="18.6 8.9 17.1 12 20.4 12.8"/></symbol>',
    '<symbol id="i-wind" viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></symbol>',
    '<symbol id="i-x" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></symbol>',
    '<symbol id="i-chevron-left" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></symbol>',
    '<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></symbol>',
    '<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></symbol>',
    '<symbol id="i-music" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></symbol>',
    '<symbol id="i-play" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></symbol>',
    '<symbol id="i-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></symbol>',
    '<symbol id="i-skip-back" viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></symbol>',
    '<symbol id="i-skip-forward" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></symbol>',
    '<symbol id="i-volume-2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></symbol>',
    '<symbol id="i-volume-x" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></symbol>',
    '<symbol id="i-wallet" viewBox="0 0 24 24"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M21 9h-6a2 2 0 0 0 0 4h6V9Z"/><path d="M3 7h16"/></symbol>',
    /* Set/2026, reorganização caixa.html (traço Feather/Lucide): */
    '<symbol id="i-coins" viewBox="0 0 24 24"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></symbol>',
    '<symbol id="i-list" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></symbol>',
    '<symbol id="i-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol>',
    /* Set/2026, videochamada nos eventos do Outlook (calendario.html): */
    '<symbol id="i-video" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></symbol>',
    /* Set/2026, símbolo de tipo nas linhas de Movimentos da caixa.html: */
    '<symbol id="i-arrow-down" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></symbol>',
    '<symbol id="i-arrow-up" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></symbol>',
    '</defs>',
    '</svg>'
  ].join('');

  /* Lista dos nomes disponíveis (sem o prefixo "i-"), por ordem alfabética
     tal como estão no sprite. Serve a grelha de ícones do estilo.html. */
  var GIOCO_ICON_NAMES = [
    'bar-chart-2', 'bell', 'chef-hat', 'chevron-down', 'chevron-right',
    'clipboard-check', 'layout-dashboard', 'log-out', 'message-square', 'moon',
    'more-vertical', 'menu', 'panel-left', 'pencil', 'phone', 'plus', 'receipt',
    'scan', 'search', 'settings', 'shopping-cart', 'store', 'sun', 'trash-2', 'trending-down',
    'trending-up', 'users',
    // Set/2026, para o A/C do centro de controlo e o modal do shell (traço Feather):
    'droplet', 'flame', 'refresh-cw', 'sliders', 'snowflake', 'wind', 'x',
    // Set/2026, calendario.html (traço Feather):
    'chevron-left', 'calendar', 'clock',
    // Set/2026, cartão Música do centro de controlo (traço Feather):
    'music', 'play', 'pause', 'skip-back', 'skip-forward', 'volume-2', 'volume-x',
    // Set/2026, cartão Posição Financeira do mrn-dashboard.html (traço Feather/Lucide):
    'wallet',
    // Set/2026, reorganização caixa.html
    'coins', 'list', 'lock',
    // Set/2026, videochamada nos eventos do Outlook (calendario.html):
    'video',
    // Set/2026, símbolo de tipo nas linhas de Movimentos da caixa.html:
    'arrow-down', 'arrow-up'
  ];

  function injectSprite() {
    try {
      if (document.getElementById('gioco-sprite')) return;
      var host = document.body || document.documentElement;
      if (!host) return;
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      wrap.innerHTML = GIOCO_SPRITE;
      host.insertBefore(wrap, host.firstChild);
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* ---------- giocoIcon(nome, {size}) ----------
     Devolve o HTML de <svg class="icon"><use href="#i-nome"/></svg>. */
  function giocoIcon(name, opts) {
    try {
      opts = opts || {};
      var size = opts.size == null ? 17 : opts.size;
      var cls = 'icon' + (opts.className ? ' ' + opts.className : '');
      var safe = String(name).replace(/[^a-z0-9-]/gi, '');
      if (!safe) return '';
      return '<svg class="' + cls + '" width="' + size + '" height="' + size + '">' +
             '<use href="#i-' + safe + '"/></svg>';
    } catch (e) { return ''; }
  }

  /* Troca o ícone de um <svg> já existente, pelo id do elemento. */
  function setIcon(id, name) {
    try {
      var el = document.getElementById(id);
      if (!el) return;
      var use = el.querySelector('use');
      if (use) use.setAttribute('href', '#i-' + name);
    } catch (e) { /* silencioso de propósito */ }
  }

  /* ---------- SIDEBAR ----------
     hover -> expande / colapsa.
     pin  -> fixa completamente fechada (largura zero). Enquanto fixada,
             o hover deixa de reagir. Clicar outra vez volta ao colapsado. */
  var sidebarEl = null;
  var sidebarPinnedClosed = false;

  function initSidebar() {
    try {
      sidebarEl = document.getElementById('sidebarEl');
      if (!sidebarEl) return;
      sidebarEl.addEventListener('mouseenter', function () {
        if (!sidebarPinnedClosed) sidebarEl.classList.remove('collapsed');
      });
      sidebarEl.addEventListener('mouseleave', function () {
        if (!sidebarPinnedClosed) sidebarEl.classList.add('collapsed');
      });
      var pin = document.getElementById('sidebarPinBtn');
      if (pin && !pin.getAttribute('onclick')) {
        pin.addEventListener('click', toggleSidebarPin);
      }
    } catch (e) { /* nunca travar o resto do script */ }
  }

  function toggleSidebarPin() {
    try {
      if (!sidebarEl) sidebarEl = document.getElementById('sidebarEl');
      if (!sidebarEl) return;
      sidebarPinnedClosed = !sidebarPinnedClosed;
      if (sidebarPinnedClosed) {
        sidebarEl.classList.add('collapsed', 'hidden');
      } else {
        sidebarEl.classList.remove('hidden');
        sidebarEl.classList.add('collapsed');
      }
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* ---------- THEME TOGGLE ----------
     knob desliza, ícone dentro troca (sol/lua), ghost aparece do lado vazio,
     aplica data-theme no <body>.

     A escolha persiste em localStorage['gioco-theme'] e é aplicada logo no
     arranque do script (que corre a seguir a <body>, antes do markup ser
     pintado) — é isso que evita o flash de tema claro ao navegar entre
     páginas. localStorage pode falhar (modo privado, cookies bloqueados):
     em qualquer erro cai-se no tema claro, nunca se trava o resto. */
  var THEME_KEY = 'gioco-theme';

  function readStoredTheme() {
    try {
      var t = window.localStorage.getItem(THEME_KEY);
      return (t === 'dark' || t === 'light') ? t : null;
    } catch (e) { return null; }
  }

  function storeTheme(t) {
    try { window.localStorage.setItem(THEME_KEY, t); } catch (e) { /* silencioso */ }
  }

  function setTheme(t) {
    try {
      document.body.setAttribute('data-theme', t);
      storeTheme(t);
      /* O toggle de tema é o componente .gio-toggle na variante --theme:
         LIGADO = tema claro, DESLIGADO = tema escuro. O estado vive no
         checkbox nativo, não numa classe. */
      var input = document.getElementById('toggleInput');
      if (input) input.checked = (t === 'light');
      setIcon('knobIcon', t === 'dark' ? 'moon' : 'sun');
      setIcon('ghostIcon', t === 'dark' ? 'sun' : 'moon');
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* Aplica só o atributo no <body>, sem tocar no toggle nem no localStorage.
     Corre antes do DOM do toggle existir; o initTheme() sincroniza depois. */
  function applyStoredThemeEarly() {
    try {
      var t = readStoredTheme();
      if (document.body) document.body.setAttribute('data-theme', t || 'light');
    } catch (e) { /* nunca travar o resto do script */ }
  }

  function toggleThemeSwitch() {
    try {
      var isDark = document.body.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'light' : 'dark');
    } catch (e) { /* nunca travar o resto do script */ }
  }

  function initTheme() {
    try {
      var input = document.getElementById('toggleInput');
      if (input && !input.getAttribute('onchange')) {
        input.addEventListener('change', toggleThemeSwitch);
      }
      // Sincroniza o knob/ghost com o que já foi aplicado ao <body>.
      setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* ---------- .gio-toggle — CONTROLO BINÁRIO ----------
     A wrapper do componente oficial de ligar/desligar (CSS em
     gioco-shell.css). Trabalha SEMPRE por referência de elemento ou por
     markup gerado, NUNCA por id fixo: tem de haver N por página — o
     centro-de-controlo tem uma dúzia de flags do A/C e do Sonos.

     Não há init nem estado em JS: o estado é o do <input type="checkbox">
     nativo, e é o CSS que o desenha. Estas funções são só conveniência para
     quem constrói HTML dinamicamente e para reflectir estado vindo do
     Firebase. */

  /* Markup do componente. Todas as opções são opcionais:
       id          id do <input> — é sempre no input que vive o handler
       classe      classes extra no <label>
       grande      true → .gio-toggle--lg (64x32, a medida do toggle de tema)
       ligado      estado inicial
       desativado  disabled no input
       rotulo      rótulo ao lado da pílula
       rotuloAntes true → rótulo à esquerda (por omissão fica à direita)
       attrs       atributos crus para o <input>: onchange, data-*,
                   aria-label, title…
     ATENÇÃO: 'rotulo' e 'attrs' entram como HTML, tal e qual — é o padrão
     do resto do OS, que constrói markup por concatenação. Nunca lhes passar
     texto vindo do utilizador sem escapar primeiro. */
  function giocoToggleHtml(o) {
    o = o || {};
    var cls = 'gio-toggle' + (o.grande ? ' gio-toggle--lg' : '') + (o.classe ? ' ' + o.classe : '');
    var txt = o.rotulo ? '<span class="gio-toggle-txt">' + o.rotulo + '</span>' : '';
    var pilula = '<span class="gio-toggle-track"><span class="gio-toggle-knob"></span></span>';
    return '<label class="' + cls + '">' +
             '<input type="checkbox" class="gio-toggle-input"' +
             (o.id ? ' id="' + o.id + '"' : '') +
             (o.ligado ? ' checked' : '') +
             (o.desativado ? ' disabled' : '') +
             (o.attrs ? ' ' + o.attrs : '') + '>' +
             (o.rotuloAntes ? txt + pilula : pilula + txt) +
           '</label>';
  }

  /* Aplica estado a um toggle JÁ no DOM, por referência — aceita o <label>,
     a track ou o próprio input. NÃO dispara 'change': serve para reflectir
     estado que veio de fora (um snapshot do Firebase), não para simular um
     clique. Passar 'desativado' como undefined deixa o disabled como está. */
  function giocoToggleSet(el, ligado, desativado) {
    try {
      if (!el) return;
      var input = (el.classList && el.classList.contains('gio-toggle-input'))
        ? el
        : (el.closest ? (el.closest('.gio-toggle') || el) : el);
      if (input && !input.classList.contains('gio-toggle-input')) {
        input = input.querySelector ? input.querySelector('.gio-toggle-input') : null;
      }
      if (!input) return;
      input.checked = !!ligado;
      if (desativado !== undefined) input.disabled = !!desativado;
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* Um checkbox nativo responde ao ESPAÇO, nunca ao ENTER. O componente
     substituiu botões, que respondiam aos dois — acrescenta-se o Enter para
     não se perder um caminho de teclado que já existia. Dispara 'change'
     para os handlers de sempre correrem exactamente como no clique.
     Delegado no document: apanha também os toggles criados depois. */
  function initToggleTeclado() {
    try {
      document.addEventListener('keydown', function (ev) {
        try {
          if (ev.key !== 'Enter' || ev.altKey || ev.ctrlKey || ev.metaKey) return;
          var alvo = ev.target;
          if (!alvo || !alvo.classList || !alvo.classList.contains('gio-toggle-input')) return;
          if (alvo.disabled) return;
          ev.preventDefault();
          alvo.checked = !alvo.checked;
          /* Os dois eventos, pela ordem do browser: há páginas que ouvem o
             'input' (o preview da regra na resultados.html) e outras o
             'change'. Um clique a sério dispara ambos; o Enter também tem de. */
          alvo.dispatchEvent(new Event('input', { bubbles: true }));
          alvo.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) { /* silencioso de propósito */ }
      });
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* ---------- .gio-seg — ESCOLHA UMA-DE-N ----------
     Wrapper do segmentado (CSS em gioco-shell.css). Como o .gio-toggle,
     trabalha SEMPRE por referência de elemento, NUNCA por id fixo: há
     sempre vários por página (a caixa.html tem cinco).

     O estado vive no DOM, no aria-selected das opções — não há registo em
     JS. O que este módulo faz é (1) desenhar markup, (2) mexer no
     aria-selected, e (3) pôr o indicador por cima da opção activa, que é a
     única parte que precisa de medir o layout real.

     O clique é tratado aqui em delegação: a página não tem de mexer no
     aria-selected, só de ouvir o clique e ler o data-valor. Como o
     listener da página está no botão ou no contentor, corre ANTES deste —
     a lógica da página e o desenho do componente são independentes. */

  /* Escreve o indicador por cima da opção activa. NÃO mexe em nada se o
     grupo estiver fora do layout (dentro de um bloco [hidden], de um
     display:none): aí as medidas são todas zero e escrevê-las deixava o
     indicador encolhido, para depois saltar quando o bloco abrisse. Deixar
     os valores anteriores como estão é o que faz o bloco abrir já certo. */
  function segPosicionar(seg, revelar) {
    try {
      var ind = seg.querySelector('.gio-seg-ind');
      if (!ind) return;
      var ativa = seg.querySelector('.gio-seg-opt[aria-selected="true"]');
      if (!ativa) { ind.style.opacity = '0'; ind.style.width = '0px'; return; }
      if (!seg.offsetParent && seg.style.position !== 'fixed') return;
      var larg = ativa.offsetWidth;
      if (!larg) return;
      ind.style.width = larg + 'px';
      ind.style.transform = 'translateX(' + ativa.offsetLeft + 'px)';
      ind.style.opacity = '1';
      /* Só depois da PRIMEIRA colocação bem sucedida é que o indicador
         passa a transicionar (ver o CSS). Assim um grupo acabado de
         injectar no DOM nasce já no sítio, sem deslizar da esquerda. */
      if (!seg.hasAttribute('data-seg-pronto')) {
        var w = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : function (f) { setTimeout(f, 0); };
        w(function () { try { seg.setAttribute('data-seg-pronto', ''); } catch (e) {} });
      }
      /* Grupo com scroll: trazer a opção escolhida para dentro da janela.
         Só no caminho interactivo — a fazê-lo em cada reposicionamento, um
         grupo estreito arrastava-se sozinho ao abrir a página. */
      if (revelar && seg.scrollWidth > seg.clientWidth) {
        var e = ativa.offsetLeft, d = e + larg;
        if (e < seg.scrollLeft) seg.scrollLeft = Math.max(0, e - 6);
        else if (d > seg.scrollLeft + seg.clientWidth) seg.scrollLeft = d - seg.clientWidth + 6;
      }
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* Um observador para todos: um grupo passa a ter largura quando o bloco
     que o contém deixa de estar hidden, quando a janela roda, quando a
     fonte acaba de carregar. Todos esses casos chegam aqui como uma
     mudança de tamanho, e nenhum obriga a página a lembrar-se de nada. */
  var segRO = (typeof ResizeObserver === 'function')
    ? new ResizeObserver(function (entradas) {
        for (var i = 0; i < entradas.length; i++) segPosicionar(entradas[i].target, false);
      })
    : null;

  function segRegistar(seg) {
    if (!seg || seg.__gioSegObservado) return;
    seg.__gioSegObservado = true;
    if (segRO) { try { segRO.observe(seg); } catch (e) {} }
  }

  function segLista(el) {
    if (!el) return [].slice.call(document.querySelectorAll('.gio-seg'));
    if (el.classList && el.classList.contains('gio-seg')) return [el];
    var perto = el.closest ? el.closest('.gio-seg') : null;
    if (perto) return [perto];
    return el.querySelectorAll ? [].slice.call(el.querySelectorAll('.gio-seg')) : [];
  }

  /* Recoloca o indicador dos grupos dentro de 'el' (ou de todos, sem
     argumento). Chamar depois de QUALQUER innerHTML que possa ter criado ou
     medido de novo um .gio-seg — é o mesmo cuidado que o GiocoChart.montar()
     pede para os gráficos, e pela mesma razão: o indicador é medido do
     layout real, e antes de o markup estar no DOM não há layout nenhum. */
  function giocoSegSync(el) {
    var segs = segLista(el);
    for (var i = 0; i < segs.length; i++) { segRegistar(segs[i]); segPosicionar(segs[i], false); }
  }

  /* Aplica estado a um grupo JÁ no DOM, por referência — aceita o
     contentor, uma opção ou qualquer descendente. 'valor' é o data-valor da
     opção a activar; null (ou um valor que não existe) deixa o grupo SEM
     opção activa, o índice -1 documentado no CSS. NÃO dispara 'click':
     serve para reflectir estado, não para simular um toque. */
  function giocoSegSet(el, valor) {
    try {
      var seg = segLista(el)[0];
      if (!seg) return;
      var opts = seg.querySelectorAll('.gio-seg-opt');
      var algumaAtiva = false;
      for (var i = 0; i < opts.length; i++) {
        var ativa = (valor !== null && valor !== undefined && opts[i].getAttribute('data-valor') === String(valor));
        if (ativa) algumaAtiva = true;
        opts[i].setAttribute('aria-selected', ativa ? 'true' : 'false');
        opts[i].tabIndex = ativa ? 0 : -1;
      }
      /* Sem nenhuma activa o grupo tem de continuar alcançável por
         tabulação, senão o teclado saltava-o por completo. */
      if (!algumaAtiva && opts.length) opts[0].tabIndex = 0;
      segRegistar(seg);
      segPosicionar(seg, false);
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* Markup do componente. Opções:
       opcoes    [{ valor, rotulo, icone?, desativada?, titulo?, attrs? }]
                 'icone' é um nome do sprite local (sem o prefixo i-).
       ativa     valor da opção escolhida; omitido/null = índice -1
       grande    true → .gio-seg--lg
       vermelho  true → .gio-seg--red (indicador vermelho; acção em
                 destaque, nunca um filtro)
       id, classe, rotuloGrupo (aria-label), attrs
     ATENÇÃO: 'rotulo', 'attrs' e 'rotuloGrupo' entram como HTML tal e qual
     — é o padrão do resto do OS, que constrói markup por concatenação.
     Nunca lhes passar texto do utilizador sem escapar primeiro. O 'valor',
     esse, é sempre escapado: é ele que costuma vir de dados. */
  function giocoSegHtml(o) {
    o = o || {};
    var opcoes = o.opcoes || [];
    var cls = 'gio-seg' + (o.grande ? ' gio-seg--lg' : '') + (o.vermelho ? ' gio-seg--red' : '') + (o.classe ? ' ' + o.classe : '');
    var h = '<div class="' + cls + '" role="tablist"' +
            (o.id ? ' id="' + o.id + '"' : '') +
            (o.rotuloGrupo ? ' aria-label="' + o.rotuloGrupo + '"' : '') +
            (o.attrs ? ' ' + o.attrs : '') + '>' +
            '<span class="gio-seg-ind" aria-hidden="true"></span>';
    var jaAtiva = false;
    for (var i = 0; i < opcoes.length; i++) {
      var op = opcoes[i] || {};
      var ativa = (o.ativa !== null && o.ativa !== undefined && String(op.valor) === String(o.ativa));
      if (ativa) jaAtiva = true;
      h += '<button type="button" class="gio-seg-opt" role="tab"' +
           ' data-valor="' + segEsc(op.valor) + '"' +
           ' aria-selected="' + (ativa ? 'true' : 'false') + '"' +
           ' tabindex="' + (ativa ? '0' : '-1') + '"' +
           (op.desativada ? ' disabled' : '') +
           (op.titulo ? ' title="' + segEsc(op.titulo) + '"' : '') +
           (op.attrs ? ' ' + op.attrs : '') + '>' +
           (op.icone ? segIcone(op.icone) : '') +
           '<span>' + (op.rotulo === undefined ? '' : op.rotulo) + '</span>' +
           '</button>';
    }
    if (!jaAtiva && opcoes.length) h = h.replace('tabindex="-1"', 'tabindex="0"');
    return h + '</div>';
  }

  /* Ícone decorativo à esquerda do rótulo: herda a cor do texto da opção
     (o .icon do shell usa stroke:currentColor) e NUNCA é a única forma de
     distinguir a opção — o rótulo mantém-se sempre. aria-hidden porque o
     nome da opção já é lido a seguir. */
  function segIcone(nome) {
    var safe = String(nome).replace(/[^a-z0-9-]/gi, '');
    if (!safe) return '';
    return '<svg class="icon" width="14" height="14" aria-hidden="true"><use href="#i-' + safe + '"/></svg>';
  }

  function segEsc(v) {
    return String(v === undefined || v === null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Clique e teclado, delegados no document — apanham também os grupos
     criados depois. Teclado: ← → andam entre opções (com volta ao início),
     Home/End vão à primeira/última. A opção é ACTIVADA ao ser alcançada
     (activação automática, o padrão de um tablist), disparando o mesmo
     clique que o rato dispara, para a página não ter de saber por onde veio.
     O foco é reposto no fim porque há handlers de página que o levam para
     outro lado (o Saída/Entrada da caixa.html salta para o campo do valor,
     e sem isto a seta seguinte já não encontrava o grupo). */
  function initSeg() {
    try {
      document.addEventListener('click', function (ev) {
        try {
          var alvo = ev.target && ev.target.closest ? ev.target.closest('.gio-seg-opt') : null;
          if (!alvo || alvo.disabled) return;
          var seg = alvo.closest('.gio-seg');
          if (!seg) return;
          var opts = seg.querySelectorAll('.gio-seg-opt');
          for (var i = 0; i < opts.length; i++) {
            var e = (opts[i] === alvo);
            opts[i].setAttribute('aria-selected', e ? 'true' : 'false');
            opts[i].tabIndex = e ? 0 : -1;
          }
          segRegistar(seg);
          segPosicionar(seg, true);
        } catch (e) { /* silencioso de propósito */ }
      });

      document.addEventListener('keydown', function (ev) {
        try {
          if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
          var teclas = { ArrowLeft: 1, ArrowRight: 1, Home: 1, End: 1 };
          if (!teclas[ev.key]) return;
          var alvo = ev.target;
          if (!alvo || !alvo.classList || !alvo.classList.contains('gio-seg-opt')) return;
          var seg = alvo.closest('.gio-seg');
          if (!seg) return;
          var livres = [].slice.call(seg.querySelectorAll('.gio-seg-opt')).filter(function (b) { return !b.disabled; });
          if (livres.length < 2) return;
          var i = livres.indexOf(alvo);
          if (i < 0) return;
          var j;
          if (ev.key === 'Home') j = 0;
          else if (ev.key === 'End') j = livres.length - 1;
          else if (ev.key === 'ArrowLeft') j = (i - 1 + livres.length) % livres.length;
          else j = (i + 1) % livres.length;
          if (j === i && ev.key !== 'Home' && ev.key !== 'End') return;
          ev.preventDefault();
          livres[j].focus();
          livres[j].click();
          livres[j].focus();
        } catch (e) { /* silencioso de propósito */ }
      });

      window.addEventListener('resize', function () { giocoSegSync(); });
      /* As larguras mudam quando a Inter substitui a fonte de recurso. */
      if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
        document.fonts.ready.then(function () { giocoSegSync(); });
      }
      giocoSegSync();
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* ---------- NAVEGAÇÃO PARTILHADA ----------
     Uma única definição das entradas do menu. Antes estava copiada à mão no
     <body> de cada página, e cada entrada nova obrigava a mexer em todas.

     ALLOW-LIST, NUNCA DENY-LIST. Cada página escolhe o CONJUNTO que quer ver,
     e o conjunto por omissão é o público. O mrn-dashboard.html é privado: o
     link dele não pode aparecer em nenhuma página pública, por isso nenhum
     conjunto o lista — nem sequer o privado, que é o menu de dentro dele e
     nunca se lista a si próprio. Se um dia isto passasse a deny-list (uma flag
     "não mostrar"), esquecer a flag numa página nova expunha o link privado.

     O conjunto 'privada' é o cluster que só se alcança a partir do dashboard
     (tesouraria, tarefas, conta bancária). A primeira entrada chama-se "Home"
     e não "Dashboard" de propósito — nas páginas públicas há um
     "Dashboard → index.html" que convida a ser "corrigido" para
     mrn-dashboard.html, e era assim que o link privado sairia.

     Máximo 9 entradas por conjunto: as regras :nth-child do gioco-shell.css
     param na 9ª e a partir daí perde-se a animação escalonada. */
  var GIOCO_NAV_CONJUNTOS = {
    publica: [
      { href: 'index.html',      icone: 'layout-dashboard', label: 'Dashboard' },
      { href: 'receitas.html',   icone: 'chef-hat',         label: 'Receitas' },
      { href: 'compras.html',    icone: 'shopping-cart',    label: 'Compras' },
      { href: 'pagamentos.html', icone: 'receipt',          label: 'Pagamentos' },
      { href: 'vendas.html',     icone: 'bar-chart-2',      label: 'Vendas' },
      { href: 'contagens.html',  icone: 'clipboard-check',  label: 'Contagens' },
      /* Gestão: folha de cálculo de ingredientes e produtos (edição em massa). */
      { href: 'gestao.html',     icone: 'pencil',           label: 'Gestão' },
      { href: 'foodcost.html',   icone: 'trending-down',    label: 'Food cost' },
      { href: 'resultados.html', icone: 'trending-up',      label: 'Resultados' },
      { href: 'equipa.html',     icone: 'users',            label: 'Equipa' },
      { href: 'contactos.html',  icone: 'phone',            label: 'Contactos' },
      /* Centro de controlo: cameras, HACCP, vendas do dia e consumo por loja.
         Icone 'scan' (moldura de visor) por ser o mais proximo de uma camara
         no sprite — o 'store' ja e o da loja-sao-bento no index. */
      { href: 'centro-de-controlo.html', icone: 'scan',       label: 'Centro de controlo' },
      /* Padrões: vendas × contexto externo (calendário + meteo), só leitura.
         'layout-dashboard' é o mais próximo de uma grelha/calendário no sprite. */
      { href: 'padroes.html',    icone: 'layout-dashboard', label: 'Padrões' },
      /* Definições ainda não tem página. Link morto de propósito: fica à vista
         no menu, mas não navega para lado nenhum. Com os Resultados a lista
         passou a 10 entradas: é o link morto que fica na 10ª, a única sem
         animação escalonada (as :nth-child do shell param na 9ª). */
      { href: '#',               icone: 'settings',         label: 'Definições' }
    ],
    privada: [
      { href: 'index.html',      icone: 'layout-dashboard', label: 'Home' },
      { href: 'tesouraria.html', icone: 'receipt',          label: 'Tesouraria' },
      { href: 'calendario.html', icone: 'calendar',         label: 'Calendário' },
      { href: 'tarefas.html',    icone: 'pencil',           label: 'Tarefas' },
      /* conta-bancaria.html sem ?conta= mostra "Nenhuma conta indicada". O slug
         é o mesmo CONTA_RECONCILIACAO usado pelo card de Depósitos. */
      { href: 'conta-bancaria.html?conta=abanca', icone: 'trending-up', label: 'Conta bancária' }
    ]
  };

  /* ---------- giocoNav(ativo, conjunto) ----------
     Preenche o <nav> da sidebar (por omissão o #giocoNav) com as entradas do
     conjunto, marcando `ativo` como .active. `ativo` é o href tal como está
     na lista — é a ÚNICA coisa que cada página declara.

     Corre SÍNCRONO, chamado por um <script> logo a seguir ao <nav>. Tem de ser
     assim: há páginas (contagens, equipa) com JS próprio que percorre
     '#sidebarEl .nav-row' para fechar o painel do menu ao toque, e esse JS
     corre antes do DOMContentLoaded. Se a nav só aparecesse mais tarde, esse
     JS não encontrava linha nenhuma e o painel deixava de fechar. */
  function giocoNav(ativo, conjunto, alvo) {
    try {
      var lista = GIOCO_NAV_CONJUNTOS[conjunto || 'publica'];
      if (!lista) return;
      var nav = alvo || document.getElementById('giocoNav');
      if (!nav) return;
      var html = '';
      for (var i = 0; i < lista.length; i++) {
        var e = lista[i];
        /* --nav-d: stagger da animação dos labels (.03s × posição), lido
           pelo gioco-shell.css — vale para qualquer número de entradas,
           ao contrário das antigas regras :nth-child que paravam na 9ª. */
        html += '<a class="nav-row' + (e.href === ativo ? ' active' : '') +
                '" href="' + e.href + '">' + giocoIcon(e.icone, { size: 17 }) +
                ' <span style="--nav-d:' + (0.03 * (i + 1)).toFixed(2) + 's">' + e.label + '</span></a>';
      }
      nav.innerHTML = html;
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* ---------- MENU AO TOQUE ----------
     Companheiro do bloco @media (hover: none) do gioco-shell.css, e igualmente
     OPT-IN: só faz alguma coisa nas páginas com <body class="shell-mobile">.
     Vinha duplicado no <style>/<script> da equipa.html e da contagens.html.

     O #sidebarPinBtn tem dois papéis: com rato chama o toggleSidebarPin() de
     sempre, sem desvios; ao toque abre/fecha o painel. Ao toque não há hover,
     e os itens do menu são <a> — tocar neles navegava em vez de abrir. */
  function ehToque(){
    if (!document.body || !document.body.classList.contains('shell-mobile')) return false;
    return !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
  }

  function painelAberto(){
    var sb = document.getElementById('sidebarEl');
    return !!(sb && sb.classList.contains('painel-aberto'));
  }

  function mostrarPainel(abrir){
    try {
      var sb = document.getElementById('sidebarEl');
      var ov = document.getElementById('navOverlay');
      if (sb) sb.classList.toggle('painel-aberto', !!abrir);
      if (ov) ov.classList.toggle('aberto', !!abrir);
      var btn = document.getElementById('sidebarPinBtn');
      if (btn && ehToque()) btn.setAttribute('title', abrir ? 'Fechar o menu' : 'Abrir o menu');
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* O que o onclick do #sidebarPinBtn deve chamar nas páginas shell-mobile. */
  function giocoToggleMenu(){
    if (!ehToque()){ toggleSidebarPin(); return; }
    mostrarPainel(!painelAberto());
  }

  function initMenuToque(){
    try {
      if (!document.body || !document.body.classList.contains('shell-mobile')) return;
      var ov = document.getElementById('navOverlay');
      if (ov) ov.addEventListener('click', function(){ mostrarPainel(false); });
      var linhas = document.querySelectorAll('#sidebarEl .nav-row');
      for (var i = 0; i < linhas.length; i++){
        linhas[i].addEventListener('click', function(){ mostrarPainel(false); });
      }
      window.addEventListener('pageshow', function(){ mostrarPainel(false); });
      var mq = window.matchMedia && window.matchMedia('(hover: none)');
      if (mq && mq.addEventListener){
        mq.addEventListener('change', function(){
          mostrarPainel(false);
          var btn = document.getElementById('sidebarPinBtn');
          if (btn && !ehToque()) btn.setAttribute('title', 'Fixar a barra lateral fechada');
        });
      }
      mostrarPainel(false);
    } catch (e) { /* nunca travar o resto do script */ }
  }

  /* ---------- CLASSE shell-touch NO BODY ----------
     Companheira do bloco @media (hover: none) do gioco-shell.css, e como ele
     OPT-IN: sem <body class="shell-mobile"> não faz nada (nem sequer no
     telemóvel). Com a classe, e quando o dispositivo não tem hover, põe
     body.shell-touch — e é com esse prefixo que uma página reorganiza o seu
     layout (ex.: a grelha de três colunas do centro de controlo em coluna
     única) sem escrever @media próprios, que o CLAUDE.md proíbe fora do shell.

     O critério é o hover, NUNCA a largura — o mesmo do @media do CSS. Um iPad
     com rato ligado/desligado muda de estado a quente, por isso volta a
     correr no 'change' do matchMedia. */
  function atualizarShellTouch(){
    try {
      if (!document.body) return;
      document.body.classList.toggle('shell-touch', ehToque());
    } catch (e) { /* nunca travar o resto do script */ }
  }
  function initShellTouch(){
    try {
      atualizarShellTouch();
      var mq = window.matchMedia && window.matchMedia('(hover: none)');
      if (mq){
        if (mq.addEventListener) mq.addEventListener('change', atualizarShellTouch);
        else if (mq.addListener) mq.addListener(atualizarShellTouch);
      }
    } catch (e) { /* nunca travar o resto do script */ }
  }


  /* ---------- MODAL (giocoModal) ----------
     Componente único do shell para painéis sobrepostos (ex.: opções do A/C
     no centro de controlo). Cria o overlay uma vez, no body, e reutiliza-o.
       giocoModal.open({ titulo, conteudo, onClose }) → devolve o elemento .gioco-modal-body
         conteudo: Node ou string HTML (já escapada por quem chama).
       giocoModal.close()
       giocoModal.isOpen()
     Fecha com Esc, clique no fundo escuro ou no botão ×. Enquanto está
     aberto, body.gioco-modal-open bloqueia o scroll da página. */
  var modalEl = null, modalBody = null, modalTitulo = null, modalOnClose = null, modalFocoAnterior = null;

  function modalCriar(){
    if (modalEl) return;
    modalEl = document.createElement('div');
    modalEl.className = 'gioco-modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.innerHTML =
      '<div class="gioco-modal glass-light">' +
        '<div class="gioco-modal-head">' +
          '<h2 class="gioco-modal-titulo" id="giocoModalTitulo"></h2>' +
          '<button type="button" class="gioco-modal-close" aria-label="Fechar">' +
            '<svg class="icon" width="16" height="16"><use href="#i-x"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="gioco-modal-body"></div>' +
      '</div>';
    modalEl.setAttribute('aria-labelledby', 'giocoModalTitulo');
    document.body.appendChild(modalEl);
    modalBody = modalEl.querySelector('.gioco-modal-body');
    modalTitulo = modalEl.querySelector('.gioco-modal-titulo');
    modalEl.querySelector('.gioco-modal-close').addEventListener('click', modalClose);
    // Só o fundo fecha: um clique dentro do painel não chega aqui com target=overlay.
    modalEl.addEventListener('mousedown', function(ev){ if (ev.target === modalEl) modalClose(); });
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && modalIsOpen()) { ev.preventDefault(); modalClose(); }
    });
  }

  function modalIsOpen(){ return !!(modalEl && modalEl.classList.contains('aberto')); }

  function modalOpen(opts){
    opts = opts || {};
    modalCriar();
    modalTitulo.textContent = opts.titulo || '';
    modalBody.innerHTML = '';
    if (opts.conteudo && typeof opts.conteudo !== 'string') modalBody.appendChild(opts.conteudo);
    else if (opts.conteudo) modalBody.innerHTML = opts.conteudo;
    modalOnClose = typeof opts.onClose === 'function' ? opts.onClose : null;
    modalFocoAnterior = document.activeElement;
    modalEl.classList.add('aberto');
    document.body.classList.add('gioco-modal-open');
    var btn = modalEl.querySelector('.gioco-modal-close');
    if (btn) btn.focus();
    return modalBody;
  }

  function modalClose(){
    if (!modalIsOpen()) return;
    modalEl.classList.remove('aberto');
    document.body.classList.remove('gioco-modal-open');
    var cb = modalOnClose; modalOnClose = null;
    if (modalFocoAnterior && modalFocoAnterior.focus) { try { modalFocoAnterior.focus(); } catch (e) {} }
    modalFocoAnterior = null;
    if (cb) cb();
  }

  var giocoModal = { open: modalOpen, close: modalClose, isOpen: modalIsOpen };

  /* ---------- ARRANQUE ---------- */
  function giocoShellInit() {
    injectSprite();
    initSidebar();
    initTheme();
    initToggleTeclado();
    initSeg();
    initMenuToque();
    initShellTouch();
  }

  injectSprite(); // o mais cedo possível, para os <use> do markup resolverem
  applyStoredThemeEarly(); // antes do primeiro paint, para não haver flash
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', giocoShellInit);
  } else {
    giocoShellInit();
  }

  /* API global (mantém os nomes usados pelos onclick inline da referência) */
  window.giocoIcon = giocoIcon;
  window.giocoNav = giocoNav;
  window.giocoToggleMenu = giocoToggleMenu;
  window.GIOCO_NAV_CONJUNTOS = GIOCO_NAV_CONJUNTOS;
  window.GIOCO_ICON_NAMES = GIOCO_ICON_NAMES;
  window.giocoShellInit = giocoShellInit;
  window.setIcon = setIcon;
  window.setTheme = setTheme;
  window.toggleThemeSwitch = toggleThemeSwitch;
  window.giocoToggleHtml = giocoToggleHtml;
  window.giocoToggleSet = giocoToggleSet;
  window.giocoSegHtml = giocoSegHtml;
  window.giocoSegSet = giocoSegSet;
  window.giocoSegSync = giocoSegSync;
  window.toggleSidebarPin = toggleSidebarPin;
  window.giocoReadStoredTheme = readStoredTheme;
  window.giocoModal = giocoModal;
})();
