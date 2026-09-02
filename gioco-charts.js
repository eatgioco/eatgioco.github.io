/* ==========================================================================
   GIOCO OS — gioco-charts.js
   Camada de gráficos do design system. Qualquer página que precise de
   barras, colunas, linha ou donut carrega gioco-charts.css/.js e usa
   GiocoChart.* — nunca reimplementar por página.

   Sem dependências externas. Carregar depois do gioco-shell.css/js.

   ------------------------------------------------------------------------
   Render em duas fases (linha() e barrasVerticais())
   ------------------------------------------------------------------------
   Estas duas funções não devolvem SVG — devolvem um <div class="chart-host">
   vazio com os dados no dataset. O SVG só é desenhado depois de o host estar
   no DOM e ter uma largura real (clientWidth), com viewBox = essa largura em
   píxeis — por isso a escala é sempre 1:1, nunca um viewBox fixo esticado
   por CSS. GiocoChart.montar(raiz) trata disto:

     - Chamar GiocoChart.montar() (ou montar(umElemento)) depois de qualquer
       innerHTML que possa ter criado .chart-host novos — no vendas.html, no
       fim de renderVistas() e ao expandir uma secção colapsada.
     - Um ResizeObserver único (partilhado por todos os hosts) redesenha
       quando a largura muda mais de 8px, com debounce de 120ms.
     - Um host com clientWidth 0 (secção colapsada) fica por desenhar até o
       próprio ResizeObserver disparar quando ganhar largura.
     - Sem ResizeObserver no browser: desenha uma vez e não redesenha.

   ------------------------------------------------------------------------
   API pública (window.GiocoChart)
   ------------------------------------------------------------------------

   .montar(raiz)
       Percorre os .chart-host dentro de `raiz` (por omissão, document) e
       desenha-os / liga-lhes o ResizeObserver. Idempotente — um host já
       montado não é tocado outra vez.

   .barra(label, valor, max, texto, delta, alt)
       Uma linha de barra horizontal (HTML/CSS, não SVG) — para listas onde
       cada linha é um <div class="bar-row">. `texto` é o HTML mostrado à
       direita da barra; `delta` (opcional) mostra uma segunda coluna à
       direita disso; `alt` força a cor de destaque em vez do neutro.

   .barrasHorizontais(itens, opts)
       Conjunto de barras horizontais COM eixo — uma régua por baixo em
       valores redondos e gridlines verticais ténues. Opacidade decrescente
       do primeiro ao último item (1.0 → 0.55) sobre var(--red).
       itens = [{ label, valor }]
       opts.formato: 'euro' | 'percent' (por omissão nenhum sufixo)
       opts.aria

   .barrasVerticais(itens, opts)
       Colunas em SVG à escala real (ver "Render em duas fases" acima), com
       escala Y em "nice numbers" e gridlines horizontais ténues.
       itens = [{ label, valor, curto, alt }] — valor 0 ou null/undefined é
               "sem dados": sem barra, sem valor, etiqueta a 55% de opacidade.
       opts.paleta       — 'destaque' (omissão) ou 'fatias'.
                           'destaque': neutro + a coluna de maior valor a
                           var(--red) (ver opts.destacarMax/opts.alt abaixo).
                           'fatias': cada coluna recebe CORES_FATIA[i % 6],
                           pela mesma agregação "Outros (n)" do donut() —
                           usar quando as colunas são as mesmas categorias
                           de um donut ao lado, para saírem com a mesma cor;
                           destacarMax e alt são ignorados neste modo.
       opts.alt          — (só paleta:'destaque') força TODAS as colunas
                           para var(--red) (uma coluna com `alt` próprio
                           manda sobre isto)
       opts.destacarMax  — (só paleta:'destaque') por omissão true: as 3
                           colunas de maior valor ficam em degradê — 1ª
                           var(--red), 2ª var(--chart-destaque-2), 3ª
                           var(--chart-destaque-3), cada vez mais claras;
                           as restantes em var(--chart-neutro). Categorias
                           sem dados nunca entram na classificação.
       opts.valores      — por omissão true: mostra o valor (`curto`, ou a
                           forma abreviada, ou nenhum — decisão automática e
                           igual para o gráfico inteiro, ver TAREFA 3)
       opts.zeroForcado  — por omissão true: passa para escalaY()
       opts.altura       — px, por omissão 260
       opts.aria

   .linha(itens, opts)
       Linha suavizada (interpolação cúbica monótona — nunca ultrapassa os
       pontos), sem eixos grossos, só gridlines horizontais ténues e
       etiquetas nos dois eixos, à escala real.
       itens = [{ label, valor, curto }]   — ignorado se opts.series vier
       opts.series   — [{ nome, cor, itens:[{label,valor,curto}] }] para
                       multi-série; cores por omissão: var(--red),
                       var(--ink), var(--fatia-3), var(--fatia-4)
       opts.area     — preenche sob a curva (só com uma única série)
       opts.zeroForcado — passa para escalaY()
       opts.etiqueta — rótulo curto no canto superior direito (maiúsculas)
       opts.altura   — px, por omissão 260
       opts.fmtY     — função opcional para formatar as etiquetas do eixo Y
                       (por omissão fmtMarca(v) + '€'); NOTA: como os args
                       atravessam JSON (render em duas fases), uma função
                       aqui não sobrevive — só útil se vier a ser preciso
                       chamar o renderer directamente no futuro.
       opts.aria

   .donut(itens, opts)
       Conic-gradient com furo central maior e o total ao centro.
       itens = [{ label, valor, curto }]
       opts.centroValor, opts.centroLabel — por omissão o total em euros
                       e a palavra "total"
       opts.aria

   .cores()          — coresTema(): tokens do tema activo, lidos do <body>
   .CORES_FATIA      — as 6 cores do donut, como strings var(--fatia-N)

   ------------------------------------------------------------------------
   Interacção (linha() e barrasVerticais())
   ------------------------------------------------------------------------
   Ao passar o rato ou tocar, o valor SNAPA para a coluna/ponto mais próximo
   (uma faixa invisível por categoria capta o rato, não é preciso acertar na
   barra) e aparece um tooltip por cima, com a barra em destaque (ou a linha
   com um ponto e uma guia vertical). Um toque fora do gráfico, ou um
   segundo toque na mesma coluna, esconde o tooltip.

   ------------------------------------------------------------------------
   Estilo — padrão do OS para qualquer gráfico novo:
   gridlines ténues (nunca eixos grossos), escala sempre em valores
   redondos (nunca presa ao máximo exacto dos dados), neutro + uma única cor
   de destaque (nunca uma cor por barra a não ser no donut ou paleta:'fatias').
   ========================================================================== */
