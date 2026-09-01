/* Fixture sintético do "ano 2000" — dados inconfundíveis (prefixo ZZTESTE).
   Vive só no harness local; nunca é escrito no Firebase. */
window.ZZT_FIXTURE = {
  categoriasIngredientes: {
    GR: { label: 'ZZTESTE Mercearia' },
    LT: { label: 'ZZTESTE Laticinios' }
  },
  ingredientes: {
    'ZI-FAR': { nome: 'ZZTESTE Farinha', unidade: 'kg', categoria: 'GR', fornecedor: 'ZZTESTE Fornecedor A', precoUltimaCompra: 1,
                compra: { unidade: 'saco 25kg', fator: 25 } },
    'ZI-TOM': { nome: 'ZZTESTE Tomate', unidade: 'kg', categoria: 'GR', fornecedor: 'ZZTESTE Fornecedor A', precoUltimaCompra: 2,
                compra: { unidade: 'lata 400g', fator: 0.4 } },
    'ZI-QUE': { nome: 'ZZTESTE Queijo', unidade: 'kg', categoria: 'LT', fornecedor: 'ZZTESTE Fornecedor B', precoUltimaCompra: 10 },
    'ZI-SAL': { nome: 'ZZTESTE Sal', unidade: 'kg', categoria: 'GR', fornecedor: 'ZZTESTE Fornecedor B', precoUltimaCompra: 0.5 },
    'ZI-ORF': { nome: 'ZZTESTE Orfao', unidade: 'kg', categoria: 'GR', fornecedor: 'ZZTESTE Fornecedor B', precoUltimaCompra: 3 },
    'ZI-SPR': { nome: 'ZZTESTE Sem Preco', unidade: 'kg', categoria: 'GR', fornecedor: 'ZZTESTE Fornecedor A' }
  },
  preparacoes: {
    'ZP-MOL': { nome: 'ZZTESTE Molho', rendimento: { qtd: 2, unidade: 'kg' },
                ingredientes: [ { ingredienteId: 'ZI-TOM', qtd: 3 }, { ingredienteId: 'ZI-SAL', qtd: 0.02 } ] },
    'ZP-FIX': { nome: 'ZZTESTE Custo Fixo', custoManual: true, custoManualPorUnidade: 4 },
    'ZP-SEM': { nome: 'ZZTESTE Sem Rendimento', rendimento: { qtd: 0, unidade: 'kg' },
                ingredientes: [ { ingredienteId: 'ZI-QUE', qtd: 1 } ] },
    'ZP-CIA': { nome: 'ZZTESTE Ciclo A', rendimento: { qtd: 1, unidade: 'kg' },
                ingredientes: [ { prepId: 'ZP-CIB', qtd: 1 } ] },
    'ZP-CIB': { nome: 'ZZTESTE Ciclo B', rendimento: { qtd: 1, unidade: 'kg' },
                ingredientes: [ { prepId: 'ZP-CIA', qtd: 1 }, { ingredienteId: 'ZI-FAR', qtd: 0.1 } ] },
    'ZP-NIN': { nome: 'ZZTESTE Aninhada', rendimento: { qtd: 4, unidade: 'kg' },
                ingredientes: [ { prepId: 'ZP-MOL', qtd: 2 }, { ingredienteId: 'ZI-QUE', qtd: 1 }, { ingredienteId: 'ZI-SPR', qtd: 0.5 } ] }
  },
  receitas: {
    'ZR-PIZ': { nome: 'ZZTESTE Pizza', categoria: 'Focaccia', pvp: 10,
                componentes: [ { ingredienteId: 'ZI-FAR', qtd: 0.25, tipo: 'ingrediente' },
                               { prepId: 'ZP-MOL', qtd: 0.2, tipo: 'preparacao' },
                               { prepId: 'ZP-FIX', qtd: 0.1, tipo: 'preparacao' } ] },
    'ZR-ANI': { nome: 'ZZTESTE Aninhada Rec', categoria: 'Side', pvp: 5,
                componentes: [ { prepId: 'ZP-NIN', qtd: 0.5, tipo: 'preparacao' } ] },
    'ZR-PRO': { nome: 'ZZTESTE Problemas', categoria: 'Side', pvp: 4,
                componentes: [ { prepId: 'ZP-SEM', qtd: 1, tipo: 'preparacao' },
                               { prepId: 'ZP-CIA', qtd: 1, tipo: 'preparacao' },
                               { prepId: 'ZP-NAO-EXISTE', qtd: 1, tipo: 'preparacao' } ] }
  },
  mapaProdutosReceitas: {
    'Z0001': { receitaId: 'ZR-PIZ' },
    'Z0002': { ignorado: true },
    'Z0003': { receitaId: 'ZR-ANI' },
    'Z0004': { receitaId: 'ZR-PRO' },
    'Z0008': { receitaId: 'ZR-NAO-EXISTE' }
  },
  contagens: {
    '2000-01-01': { estado: 'fechada', fechadaEm: '2000-01-01T22:00:00.000Z', itens: {
      'ZI-FAR': { qtdBase: 10, qtdContada: 10, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-TOM': { qtdBase: 5, qtdContada: 5, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-QUE': { qtdBase: 2, qtdContada: 2, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-ORF': { qtdBase: 1, qtdContada: 1, unidadeBase: 'kg', unidadeContagem: 'kg' }
    } },
    '2000-01-04': { estado: 'fechada', fechadaEm: '2000-01-04T22:00:00.000Z', itens: {
      'ZI-FAR': { qtdBase: 9, qtdContada: 9, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-TOM': { qtdBase: 7, qtdContada: 7, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-QUE': { qtdBase: 1.8, qtdContada: 1.8, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-SAL': { qtdBase: 2, qtdContada: 2, unidadeBase: 'kg', unidadeContagem: 'kg' }
    } },
    '2000-01-06': { estado: 'rascunho', itens: {
      'ZI-FAR': { qtdBase: 99, qtdContada: 99, unidadeBase: 'kg', unidadeContagem: 'kg' }
    } },
    '2000-01-08': { estado: 'fechada', fechadaEm: '2000-01-08T22:00:00.000Z', itens: {
      'ZI-FAR': { qtdBase: 12, qtdContada: 12, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-TOM': { qtdBase: 3, qtdContada: 3, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-QUE': { qtdBase: 1.5, qtdContada: 1.5, unidadeBase: 'kg', unidadeContagem: 'kg' },
      'ZI-ORF': { qtdBase: 1, qtdContada: 1, unidadeBase: 'kg', unidadeContagem: 'kg' }
    } }
  },
  faturasProcessadas: {
    'ZF-1': { data: '2000-01-03', fornecedorTexto: 'ZZTESTE Fornecedor A', montante: 16, linhas: [
      { ingredienteId: 'ZI-TOM', quantidade: 10, montante: 8, descricao: 'ZZTESTE lata tomate' },
      { ingredienteId: 'ZI-SAL', quantidade: 2, montante: 1, descricao: 'ZZTESTE sal' },
      { montante: 7, descricao: 'ZZTESTE linha sem ingrediente' }
    ] },
    'ZF-2': { data: '2000-01-06', fornecedorTexto: 'ZZTESTE Fornecedor B', montante: 5, linhas: [
      { ingredienteId: 'ZI-FAR', quantidade: 0.2, montante: 5, descricao: 'ZZTESTE saco farinha' }
    ] },
    'ZF-3': { data: '2000-01-01', fornecedorTexto: 'ZZTESTE Fora da janela', montante: 99, linhas: [
      { ingredienteId: 'ZI-QUE', quantidade: 9, montante: 99, descricao: 'ZZTESTE fora da janela' }
    ] }
  },
  vendasDiario: { '2000-01': {} }
};
(function () {
  var dias = ['2000-01-01','2000-01-02','2000-01-03','2000-01-04','2000-01-06','2000-01-07','2000-01-08'];
  dias.forEach(function (dia) {
    var produtos = {
      'Z0001': { desc: 'ZZTESTE PIZZA', qtd: 2, valor: 20, categoria: 'Comida', subcategoria: 'Focaccia', iva: 13, pvpMedio: 10 },
      'Z0002': { desc: 'ZZTESTE SACO', qtd: 1, valor: 1, categoria: 'Outros', subcategoria: 'Extra', iva: 23, pvpMedio: 1 },
      'Z0003': { desc: 'ZZTESTE ANINHADA', qtd: 1, valor: 5, categoria: 'Comida', subcategoria: 'Side', iva: 13, pvpMedio: 5 },
      'Z0009': { desc: 'ZZTESTE SEM MAPA', qtd: 3, valor: 9, categoria: 'Comida', subcategoria: 'Side', iva: 13, pvpMedio: 3 }
    };
    if (dia === '2000-01-06') produtos['Z0004'] = { desc: 'ZZTESTE PROBLEMAS', qtd: 1, valor: 4, categoria: 'Comida', subcategoria: 'Side', iva: 13, pvpMedio: 4 };
    if (dia === '2000-01-07') produtos['Z0008'] = { desc: 'ZZTESTE MAPA MORTO', qtd: 1, valor: 2, categoria: 'Comida', subcategoria: 'Side', iva: 13, pvpMedio: 2 };
    window.ZZT_FIXTURE.vendasDiario['2000-01'][dia] = { produtos: produtos, resumo: { bruto: 35, liquido: 30 } };
  });
})();
