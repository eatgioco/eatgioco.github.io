/* gioco-contexto.js — CONTEXTO DE NEGÓCIO da GIOCO (GiocoContexto), FONTE ÚNICA.
   Set/2026.

   O que é a GIOCO, onde fica, a entidade legal, quem é a equipa e o que cada um
   faz, e quem decide. É o bloco que vai em TODOS os pedidos ao modelo do
   gioco-sugestoes.js (sugestão inicial, atualização incremental e classificação
   de local) — sem ele o Gemini não conhece a equipa e nunca sugere envolver as
   pessoas certas.

   PORQUÊ UM FICHEIRO PRÓPRIO (e não o CLAUDE.md nem um nó no Firebase):
   · o CLAUDE.md é a documentação técnica do OS (nós, escritas, regras de código),
     não é servido às páginas e não é para ser lido em runtime; a secção "Equipa
     (referência)" de lá passou a apontar para AQUI — este ficheiro é a única
     fonte, e quem mexer na equipa mexe só aqui;
   · um nó no Firebase precisava de UI própria e ficava com duas verdades (a do nó
     e a do repo). Um ficheiro estático no repo é editável pelo Manel num só sítio,
     fica em git com histórico, e não tem segredos (Restrição 1 — só o que já é
     público no site e nas faturas).

   Sem Firebase, sem DOM, sem rede. Carregar ANTES do gioco-sugestoes.js.

   API: DADOS (o objeto abaixo) e texto() → o bloco em prosa para o prompt (PURA).
   Ao mudar a equipa: editar só `equipa` — o texto é gerado. */
(function () {
  'use strict';

  var DADOS = {
    empresa: 'GIOCO',
    descricao: 'focacciaria italiana de balcão (loja única, sem mesas) em Lisboa',
    morada: 'Rua de São Bento 154, Lisboa',
    entidadeLegal: 'Tribo Poética (NIF 518717186) — é a entidade que fatura, contrata e assina',
    site: 'https://eatgioco.github.io/',
    decisor: 'Manel',
    equipa: [
      { nome: 'Manel', papel: 'Fundador', faz: 'decide tudo, trata de tesouraria, fornecedores, contratos, banco e obrigações legais; é quem usa esta lista' },
      { nome: 'Alfredo Giangaspero', papel: 'Head of Operations', faz: 'gere a loja no dia a dia — equipa ao balcão, caixa, encomendas, HACCP, manutenção e tudo o que é físico na loja' },
      { nome: 'Mattia Pivetta', papel: 'Head of Product', faz: 'produto e cozinha — receitas, fichas técnicas, fornecedores de ingredientes, qualidade' },
      { nome: 'Leonor Borges', papel: 'Head of Brand', faz: 'marca e comunicação — design, sinalética, redes sociais, materiais gráficos, fotografia' }
    ]
  };

  function texto() {
    var pessoas = DADOS.equipa.map(function (p) { return '- ' + p.nome + ' (' + p.papel + '): ' + p.faz + '.'; }).join('\n');
    return 'CONTEXTO DO NEGÓCIO:\n' +
      'A ' + DADOS.empresa + ' é uma ' + DADOS.descricao + ', na ' + DADOS.morada + '. ' +
      'Entidade legal: ' + DADOS.entidadeLegal + '.\n' +
      'Equipa:\n' + pessoas + '\n' +
      'O ' + DADOS.decisor + ' é o ÚNICO decisor: qualquer decisão é dele. Os outros executam, informam ou dão opinião na sua área. ' +
      'Quando um passo envolve alguém da equipa, usa o nome real da pessoa certa para essa área.';
  }

  var C = { DADOS: DADOS, texto: texto };
  if (typeof window !== 'undefined') window.GiocoContexto = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})();
