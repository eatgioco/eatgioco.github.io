/* ==========================================================================
   GIOCO OS — gioco-consumo.js
   Motor de explosão de fichas técnicas e de consumo teórico a partir de
   vendasDiario.

   Extraído VERBATIM do bloco que vivia dentro do foodcost.html (mesmo padrão
   de factory do gioco-compromissos.js). Semântica intocável:
   - preparações explodem recursivamente, com `visitadas` a cortar ciclos;
   - preparação de custo fixo (custoManual) entra SÓ em euros, nunca em
     quantidade de ingrediente, e fica marcada como estimativa;
   - preparação sem rendimento é ignorada no teórico (não divide por zero);
   - a quantidade de um componente de preparação é para o rendimento inteiro:
     para 1 unidade da preparação usa-se a fatia proporcional (qtd / rend);
   - um produto vendido sem mapa vai para `semMapa`; com `ignorado:true` vai
     para `ignoradosVendidos`. São coisas diferentes e ficam ambas à vista —
     nunca se inventa consumo para um produto sem ficha técnica.

   Formatos de chave (três, e não são o mesmo — ver CLAUDE.md):
     vendasDiario  AAAA-MM (com zero) e os dias AAAA-MM-DD
     contagens     AAAA-MM-DD
     pagamentosConcluidos  AAAA-M (SEM zero) — não é usado aqui

   Uso (dentro do closure da página, com as vars de dados já a existirem):

     var CONS = giocoConsumoEngine({
       getReceitas:     function(){ return allReceitas; },
       getPreparacoes:  function(){ return allPreparacoes; },
       getVendasDiario: function(){ return allVendasDiario; },
       getMapa:         function(){ return allMapa; }
     });

   e depois destruturar os nomes usados, para os call sites não mudarem.
   ========================================================================== */
