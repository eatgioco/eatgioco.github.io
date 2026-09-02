/* ==========================================================================
   GIOCO OS — gioco-charts.js
   Camada de gráficos do design system. Qualquer página que precise de
   barras, colunas, linha ou donut carrega gioco-charts.css/.js e usa
   GiocoChart.* — nunca reimplementar por página.

   Sem dependências externas. Carregar depois do gioco-shell.css/js.

   ------------------------------------------------------------------------
   API pública (window.GiocoChart)
   ------------------------------------------------------------------------

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
       Colunas em SVG com escala Y em "nice numbers" e gridlines
       horizontais ténues — a mesma escala e grelha da .linha().
       itens = [{ label, valor, curto, alt }]
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
       opts.destacarMax  — (só paleta:'destaque') por omissão true: a coluna
                           de maior valor fica em var(--red), as restantes
                           em var(--chart-neutro)
       opts.valores      — por omissão false: mostra o valor (`curto`) em
                           cima de cada coluna
       opts.zeroForcado  — por omissão true: passa para escalaY()
       opts.aria

   .linha(itens, opts)
       Linha suavizada (interpolação cúbica monótona — nunca ultrapassa os
       pontos), sem eixos grossos, só gridlines horizontais ténues e
       etiquetas nos dois eixos.
       itens = [{ label, valor, curto }]   — ignorado se opts.series vier
       opts.series   — [{ nome, cor, itens:[{label,valor}] }] para
                       multi-série; cores por omissão: var(--red),
                       var(--ink), var(--fatia-3), var(--fatia-4)
       opts.area     — preenche sob a curva (só com uma única série)
       opts.zeroForcado — passa para escalaY()
       opts.etiqueta — rótulo curto no canto superior direito (maiúsculas)
       opts.fmtY     — função opcional para formatar as etiquetas do eixo Y
                       (por omissão fmtCurto(v) + '€')
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
   Estilo — padrão do OS para qualquer gráfico novo:
   gridlines ténues (nunca eixos grossos), escala sempre em valores
   redondos (nunca presa ao máximo dos dados), neutro + uma única cor de
   destaque (nunca uma cor por barra a não ser no donut).
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
     quando útil (2k, não 2,0k). Abaixo de 1000, inteiro com separador pt-PT. */
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
     Opacidade decrescente do primeiro ao último item, sobre var(--red). */
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
      if (opts.formato === 'euro') return fmtCurto(v) + '€';
      return fmtCurto(v);
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

  /* Colunas em SVG — a mesma escalaY e gridlines da linha(), para as duas
     vistas serem visualmente consistentes ao trocar entre elas. */
  function barrasVerticais(itens, opts){
    opts = opts || {};
    if (!itens || !itens.length) return '';

    var paleta = opts.paleta || 'destaque';
    var lista = (paleta === 'fatias') ? agregarFatias(itens) : itens;

    var C = coresTema();
    var neutro = tok('--chart-neutro', '#DDD5CB');
    var gridCor = tok('--chart-grid', 'rgba(20,20,20,0.07)');
    var eixoCor = tok('--chart-eixo', C.muted);

    var destacarMax = paleta === 'destaque' && opts.destacarMax !== false;
    var valores = lista.map(function(x){ return Number(x.valor) || 0; });
    var maxDados = Math.max.apply(null, valores.concat([0]));
    var iMax = 0;
    valores.forEach(function(v, i){ if (v > valores[iMax]) iMax = i; });

    var escala = escalaY(maxDados, 0, 5, { zeroForcado: opts.zeroForcado });

    var n = lista.length;
    var W = 720, H = 240, PADL = 54, PADR = 12, PADT = 16, PADB0 = 30;
    var plotW = W - PADL - PADR;
    var passo = plotW / n;

    var labels = lista.map(function(x){ return x.label; });
    var plano = planoX(labels, passo, 11);
    var PADB = PADB0 + plano.extraPadB;
    var plotH = H - PADT - PADB;

    function py(v){
      var t = escala.max > escala.min ? ((Number(v) || 0) - escala.min) / (escala.max - escala.min) : 0;
      return PADT + (1 - t) * plotH;
    }

    var grade = escala.marcas.map(function(v){
      var y = py(v);
      return '<line x1="' + PADL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + y.toFixed(1) +
          '" stroke="' + gridCor + '" stroke-width="1"/>' +
        '<text x="' + (PADL - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" ' +
          'font-family="' + SVG_FONTE + '" font-size="10" fill="' + eixoCor + '">' + esc(fmtCurto(v)) + '</text>';
    }).join('');

    var largura = Math.max(2, passo * 0.65);
    var gap = passo - largura;

    var barras = lista.map(function(x, i){
      var v = Number(x.valor) || 0;
      var xPos = PADL + i * passo + gap / 2;
      var yTop = py(v);
      var altura = Math.max(0, (H - PADB) - yTop);
      var cor;
      if (paleta === 'fatias'){
        cor = corFatia(i);
      } else {
        var efeitoAlt = (x.alt === undefined) ? opts.alt : x.alt;
        cor = efeitoAlt ? C.red : ((destacarMax && i === iMax) ? C.red : neutro);
      }
      var valorTxt = (opts.valores === true)
        ? '<text x="' + (xPos + largura / 2).toFixed(1) + '" y="' + (yTop - 6).toFixed(1) + '" text-anchor="middle" ' +
          'font-family="' + SVG_FONTE + '" font-size="10" font-weight="700" fill="' + C.ink + '">' + esc(x.curto || '') + '</text>'
        : '';
      return '<rect x="' + xPos.toFixed(1) + '" y="' + yTop.toFixed(1) + '" width="' + largura.toFixed(1) +
        '" height="' + altura.toFixed(1) + '" fill="' + cor + '"/>' + valorTxt;
    }).join('');

    var marcasX = labels.map(function(l, i){
      if (i % plano.salto !== 0 && i !== n - 1) return '';
      var x = PADL + i * passo + passo / 2;
      var y = H - PADB + 14;
      if (plano.rotar){
        return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="end" transform="rotate(-45 ' +
          x.toFixed(1) + ' ' + y.toFixed(1) + ')" font-family="' + SVG_FONTE + '" font-size="11" fill="' + eixoCor + '">' + esc(l) + '</text>';
      }
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" ' +
        'font-family="' + SVG_FONTE + '" font-size="11" fill="' + eixoCor + '">' + esc(l) + '</text>';
    }).join('');

    return '<div class="curve-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
        esc(opts.aria || 'Barras verticais') + '">' + grade + barras + marcasX + '</svg></div>';
  }

  var AREA_ID = 0;

  function linha(itens, opts){
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

    var W = 720, H = 240, PADL = 60, PADR = 18, PADT = 24, PADB0 = 40;
    var passo = n > 1 ? (W - PADL - PADR) / (n - 1) : 0;
    function px(i){ return n > 1 ? PADL + i * passo : PADL + (W - PADL - PADR) / 2; }

    var labels = base.map(function(x){ return x.label; });
    var plano = planoX(labels, passo, 10);
    var PADB = PADB0 + plano.extraPadB;
    var plotH = H - PADT - PADB;

    function py(v){
      var t = escala.max > escala.min ? ((Number(v) || 0) - escala.min) / (escala.max - escala.min) : 0;
      return PADT + (1 - t) * plotH;
    }

    var gridCor = tok('--chart-grid', 'rgba(20,20,20,0.07)');
    var eixoCor = tok('--chart-eixo', C.muted);
    var fmtY = opts.fmtY || function(v){ return fmtCurto(v) + '€'; };

    var marcasY = escala.marcas.map(function(v){
      var y = py(v);
      return '<line x1="' + PADL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + y.toFixed(1) +
          '" stroke="' + gridCor + '" stroke-width="1"/>' +
        '<text x="' + (PADL - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" ' +
          'font-family="' + SVG_FONTE + '" font-size="10" fill="' + eixoCor + '">' + esc(fmtY(v)) + '</text>';
    }).join('');

    var marcasX = labels.map(function(l, i){
      if (i % plano.salto !== 0 && i !== n - 1) return '';
      var x = px(i), y = H - PADB + 14;
      if (plano.rotar){
        return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="end" transform="rotate(-45 ' +
          x.toFixed(1) + ' ' + y.toFixed(1) + ')" font-family="' + SVG_FONTE + '" font-size="10" fill="' + eixoCor + '">' + esc(l) + '</text>';
      }
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" ' +
        'font-family="' + SVG_FONTE + '" font-size="10" fill="' + eixoCor + '">' + esc(l) + '</text>';
    }).join('');

    var defs = '', areas = '';
    var linhas = seriesList.map(function(s){
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
      return '<path d="' + caminho + '" fill="none" stroke="' + s.cor + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    }).join('');

    var legenda = '';
    if (seriesList.length > 1){
      legenda = '<div class="chart-legenda">' + seriesList.map(function(s){
        return '<span class="chart-legenda-item"><span class="chart-legenda-dot" style="background:' + s.cor + '"></span>' + esc(s.nome || '') + '</span>';
      }).join('') + '</div>';
    }

    var etiqueta = opts.etiqueta ? '<text x="' + (W - PADR) + '" y="' + (PADT - 10) + '" text-anchor="end" ' +
      'font-family="' + SVG_FONTE + '" font-size="10" letter-spacing="0.5" fill="' + eixoCor + '">' +
      esc(String(opts.etiqueta).toUpperCase()) + '</text>' : '';

    return '<div class="curve-wrap">' + legenda + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
        esc(opts.aria || 'Gráfico de linha') + '">' +
      (defs ? '<defs>' + defs + '</defs>' : '') +
      marcasY + areas + linhas + marcasX + etiqueta +
      '</svg></div>';
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
    barra: barra,
    barrasHorizontais: barrasHorizontais,
    barrasVerticais: barrasVerticais,
    linha: linha,
    donut: donut,
    cores: coresTema,
    CORES_FATIA: CORES_FATIA
  };

})();
