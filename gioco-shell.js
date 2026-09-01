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

  /* ---------- Sprite: filtro liquidDistort + 24 símbolos ----------
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
    '<symbol id="i-plus" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>',
    '<symbol id="i-receipt" viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></symbol>',
    '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>',
    '<symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></symbol>',
    '<symbol id="i-shopping-cart" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></symbol>',
    '<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></symbol>',
    '<symbol id="i-trash-2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></symbol>',
    '<symbol id="i-trending-down" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></symbol>',
    '<symbol id="i-trending-up" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></symbol>',
    '<symbol id="i-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol>',
    '</defs>',
    '</svg>'
  ].join('');

  /* Lista dos nomes disponíveis (sem o prefixo "i-"), por ordem alfabética
     tal como estão no sprite. Serve a grelha de ícones do estilo.html. */
  var GIOCO_ICON_NAMES = [
    'bar-chart-2', 'bell', 'chef-hat', 'chevron-down', 'chevron-right',
    'clipboard-check', 'layout-dashboard', 'log-out', 'message-square', 'moon',
    'more-vertical', 'menu', 'panel-left', 'pencil', 'plus', 'receipt',
    'search', 'settings', 'shopping-cart', 'sun', 'trash-2', 'trending-down',
    'trending-up', 'users'
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
      var track = document.getElementById('toggleTrack');
      if (track) {
        track.classList.toggle('is-dark', t === 'dark');
        track.classList.toggle('is-light', t === 'light');
      }
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
      var track = document.getElementById('toggleTrack');
      if (track && !track.getAttribute('onclick')) {
        track.addEventListener('click', toggleThemeSwitch);
      }
      // Sincroniza o knob/ghost com o que já foi aplicado ao <body>.
      setTheme(document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
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
      { href: 'foodcost.html',   icone: 'trending-down',    label: 'Food cost' },
      { href: 'resultados.html', icone: 'trending-up',      label: 'Resultados' },
      { href: 'equipa.html',     icone: 'users',            label: 'Equipa' },
      /* Definições ainda não tem página. Link morto de propósito: fica à vista
         no menu, mas não navega para lado nenhum. Com os Resultados a lista
         passou a 10 entradas: é o link morto que fica na 10ª, a única sem
         animação escalonada (as :nth-child do shell param na 9ª). */
      { href: '#',               icone: 'settings',         label: 'Definições' }
    ],
    privada: [
      { href: 'index.html',      icone: 'layout-dashboard', label: 'Home' },
      { href: 'tesouraria.html', icone: 'receipt',          label: 'Tesouraria' },
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
        html += '<a class="nav-row' + (e.href === ativo ? ' active' : '') +
                '" href="' + e.href + '">' + giocoIcon(e.icone, { size: 17 }) +
                ' <span>' + e.label + '</span></a>';
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

  /* ---------- ARRANQUE ---------- */
  function giocoShellInit() {
    injectSprite();
    initSidebar();
    initTheme();
    initMenuToque();
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
  window.toggleSidebarPin = toggleSidebarPin;
  window.giocoReadStoredTheme = readStoredTheme;
})();