function giocoConsumoEngine(deps) {
  'use strict';

  function __RECEITAS()    { return deps.getReceitas() || {}; }
  function __PREPARACOES() { return deps.getPreparacoes() || {}; }
  function __VENDAS()      { return deps.getVendasDiario() || {}; }
  function __MAPA()        { return deps.getMapa() || {}; }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function arred(v) {
    var n = Number(v);
    return isFinite(n) ? Math.round(n * 10000) / 10000 : 0;
  }

  function mesDaData(iso) {           // 2026-08-15 -> 2026-08
    return String(iso || '').slice(0, 7);
  }

  // ==================================================================
  // Explosão da ficha técnica
  // ==================================================================
  // Uma receita dá {ingredienteId: qtd} em unidade base, mais o custo em €
  // das preparações que NÃO têm breakdown (custoManual: entram só em €).
  //
  // As preparações explodem recursivamente. `visitadas` corta ciclos: uma
  // preparação que se contenha a si própria (directa ou indirectamente)
  // pendurava o browser em vez de dar um erro.
  function novoAcc() {
    return {
      ingredientes: {},        // ingredienteId -> qtd base
      euroSemBreakdown: 0,     // preparações de custo fixo
      estimativas: {},
      semFicha: 0,
      semRendimento: {},
      ciclos: {}
    };
  }

  function explodirPreparacao(prepId, fator, acc, visitadas) {
    var allPreparacoes = __PREPARACOES();
    var prep = allPreparacoes[prepId];
    if (!prep) { acc.semFicha += 1; return; }

    // Custo fixo €/kg: não há breakdown, por isso não entra em quantidade de
    // ingrediente nenhum — entra só em euros, e fica marcado como estimativa.
    if (prep.custoManual) {
      acc.euroSemBreakdown += fator * num(prep.custoManualPorUnidade);
      acc.estimativas[prepId] = prep.nome || prepId;
      return;
    }

    if (visitadas[prepId]) { acc.ciclos[prepId] = prep.nome || prepId; return; }
    visitadas[prepId] = true;

    var rend = (prep.rendimento && num(prep.rendimento.qtd)) || 0;
    if (rend <= 0) { acc.euroSemBreakdown += 0; acc.semRendimento[prepId] = prep.nome || prepId; visitadas[prepId] = false; return; }

    var lista = prep.ingredientes || [];
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      // A quantidade da preparação é para o rendimento inteiro: para 1 unidade
      // (kg) da preparação usa-se a fatia proporcional.
      var q = fator * num(c.qtd) / rend;
      if (c.ingredienteId) {
        acc.ingredientes[c.ingredienteId] = (acc.ingredientes[c.ingredienteId] || 0) + q;
      } else if (c.prepId) {
        explodirPreparacao(c.prepId, q, acc, visitadas);
      }
    }
    visitadas[prepId] = false;
  }

  function explodirReceita(receitaId, unidades, acc) {
    var r = __RECEITAS()[receitaId];
    if (!r) return false;
    var comps = r.componentes || [];
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var q = unidades * num(c.qtd);
      if (c.tipo === 'preparacao' || c.prepId) {
        explodirPreparacao(c.prepId, q, acc, {});
      } else if (c.ingredienteId) {
        acc.ingredientes[c.ingredienteId] = (acc.ingredientes[c.ingredienteId] || 0) + q;
      }
    }
    return true;
  }

  // ==================================================================
  // Dias de um período (de, para] — a contagem de `de` mede o stock ao fecho
  // desse dia, por isso o consumo começa no dia seguinte e acaba no dia da
  // contagem final, inclusive.
  // ==================================================================
  function diasDoPeriodo(de, para) {
    var out = [];
    var d = new Date(de + 'T00:00:00');
    var fim = new Date(para + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    while (d <= fim) {
      out.push(d.getFullYear() + '-' +
               String(d.getMonth() + 1).padStart(2, '0') + '-' +
               String(d.getDate()).padStart(2, '0'));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  // ==================================================================
  // Vendas de uma lista de dias, agregadas por código ZoneSoft
  // ==================================================================
  // Um dia sem vendas importadas não existe em vendasDiario e é simplesmente
  // saltado — não conta como dia de zero vendas. `diasComVendas` diz quantos
  // dias da lista tinham mesmo dados.
  function vendasDosDias(dias) {
    var allVendasDiario = __VENDAS();
    var vendidos = {};       // codigo -> { qtd, valor, desc }
    var receitaTotal = 0;
    var diasComVendas = 0;

    dias.forEach(function (dia) {
      var mes = allVendasDiario[mesDaData(dia)];
      var d = mes && mes[dia];
      if (!d || !d.produtos) return;
      diasComVendas++;
      Object.keys(d.produtos).forEach(function (cod) {
        var p = d.produtos[cod];
        if (!vendidos[cod]) vendidos[cod] = { qtd: 0, valor: 0, desc: p.desc || cod, categoria: p.categoria || '' };
        vendidos[cod].qtd += num(p.qtd);
        vendidos[cod].valor += num(p.valor);
        receitaTotal += num(p.valor);
      });
    });

    return { vendidos: vendidos, receitaTotal: receitaTotal, diasComVendas: diasComVendas };
  }

  // ==================================================================
  // Consumo teórico: explodir cada produto vendido
  // ==================================================================
  function consumoDeVendidos(vendidos) {
    var allMapa = __MAPA();
    var allReceitas = __RECEITAS();
    var acc = novoAcc();
    var semMapa = [];          // produtos vendidos sem receita e não ignorados
    var ignoradosVendidos = [];

    Object.keys(vendidos).forEach(function (cod) {
      var m = allMapa[cod];
      if (m && m.ignorado) { ignoradosVendidos.push({ cod: cod, v: vendidos[cod] }); return; }
      if (m && m.receitaId && allReceitas[m.receitaId]) {
        explodirReceita(m.receitaId, vendidos[cod].qtd, acc);
        return;
      }
      if (m && m.ingredienteId) {
        var qDireto = vendidos[cod].qtd * num(m.qtdBase);
        acc.ingredientes[m.ingredienteId] = (acc.ingredientes[m.ingredienteId] || 0) + qDireto;
        return;
      }
      if (m && m.preparacaoId) {
        var qDose = vendidos[cod].qtd * num(m.qtdBase);
        explodirPreparacao(m.preparacaoId, qDose, acc, {});
        return;
      }
      semMapa.push({ cod: cod, v: vendidos[cod] });
    });

    return { acc: acc, semMapa: semMapa, ignoradosVendidos: ignoradosVendidos };
  }

  // Atalho: vendas + explosão numa só passagem, para quem só quer o consumo
  // teórico de uma lista de dias.
  function consumoDosDias(dias) {
    var v = vendasDosDias(dias);
    var c = consumoDeVendidos(v.vendidos);
    return {
      vendidos: v.vendidos,
      receitaTotal: v.receitaTotal,
      diasComVendas: v.diasComVendas,
      acc: c.acc,
      semMapa: c.semMapa,
      ignoradosVendidos: c.ignoradosVendidos
    };
  }

  return {
    num: num, arred: arred, mesDaData: mesDaData,
    novoAcc: novoAcc,
    explodirPreparacao: explodirPreparacao,
    explodirReceita: explodirReceita,
    diasDoPeriodo: diasDoPeriodo,
    vendasDosDias: vendasDosDias,
    consumoDeVendidos: consumoDeVendidos,
    consumoDosDias: consumoDosDias
  };
}
