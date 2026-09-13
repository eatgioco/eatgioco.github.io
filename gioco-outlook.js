/* ==========================================================================
   GIOCO OS — gioco-outlook.js
   Camada de LEITURA do calendário do Outlook (Microsoft Graph), no molde dos
   outros motores partilhados do OS. Expõe o objeto global GiocoOutlook.
   Set/2026, para a camada "Outlook" da calendario.html.

   SÓ LEITURA, das duas pontas:
   - nunca escreve no Firebase (não conhece o Firebase de todo);
   - nunca escreve no Graph (só GET /me/calendarView, scope Calendars.Read).
   Um evento do Outlook NUNCA é gravado no nó eventos/ — vive só em memória,
   é remontado a cada mudança de mês e desaparece com a sessão do browser.

   DEPENDÊNCIA: @azure/msal-browser 2.38.2, carregado por <script> a partir do
   CDN da Microsoft com integrity+crossorigin (ver calendario.html). Se o
   script não carregar, disponivel() devolve false e TODAS as outras funções
   falham em silêncio controlado — a página que usa o módulo continua a
   funcionar sem a camada. Nunca deixar o módulo atirar para fora.

   USO:
     GiocoOutlook.init();                       // idempotente; trata o retorno do redirect
     GiocoOutlook.pronto()                      // Promise: o handleRedirectPromise assentou
     GiocoOutlook.estado()                      // 'webview'|'indisponivel'|'a-verificar'|'ligado'|'desligado'
     GiocoOutlook.erroDoRedirect()              // erro do regresso do redirect (ou null), para a página mostrar
     GiocoOutlook.diagnostico()                 // objecto para o painel de erro da pagina
     GiocoOutlook.detetarAmbiente(ua)           // PURA, exportada para teste
     GiocoOutlook.disponivel()                  // o SDK carregou?
     GiocoOutlook.estaLigado()                  // atalho para estado() === 'ligado'
     GiocoOutlook.conta()                       // { email, nome } | null
     GiocoOutlook.ligar()                       // popup; cai para redirect se bloqueado
     GiocoOutlook.desligar()                    // limpa a cache local, sem ir à Microsoft
     GiocoOutlook.carregarEventos(ini, fim)     // Promise<[itens normalizados]>

   FORMA DOS ITENS — a MESMA lista normalizada da calendario.html:
     { id, titulo, data, diaInteiro, horaInicio, horaFim, categoria,
       notas, origem:'outlook', editavel:false,
       extra: { graphId, local, webLink, organizador, showAs, inicio, fim } }
   Um evento que atravessa vários dias dá VÁRIOS itens (um por dia), porque o
   modelo normalizado tem um só campo `data`. Ver expandirDias().
   ========================================================================== */
