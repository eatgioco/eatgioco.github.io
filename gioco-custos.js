/* ==========================================================================
   GIOCO OS — gioco-custos.js
   Motor partilhado de custo e food cost das fichas técnicas.
   Extraído verbatim do receitas.html (Set/2026) para o receitas.html e a
   gestao.html usarem o MESMO número — nunca reimplementar por página;
   correções vêm para aqui.

   Cadeia de cálculo:
     ingrediente  → € por unidade base = precoUltimaCompra ÷ compra.fator
                    (sem `compra`, o preço já está na unidade base: fator 1)
     preparação   → € por unidade de rendimento = Σ(ingredientes) ÷ rendimento.qtd,
                    ou custoManualPorUnidade quando custoManual = true
     receita      → Σ(componentes), cada um ingrediente ou preparação, com
                    conversão de unidade (g↔kg, ml↔l) e sinalização de
                    linhas incalculáveis (motivo) em vez de um 0 disfarçado
     food cost    → custo ÷ (pvp ÷ 1,13)  — o PVP está com IVA (13%,
                    restauração) e o food cost mede-se sobre a receita líquida

   API (global `GiocoCustos`):
     custoIngrediente(ing)                       → number | null   (€ / unidade base)
     custoPreparacao(prep, ingredientes)         → { custo, unidade, motivo, manual, lote }
     custoReceita(receita, ingredientes, preps)  → { custo, completo, linhas, pvp,
                                                     pvpLiquido, foodCost (%), avisos[] }
     custoComponente(comp, ingredientes, preps)  → { custo, ok, motivo, nome,
                                                     precoUnitario, unidadePreco, detalhe }
     foodCost(custo, pvp)                        → number | null   (fração: 0,32 = 32%)
     pvpSemIva(pvp), converterFator(de, para), unidadeCanonica(u),
     normalizarTexto(s), MOTIVO_LABEL, IVA_RESTAURACAO

   Sem dependências. Compat com o resto do OS: sem módulos ES, sem build.
   ========================================================================== */
