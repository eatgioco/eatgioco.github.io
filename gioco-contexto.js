/* gioco-contexto.js — CONTEXTO DE NEGÓCIO da GIOCO (GiocoContexto), FONTE ÚNICA.
   Set/2026.

   O que é a GIOCO, onde fica, a entidade legal, a fase em que está e quem decide.
   É o bloco que vai em TODOS os pedidos ao modelo do gioco-sugestoes.js
   (sugestão inicial, atualização incremental e classificação de local).

   SEM EQUIPA, DE PROPÓSITO (decisão de 12/09/2026): este ficheiro NÃO tem nomes,
   papéis nem funções de pessoas. Uma lista de equipa desatualiza-se (já
   aconteceu) e contexto errado é pior que contexto ausente. O modelo descreve
   terceiros pelo papel genérico ("o responsável da loja", "o fornecedor", "o
   senhorio", "a câmara") e só usa um nome se o Manel o escrever no contexto do
   projeto. O teste testa-sugestoes.js falha se um nome próprio de pessoa
   aparecer aqui ou no gioco-sugestoes.js — a única excepção é "Manel", o
   fundador e único decisor, que faz parte do contexto.

   PORQUÊ UM FICHEIRO PRÓPRIO (e não o CLAUDE.md nem um nó no Firebase):
   · o CLAUDE.md é a documentação técnica do OS, não é servido às páginas e não é
     para ser lido em runtime;
   · um nó no Firebase precisava de UI própria e ficava com duas verdades. Um
     ficheiro estático no repo é editável num só sítio, fica em git e não tem
     segredos (Restrição 1 — só o que já é público no site e nas faturas).

   Sem Firebase, sem DOM, sem rede. Carregar ANTES do gioco-sugestoes.js.

   API: DADOS (o objeto abaixo) e texto() → o bloco em prosa para o prompt (PURA). */
(function () {
  'use strict';

  var DADOS = {
    empresa: 'GIOCO',
    descricao: 'focacciaria italiana de balcão (loja única, sem mesas) em Lisboa',
    morada: 'Rua de São Bento 154, Lisboa',
    entidadeLegal: 'Tribo Poética Unipessoal Lda. (NIF 518717186) — é a entidade que fatura, contrata e assina',
    fase: 'abriu em 2026; é um negócio pequeno, em fase inicial',
    site: 'https://eatgioco.github.io/',
    decisor: 'Manel'
  };

  function texto() {
    return 'CONTEXTO DO NEGÓCIO:\n' +
      'A ' + DADOS.empresa + ' é uma ' + DADOS.descricao + ', na ' + DADOS.morada + '. ' +
      'Entidade legal: ' + DADOS.entidadeLegal + '. ' +
      'A GIOCO ' + DADOS.fase + '.\n' +
      'O ' + DADOS.decisor + ' é o fundador e o ÚNICO decisor: não há hierarquia a consultar nem aprovações internas a obter.';
  }

  var C = { DADOS: DADOS, texto: texto };
  if (typeof window !== 'undefined') window.GiocoContexto = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})();
