/* gioco-caixa.js — motor partilhado do DINHEIRO FÍSICO (GiocoCaixa), SÓ leitura.
   Funções puras: recebem os nós tal como estão em memória (o objeto devolvido
   por snapshot.val()) e nunca tocam no Firebase. Extraídas da caixa.html em
   Set/2026 sem alterar um cêntimo; usadas pela caixa.html (cards Caixa/Cofre),
   pelo mrn-dashboard.html (cartão Posição Financeira) e, desde 19 Set/2026,
   pela reconciliacao.html (check diário do numerário, Cartão A). Nunca
   reimplementar por página — ver CLAUDE.md, nós caixaContagens e cofreMovimentos.

   dataHoraValida(iso)               → string ISO parseável por new Date(), só isso.
                                       Fonte ÚNICA desta validação — caixa.html delega
                                       aqui em vez de manter a sua própria cópia.
   ultimaContagem(contagens)         → a contagem mais recente por dataHora, ou null.
                                       Um registo com dataHora inválida (ex.: 'ontem')
                                       é tratado como inexistente — nunca vira âncora
                                       só por new Date(invalida) > x dar sempre false.
   contagensInvalidas(contagens)     → ids de contagens com dataHora inválida, para a
                                       página avisar que ficaram fora do cálculo.
   efeitoMovimentoCents(m)           → efeito de UM caixaMovimento no saldo, em CÊNTIMOS
                                       inteiros (entrada +valor; saída 'acertado'
                                       −(valor − valorDevolvido); qualquer outra saída
                                       −valor). É a ÚNICA definição desta regra no OS:
                                       saldoVivoCaixa e reconciliarNumerario passam
                                       ambos por aqui — se mudar, mudam os dois.
   saldoVivoCaixa(contagens, movs)   → total da última contagem + caixaMovimentos
                                       posteriores (efeitoMovimentoCents por movimento).
                                       null SEM contagem nenhuma — não é 0. Movimentos
                                       com dataHora inválida continuam excluídos da
                                       soma (ver movimentosInvalidos, mesma condição).
   movimentosInvalidos(contagens, movs) → ids de caixaMovimentos com dataHora inválida
                                       que saldoVivoCaixa excluiu em silêncio da soma —
                                       chamar ao lado de saldoVivoCaixa para avisar na UI;
                                       [] sem contagem (nada foi calculado, nada foi excluído).
   saldoCofre(cofreMovs)             → soma CUMULATIVA entradas − saídas de toda a história
   dayKeyLocal(iso|Date)             → 'AAAA-MM-DD' na hora LOCAL (a mesma chave de dia da
                                       listagem da caixa.html — nunca a fatia UTC do ISO).
   reconciliarNumerario(contagens, movs, nuPorDia, posPorDia)
                                     → CHECK DIÁRIO DO NUMERÁRIO (19 Set/2026, decisão do
                                       Manel — ver CLAUDE.md, reconciliacao.html). Devolve
                                       { linhas:[…], contagensInvalidas:[ids],
                                         movimentosInvalidos:[ids] }.
       Âncora do dia D = a PRIMEIRA contagem válida do dia local D; contagens a meio
       do dia são ignoradas. Janela de D = (âncora de D, âncora seguinte] — o mesmo
       critério de inclusão do saldoVivoCaixa (movimento depois da âncora conta).
       Os dias de operação cobertos pela janela vão do dia da âncora D até à véspera
       do dia da âncora seguinte; sem contagem numa manhã, a janela cobre vários
       dias numa só linha (NU e POS somados) — NUNCA se inventa uma âncora.
         esperado = total da âncora D
                  + NU (nuPorDia[dia], em euros) dos dias cobertos
                  + Σ efeitoMovimentoCents dos caixaMovimentos na janela
                  − saídas POS (posPorDia[dia].saidas) + entradas POS (.entradas)
         Δ = total da âncora seguinte − esperado
       SEM TOLERÂNCIA: toda a aritmética é em cêntimos inteiros (cents() em cada
       parcela ANTES de somar) e só se converte para euros no resultado; o Fecho de
       Caixa ZS traz três casas e é arredondado ao cêntimo à entrada. Δ = 0 cêntimos
       é o ÚNICO 'ok'. Estados: 'aberto' (sem âncora seguinte — hoje nunca confirma
       hoje), 'provisorio' (há Δ mas falta o Fecho ZS OU o NU importado de algum dia
       da janela — faltas em `semPos`/`semNu`), 'ok' (Δ = 0), 'falta' (Δ < 0),
       'sobra' (Δ > 0). nuPorDia: { 'AAAA-MM-DD': euros }; posPorDia (opcional):
       { 'AAAA-MM-DD': { saidas: euros|null, entradas: euros|null } } — dia sem
       registo → saidasPos/entradasPos null nessa parcela.
       Cada linha: { dias:[…], ancoraDe:{id, dataHora, total, pessoa}, ancoraAte
       (idem ou null), nu, entradasOs, saidasOs, movimentos:[{id, dataHora, tipo,
       motivo, valor, valorDevolvido, estado, efeito}], saidasPos|null,
       entradasPos|null, semPos:[dias], semNu:[dias], esperado, contado|null,
       delta|null, estado, motivoDiferenca (o texto gravado na âncora seguinte),
       chave ('dias.join("_")~NU', a chave de reconciliacaoDescartes) }.
       Movimentos e contagens com dataHora inválida ficam fora e são devolvidos à
       parte (mesmo critério de movimentosInvalidos/contagensInvalidas).
*/
(function(){
  function round2(n){ return Math.round(n * 100) / 100; }
  function cents(n){ var v = parseFloat(n); return isNaN(v) ? 0 : Math.round(v * 100); }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  function dataHoraValida(iso){
    return typeof iso === 'string' && !!iso && !isNaN(new Date(iso).getTime());
  }

  function dayKeyLocal(input){
    var d = (input instanceof Date) ? input : new Date(input);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function ultimaContagem(contagens){
    var all = contagens || {};
    var melhor = null;
    Object.keys(all).forEach(function(id){
      var c = all[id];
      if (!c || !dataHoraValida(c.dataHora)) return;
      if (!melhor || new Date(c.dataHora) > new Date(melhor.dataHora)) melhor = c;
    });
    return melhor;
  }

  function contagensInvalidas(contagens){
    var all = contagens || {};
    var out = [];
    Object.keys(all).forEach(function(id){
      var c = all[id];
      if (c && !dataHoraValida(c.dataHora)) out.push(id);
    });
    return out;
  }

  // Efeito de um movimento no saldo físico, em cêntimos inteiros. Regra ÚNICA
  // (era a do saldoVivoCaixa; extraída em 19 Set/2026 para o check do numerário
  // a usar tal e qual): entrada +valor; saída 'acertado' −(valor − valorDevolvido);
  // qualquer outra saída −valor (o dinheiro já saiu fisicamente, mesmo por acertar).
  function efeitoMovimentoCents(m){
    if (!m) return 0;
    if (m.tipo === 'entrada') return cents(m.valor);
    if (m.estado === 'acertado') return 0 - (cents(m.valor) - cents(m.valorDevolvido));
    return 0 - cents(m.valor);
  }

  function saldoVivoCaixa(contagens, movs){
    var contagem = ultimaContagem(contagens);
    if (!contagem) return null;
    var all = movs || {};
    var saldoCents = cents(contagem.total);
    var desde = new Date(contagem.dataHora).getTime();
    Object.keys(all).forEach(function(id){
      var m = all[id];
      if (!m || !dataHoraValida(m.dataHora)) return;
      var t = new Date(m.dataHora).getTime();
      if (t <= desde) return;
      saldoCents += efeitoMovimentoCents(m);
    });
    return round2(saldoCents / 100);
  }

  function movimentosInvalidos(contagens, movs){
    var contagem = ultimaContagem(contagens);
    if (!contagem) return [];
    var all = movs || {};
    var out = [];
    Object.keys(all).forEach(function(id){
      var m = all[id];
      if (m && !dataHoraValida(m.dataHora)) out.push(id);
    });
    return out;
  }

  function saldoCofre(cofreMovs){
    var all = cofreMovs || {};
    var saldo = 0;
    Object.keys(all).forEach(function(id){
      var m = all[id];
      if (!m) return;
      saldo += (m.tipo === 'entrada' ? 1 : -1) * (parseFloat(m.valor) || 0);
    });
    return round2(saldo);
  }

  function diaSeguinte(dia){
    var p = dia.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2] + 1, 12, 0, 0);
    return dayKeyLocal(d);
  }

  function reconciliarNumerario(contagens, movs, nuPorDia, posPorDia){
    var allC = contagens || {}, allM = movs || {};
    var nu = nuPorDia || {}, pos = posPorDia || null;
    var contInv = [], movInv = [];

    // 1. Âncoras: a PRIMEIRA contagem válida de cada dia local.
    var porDia = {};
    Object.keys(allC).forEach(function(id){
      var c = allC[id];
      if (!c) return;
      if (!dataHoraValida(c.dataHora)){ contInv.push(id); return; }
      var dia = dayKeyLocal(c.dataHora);
      var ts = new Date(c.dataHora).getTime();
      var atual = porDia[dia];
      if (!atual || ts < atual.ts || (ts === atual.ts && id < atual.id)){
        porDia[dia] = { id: id, ts: ts, dia: dia, dataHora: c.dataHora, total: round2(cents(c.total) / 100),
          totalCents: cents(c.total), pessoa: c.pessoa || '', motivoDiferenca: c.motivoDiferenca || null };
      }
    });
    var ancoras = Object.keys(porDia).sort().map(function(d){ return porDia[d]; });

    // 2. Movimentos válidos, ordenados por tempo.
    var lista = [];
    Object.keys(allM).forEach(function(id){
      var m = allM[id];
      if (!m) return;
      if (!dataHoraValida(m.dataHora)){ movInv.push(id); return; }
      lista.push({ id: id, ts: new Date(m.dataHora).getTime(), m: m });
    });
    lista.sort(function(a, b){ return a.ts - b.ts || (a.id < b.id ? -1 : 1); });

    var hoje = dayKeyLocal(new Date());
    var linhas = [];
    ancoras.forEach(function(de, i){
      var ate = ancoras[i + 1] || null;
      // Dias de operação cobertos: do dia da âncora D até à véspera da seguinte
      // (em aberto: até hoje).
      var dias = [];
      var fim = ate ? ate.dia : hoje;
      var d = de.dia, guard = 0;
      while (d < fim && guard++ < 400){ dias.push(d); d = diaSeguinte(d); }
      if (!dias.length) dias.push(de.dia);

      var nuCents = 0, semNu = [];
      dias.forEach(function(dd){
        if (nu[dd] == null || isNaN(parseFloat(nu[dd]))) semNu.push(dd); else nuCents += cents(nu[dd]);
      });

      var entradasOs = 0, saidasOs = 0, movimentos = [];
      lista.forEach(function(x){
        if (x.ts <= de.ts) return;
        if (ate && x.ts > ate.ts) return;
        var ef = efeitoMovimentoCents(x.m);
        if (ef >= 0) entradasOs += ef; else saidasOs += -ef;
        movimentos.push({ id: x.id, dataHora: x.m.dataHora, tipo: x.m.tipo, motivo: x.m.motivo || '',
          valor: round2(cents(x.m.valor) / 100), valorDevolvido: x.m.valorDevolvido == null ? null : round2(cents(x.m.valorDevolvido) / 100),
          estado: x.m.estado || null, efeito: round2(ef / 100) });
      });

      var saidasPos = null, entradasPos = null, semPos = [];
      if (pos){
        var sCents = 0, eCents = 0, temS = false, temE = false;
        dias.forEach(function(dd){
          var p = pos[dd];
          if (!p || p.saidas == null || isNaN(parseFloat(p.saidas))){ semPos.push(dd); return; }
          sCents += cents(p.saidas); temS = true;
          if (p.entradas != null && !isNaN(parseFloat(p.entradas))){ eCents += cents(p.entradas); temE = true; }
        });
        if (temS) saidasPos = round2(sCents / 100);
        if (temE) entradasPos = round2(eCents / 100);
      } else {
        semPos = dias.slice();
      }

      var esperadoCents = de.totalCents + nuCents + entradasOs - saidasOs
        - (saidasPos == null ? 0 : cents(saidasPos)) + (entradasPos == null ? 0 : cents(entradasPos));
      var contado = ate ? round2(ate.totalCents / 100) : null;
      var deltaCents = ate ? ate.totalCents - esperadoCents : null;

      var estado;
      if (!ate) estado = 'aberto';
      else if (semPos.length || semNu.length) estado = 'provisorio';
      else if (deltaCents === 0) estado = 'ok';
      else estado = deltaCents < 0 ? 'falta' : 'sobra';

      linhas.push({
        dias: dias,
        ancoraDe: { id: de.id, dataHora: de.dataHora, total: de.total, pessoa: de.pessoa },
        ancoraAte: ate ? { id: ate.id, dataHora: ate.dataHora, total: ate.total, pessoa: ate.pessoa } : null,
        nu: round2(nuCents / 100),
        entradasOs: round2(entradasOs / 100),
        saidasOs: round2(saidasOs / 100),
        movimentos: movimentos,
        saidasPos: saidasPos,
        entradasPos: entradasPos,
        semPos: semPos,
        semNu: semNu,
        esperado: round2(esperadoCents / 100),
        contado: contado,
        delta: deltaCents == null ? null : round2(deltaCents / 100),
        deltaCents: deltaCents,
        estado: estado,
        motivoDiferenca: ate ? ate.motivoDiferenca : null,
        chave: dias.join('_') + '~NU'
      });
    });

    return { linhas: linhas, contagensInvalidas: contInv, movimentosInvalidos: movInv };
  }

  var G = {
    dataHoraValida: dataHoraValida,
    dayKeyLocal: dayKeyLocal,
    ultimaContagem: ultimaContagem,
    contagensInvalidas: contagensInvalidas,
    efeitoMovimentoCents: efeitoMovimentoCents,
    saldoVivoCaixa: saldoVivoCaixa,
    movimentosInvalidos: movimentosInvalidos,
    saldoCofre: saldoCofre,
    reconciliarNumerario: reconciliarNumerario
  };
  if (typeof window !== 'undefined') window.GiocoCaixa = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})();