var GiocoOutlook = (function () {
  'use strict';

  var CLIENT_ID = '0450087b-b2a7-446b-babe-9116013ee5c8';
  var AUTHORITY = 'https://login.microsoftonline.com/1c0bb082-78b9-41fa-b183-d4044379803f';
  var SCOPES = ['Calendars.Read'];
  var GRAPH = 'https://graph.microsoft.com/v1.0/me/calendarView';
  var FUSO = 'Europe/Lisbon';
  // Um evento a atravessar mais dias do que isto é quase de certeza um
  // marcador anual/aberto: expandi-lo encheria a grelha inteira.
  var MAX_DIAS_EVENTO = 60;
  // Travão da paginação do Graph: 250 × 20 = 5000 eventos, muito acima de
  // qualquer mês real. Sem ele, um nextLink em ciclo prendia a página.
  var MAX_PAGINAS = 20;
  /* Campos pedidos ao calendarView. O conjunto completo traz o que a detecção
     da videochamada precisa; o mínimo é o que a página precisa para desenhar,
     e serve de rede se algum campo do completo for recusado (ver carregarEventos).
     onlineMeetingUrl está DEPRECADO no Graph — nunca o pedir. */
  var SELECT_COMPLETO = 'id,subject,start,end,isAllDay,isCancelled,location,locations,' +
    'webLink,organizer,showAs,isOnlineMeeting,onlineMeeting,onlineMeetingProvider,bodyPreview';
  var SELECT_MINIMO = 'id,subject,start,end,isAllDay,isCancelled,location,webLink,organizer,showAs';

  var pca = null;            // PublicClientApplication (uma só instância)
  var arrancou = false;      // init() já correu
  var redirectPronto = null; // Promise do handleRedirectPromise
  var prontoOk = false;      // o handleRedirectPromise JÁ assentou
  var redirectResultado = null; // o que o regresso do redirect trouxe (ou null)
  var redirectTentado = false;  // um único loginRedirect por carregamento
  var ultimoErro = null;        // objecto INTEIRO do último erro, para o diagnóstico
  var erroRedirect = null;      // o erro do REGRESSO do redirect (Set/2026): a página
                                // tem de o mostrar — antes ficava só na consola

  /* ---------- Ambiente ----------
     PURA e exportável (recebe o UA em vez de o ir buscar), para ser testável
     com strings reais de iPhone — mesma decisão do detetarLinkReuniao.

     Porquê: o login da Microsoft comporta-se de trÊs maneiras diferentes.
     - Numa WEBVIEW embutida (Facebook, Instagram, WhatsApp…) a Microsoft
       BLOQUEIA o login de propósito. Não vale a pena tentar: avisa-se e ponto.
       Em iOS uma WKWebView não põe "Safari" no UA; o Safari real põe.
     - Em iOS (Safari incluído) o popup é pouco fiável: ou vem bloqueado e
       reportado como cancelamento, ou a promessa nunca assenta. Vai-se
       directo a redirect.
     - No desktop o popup funciona e continua a ser o caminho.

     ATENÇÃO — ecrã principal do iPhone (Set/2026): a página tem
     apple-mobile-web-app-capable=yes, e aberta pelo ícone do ecrã principal
     corre em modo "standalone" com um UA SEM "Safari" — exactamente o UA de
     uma WKWebView. Era por isso que, do ícone, a camada dizia "Abre no
     Safari" e nunca tentava o login. Standalone NÃO é uma app de terceiros:
     é o Safari sem barra, a Microsoft aceita o login por redirect e o
     localStorage é o do próprio atalho. `standalone` (navigator.standalone
     ou display-mode) vence a regra do UA. */
  function detetarAmbiente(ua, plataforma, toques, standalone) {
    ua = String(ua == null ? (navigator.userAgent || '') : ua);
    plataforma = plataforma == null ? (navigator.platform || '') : plataforma;
    toques = toques == null ? (navigator.maxTouchPoints || 0) : toques;
    if (standalone == null) standalone = detetarStandalone();
    // iPadOS 13+ mente no UA e diz-se Macintosh: distingue-se pelo toque.
    var ios = /iPad|iPhone|iPod/.test(ua) || (plataforma === 'MacIntel' && toques > 1);
    var appEmbutida = /(FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|MicroMessenger|LinkedInApp|Snapchat|TikTok)/i.test(ua);
    // Browsers de terceiros em iOS (CriOS/FxiOS/EdgiOS) têm "Safari" no UA e
    // são browsers a sério; só a ausência de "Safari" denuncia a webview —
    // excepto em standalone (ícone do ecrã principal), que também não a tem.
    var webviewIos = ios && !standalone && !/Safari/.test(ua);
    return {
      ios: ios,
      standalone: !!standalone,
      webview: !!(appEmbutida || webviewIos),
      motivo: appEmbutida ? 'app' : (webviewIos ? 'ios-webview' : null),
      ua: ua
    };
  }
  function detetarStandalone() {
    try {
      if (typeof navigator !== 'undefined' && navigator.standalone === true) return true;
      if (typeof window !== 'undefined' && window.matchMedia &&
          window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) { /* sem window: Node, testes */ }
    return false;
  }
  var AMB = detetarAmbiente();

  function disponivel() { return typeof msal !== 'undefined' && !!msal.PublicClientApplication; }

  /* Erro nosso, com a mesma forma dos do MSAL (errorCode + errorMessage), para
     o painel de diagnóstico da página não ter de distinguir origens. */
  function erroNosso(codigo, mensagem) {
    var e = new Error(mensagem);
    e.errorCode = codigo;
    e.errorMessage = mensagem;
    e.gioco = true;
    return e;
  }

  /* Travão do nosso lado: o loginPopup do MSAL não tem timeout nenhum, e em
     Safari um popup bloqueado pode deixar a promessa pendente para sempre —
     o botão ficava "A ligar…" até recarregar a página. */
  function comTimeout(promessa, ms, codigo, mensagem) {
    return new Promise(function (resolve, reject) {
      var assente = false;
      var t = setTimeout(function () {
        if (assente) return;
        assente = true;
        reject(erroNosso(codigo, mensagem));
      }, ms);
      promessa.then(function (v) {
        if (assente) return;
        assente = true; clearTimeout(t); resolve(v);
      }, function (e) {
        if (assente) return;
        assente = true; clearTimeout(t); reject(e);
      });
    });
  }

  function redirectUri() {
    // Sem query string nem hash: tem de bater certo com a SPA registada no
    // Azure (https://eatgioco.github.io/calendario.html). O deep-link ?dia=…
    // da página não pode entrar aqui, senão dá redirect_uri_mismatch.
    return window.location.origin + window.location.pathname;
  }

  function init() {
    if (arrancou) return redirectPronto || Promise.resolve(null);
    arrancou = true;
    // Numa webview embutida nem se constrói o MSAL: não há login possível.
    if (!disponivel() || AMB.webview) {
      prontoOk = true;
      redirectPronto = Promise.resolve(null);
      return redirectPronto;
    }
    try {
      pca = new msal.PublicClientApplication({
        auth: {
          clientId: CLIENT_ID,
          authority: AUTHORITY,
          redirectUri: redirectUri(),
          // false: o redirectUri JÁ é esta página, e o salto extra de volta ao
          // URL original (ex.: um deep-link ?dia=…) é mais uma oportunidade
          // de o Safari perder estado pelo caminho.
          navigateToLoginRequestUrl: false
        },
        cache: {
          // localStorage e não sessionStorage: a sessão tem de sobreviver a
          // fechar o separador, senão o Manel voltava a autenticar-se todos
          // os dias só para ver a agenda.
          cacheLocation: 'localStorage',
          // OBRIGATÓRIO para o Safari (Set/2026): com o ITP, o `state` do fluxo
          // de redirect guardado só em localStorage perde-se entre a ida à
          // Microsoft e a volta, e o regresso falha a validar. Em cookie
          // sobrevive. Não tem custo nos outros browsers.
          storeAuthStateInCookie: true
        }
      });
    } catch (e) {
      console.error('[outlook] MSAL não arrancou:', e);
      ultimoErro = e;
      pca = null;
      prontoOk = true;
      redirectPronto = Promise.resolve(null);
      return redirectPronto;
    }
    /* Retorno do loginRedirect. Tem de correr no arranque E de ser AGUARDADO
       antes de qualquer getAllAccounts/acquireToken/login — senão, no regresso
       do redirect, o getAllAccounts responde vazio enquanto o hash ainda está
       a ser processado, a UI volta a dizer "Ligar Outlook" e entra-se em ciclo.
       É a armadilha clássica do fluxo de redirect. Ver pronto() e estado(). */
    redirectPronto = pca.handleRedirectPromise().then(function (r) {
      redirectResultado = r || null;
      if (r) console.info('[outlook] sessão obtida pelo regresso do redirect.');
      return r;
    })['catch'](function (e) {
      // Guardado para o painel de diagnóstico: em iOS é aqui que aparece o
      // "state não corresponde" quando o ITP come o estado do fluxo, e é
      // aqui que chega um redirect_uri_mismatch / consentimento recusado
      // devolvido pela Microsoft no hash. Fica em erroRedirect() para a
      // página o pôr no #outErro — em silêncio, o Manel via só "Ligar
      // Outlook" outra vez, sem saber que o login tinha falhado.
      ultimoErro = e;
      erroRedirect = e;
      console.error('[outlook] handleRedirectPromise:', e);
      return null;
    }).then(function (r) { prontoOk = true; return r; });
    return redirectPronto;
  }

  function contaMsal() {
    if (!pca) return null;
    try {
      var cs = pca.getAllAccounts();
      return cs && cs.length ? cs[0] : null;
    } catch (e) { return null; }
  }

  /* O PORTAO. Tudo o que toca no MSAL passa por aqui primeiro. */
  function pronto() { return init(); }

  /* Estado SÍNCRONO para o render, que corre muitas vezes e nunca pode
     bloquear à espera do MSAL:
       'webview'      — browser embutido: login impossível, nem se tenta
       'indisponivel' — o SDK não carregou
       'a-verificar'  — o handleRedirectPromise ainda não assentou
       'ligado' | 'desligado'
     Enquanto for 'a-verificar' NINGUÉM pode concluir que não há sessão — era
     exactamente isso que punha a UI a pedir login em cima de um redirect
     bem sucedido. A página liga-se a pronto() para voltar a desenhar. */
  function estado() {
    if (AMB.webview) return 'webview';
    if (!disponivel()) return 'indisponivel';
    if (!prontoOk) return 'a-verificar';
    return contaMsal() ? 'ligado' : 'desligado';
  }
  function estaLigado() { return estado() === 'ligado'; }
  function conta() {
    if (estado() !== 'ligado') return null;
    var c = contaMsal();
    if (!c) return null;
    return { email: c.username || '', nome: c.name || c.username || '' };
  }

  /* ---------- Ligar ----------
     Três caminhos, por ambiente:
       webview — rejeita já, com uma mensagem que se mostra ao utilizador;
       iOS     — loginRedirect DIRECTO. O popup em iOS é pouco fiável: vem
                 bloqueado e reportado como cancelamento, ou fica pendente
                 sem nunca assentar — e o fallback mascarava o erro real;
       resto   — loginPopup (com timeout nosso) e fallback para redirect.

     POPUP_FALHOU só vale no ramo do popup. Inclui user_cancelled e
     interaction_in_progress porque no Safari de secretária um popup
     bloqueado chega disfarçado de cancelamento. O cuidado original
     mantem-se de duas maneiras: só se cai para redirect DENTRO de um
     clique em "Ligar Outlook" (a acção que o utilizador pediu), e no
     máximo UMA vez por carregamento da página (redirectTentado), para
     quem fecha popups de propósito não entrar num ciclo de redirects. */
  var POPUP_FALHOU = [
    'popup_window_error', 'empty_window_error', 'block_iframe_reload',
    'user_cancelled', 'interaction_in_progress', 'popup_sem_resposta'
  ];
  var TIMEOUT_POPUP_MS = 60000;

  function ligar() {
    if (AMB.webview) {
      return Promise.reject(erroNosso('webview_bloqueada',
        'Este browser está embutido numa app e a Microsoft bloqueia o login aqui. ' +
        'Abre a página no Safari para ligares o Outlook.'));
    }
    if (!disponivel()) return Promise.reject(erroNosso('sdk_ausente', 'O SDK da Microsoft não carregou.'));
    return pronto().then(function () {
      if (!pca) return Promise.reject(erroNosso('sdk_ausente', 'O SDK da Microsoft não arrancou.'));
      // O regresso do redirect pode JÁ ter trazido a sessão: nesse caso não
      // se pede login nenhum outra vez.
      if (contaMsal()) return conta();

      function porRedirect() {
        if (redirectTentado) {
          return Promise.reject(erroNosso('redirect_repetido',
            'O login por redirecção já foi tentado neste carregamento e não resultou. ' +
            'Recarrega a página e tenta outra vez.'));
        }
        redirectTentado = true;
        // A partir daqui a página vai embora e volta; quem chamou não recebe
        // resolução nenhuma, de propósito.
        return pca.loginRedirect({ scopes: SCOPES }).then(function () { return null; });
      }

      if (AMB.ios) return porRedirect();

      return comTimeout(
        pca.loginPopup({ scopes: SCOPES, prompt: 'select_account' }),
        TIMEOUT_POPUP_MS, 'popup_sem_resposta',
        'A janela de login da Microsoft não respondeu em 60 segundos. ' +
        'Pode ter sido bloqueada pelo browser.'
      ).then(function () {
        return conta();
      })['catch'](function (erro) {
        var cod = (erro && erro.errorCode) || '';
        if (POPUP_FALHOU.indexOf(cod) >= 0) return porRedirect();
        throw erro;
      });
    });
  }

  /* ---------- Desligar ----------
     Local e só local: limpa a cache do MSAL neste browser e NÃO manda o
     Manel para a página de logout da Microsoft (que o tirava também do
     Outlook, do Teams e do resto do M365 no mesmo browser).
     onRedirectNavigate:false é a forma documentada de o conseguir no MSAL v2
     — a cache é limpa antes da navegação, e devolver false cancela-a. */
  function desligar() {
    if (!pca) return Promise.resolve();
    var c = contaMsal();
    if (!c) return Promise.resolve();
    return pca.logoutRedirect({
      account: c,
      onRedirectNavigate: function () { return false; }
    })['catch'](function (e) {
      console.error('[outlook] logout:', e);
    }).then(function () {
      // Rede de segurança: se por alguma razão a conta continuar em cache,
      // varre as chaves do MSAL deste clientId à mão.
      if (!contaMsal()) return;
      try {
        var apagar = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && (k.indexOf(CLIENT_ID) >= 0 || k.indexOf('msal.') === 0)) apagar.push(k);
        }
        apagar.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) { /* localStorage indisponível: nada a fazer */ }
    });
  }

  /* ---------- Token ----------
     Também passa pelo pronto(): sem isso, um carregarEventos() disparado no
     regresso do redirect via a conta ainda vazia e falhava sem razão. */
  function token() {
    if (!disponivel()) return Promise.reject(erroNosso('sdk_ausente', 'O SDK da Microsoft não carregou.'));
    return pronto().then(function () {
      if (!pca) throw erroNosso('sdk_ausente', 'O SDK da Microsoft não arrancou.');
      var c = contaMsal();
      if (!c) throw erroNosso('sem_conta', 'Sem conta Microsoft ligada.');
      return tokenDaConta(c);
    });
  }
  function tokenDaConta(c) {
    return pca.acquireTokenSilent({ scopes: SCOPES, account: c })
      .then(function (r) { return r.accessToken; })
      ['catch'](function (erro) {
        // Silencioso falhou (token expirado, consentimento novo, MFA):
        // só aqui é que se incomoda o utilizador com um popup.
        console.warn('[outlook] token silencioso falhou, a pedir popup:', erro && erro.errorCode);
        // Em iOS o popup também não é de confiança aqui: mais vale dizer
        // claramente que é preciso ligar outra vez do que abrir uma janela
        // que não vai responder.
        if (AMB.ios) {
          throw erroNosso('sessao_expirada',
            'A sessão da Microsoft expirou. Desliga e volta a ligar a conta.');
        }
        return pca.acquireTokenPopup({ scopes: SCOPES, account: c }).then(function (r) { return r.accessToken; });
      });
  }

  /* ---------- Datas (puras) ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function toISODate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseISO(iso) {
    var p = String(iso).split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  function addDays(iso, n) { var d = parseISO(iso); d.setDate(d.getDate() + n); return toISODate(d); }

  /* Parte local de um {dateTime, timeZone} do Graph.
     Com o header Prefer o Graph devolve já em Europe/Lisbon e basta ler os
     dígitos da string — parsear com new Date() introduziria um desvio de
     fuso que não existe. O ramo UTC é defensivo, para o caso de o header ser
     ignorado; aí a conversão assume que o browser está no fuso da loja. */
  function partes(g) {
    var s = String((g && g.dateTime) || '');
    var tz = String((g && g.timeZone) || '');
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
    if (!m) return null;
    if (/^utc$/i.test(tz)) {
      var d = new Date(s.replace(/(\.\d+)?Z?$/, '') + 'Z');
      if (!isNaN(d.getTime())) return { data: toISODate(d), hora: pad2(d.getHours()) + ':' + pad2(d.getMinutes()) };
    }
    return { data: m[1] + '-' + m[2] + '-' + m[3], hora: m[4] + ':' + m[5] };
  }

  /* ---------- Link de videochamada ----------
     O URL de entrada aparece em sítios diferentes conforme o serviço: um
     convite Teams preenche `onlineMeeting.joinUrl`, um Google Meet / Zoom /
     Whereby costuma deixar o link no `location` ou no corpo do convite.
     detetarLinkReuniao(ev) devolve { url, servico } ou null, pela ordem de
     prioridade dos campos (o primeiro que dê resultado ganha).

     SEGURANÇA da comparação de host: nunca `includes()`. `casaDominio()`
     exige host exacto OU sufixo `.dominio` — senão `zoom.us.phishing.com`
     passava por Zoom. Só https: um `http://` é ignorado, e todo o URL passa
     por `new URL()` dentro de try/catch antes de chegar ao DOM. */
  var SERVICOS = [
    { servico: 'Google Meet', dominios: ['meet.google.com'] },
    { servico: 'Teams',       dominios: ['teams.microsoft.com', 'teams.live.com'] },
    { servico: 'Zoom',        dominios: ['zoom.us'] },
    { servico: 'Whereby',     dominios: ['whereby.com'] },
    { servico: 'Jitsi',       dominios: ['meet.jit.si'] },
    { servico: 'Webex',       dominios: ['webex.com'] }
  ];
  // O `onlineMeetingProvider` do Graph, quando o joinUrl não cai em nenhum
  // host conhecido (ex.: um tenant Teams com domínio próprio).
  var PROVIDERS = {
    teamsForBusiness: 'Teams',
    skypeForBusiness: 'Skype for Business',
    skypeForConsumer: 'Skype'
  };
  // Conservador de propósito: pára no primeiro espaço, aspa, parêntese ou
  // sinal de marcação. A pontuação final é aparada a seguir.
  var RE_URL = /https:\/\/[^\s<>"'\]\[)（）]+/gi;

  function casaDominio(host, dominio) {
    return host === dominio || host.length > dominio.length + 1 &&
      host.slice(-(dominio.length + 1)) === '.' + dominio;
  }
  function servicoDoHost(host) {
    for (var i = 0; i < SERVICOS.length; i++) {
      for (var j = 0; j < SERVICOS[i].dominios.length; j++) {
        if (casaDominio(host, SERVICOS[i].dominios[j])) return SERVICOS[i].servico;
      }
    }
    return null;
  }
  /* String → { url, host } com o URL já validado, ou null. Só https. */
  function urlValido(bruto) {
    var texto = String(bruto || '').replace(/[.,;:!?'"\)\]]+$/, '');
    try {
      var u = new URL(texto);
      if (u.protocol !== 'https:') return null;
      return { url: u.href, host: u.hostname.toLowerCase() };
    } catch (e) { return null; }
  }
  function urlsDe(texto) {
    var out = [], m, re = new RegExp(RE_URL.source, 'gi');
    while ((m = re.exec(String(texto || ''))) !== null) {
      var v = urlValido(m[0]);
      if (v) out.push(v);
      if (out.length > 20) break;   // travão: um corpo de convite pode ter dezenas
    }
    return out;
  }
  /* Num texto qualquer: só o primeiro URL de um serviço CONHECIDO conta. */
  function reuniaoConhecida(texto) {
    var us = urlsDe(texto);
    for (var i = 0; i < us.length; i++) {
      var srv = servicoDoHost(us[i].host);
      if (srv) return { url: us[i].url, servico: srv };
    }
    return null;
  }
  /* Num campo de LOCAL: serviço conhecido primeiro; se não houver, aceita um
     campo que seja APENAS um URL e mais nada (é o padrão de quem cola o link
     de um serviço que não conhecemos no campo do local). Esta segunda regra
     não se aplica ao corpo do convite, que está cheio de links alheios. */
  function reuniaoDeLocal(texto) {
    var conhecida = reuniaoConhecida(texto);
    if (conhecida) return conhecida;
    var limpo = String(texto || '').trim();
    if (!/^https:\/\/\S+$/.test(limpo)) return null;
    var v = urlValido(limpo);
    return v ? { url: v.url, servico: 'Videochamada' } : null;
  }

  function detetarLinkReuniao(ev) {
    if (!ev) return null;
    // Cancelado nunca tem link de entrada, mesmo que o URL ainda lá esteja.
    // Hoje o carregarEventos já filtra os cancelados antes de chegarem aqui;
    // esta guarda é para o dia em que se decidir mostrá-los riscados.
    if (ev.isCancelled === true) return null;
    // 1. O campo oficial.
    var join = ev.onlineMeeting && ev.onlineMeeting.joinUrl;
    if (join) {
      var v = urlValido(join);
      if (v) {
        return {
          url: v.url,
          servico: servicoDoHost(v.host) || PROVIDERS[ev.onlineMeetingProvider] || 'Videochamada'
        };
      }
    }
    // 2. location.displayName.
    var r = reuniaoDeLocal(ev.location && ev.location.displayName);
    if (r) return r;
    // 3. locations[] (displayName e locationUri de cada um).
    if (Object.prototype.toString.call(ev.locations) === '[object Array]') {
      for (var i = 0; i < ev.locations.length; i++) {
        var loc = ev.locations[i] || {};
        r = reuniaoDeLocal(loc.displayName) || reuniaoDeLocal(loc.locationUri);
        if (r) return r;
      }
    }
    // 4. Corpo do convite: só serviços conhecidos.
    return reuniaoConhecida(ev.bodyPreview);
  }

  /* ---------- Normalização ----------
     Um evento do Graph → 1..N itens da lista normalizada (um por dia).
     - isAllDay: o `end` do Graph é EXCLUSIVO (um dia inteiro a 10/09 vem
       10/09→11/09), por isso o último dia não entra;
     - com horas, no mesmo dia: um item com início e fim;
     - com horas, a atravessar dias: primeiro dia início→23:59, dias do meio
       como dia inteiro, último dia 00:00→fim. */
  function expandirDias(ev) {
    var ini = partes(ev.start), fim = partes(ev.end);
    if (!ini) return [];
    if (!fim) fim = { data: ini.data, hora: ini.hora };
    var titulo = String(ev.subject || '(sem assunto)');
    var local = ev.location && ev.location.displayName ? String(ev.location.displayName) : '';
    var organizador = ev.organizer && ev.organizer.emailAddress ? String(ev.organizer.emailAddress.name || ev.organizer.emailAddress.address || '') : '';
    // Uma detecção por EVENTO (não por dia): o base.extra é partilhado por
    // referência por todos os itens-dia que este evento gerar.
    var reuniao = detetarLinkReuniao(ev);
    var base = {
      titulo: titulo,
      // 'outro' é só o valor exigido pelo modelo normalizado: a camada
      // Outlook desenha-se sempre com a paleta neutra, nunca por categoria.
      categoria: 'outro',
      notas: '',
      origem: 'outlook',
      editavel: false,
      extra: {
        graphId: String(ev.id || ''),
        local: local,
        webLink: ev.webLink ? String(ev.webLink) : '',
        organizador: organizador,
        showAs: ev.showAs ? String(ev.showAs) : '',
        // Ausente quando não há link — quem lê testa a existência, nunca o conteúdo.
        reuniao: reuniao || null,
        inicio: ini,
        fim: fim
      }
    };
    function item(data, diaInteiro, hi, hf) {
      var o = {
        id: 'out:' + base.extra.graphId + '#' + data,
        titulo: base.titulo, data: data, diaInteiro: diaInteiro,
        horaInicio: diaInteiro ? null : hi, horaFim: diaInteiro ? null : hf,
        categoria: base.categoria, notas: base.notas,
        origem: base.origem, editavel: base.editavel, extra: base.extra
      };
      return o;
    }

    var out = [], d, n = 0;
    if (ev.isAllDay) {
      d = ini.data;
      var ultimo = fim.data > ini.data ? addDays(fim.data, -1) : ini.data;
      while (d <= ultimo && n < MAX_DIAS_EVENTO) { out.push(item(d, true, null, null)); d = addDays(d, 1); n++; }
      return out;
    }
    if (ini.data === fim.data) return [item(ini.data, false, ini.hora, fim.hora > ini.hora ? fim.hora : null)];
    // Fim exatamente à meia-noite do dia seguinte: é um único dia, não dois.
    if (fim.hora === '00:00' && addDays(ini.data, 1) === fim.data) return [item(ini.data, false, ini.hora, '23:59')];
    out.push(item(ini.data, false, ini.hora, '23:59'));
    d = addDays(ini.data, 1); n = 1;
    while (d < fim.data && n < MAX_DIAS_EVENTO) { out.push(item(d, true, null, null)); d = addDays(d, 1); n++; }
    if (n < MAX_DIAS_EVENTO && fim.hora !== '00:00') out.push(item(fim.data, false, '00:00', fim.hora));
    return out;
  }

  /* ---------- Carregar ----------
     dataInicio / dataFim em 'AAAA-MM-DD'; o fim é EXCLUSIVO, como a janela
     do Graph. Devolve sempre uma lista (rejeita só em erro real de rede/API,
     e quem chama trata isso como estado de erro da camada, nunca como falha
     da página). */
  function carregarEventos(dataInicio, dataFim) {
    return token().then(function (tk) {
      function base(campos) {
        return GRAPH +
          '?startDateTime=' + encodeURIComponent(dataInicio + 'T00:00:00') +
          '&endDateTime=' + encodeURIComponent(dataFim + 'T00:00:00') +
          '&$top=250&$orderby=' + encodeURIComponent('start/dateTime') +
          '&$select=' + encodeURIComponent(campos);
      }
      var todos = [];

      function pagina(u, n) {
        if (n > MAX_PAGINAS) return Promise.resolve();
        return fetch(u, {
          headers: {
            Authorization: 'Bearer ' + tk,
            Prefer: 'outlook.timezone="' + FUSO + '"'
          }
        }).then(function (r) {
          if (!r.ok) {
            return r.text().then(function (t) {
              var erro = new Error('Graph ' + r.status + (t ? ': ' + t.slice(0, 200) : ''));
              erro.status = r.status;
              throw erro;
            });
          }
          return r.json();
        }).then(function (j) {
          (j.value || []).forEach(function (ev) {
            if (ev && ev.isCancelled === true) return;
            todos = todos.concat(expandirDias(ev));
          });
          var prox = j['@odata.nextLink'];
          if (prox) return pagina(prox, n + 1);
        });
      }

      /* Um 400 na PRIMEIRA página quase de certeza é um campo do $select que
         este tenant não aceita. Em vez de deixar a camada inteira em erro,
         repete-se uma única vez com o conjunto mínimo (o de sempre): perde-se
         a detecção da videochamada, o calendário continua a aparecer. */
      return pagina(base(SELECT_COMPLETO), 1).then(function () { return todos; })
        ['catch'](function (e) {
          if (e && e.status !== 400) throw e;
          console.warn('[outlook] $select completo recusado, a repetir com o mínimo:', e && e.message);
          todos = [];
          return pagina(base(SELECT_MINIMO), 1).then(function () { return todos; });
        });
    });
  }

  /* Diagnóstico para o painel da página. Devolve o erro INTEIRO (nunca uma
     string derivada) mais o contexto que só existe em runtime — no telemóvel
     não há consola nem tooltip, e sem isto o "Login falhou" é indiagnosticável. */
  function guardarErro(e) { ultimoErro = e || null; return e; }
  function diagnostico() {
    var e = ultimoErro || {};
    return {
      errorCode: e.errorCode || (e.name || null),
      errorMessage: e.errorMessage || e.message || null,
      subError: e.subError || null,
      correlationId: e.correlationId || null,
      stack: e.stack || null,
      redirectUri: redirectUri(),
      estado: estado(),
      ambiente: { ios: AMB.ios, webview: AMB.webview, standalone: AMB.standalone, motivo: AMB.motivo },
      ua: AMB.ua,
      sdk: (typeof msal !== 'undefined' && msal.version) ? msal.version : 'não carregado',
      redirectTrouxeSessao: !!redirectResultado
    };
  }

  /* O erro (objecto inteiro) que o regresso do redirect trouxe, ou null.
     Só faz sentido depois de pronto(); a página lê-o UMA vez e mostra-o. */
  function erroDoRedirect() { return erroRedirect; }

  return {
    init: init,
    pronto: pronto,
    estado: estado,
    erroDoRedirect: erroDoRedirect,
    detetarAmbiente: detetarAmbiente,
    diagnostico: diagnostico,
    guardarErro: guardarErro,
    redirectUri: redirectUri,
    // Funcao PURA, exposta para teste e reutilizacao (scripts/testa-outlook-reuniao.js).
    // Nao toca em rede, DOM nem MSAL: recebe um evento do Graph, devolve
    // { url, servico } ou null.
    detetarLinkReuniao: detetarLinkReuniao,
    disponivel: disponivel,
    estaLigado: estaLigado,
    conta: conta,
    ligar: ligar,
    desligar: desligar,
    carregarEventos: carregarEventos
  };
})();

/* Node (so para os testes de scripts/testa-outlook-reuniao.js). No browser
   nao existe module e este bloco e ignorado. */
if (typeof module !== 'undefined' && module.exports) module.exports = GiocoOutlook;
