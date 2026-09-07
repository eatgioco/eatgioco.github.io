/* gioco-caixa.js — motor partilhado do DINHEIRO FÍSICO (GiocoCaixa), SÓ leitura.
   Funções puras: recebem os nós tal como estão em memória (o objeto devolvido
   por snapshot.val()) e nunca tocam no Firebase. Extraídas da caixa.html em
   Set/2026 sem alterar um cêntimo; usadas pela caixa.html (cards Caixa/Cofre)
   e pelo mrn-dashboard.html (cartão Posição Financeira). Nunca reimplementar
   por página — ver CLAUDE.md, nós caixaContagens e cofreMovimentos.

   ultimaContagem(contagens)         → a contagem mais recente por dataHora, ou null
   saldoVivoCaixa(contagens, movs)   → total da última contagem + caixaMovimentos
                                       posteriores (entrada +valor; saída 'acertado'
                                       −(valor − valorDevolvido); saída 'aberto' −valor).
                                       null SEM contagem nenhuma — não é 0.
   saldoCofre(cofreMovs)             → soma CUMULATIVA entradas − saídas de toda a história
*/
(function(){
  function round2(n){ return Math.round(n * 100) / 100; }

  function ultimaContagem(contagens){
    var all = contagens || {};
    var melhor = null;
    Object.keys(all).forEach(function(id){
      var c = all[id];
      if (!c || !c.dataHora) return;
      if (!melhor || new Date(c.dataHora) > new Date(melhor.dataHora)) melhor = c;
    });
    return melhor;
  }

  function saldoVivoCaixa(contagens, movs){
    var contagem = ultimaContagem(contagens);
    if (!contagem) return null;
    var all = movs || {};
    var saldo = parseFloat(contagem.total) || 0;
    var desde = new Date(contagem.dataHora).getTime();
    Object.keys(all).forEach(function(id){
      var m = all[id];
      if (!m) return;
      var t = new Date(m.dataHora).getTime();
      if (isNaN(t) || t <= desde) return;
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
    ultimaContagem: ultimaContagem,
    saldoVivoCaixa: saldoVivoCaixa,
    saldoCofre: saldoCofre
  };
})();
