/* gioco-caixa.js — motor partilhado do DINHEIRO FÍSICO (GiocoCaixa), SÓ leitura.
   Funções puras: recebem os nós tal como estão em memória (o objeto devolvido
   por snapshot.val()) e nunca tocam no Firebase. Extraídas da caixa.html em
   Set/2026 sem alterar um cêntimo; usadas pela caixa.html (cards Caixa/Cofre)
   e pelo mrn-dashboard.html (cartão Posição Financeira). Nunca reimplementar
   por página — ver CLAUDE.md, nós caixaContagens e cofreMovimentos.

   dataHoraValida(iso)               → string ISO parseável por new Date(), só isso.
                                       Fonte ÚNICA desta validação — caixa.html delega
                                       aqui em vez de manter a sua própria cópia.
   ultimaContagem(contagens)         → a contagem mais recente por dataHora, ou null.
                                       Um registo com dataHora inválida (ex.: 'ontem')
                                       é tratado como inexistente — nunca vira âncora
                                       só por new Date(invalida) > x dar sempre false.
   contagensInvalidas(contagens)     → ids de contagens com dataHora inválida, para a
                                       página avisar que ficaram fora do cálculo.
   saldoVivoCaixa(contagens, movs)   → total da última contagem + caixaMovimentos
                                       posteriores (entrada +valor; saída 'acertado'
                                       −(valor − valorDevolvido); saída 'aberto' −valor).
                                       null SEM contagem nenhuma — não é 0. Movimentos
                                       com dataHora inválida continuam excluídos da
                                       soma (ver movimentosInvalidos, mesma condição).
   movimentosInvalidos(contagens, movs) → ids de caixaMovimentos com dataHora inválida
                                       que saldoVivoCaixa excluiu em silêncio da soma —
                                       chamar ao lado de saldoVivoCaixa para avisar na UI;
                                       [] sem contagem (nada foi calculado, nada foi excluído).
   saldoCofre(cofreMovs)             → soma CUMULATIVA entradas − saídas de toda a história
*/
(function(){
  function round2(n){ return Math.round(n * 100) / 100; }

  function dataHoraValida(iso){
    return typeof iso === 'string' && !!iso && !isNaN(new Date(iso).getTime());
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

  function saldoVivoCaixa(contagens, movs){
    var contagem = ultimaContagem(contagens);
    if (!contagem) return null;
    var all = movs || {};
    var saldo = parseFloat(contagem.total) || 0;
    var desde = new Date(contagem.dataHora).getTime();
    Object.keys(all).forEach(function(id){
      var m = all[id];
      if (!m || !dataHoraValida(m.dataHora)) return;
      var t = new Date(m.dataHora).getTime();
      if (t <= desde) return;
      if (m.tipo === 'entrada'){
        saldo += (parseFloat(m.valor) || 0);
      } else if (m.estado === 'acertado'){
        saldo -= ((parseFloat(m.valor) || 0) - (parseFloat(m.valorDevolvido) || 0));
      } else {
        saldo -= (parseFloat(m.valor) || 0);
      }
    });
    return round2(saldo);
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

  window.GiocoCaixa = {
    dataHoraValida: dataHoraValida,
    ultimaContagem: ultimaContagem,
    contagensInvalidas: contagensInvalidas,
    saldoVivoCaixa: saldoVivoCaixa,
    movimentosInvalidos: movimentosInvalidos,
    saldoCofre: saldoCofre
  };
})();