(function (global) {
  'use strict';

  // O PVP está com IVA incluído. O food cost mede-se sobre a receita líquida,
  // por isso o denominador é o PVP sem IVA (13%, taxa da restauração).
  var IVA_RESTAURACAO = 0.13;

  var ACCENT_MAP = {
    "à":"a","á":"a","â":"a","ã":"a","ä":"a",
    "è":"e","é":"e","ê":"e","ë":"e",
    "ì":"i","í":"i","î":"i","ï":"i",
    "ò":"o","ó":"o","ô":"o","õ":"o","ö":"o",
    "ù":"u","ú":"u","û":"u","ü":"u",
    "ç":"c","ñ":"n"
  };

  // Mesma lógica de normalização usada em leitura-faturas.html: minúsculas,
  // sem acentos, sem espaços à volta.
  function normalizarTexto(s) {
    var lower = String(s === null || s === undefined ? "" : s).toLowerCase();
    var out = "";
    for (var i = 0; i < lower.length; i++) {
      var ch = lower.charAt(i);
      out += ACCENT_MAP[ch] || ch;
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  // Conversões entre unidades da mesma família. Devolve null quando as
  // unidades são incompatíveis — nesse caso a linha fica sinalizada em vez
  // de produzir um custo errado.
  var UNIDADE_ALIASES = {
    kg:'kg', quilo:'kg', quilos:'kg', g:'g', gr:'g', grama:'g', gramas:'g',
    l:'l', lt:'l', litro:'l', litros:'l', ml:'ml',
    un:'un', uni:'un', und:'un', unid:'un', unidade:'un', unidades:'un', pc:'un', pç:'un'
  };

  var FATORES = {
    kg:{kg:1, g:0.001},
    g:{g:1, kg:1000},
    l:{l:1, ml:0.001},
    ml:{ml:1, l:1000},
    un:{un:1}
  };

  function unidadeCanonica(u) {
    var n = normalizarTexto(u);
    return UNIDADE_ALIASES[n] || n;
  }

  // Quantos "de" cabem em 1 "para". Ex.: converterFator('g','kg') = 0.001
  function converterFator(de, para) {
    var a = unidadeCanonica(de);
    var b = unidadeCanonica(para);
    if (!a || !b) return 1;          // unidade desconhecida: assume-se igual
    if (a === b) return 1;
    if (FATORES[a] && typeof FATORES[a][b] === 'number') return FATORES[a][b];
    return null;
  }

  var MOTIVO_LABEL = {
    'sem-preco': '— preço em falta',
    'sem-referencia': '— ingrediente não encontrado',
    'sem-qtd': '— quantidade em falta',
    'sem-rendimento': '— rendimento em falta',
    'ciclo': '— referência circular',
    'unidade': '— unidade incompatível'
  };

  function numero(v) {
    if (typeof v !== 'number') v = parseFloat(v);
    if (v === null || v === undefined || isNaN(v)) return null;
    return v;
  }

  function pvpSemIva(pvp) {
    if (typeof pvp !== 'number' || isNaN(pvp) || !pvp) return null;
    return pvp / (1 + IVA_RESTAURACAO);
  }

  // Fração (0,32 = 32%). null quando não há custo ou PVP.
  function foodCost(custo, pvp) {
    var c = numero(custo);
    var liquido = pvpSemIva(numero(pvp));
    if (c === null || !liquido) return null;
    return c / liquido;
  }

  // € por unidade base do ingrediente. precoUltimaCompra vem da leitura de
  // faturas na unidade em que se compra; compra.fator diz quantas unidades
  // base tem um formato de compra. Sem `compra`, o preço vale tal e qual.
  function custoIngrediente(ing) {
    if (!ing) return null;
    var preco = numero(ing.precoUltimaCompra);
    if (preco === null) return null;
    var fator = ing.compra ? numero(ing.compra.fator) : null;
    if (fator === null || fator <= 0) fator = 1;
    return preco / fator;
  }

  // Devolve sempre { custo:number|null, ok:boolean, motivo:string|null,
  //                  nome:string, precoUnitario, unidadePreco, detalhe }
  // custo === null significa "não é possível calcular" — nunca 0 disfarçado.
  function custoComponente(componente, ingredientes, preparacoes, visitados) {
    ingredientes = ingredientes || {};
    preparacoes = preparacoes || {};
    visitados = visitados || {};
    var qtd = typeof componente.qtd === 'number' ? componente.qtd : parseFloat(componente.qtd);
    if (isNaN(qtd)) qtd = null;

    if (componente.tipo === 'preparacao') {
      var prep = preparacoes[componente.prepId];
      var nomePrep = (prep && prep.nome) || componente.nome || 'Preparação desconhecida';
      if (!prep) {
        return { custo:null, ok:false, motivo:'sem-referencia', nome:nomePrep, detalhe:null };
      }
      var porUnidade = custoPreparacaoPorId(componente.prepId, ingredientes, preparacoes, visitados);
      if (porUnidade.custo === null || qtd === null) {
        return { custo:null, ok:false, motivo:porUnidade.motivo || 'sem-preco', nome:nomePrep, detalhe:null };
      }
      var fatorP = converterFator(componente.unidade, porUnidade.unidade);
      if (fatorP === null) {
        return { custo:null, ok:false, motivo:'unidade', nome:nomePrep,
                 detalhe:'unidade incompatível (' + (componente.unidade || '?') + ' vs ' + porUnidade.unidade + ')' };
      }
      return {
        custo: qtd * fatorP * porUnidade.custo,
        ok: true, motivo: null, nome: nomePrep,
        precoUnitario: porUnidade.custo, unidadePreco: porUnidade.unidade, detalhe: null
      };
    }

    // tipo === 'ingrediente'
    var ing = ingredientes[componente.ingredienteId];
    var nomeIng = (ing && ing.nome) || componente.nome || 'Ingrediente desconhecido';
    if (!ing) {
      return { custo:null, ok:false, motivo:'sem-referencia', nome:nomeIng, detalhe:null };
    }
    var preco = custoIngrediente(ing);
    if (preco === null) {
      return { custo:null, ok:false, motivo:'sem-preco', nome:nomeIng, detalhe:null };
    }
    if (qtd === null) {
      return { custo:null, ok:false, motivo:'sem-qtd', nome:nomeIng, detalhe:null };
    }
    var fator = converterFator(componente.unidade, ing.unidade || componente.unidade);
    if (fator === null) {
      return { custo:null, ok:false, motivo:'unidade', nome:nomeIng,
               detalhe:'unidade incompatível (' + (componente.unidade || '?') + ' vs ' + ing.unidade + ')' };
    }
    return {
      custo: qtd * fator * preco,
      ok: true, motivo: null, nome: nomeIng,
      precoUnitario: preco, unidadePreco: (ing.unidade || componente.unidade || 'un'), detalhe: null
    };
  }

  // Custo total do lote de uma preparação, linha a linha.
  function custoDoLote(prep, ingredientes, preparacoes, visitados) {
    prep = prep || {};
    var lista = Array.isArray(prep.ingredientes) ? prep.ingredientes : [];
    var linhas = [];
    var total = 0;
    var completo = true;

    lista.forEach(function (item) {
      var res = custoComponente({
        tipo: 'ingrediente',
        ingredienteId: item.ingredienteId,
        nome: item.nome,
        qtd: item.qtd,
        unidade: item.unidade
      }, ingredientes, preparacoes, Object.assign({}, visitados || {}));
      linhas.push({ item: item, res: res });
      if (res.ok) total += res.custo; else completo = false;
    });

    var rendimento = prep.rendimento && typeof prep.rendimento.qtd === 'number' ? prep.rendimento.qtd : null;
    return {
      linhas: linhas,
      total: total,
      completo: completo,
      rendimento: rendimento,
      unidade: (prep.rendimento && prep.rendimento.unidade) || 'kg'
    };
  }

  // Custo por kg/l/un de uma preparação. Recursivo: uma preparação pode
  // conter outra (ainda não acontece, mas fica preparado) — visitados corta
  // ciclos para não entrar em recursão infinita.
  function custoPreparacaoPorId(prepId, ingredientes, preparacoes, visitados) {
    visitados = visitados || {};
    var prep = preparacoes[prepId];
    if (!prep) return { custo:null, unidade:'kg', motivo:'sem-referencia', lote:null };
    if (visitados[prepId]) return { custo:null, unidade:'kg', motivo:'ciclo', lote:null };
    visitados[prepId] = true;
    return custoPreparacao(prep, ingredientes, preparacoes, visitados);
  }

  // Custo por unidade de rendimento de uma preparação (objeto, não id).
  // Devolve { custo, unidade, motivo, manual, lote }.
  function custoPreparacao(prep, ingredientes, preparacoes, visitados) {
    ingredientes = ingredientes || {};
    preparacoes = preparacoes || {};
    if (!prep) return { custo:null, unidade:'kg', motivo:'sem-referencia', lote:null };

    if (prep.custoManual) {
      var manual = prep.custoManualPorUnidade;
      if (typeof manual !== 'number') manual = parseFloat(manual);
      var unidadeManual = (prep.rendimento && prep.rendimento.unidade) || 'kg';
      var loteManual = custoDoLote(prep, ingredientes, preparacoes, visitados);
      if (manual === null || manual === undefined || isNaN(manual)) {
        return { custo:null, unidade:unidadeManual, motivo:'sem-preco', lote:loteManual };
      }
      return { custo:manual, unidade:unidadeManual, motivo:null, manual:true, lote:loteManual };
    }

    var detalhe = custoDoLote(prep, ingredientes, preparacoes, visitados);
    if (!detalhe.completo || detalhe.rendimento === null || !detalhe.rendimento) {
      return { custo:null, unidade:detalhe.unidade,
               motivo:detalhe.rendimento ? 'sem-preco' : 'sem-rendimento', lote:detalhe };
    }
    return { custo: detalhe.total / detalhe.rendimento, unidade: detalhe.unidade, motivo:null, lote:detalhe };
  }

  // Custo total de um artigo, com o detalhe de cada componente. O food cost
  // sai daqui e não do render, para todas as vistas usarem o mesmo número.
  // avisos[] descreve cada linha incalculável (preparação sem rendimento,
  // ingrediente sem preço…) em texto, pronto a mostrar.
  function custoReceita(receita, ingredientes, preparacoes) {
    receita = receita || {};
    var componentes = Array.isArray(receita.componentes) ? receita.componentes : [];
    var linhas = [];
    var total = 0;
    var completo = true;
    var avisos = [];

    componentes.forEach(function (comp) {
      var res = custoComponente(comp, ingredientes, preparacoes, {});
      linhas.push({ comp: comp, res: res });
      if (res.ok) total += res.custo;
      else {
        completo = false;
        var label = (res.motivo === 'unidade' && res.detalhe) ? res.detalhe
                  : (MOTIVO_LABEL[res.motivo] || '— sem custo').replace(/^—\s*/, '');
        avisos.push(res.nome + ': ' + label);
      }
    });

    var pvp = typeof receita.pvp === 'number' ? receita.pvp : parseFloat(receita.pvp);
    if (isNaN(pvp)) pvp = null;
    var liquido = pvpSemIva(pvp);
    var fc = (completo && liquido) ? (total / liquido * 100) : null;

    return {
      custo: total, total: total, linhas: linhas, completo: completo, avisos: avisos,
      pvp: pvp, pvpLiquido: liquido, foodCost: fc
    };
  }

  global.GiocoCustos = {
    IVA_RESTAURACAO: IVA_RESTAURACAO,
    MOTIVO_LABEL: MOTIVO_LABEL,
    normalizarTexto: normalizarTexto,
    unidadeCanonica: unidadeCanonica,
    converterFator: converterFator,
    pvpSemIva: pvpSemIva,
    foodCost: foodCost,
    custoIngrediente: custoIngrediente,
    custoComponente: custoComponente,
    custoPreparacao: custoPreparacao,
    custoReceita: custoReceita
  };
})(typeof window !== 'undefined' ? window : this);
