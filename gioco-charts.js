/* ==========================================================================
   GIOCO OS — gioco-charts.js
   Camada de gráficos do design system. Extraído verbatim do vendas.html
   (Fase de partilha entre páginas), para que qualquer página do OS possa
   desenhar barras, colunas, linha e donut sem reimplementar.

   Sem dependências externas. Carregar depois do gioco-shell.css/js.
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

  /* Cores dos SVG gerados em JS. Os atributos stroke/fill de SVG não aceitam
     var(--token), por isso os tokens do tema são lidos do <body> no momento do
     render. É isto que faz os gráficos seguirem o tema activo em vez de ficarem
     presos às cores do tema claro, como estavam antes da Fase 2. */
  function coresTema(){
    var cs = window.getComputedStyle(document.body);
    function tok(nome, alternativa){
      var v = cs.getPropertyValue(nome);
      v = v ? v.trim() : '';
      return v || alternativa;
    }
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

  function barra(label, valor, max, texto, delta, alt){
    var largura = max > 0 ? Math.max(0, valor / max) * 100 : 0;
    return '<div class="bar-row">' +
      '<span class="bar-label">' + esc(label) + '</span>' +
      '<span class="bar-track"><span class="bar-fill' + (alt ? ' alt' : '') + '" style="width:' + largura.toFixed(2) + '%"></span></span>' +
      '<span class="bar-value">' + texto + '</span>' +
      (delta === undefined ? '' : '<span class="bar-delta">' + delta + '</span>') +
      '</div>';
  }

  /* Vistas alternativas — todas recebem itens = [{ label, valor, texto, curto }].
     `texto` é o HTML usado na vista horizontal; `curto` é a versão compacta
     para a etiqueta em cima da barra vertical / do ponto máximo da linha. */

  function barrasVerticais(itens, opts){
    opts = opts || {};
    var max = 0;
    itens.forEach(function(x){ max = Math.max(max, Number(x.valor) || 0); });
    var colunas = itens.map(function(x){
      var v = Number(x.valor) || 0;
      // 1% de altura mínima para uma barra não nula não desaparecer.
      var altura = max > 0 ? (v > 0 ? Math.max(v / max * 100, 1) : 0) : 0;
      var alt = (x.alt === undefined) ? opts.alt : x.alt;
      return '<div class="vbar-col">' +
        '<span class="vbar-valor">' + (x.curto || '') + '</span>' +
        '<span class="vbar-track"><span class="vbar-fill' + (alt ? ' alt' : '') +
          '" style="height:' + altura.toFixed(2) + '%"></span></span>' +
        '<span class="vbar-label">' + esc(x.label) + '</span>' +
      '</div>';
    }).join('');
    return '<div class="vbars">' + colunas + '</div>';
  }

  function graficoLinha(itens, opts){
    opts = opts || {};
    if (!itens.length) return '';
    var fmtY = opts.fmtY || function(v){ return intFmt(Math.round(v)) + '€'; };
    var C = coresTema();

    var W = 720, H = 240, PADL = 60, PADR = 18, PADT = 24, PADB = 46;
    var n = itens.length;
    var max = 0, iMax = 0;
    itens.forEach(function(x, i){
      var v = Number(x.valor) || 0;
      if (v > max){ max = v; iMax = i; }
    });
    var escala = max > 0 ? max : 1;

    var passo = n > 1 ? (W - PADL - PADR) / (n - 1) : 0;
    function px(i){ return n > 1 ? PADL + i * passo : PADL + (W - PADL - PADR) / 2; }
    function py(v){ return H - PADB - (Number(v) || 0) / escala * (H - PADT - PADB); }

    var caminho = itens.map(function(x, i){
      return (i === 0 ? 'M' : 'L') + px(i).toFixed(1) + ' ' + py(x.valor).toFixed(1);
    }).join(' ');

    // Eixo Y: 0, metade e máximo.
    var marcasY = [0, 0.5, 1].map(function(f){
      var v = escala * f;
      var y = py(v);
      return '<line x1="' + PADL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + y.toFixed(1) +
          '" stroke="' + (f === 0 ? C.ink : C.line) + '" stroke-width="' + (f === 0 ? 2 : 1) + '"/>' +
        '<text x="' + (PADL - 6) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" ' +
          'font-family="' + SVG_FONTE + '" font-size="10" fill="' + C.muted + '">' + esc(fmtY(v)) + '</text>';
    }).join('');

    // Com muitos pontos (31 dias) só se escrevem alguns labels, para não sobreporem.
    var salto = Math.max(1, Math.ceil(n / 12));
    var marcasX = itens.map(function(x, i){
      if (i % salto !== 0 && i !== n - 1) return '';
      return '<text x="' + px(i).toFixed(1) + '" y="' + (H - PADB + 16) + '" text-anchor="middle" ' +
        'font-family="' + SVG_FONTE + '" font-size="10" fill="' + C.muted + '">' + esc(x.label) + '</text>';
    }).join('');

    var destaque = max > 0 ?
      '<circle cx="' + px(iMax).toFixed(1) + '" cy="' + py(max).toFixed(1) + '" r="5" fill="' + C.red + '" stroke="' + C.ink + '" stroke-width="2"/>' +
      '<text x="' + px(iMax).toFixed(1) + '" y="' + Math.max(PADT - 6, py(max) - 12).toFixed(1) + '" text-anchor="middle" ' +
        'font-family="' + SVG_FONTE + '" font-size="11" fill="' + C.redInk + '">' +
        esc((itens[iMax].curto || fmtY(max)) + ' · ' + itens[iMax].label) + '</text>' : '';

    return '<div class="curve-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
        esc(opts.aria || 'Gráfico de linha') + '">' +
      marcasY +
      '<line x1="' + PADL + '" y1="' + PADT + '" x2="' + PADL + '" y2="' + (H - PADB) + '" stroke="' + C.ink + '" stroke-width="2"/>' +
      '<path d="' + caminho + '" fill="none" stroke="' + C.red + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      destaque + marcasX +
      '</svg></div>';
  }

  var CORES_FATIA = ['var(--fatia-1)','var(--fatia-2)','var(--fatia-3)','var(--fatia-4)','var(--fatia-5)','var(--fatia-6)'];

  function donut(itens, opts){
    opts = opts || {};
    if (!itens.length) return '';

    // Nunca mais fatias do que cores: o excedente junta-se em "Outros".
    // Assim não há duas fatias adjacentes (nem a primeira com a última) da mesma cor.
    var lista = itens.slice();
    if (lista.length > CORES_FATIA.length){
      var cabeca = lista.slice(0, CORES_FATIA.length - 1);
      var resto = lista.slice(CORES_FATIA.length - 1);
      cabeca.push({
        label: 'Outros (' + resto.length + ')',
        valor: resto.reduce(function(acc, x){ return acc + (Number(x.valor) || 0); }, 0)
      });
      lista = cabeca;
    }

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
        '<span class="donut-valor">' + (x.curto || eur(v)) +
          ' · ' + (total ? dec(v / total * 100, 1) : '0,0') + '%</span>' +
      '</li>';
    }).join('');

    return '<div class="donut-wrap">' +
      '<div class="donut" role="img" aria-label="' + esc(opts.aria || 'Distribuição') +
        '" style="background:conic-gradient(' + paradas.join(',') + ')"></div>' +
      '<ul class="donut-legenda">' + legenda + '</ul>' +
    '</div>';
  }

  window.GiocoChart = {
    barra: barra,
    barrasVerticais: barrasVerticais,
    linha: graficoLinha,
    donut: donut,
    cores: coresTema,
    CORES_FATIA: CORES_FATIA
  };

})();