(function () {

  /* Cópias privadas mínimas dos helpers de formatação do vendas.html — o
     ficheiro não importa esc/eur/dec/intFmt, replica-os aqui com o mesmo
     comportamento exacto (separadores e casas decimais). */
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function intFmt(n){
    return (Number(n) || 0).toLocaleString('pt-PT');
  }

  function dec(n, casas){
    n = Number(n) || 0;
    if (casas === undefined) casas = 2;
    return n.toLocaleString('pt-PT', { minimumFractionDigits:casas, maximumFractionDigits:casas });
  }

  function eur(n){
    n = Number(n) || 0;
    return n.toLocaleString('pt-PT', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';
  }

  /* Um só sítio a ler tokens do CSS computado do <body> — coresTema() e o
     resto do módulo usam este helper. Os atributos stroke/fill de SVG não
     aceitam var(--token) directamente, por isso resolve-se sempre aqui o
     valor real, no momento do render, para os gráficos seguirem o tema
     activo em vez de ficarem presos às cores do tema claro. */
  function tok(nome, alternativa){
    var cs = window.getComputedStyle(document.body);
    var v = cs.getPropertyValue(nome);
    v = v ? v.trim() : '';
    return v || alternativa;
  }

  function coresTema(){
    return {
      ink:   tok('--ink',   '#141414'),
      line:  tok('--line',  '#f0e6d6'),
      muted: tok('--muted', '#6b6660'),
      red:   tok('--red',   '#D91124'),
      /* Mesma regra do shell: o --red é superfície (traços, pontos, fatias),
         o --red-ink é texto. Sobre fundo escuro o --red dá 3,17:1 — chega
         para um traço (3:1), não chega para texto (4,5:1). */
      redInk: tok('--red-ink', '#D91124')
    };
  }

  /* O texto dentro dos SVG segue a mesma regra do resto da página: Inter. */
  var SVG_FONTE = 'Inter, sans-serif';

  /* Proporções fixas em píxeis reais — nunca derivadas de aspect ratio,
     porque o viewBox passa a ser a largura real do host (ver montar()). */
  var MARGEM_ESQ = 52, MARGEM_DIR = 16, MARGEM_TOPO = 26;
  var MARGEM_BASE = 34, MARGEM_BASE_ROD = 64;
  var FONTE_EIXO = 11, FONTE_VALOR = 10;
  var ALTURA_OMISSAO = 260;
  var CHAR_LARGURA_VALOR = 5.6;

  /* ======================================================================
     Escala "nice numbers" — partilhada por linha() e barrasVerticais(), para
     o eixo Y nunca ficar preso ao máximo exacto dos dados. Escolhe um passo
     em 1, 2, 2.5 ou 5 × 10^n tal que o número de marcas fique entre 4 e 6.
     ====================================================================== */
  function escalaY(maxDados, minDados, nAlvo, opts){
    opts = opts || {};
    nAlvo = nAlvo || 5;
    minDados = Number(minDados) || 0;
    maxDados = Math.max(Number(maxDados) || 0, minDados);

    if (maxDados <= 0 && minDados <= 0){
      var marcas0 = [];
      for (var k = 0; k <= nAlvo; k++) marcas0.push(k);
      return { min:0, max:nAlvo, passo:1, marcas:marcas0 };
    }

    var zeroForcado = opts.zeroForcado !== false;
    var baseMin = 0;
    // Amplitude pequena face ao valor absoluto (ex. movimento por hora): não
    // forçar o zero, ou a curva toda fica achatada perto do topo.
    if (!zeroForcado && minDados > 0 && (maxDados - minDados) / maxDados < 0.35){
      baseMin = minDados;
    }

    var amplitude = maxDados - baseMin;
    if (amplitude <= 0) amplitude = maxDados || 1;

    var passoBruto = amplitude / nAlvo;
    var potencia = Math.pow(10, Math.floor(Math.log(passoBruto) / Math.LN10));
    var candidatos = [1, 2, 2.5, 5, 10];
    var passo = candidatos[candidatos.length - 1] * potencia;
    for (var i = 0; i < candidatos.length; i++){
      if (passoBruto <= candidatos[i] * potencia + 1e-9){
        passo = candidatos[i] * potencia;
        break;
      }
    }

    var min = baseMin === 0 ? 0 : Math.floor(baseMin / passo) * passo;
    var max = Math.ceil(maxDados / passo) * passo;
    if (max <= min) max = min + passo;

    var marcas = [];
    for (var v = min; v <= max + passo * 0.001; v += passo){
      marcas.push(Math.round(v * 1e6) / 1e6);
    }
    return { min:min, max:max, passo:passo, marcas:marcas };
  }

  /* "1,4k" acima de 1000, "1,2M" acima de 1 000 000 — uma casa decimal só
     quando útil (2k, não 2,0k). Abaixo de 1000, inteiro com separador pt-PT.
     Para VALORES (dados) — pode arredondar. Ver fmtMarca() para eixos, onde
     arredondar mentiria sobre o valor exacto da marca. */
  function arredUmaCasa(n){
    var r = Math.round(n * 10) / 10;
    if (Math.abs(r - Math.round(r)) < 1e-9) return intFmt(Math.round(r));
    return r.toString().replace('.', ',');
  }

  function fmtCurto(v){
    v = Number(v) || 0;
    var neg = v < 0;
    v = Math.abs(v);
    var texto;
    if (v >= 1000000) texto = arredUmaCasa(v / 1000000) + 'M';
    else if (v >= 1000) texto = arredUmaCasa(v / 1000) + 'k';
    else texto = intFmt(Math.round(v));
    return (neg ? '-' : '') + texto;
  }

  /* Formatação exacta para MARCAS DE EIXO (nunca dados): o valor mostrado
     tem de ser exactamente o da marca, nunca arredondado — 1250 → "1,25k",
     não "1,3k". Tenta 0, 1, depois 2 casas; se nenhuma for exacta, escreve
     por extenso com separador de milhares em vez de mentir. */
  function fmtMarca(v){
    v = Number(v) || 0;
    var neg = v < 0;
    v = Math.abs(v);
    if (v < 1000) return (neg ? '-' : '') + intFmt(Math.round(v));

    var unidade = v >= 1000000 ? 1000000 : 1000;
    var sufixo = v >= 1000000 ? 'M' : 'k';
    var n = v / unidade;
    for (var casas = 0; casas <= 2; casas++){
      var mult = Math.pow(10, casas);
      var r = Math.round(n * mult) / mult;
      if (Math.abs(r * unidade - v) < 0.5){
        var texto = casas === 0 ? intFmt(r) : r.toFixed(casas).replace('.', ',');
        return (neg ? '-' : '') + texto + sufixo;
      }
    }
    return (neg ? '-' : '') + intFmt(Math.round(v));
  }

  /* Decide se as etiquetas do eixo X cabem na horizontal; se não couberem,
     roda-as -45°; se mesmo rodadas não couberem, salta algumas. Estimativa
     de largura de texto por nº de caracteres — não há medição real de texto
     disponível antes do SVG estar no DOM. */
  function planoX(labels, passo, fonte){
    fonte = fonte || 10;
    var charW = fonte * 0.56;
    var maxLen = 0;
    labels.forEach(function(l){ maxLen = Math.max(maxLen, String(l == null ? '' : l).length); });
    var largura = maxLen * charW;

    if (labels.length <= 1 || largura <= passo * 0.85){
      return { rotar:false, salto:1, extraPadB:0 };
    }
    var diagonal = largura * 0.72;
    if (diagonal <= passo * 0.95){
      return { rotar:true, salto:1, extraPadB: Math.min(diagonal, 70) };
    }
    var salto = Math.max(1, Math.ceil(diagonal / passo));
    return { rotar:true, salto:salto, extraPadB: Math.min(diagonal, 70) };
  }

  /* Decide se cabem valores fixos por cima das colunas — decisão global
     para o gráfico inteiro (nunca metade das barras com valor, metade sem).
     Tenta primeiro o `curto` do item (ou fmtCurto se não vier); se não
     couber, tenta a forma abreviada (fmtCurto); se ainda não couber,
     desliga tudo e confia no tooltip. Categorias sem dados não entram na
     conta (não mostram valor de qualquer forma). */
  function decidirValores(lista, espacoPorColuna){
    var largura1 = 0, largura2 = 0, temAlgum = false;
    lista.forEach(function(x){
      var v = (x.valor === null || x.valor === undefined) ? 0 : (Number(x.valor) || 0);
      if (!v) return;
      temAlgum = true;
      var t1 = (x.curto != null && x.curto !== '') ? String(x.curto) : fmtCurto(v);
      var t2 = fmtCurto(v);
      largura1 = Math.max(largura1, t1.length * CHAR_LARGURA_VALOR);
      largura2 = Math.max(largura2, t2.length * CHAR_LARGURA_VALOR);
    });
    if (!temAlgum) return { mostrar:false, curto:false };
    var disponivel = espacoPorColuna * 0.92;
    if (largura1 <= disponivel) return { mostrar:true, curto:false };
    if (largura2 <= disponivel) return { mostrar:true, curto:true };
    return { mostrar:false, curto:false };
  }

  /* Interpolação cúbica monótona (Fritsch–Carlson): a curva passa pelos
     pontos sem nunca ultrapassar os valores nem inventar picos/vales entre
     eles — ao contrário de uma spline cardinal comum. */
  function caminhoMonotono(pts){
    var n = pts.length;
    if (n < 2) return '';
    if (n === 2){
      return 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2) +
        ' L' + pts[1][0].toFixed(2) + ' ' + pts[1][1].toFixed(2);
    }

    var dx = [], dy = [], d = [];
    var i;
    for (i = 0; i < n - 1; i++){
      dx[i] = pts[i + 1][0] - pts[i][0];
      dy[i] = pts[i + 1][1] - pts[i][1];
      d[i] = dx[i] !== 0 ? dy[i] / dx[i] : 0;
    }

    var m = [];
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) m[i] = (d[i - 1] + d[i]) / 2;

    for (i = 0; i < n - 1; i++){
      if (d[i] === 0){ m[i] = 0; m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i];
      var s = a * a + b * b;
      if (s > 9){
        var tau = 3 / Math.sqrt(s);
        m[i] = tau * a * d[i];
        m[i + 1] = tau * b * d[i];
      }
    }

    var caminho = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
    for (i = 0; i < n - 1; i++){
      var cp1x = pts[i][0] + dx[i] / 3;
      var cp1y = pts[i][1] + m[i] * dx[i] / 3;
      var cp2x = pts[i + 1][0] - dx[i] / 3;
      var cp2y = pts[i + 1][1] - m[i + 1] * dx[i] / 3;
      caminho += ' C' + cp1x.toFixed(2) + ' ' + cp1y.toFixed(2) + ', ' +
        cp2x.toFixed(2) + ' ' + cp2y.toFixed(2) + ', ' +
        pts[i + 1][0].toFixed(2) + ' ' + pts[i + 1][1].toFixed(2);
    }
    return caminho;
  }

  function barra(label, valor, max, texto, delta, alt){
    var largura = max > 0 ? Math.max(0, valor / max) * 100 : 0;
    return '<div class="bar-row">' +
      '<span class="bar-label">' + esc(label) + '</span>' +
      '<span class="bar-track"><span class="bar-fill' + (alt ? ' alt' : '') + '" style="width:' + largura.toFixed(2) + '%"></span></span>' +
      '<span class="bar-value">' + texto + '</span>' +
      (delta === undefined ? '' : '<span class="bar-delta">' + delta + '</span>') +
      '</div>';
  }

  /* Conjunto de barras horizontais com eixo — a régua por baixo (escalaY
     aplicada ao eixo X) e gridlines verticais ténues por trás das barras.
     Opacidade decrescente do primeiro ao último item, sobre var(--red).
     Fora do âmbito do render em duas fases (viewBox fixo, como antes) —
     ainda não usada em nenhuma página. */
  function barrasHorizontais(itens, opts){
    opts = opts || {};
    if (!itens || !itens.length) return '';

    var eixoCor = tok('--chart-eixo', tok('--muted', '#6b6660'));
    var gridCor = tok('--chart-grid', 'rgba(20,20,20,0.07)');
    var vermelho = tok('--red', '#D91124');

    var n = itens.length;
    var valores = itens.map(function(x){ return Number(x.valor) || 0; });
    var maxDados = Math.max.apply(null, valores.concat([0]));
    var escala = escalaY(maxDados, 0, 5, { zeroForcado:true });

    var W = 720, rowH = 26, PADT = 8, PADB = 26, labelW = 116, PADR = 12;
    var plotW = W - labelW - PADR;
    var H = PADT + n * rowH + PADB;

    function fmtX(v){
      if (opts.formato === 'percent') return dec(v, 0) + '%';
      if (opts.formato === 'euro') return fmtMarca(v) + '€';
      return fmtMarca(v);
    }

    function px(v){ return labelW + (escala.max > 0 ? (v / escala.max) * plotW : 0); }

    var grade = escala.marcas.map(function(v){
      var x = px(v);
      return '<line x1="' + x.toFixed(1) + '" y1="' + PADT + '" x2="' + x.toFixed(1) + '" y2="' + (H - PADB).toFixed(1) +
          '" stroke="' + gridCor + '" stroke-width="1"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + (H - PADB + 14) + '" text-anchor="middle" ' +
          'font-family="' + SVG_FONTE + '" font-size="10" fill="' + eixoCor + '">' + esc(fmtX(v)) + '</text>';
    }).join('');

    var barras = itens.map(function(x, i){
      var y = PADT + i * rowH;
      var v = Number(x.valor) || 0;
      var w = Math.max(0, escala.max > 0 ? (v / escala.max) * plotW : 0);
      var opacidade = n > 1 ? (1 - (i / (n - 1)) * 0.45) : 1;
      return '<text x="' + (labelW - 8) + '" y="' + (y + rowH / 2 + 4).toFixed(1) + '" text-anchor="end" ' +
          'font-family="' + SVG_FONTE + '" font-size="11.5" fill="' + eixoCor + '">' + esc(x.label) + '</text>' +
        '<rect x="' + labelW + '" y="' + (y + 4).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (rowH - 8) +
          '" fill="' + vermelho + '" opacity="' + opacidade.toFixed(2) + '"/>';
    }).join('');

    return '<div class="curve-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
        esc(opts.aria || 'Barras horizontais') + '">' + grade + barras + '</svg></div>';
  }

  var CORES_FATIA = ['var(--fatia-1)','var(--fatia-2)','var(--fatia-3)','var(--fatia-4)','var(--fatia-5)','var(--fatia-6)'];
  var FATIA_HEX_FALLBACK = ['#D91124','#141414','#E4694E','#8C857B','#A6202C','#6E675C'];

  /* Nunca mais fatias do que cores: o excedente junta-se numa última entrada
     "Outros (n)", para não haver duas fatias/barras adjacentes da mesma cor.
     Partilhado por donut() e por barrasVerticais() com opts.paleta==='fatias'
     — é o que garante que a categoria X sai com a MESMA cor nos dois. */
  function agregarFatias(itens){
    if (itens.length <= CORES_FATIA.length) return itens.slice();
    var cabeca = itens.slice(0, CORES_FATIA.length - 1);
    var resto = itens.slice(CORES_FATIA.length - 1);
    cabeca.push({
      label: 'Outros (' + resto.length + ')',
      valor: resto.reduce(function(acc, x){ return acc + (Number(x.valor) || 0); }, 0)
    });
    return cabeca;
  }

  /* Cor real (não "var(--fatia-N)") para atributos de SVG, que não aceitam
     custom properties directamente — mesma razão do tok() em coresTema(). */
  function corFatia(i){
    var idx = i % CORES_FATIA.length;
    return tok('--fatia-' + (idx + 1), FATIA_HEX_FALLBACK[idx]);
  }

  /* ======================================================================
     Renderers reais — chamados só depois de o host ter uma largura L
     conhecida (ver montar() lá em baixo). L é a largura REAL em píxeis,
     por isso o viewBox usa L directamente: escala sempre 1:1.
     ====================================================================== */

  function renderColunasSVG(itens, opts, L){
    opts = opts || {};
    if (!itens || !itens.length) return '';

    var paleta = opts.paleta || 'destaque';
    var lista = (paleta === 'fatias') ? agregarFatias(itens) : itens;

    var C = coresTema();
    var neutro = tok('--chart-neutro', '#DDD5CB');
    var gridCor = tok('--chart-grid', 'rgba(20,20,20,0.07)');
    var eixoCor = tok('--chart-eixo', C.muted);

    var destacarMax = paleta === 'destaque' && opts.destacarMax !== false;

    var n = lista.length;
    var valoresNum = lista.map(function(x){ return (x.valor === null || x.valor === undefined) ? 0 : (Number(x.valor) || 0); });
    var semDadosFlags = lista.map(function(x){ return x.valor === null || x.valor === undefined || Number(x.valor) === 0; });
    var maxDados = Math.max.apply(null, valoresNum.concat([0]));

    /* Top 3 em degradê — 1º var(--red), 2º e 3º cada vez mais claros (cores
       dedicadas, não opacidade — ficam sólidas mesmo sobre gridlines).
       Categorias sem dados nunca entram na classificação. */
    var CORES_TOPO = [C.red, tok('--chart-destaque-2', '#E4694E'), tok('--chart-destaque-3', '#EDA391')];
    var rankPorIndice = {};
    if (destacarMax){
      var indicesComDados = [];
      valoresNum.forEach(function(v, i){ if (!semDadosFlags[i]) indicesComDados.push(i); });
      indicesComDados.sort(function(a, b){ return valoresNum[b] - valoresNum[a]; });
      indicesComDados.slice(0, 3).forEach(function(idx, rank){ rankPorIndice[idx] = rank; });
    }

    var A = opts.altura || ALTURA_OMISSAO;
    var PADL = MARGEM_ESQ, PADR = MARGEM_DIR, PADT = MARGEM_TOPO;

    var plotW = L - PADL - PADR;
    var espacoPorColuna = plotW / n;

    var labels = lista.map(function(x){ return x.label; });
    var plano = planoX(labels, espacoPorColuna, FONTE_EIXO);
    var PADB = plano.rotar ? MARGEM_BASE_ROD : MARGEM_BASE;
    var plotH = A - PADT - PADB;

    var querValores = opts.valores !== false;
    var decisaoValores = querValores ? decidirValores(lista, espacoPorColuna) : { mostrar:false, curto:false };

    var nAlvoY = decisaoValores.mostrar ? 3 : 5;
    var escala = escalaY(maxDados, 0, nAlvoY, { zeroForcado: opts.zeroForcado });

    function py(v){
      var t = escala.max > escala.min ? ((Number(v) || 0) - escala.min) / (escala.max - escala.min) : 0;
      return PADT + (1 - t) * plotH;
    }

    var grade = escala.marcas.map(function(v){
      var y = py(v);
      return '<line x1="' + PADL + '" y1="' + y.toFixed(1) + '" x2="' + (L - PADR) + '" y2="' + y.toFixed(1) +
          '" stroke="' + gridCor + '" stroke-width="1"/>' +
        '<text x="' + (PADL - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" ' +
          'font-family="' + SVG_FONTE + '" font-size="' + FONTE_EIXO + '" fill="' + eixoCor + '">' + esc(fmtMarca(v)) + '</text>';
    }).join('');

    var larguraBarra = Math.min(44, espacoPorColuna * 0.62);
    if (espacoPorColuna - larguraBarra < 8) larguraBarra = espacoPorColuna - 8;
    if (larguraBarra < 3) larguraBarra = 3;

    var barras = '', valoresTxt = '', rotulos = '', zonas = '';

    lista.forEach(function(x, i){
      var v = valoresNum[i];
      var semDados = semDadosFlags[i];
      var xCentro = PADL + i * espacoPorColuna + espacoPorColuna / 2;
      var xBarra = xCentro - larguraBarra / 2;
      var yBase = A - PADB;
      var yTop = semDados ? yBase : py(v);
      var altura = semDados ? 0 : Math.max(0, yBase - yTop);

      var cor, destacada;
      if (paleta === 'fatias'){
        cor = corFatia(i);
        destacada = true;
      } else {
        var efeitoAlt = (x.alt === undefined) ? opts.alt : x.alt;
        var rank = rankPorIndice[i];
        destacada = !!(efeitoAlt || rank !== undefined);
        // O alt manual força o 1º lugar (vermelho cheio); o degradê é só
        // para o top 3 automático (destacarMax).
        cor = efeitoAlt ? C.red : (rank !== undefined ? CORES_TOPO[rank] : neutro);
      }

      var textoCompleto = (x.curto != null && x.curto !== '') ? String(x.curto) : fmtCurto(v);

      if (!semDados){
        barras += '<rect class="chart-bar" data-idx="' + i + '" data-cor-original="' + cor +
          '" data-destacada="' + (destacada ? '1' : '0') +
          '" x="' + xBarra.toFixed(1) + '" y="' + yTop.toFixed(1) +
          '" width="' + larguraBarra.toFixed(1) + '" height="' + altura.toFixed(1) +
          '" fill="' + cor + '"/>';

        if (decisaoValores.mostrar){
          var textoValor = decisaoValores.curto ? fmtCurto(v) : textoCompleto;
          var corValor = destacada ? C.redInk : C.ink;
          valoresTxt += '<text x="' + xCentro.toFixed(1) + '" y="' + (yTop - 4).toFixed(1) + '" text-anchor="middle" ' +
            'font-family="' + SVG_FONTE + '" font-size="' + FONTE_VALOR + '" font-weight="600" fill="' + corValor + '">' +
            esc(textoValor) + '</text>';
        }
      }

      if (i % plano.salto === 0 || i === n - 1){
        var yLabel = A - PADB + 16;
        var opacidadeLabel = semDados ? 0.55 : 1;
        if (plano.rotar){
          rotulos += '<text x="' + xCentro.toFixed(1) + '" y="' + yLabel + '" text-anchor="end" transform="rotate(-45 ' +
            xCentro.toFixed(1) + ' ' + yLabel + ')" font-family="' + SVG_FONTE + '" font-size="' + FONTE_EIXO +
            '" fill="' + eixoCor + '" opacity="' + opacidadeLabel + '">' + esc(x.label) + '</text>';
        } else {
          rotulos += '<text x="' + xCentro.toFixed(1) + '" y="' + yLabel + '" text-anchor="middle" ' +
            'font-family="' + SVG_FONTE + '" font-size="' + FONTE_EIXO + '" fill="' + eixoCor +
            '" opacity="' + opacidadeLabel + '">' + esc(x.label) + '</text>';
        }
      }

      zonas += '<rect class="chart-hover-zone" data-idx="' + i + '" data-label="' + esc(x.label) +
        '" data-curto="' + esc(textoCompleto) + '" data-sem-dados="' + (semDados ? '1' : '0') +
        '" data-x="' + xCentro.toFixed(1) + '" data-y-topo="' + yTop.toFixed(1) +
        '" x="' + (PADL + i * espacoPorColuna).toFixed(1) + '" y="' + PADT +
        '" width="' + espacoPorColuna.toFixed(1) + '" height="' + plotH.toFixed(1) + '"/>';
    });

    return '<svg viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="' +
        esc(opts.aria || 'Barras verticais') + '">' +
      grade + barras + valoresTxt + rotulos + zonas +
      '</svg>';
  }

  var AREA_ID = 0;

  function renderLinhaSVG(itens, opts, L){
    opts = opts || {};
    var C = coresTema();
    var coresSerie = [C.red, C.ink, tok('--fatia-3', '#E4694E'), tok('--fatia-4', '#8C857B')];

    var seriesList = (opts.series && opts.series.length)
      ? opts.series.map(function(s, i){
          return { nome: s.nome, cor: s.cor || coresSerie[i % coresSerie.length], itens: s.itens || [] };
        })
      : [{ nome:null, cor: opts.cor || C.red, itens: itens || [] }];

    var base = seriesList[0].itens;
    var n = base.length;
    if (!n) return '';

    var todosValores = [];
    seriesList.forEach(function(s){ s.itens.forEach(function(x){ todosValores.push(Number(x.valor) || 0); }); });
    var maxDados = Math.max.apply(null, todosValores.concat([0]));
    var minDados = Math.min.apply(null, todosValores.concat([0]));
    var escala = escalaY(maxDados, minDados, 5, { zeroForcado: opts.zeroForcado });

    var A = opts.altura || ALTURA_OMISSAO;
    var PADL = MARGEM_ESQ, PADR = MARGEM_DIR, PADT = MARGEM_TOPO;
    var passo = n > 1 ? (L - PADL - PADR) / (n - 1) : 0;
    function px(i){ return n > 1 ? PADL + i * passo : PADL + (L - PADL - PADR) / 2; }

    var labels = base.map(function(x){ return x.label; });
    var plano = planoX(labels, passo, FONTE_EIXO);
    var PADB = plano.rotar ? MARGEM_BASE_ROD : MARGEM_BASE;
    var plotH = A - PADT - PADB;

    function py(v){
      var t = escala.max > escala.min ? ((Number(v) || 0) - escala.min) / (escala.max - escala.min) : 0;
      return PADT + (1 - t) * plotH;
    }

    var gridCor = tok('--chart-grid', 'rgba(20,20,20,0.07)');
    var eixoCor = tok('--chart-eixo', C.muted);
    var fmtY = opts.fmtY || function(v){ return fmtMarca(v) + '€'; };

    var marcasY = escala.marcas.map(function(v){
      var y = py(v);
      return '<line x1="' + PADL + '" y1="' + y.toFixed(1) + '" x2="' + (L - PADR) + '" y2="' + y.toFixed(1) +
          '" stroke="' + gridCor + '" stroke-width="1"/>' +
        '<text x="' + (PADL - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" ' +
          'font-family="' + SVG_FONTE + '" font-size="' + FONTE_EIXO + '" fill="' + eixoCor + '">' + esc(fmtY(v)) + '</text>';
    }).join('');

    var marcasX = labels.map(function(l, i){
      if (i % plano.salto !== 0 && i !== n - 1) return '';
      var x = px(i), y = A - PADB + 16;
      if (plano.rotar){
        return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="end" transform="rotate(-45 ' +
          x.toFixed(1) + ' ' + y.toFixed(1) + ')" font-family="' + SVG_FONTE + '" font-size="' + FONTE_EIXO + '" fill="' + eixoCor + '">' + esc(l) + '</text>';
      }
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" ' +
        'font-family="' + SVG_FONTE + '" font-size="' + FONTE_EIXO + '" fill="' + eixoCor + '">' + esc(l) + '</text>';
    }).join('');

    var defs = '', areas = '';
    var linhasEls = seriesList.map(function(s){
      if (!s.itens.length || s.itens.length < 2) return '';
      var pts = s.itens.map(function(x, i){ return [px(i), py(x.valor)]; });
      var caminho = caminhoMonotono(pts);
      if (opts.area && seriesList.length === 1){
        var baseline = py(escala.min);
        var idGrad = 'giocoChartArea' + (++AREA_ID);
        var caminhoArea = caminho + ' L' + pts[pts.length - 1][0].toFixed(2) + ' ' + baseline.toFixed(2) +
          ' L' + pts[0][0].toFixed(2) + ' ' + baseline.toFixed(2) + ' Z';
        defs += '<linearGradient id="' + idGrad + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + s.cor + '" stop-opacity="0.22"/>' +
          '<stop offset="1" stop-color="' + s.cor + '" stop-opacity="0"/></linearGradient>';
        areas += '<path d="' + caminhoArea + '" fill="url(#' + idGrad + ')" stroke="none"/>';
      }
      return '<path d="' + caminho + '" fill="none" stroke="' + s.cor + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    }).join('');

    var legenda = '';
    if (seriesList.length > 1){
      legenda = '<div class="chart-legenda">' + seriesList.map(function(s){
        return '<span class="chart-legenda-item"><span class="chart-legenda-dot" style="background:' + s.cor + '"></span>' + esc(s.nome || '') + '</span>';
      }).join('') + '</div>';
    }

    var etiqueta = opts.etiqueta ? '<text x="' + (L - PADR) + '" y="' + (PADT - 10) + '" text-anchor="end" ' +
      'font-family="' + SVG_FONTE + '" font-size="10" letter-spacing="0.5" fill="' + eixoCor + '">' +
      esc(String(opts.etiqueta).toUpperCase()) + '</text>' : '';

    /* Camada de interacção: guia vertical + um ponto por série, escondidos
       (opacity 0) até ao hover, e uma faixa por ponto para captar o rato. */
    var overlay = '<line class="chart-hover-guia" x1="' + PADL + '" y1="' + PADT + '" x2="' + PADL + '" y2="' + (A - PADB) +
      '" stroke="' + gridCor + '" stroke-width="1" opacity="0"/>';
    seriesList.forEach(function(s){
      overlay += '<circle class="chart-hover-ponto" cx="0" cy="0" r="4" fill="' + s.cor + '" opacity="0"/>';
    });

    var zonas = labels.map(function(l, i){
      var xCentro = px(i);
      var xIni = n > 1 ? xCentro - passo / 2 : PADL;
      var larguraZona = n > 1 ? passo : (L - PADL - PADR);
      var valoresInfo = seriesList.map(function(s){
        var item = s.itens[i];
        if (!item) return null;
        var v = Number(item.valor) || 0;
        var y = py(v);
        var textoCurto = (item.curto != null && item.curto !== '') ? String(item.curto) : fmtCurto(v);
        return { nome: s.nome, cor: s.cor, curto: textoCurto, y: Math.round(y * 100) / 100 };
      }).filter(function(x){ return x; });
      return '<rect class="chart-hover-zone" data-idx="' + i + '" data-label="' + esc(l) + '" data-x="' + xCentro.toFixed(1) +
        '" data-valores="' + esc(JSON.stringify(valoresInfo)) + '" x="' + xIni.toFixed(1) + '" y="' + PADT +
        '" width="' + Math.max(0, larguraZona).toFixed(1) + '" height="' + plotH.toFixed(1) + '"/>';
    }).join('');

    return legenda + '<svg viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="' +
        esc(opts.aria || 'Gráfico de linha') + '">' +
      (defs ? '<defs>' + defs + '</defs>' : '') +
      marcasY + areas + linhasEls + marcasX + etiqueta + overlay + zonas +
      '</svg>';
  }

  /* ======================================================================
     Interacção: tooltip com snap à coluna/ponto mais próximo, mais o
     realce (recolorir a barra, ou guia + ponto na linha).
     ====================================================================== */

  function construirTipColunas(zone){
    var label = zone.getAttribute('data-label') || '';
    var semDados = zone.getAttribute('data-sem-dados') === '1';
    var valorTxt = semDados ? 'sem vendas' : (zone.getAttribute('data-curto') || '');
    return '<div class="chart-tip-label">' + esc(label) + '</div>' +
      '<div class="chart-tip-valor">' + esc(valorTxt) + '</div>';
  }

  function construirTipLinha(zone){
    var label = zone.getAttribute('data-label') || '';
    var valores;
    try { valores = JSON.parse(zone.getAttribute('data-valores') || '[]'); } catch(e){ valores = []; }
    var corpo;
    if (valores.length > 1){
      corpo = valores.map(function(v){
        return '<div class="chart-tip-serie">' +
          '<span class="chart-tip-chip" style="background:' + esc(v.cor) + '"></span>' +
          '<span class="chart-tip-nome">' + esc(v.nome || '') + '</span>' +
          '<span class="chart-tip-valor2">' + esc(v.curto) + '</span></div>';
      }).join('');
    } else {
      corpo = '<div class="chart-tip-valor">' + esc(valores.length ? valores[0].curto : 'sem dados') + '</div>';
    }
    return '<div class="chart-tip-label">' + esc(label) + '</div>' + corpo;
  }

  function menorY(zone){
    var valores;
    try { valores = JSON.parse(zone.getAttribute('data-valores') || '[]'); } catch(e){ valores = []; }
    var y = Infinity;
    valores.forEach(function(v){ if (v.y < y) y = v.y; });
    return isFinite(y) ? y : MARGEM_TOPO;
  }

  function realcarColuna(host, idx){
    var vermelho = tok('--red', '#D91124');
    var neutroForte = tok('--chart-neutro-forte', '#CFC5B8');
    var barras = host.querySelectorAll('.chart-bar');
    for (var i = 0; i < barras.length; i++){
      var bar = barras[i];
      var bIdx = Number(bar.getAttribute('data-idx'));
      if (bIdx === idx){
        var destacada = bar.getAttribute('data-destacada') === '1';
        bar.setAttribute('fill', destacada ? neutroForte : vermelho);
        bar.style.opacity = '1';
      } else {
        // Repor a cor original antes de escurecer — senão uma barra
        // realçada num hover anterior fica "pintada" para sempre.
        bar.setAttribute('fill', bar.getAttribute('data-cor-original'));
        bar.style.opacity = '0.55';
      }
    }
  }

  function restaurarColunas(host){
    var barras = host.querySelectorAll('.chart-bar');
    for (var i = 0; i < barras.length; i++){
      barras[i].setAttribute('fill', barras[i].getAttribute('data-cor-original'));
      barras[i].style.opacity = '1';
    }
  }

  function realcarLinha(host, zone){
    var x = Number(zone.getAttribute('data-x'));
    var guia = host.querySelector('.chart-hover-guia');
    if (guia){
      guia.setAttribute('x1', x);
      guia.setAttribute('x2', x);
      guia.setAttribute('opacity', '1');
    }
    var valores;
    try { valores = JSON.parse(zone.getAttribute('data-valores') || '[]'); } catch(e){ valores = []; }
    var pontos = host.querySelectorAll('.chart-hover-ponto');
    for (var i = 0; i < pontos.length; i++){
      var info = valores[i];
      if (!info){ pontos[i].setAttribute('opacity', '0'); continue; }
      pontos[i].setAttribute('cx', x);
      pontos[i].setAttribute('cy', info.y);
      pontos[i].setAttribute('opacity', '1');
    }
  }

  function restaurarLinha(host){
    var guia = host.querySelector('.chart-hover-guia');
    if (guia) guia.setAttribute('opacity', '0');
    var pontos = host.querySelectorAll('.chart-hover-ponto');
    for (var i = 0; i < pontos.length; i++) pontos[i].setAttribute('opacity', '0');
  }

  /* Centra o tip sobre xCentro, acima de yTopo; encosta à margem do host em
     vez de sair pela lateral, e desce para baixo se não couber por cima. */
  function posicionarTip(host, tip, xCentro, yTopo){
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.display = 'block';
    var larguraTip = tip.offsetWidth;
    var alturaTip = tip.offsetHeight;
    var larguraHost = host.clientWidth;

    var left = xCentro - larguraTip / 2;
    if (left < 4) left = 4;
    if (left + larguraTip > larguraHost - 4) left = Math.max(4, larguraHost - 4 - larguraTip);

    var top = yTopo - alturaTip - 10;
    if (top < 4) top = yTopo + 10;

    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
    tip.style.visibility = 'visible';
  }

  function ligarInteractividade(host, tipo){
    var tip = host.querySelector('.chart-tip');
    var zonas = host.querySelectorAll('.chart-hover-zone');
    var activo = null;

    function mostrar(idx, zone){
      if (tipo === 'colunas') realcarColuna(host, idx);
      else realcarLinha(host, zone);

      tip.innerHTML = tipo === 'colunas' ? construirTipColunas(zone) : construirTipLinha(zone);

      var xCentro = Number(zone.getAttribute('data-x'));
      var yTopo = tipo === 'colunas' ? Number(zone.getAttribute('data-y-topo')) : menorY(zone);
      posicionarTip(host, tip, xCentro, yTopo);
      activo = idx;
    }

    function esconder(){
      if (activo === null) return;
      activo = null;
      tip.style.visibility = 'hidden';
      if (tipo === 'colunas') restaurarColunas(host);
      else restaurarLinha(host);
    }

    for (var i = 0; i < zonas.length; i++){
      (function(zone){
        var idx = Number(zone.getAttribute('data-idx'));
        zone.addEventListener('pointerenter', function(){ mostrar(idx, zone); });
        zone.addEventListener('pointerdown', function(){
          if (activo === idx) esconder(); else mostrar(idx, zone);
        });
      })(zonas[i]);
    }

    host.addEventListener('pointerleave', esconder);

    // Toque fora do gráfico esconde o tooltip; auto-remove-se quando o host
    // sair do DOM (evita acumular listeners de hosts substituídos por um
    // novo innerHTML — vendas.html reconstrói secções inteiras a cada render).
    function aoTocarFora(ev){
      if (!document.body.contains(host)){
        document.removeEventListener('pointerdown', aoTocarFora);
        return;
      }
      if (activo !== null && !host.contains(ev.target)) esconder();
    }
    document.addEventListener('pointerdown', aoTocarFora);
  }

  /* ======================================================================
     montar(): liga o ResizeObserver partilhado e desenha cada .chart-host
     assim que tiver uma largura real. Ver o comentário de topo do ficheiro.
     ====================================================================== */

  function obterEstadoHost(host){
    if (!host._gcEstado) host._gcEstado = { largura:null, timer:null };
    return host._gcEstado;
  }

  function desenharHost(host, largura){
    largura = largura || host.clientWidth;
    if (!largura) return;
    var estado = obterEstadoHost(host);
    estado.largura = largura;

    var tipo = host.getAttribute('data-gc-tipo');
    var args;
    try { args = JSON.parse(host.getAttribute('data-gc-args') || '{}'); } catch(e){ args = {}; }

    var html;
    if (tipo === 'linha') html = renderLinhaSVG(args.itens, args.opts || {}, largura);
    else if (tipo === 'colunas') html = renderColunasSVG(args.itens, args.opts || {}, largura);
    else return;

    host.innerHTML = html;
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    host.appendChild(tip);

    ligarInteractividade(host, tipo);
  }

  var _ro = null, _roIniciado = false;
  function obterResizeObserver(){
    if (_roIniciado) return _ro;
    _roIniciado = true;
    if (typeof ResizeObserver === 'undefined') return null;
    _ro = new ResizeObserver(function(entries){
      for (var i = 0; i < entries.length; i++){
        var entry = entries[i];
        var host = entry.target;
        if (!document.body.contains(host)){
          try { _ro.unobserve(host); } catch(e){}
          continue;
        }
        var largura = Math.round(entry.contentRect.width);
        if (largura <= 0) continue;
        var estado = obterEstadoHost(host);
        if (estado.largura !== null && Math.abs(estado.largura - largura) < 8) continue;
        if (estado.timer) clearTimeout(estado.timer);
        (function(hostRef, larguraRef, estadoRef){
          estadoRef.timer = setTimeout(function(){
            estadoRef.timer = null;
            desenharHost(hostRef, larguraRef);
          }, 120);
        })(host, largura, estado);
      }
    });
    return _ro;
  }

  function montar(raiz){
    raiz = raiz || document;
    if (!raiz.querySelectorAll) return;
    var hosts = raiz.querySelectorAll('.chart-host');
    var ro = obterResizeObserver();
    for (var i = 0; i < hosts.length; i++){
      var host = hosts[i];
      if (host._gcMontado) continue;
      host._gcMontado = true;

      if (!ro){
        // Sem ResizeObserver: desenha uma vez e não observa mais.
        desenharHost(host, host.clientWidth);
        continue;
      }
      ro.observe(host);
      var larguraInicial = host.clientWidth;
      if (larguraInicial > 0) desenharHost(host, larguraInicial);
      // Largura 0 (secção colapsada): o próprio ResizeObserver dispara
      // quando o host ganhar largura — nada mais a fazer aqui.
    }
  }

  function linha(itens, opts){
    opts = opts || {};
    var baseItens = (opts.series && opts.series.length) ? (opts.series[0].itens || []) : (itens || []);
    if (!baseItens.length) return '';
    var argsObj = { itens: itens || [], opts: opts };
    return '<div class="chart-host" data-gc-tipo="linha" data-gc-args="' + esc(JSON.stringify(argsObj)) + '"></div>';
  }

  function barrasVerticais(itens, opts){
    opts = opts || {};
    if (!itens || !itens.length) return '';
    var argsObj = { itens: itens, opts: opts };
    return '<div class="chart-host" data-gc-tipo="colunas" data-gc-args="' + esc(JSON.stringify(argsObj)) + '"></div>';
  }

  function donut(itens, opts){
    opts = opts || {};
    if (!itens.length) return '';

    // Mesma agregação usada por barrasVerticais(itens, {paleta:'fatias'}) —
    // garante que a categoria X sai com a mesma cor nos dois gráficos.
    var lista = agregarFatias(itens);

    var total = lista.reduce(function(acc, x){ return acc + (Number(x.valor) || 0); }, 0);
    var angulo = 0;
    var paradas = [];
    var legenda = lista.map(function(x, i){
      var v = Number(x.valor) || 0;
      var cor = CORES_FATIA[i % CORES_FATIA.length];
      var fim = (i === lista.length - 1) ? 360 : angulo + (total ? v / total * 360 : 0);
      paradas.push(cor + ' ' + angulo.toFixed(3) + 'deg ' + fim.toFixed(3) + 'deg');
      angulo = fim;
      return '<li class="donut-item">' +
        '<span class="donut-chip" style="background:' + cor + '"></span>' +
        '<span class="donut-nome">' + esc(x.label) + '</span>' +
        '<span class="donut-valor">' + (x.curto || eur(v)) + '</span>' +
        '<span class="donut-pct">' + (total ? dec(v / total * 100, 1) : '0,0') + '%</span>' +
      '</li>';
    }).join('');

    var centroValor = opts.centroValor !== undefined ? opts.centroValor : eur(total);
    var centroLabel = opts.centroLabel !== undefined ? opts.centroLabel : 'total';

    return '<div class="donut-wrap">' +
      '<div class="donut" role="img" aria-label="' + esc(opts.aria || 'Distribuição') +
        '" style="background:conic-gradient(' + paradas.join(',') + ')">' +
        '<div class="donut-centro">' +
          '<span class="donut-centro-valor">' + esc(centroValor) + '</span>' +
          '<span class="donut-centro-label">' + esc(centroLabel) + '</span>' +
        '</div>' +
      '</div>' +
      '<ul class="donut-legenda">' + legenda + '</ul>' +
    '</div>';
  }

  window.GiocoChart = {
    montar: montar,
    barra: barra,
    barrasHorizontais: barrasHorizontais,
    barrasVerticais: barrasVerticais,
    linha: linha,
    donut: donut,
    cores: coresTema,
    CORES_FATIA: CORES_FATIA
  };

})();
