# GIOCO OS — contexto para o Claude Code

## O projecto
Sistema de gestão interno da GIOCO, uma focacciaria italiana de balcão em Lisboa (Rua de São Bento 154). Stack: HTML puro + Firebase Realtime Database, alojado em GitHub Pages.

- **Repo:** github.com/eatgioco/eatgioco.github.io (PÚBLICO)
- **Site:** https://eatgioco.github.io/
- **Firebase RTDB:** https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app
- **Firebase modo de teste** — sem autenticação activa. Firebase Auth adiado.

## Identidade visual
- Fundo: `#F5F2EC` | Vermelho: `#D91124` | Preto: `#141414`
- Fontes: Space Mono (títulos/labels) + Inter (texto corrido)
- Header vermelho com `● GIOCO®`, botão `🏠 Home` em todas as páginas internas
- **Desktop-only. Nunca fazer páginas mobile-first ou responsivas.** Todas as páginas
  usam o mesmo layout normal: `header-inner` e `main` com `max-width:1200px`,
  `main` com `padding:40px 24px 80px`, e `<meta name="viewport" content="width=1200">`.
  Sem `@media (max-width: …)` — a única excepção permitida é `@media print`.
  No telemóvel a página aparece reduzida (zoom out), não reorganizada.
- **Excepção ao desktop-only: as páginas de `device-width`.** `equipa.html` (grelha de
  turnos), `contagens.html` e `tesouraria.html` usam
  `<meta name="viewport" content="width=device-width, initial-scale=1">` porque são usadas
  ao telemóvel. Adaptam-se sem `@media` próprios: `overflow-x:auto` + coluna sticky e
  grelhas `minmax(min(Xpx,100%),1fr)`.
  O menu ao toque é do shell e é **opt-in**: o `gioco-shell.css` tem um
  `@media (hover: none)` inteiro prefixado por `body.shell-mobile`, e o `gioco-shell.js` tem
  o `giocoToggleMenu()`. Uma página adere com três coisas: `<body class="shell-mobile">`,
  `<div class="nav-overlay" id="navOverlay"></div>` e `onclick="giocoToggleMenu()"` no
  `#sidebarPinBtn`. Aí a sidebar deixa de ser lateral e passa a barra fixa no fundo, e o
  `#sidebarPinBtn` abre um painel para cima em vez de fixar a barra fechada — ao toque não
  há hover, e os itens do menu são `<a>`, por isso tocar neles navegava em vez de abrir.
  O critério é a existência de hover, **nunca a largura** — e é por isso que tem de ser
  opt-in: sem a classe, uma página desktop-only (`width=1200`) aberta no telemóvel ficava
  com uma barra de 52px desenhada a 1200px e reduzida a zoom out, inutilizável.
  Aderem hoje: `equipa.html`, `contagens.html`, `tesouraria.html`, `gestao.html`,
  `caixa.html` (desde Set/2026: fotografar o talão no Devolver Troco) e
  `loja-sao-bento.html` (desde 1 Set/2026: no computador da loja, que tem rato,
  nada muda — o critério é o hover).

## Ficheiros do repositório

| Ficheiro | Módulo | Audiência |
|---|---|---|
| `index.html` | Home / menu do OS | Equipa |
| `compras.html` | Base de dados de fornecedores + encomendas + ingredientes (abas "Por fornecedor" / "Por ingrediente" / "Encomenda sugerida") | Equipa |
| `pagamentos.html` | Ciclo de pedidos de pagamento (numeração N/MM/AA, anulação) | Equipa |
| `caixa.html` | Movimentos de dinheiro físico. Layout (Set/2026): resumo no topo ("Saldo hoje" e "Por acertar" — o Manel usa estes textos como indicador, não mudar) → **ferramenta de caixa** em duas colunas (registo à esquerda; "Por devolver troco" à direita, com TODOS os movimentos `aberto` sem filtro de data, ordem cronológica, e o único sítio onde vive o botão "↩ Devolver Troco") → **listagem completa** a toda a largura (filtros Hoje/7 dias/Mês/Tudo + motivos, mais "Sem fatura (declarado)" e "Troco não conferiu"; os `aberto` aparecem com badge "Por acertar" mas sem botão). Em saídas Compra / Pagamento a fornecedor o registo pergunta "Vai haver troco?" (obrigatório): Não → fechado logo (`temTroco:false`, `estado:'acertado'`, `valorDevolvido:0`); Sim → `aberto` até ao Devolver Troco, que exige fatura carregada (lida via `gioco-faturas.js`, foto arquivada em `caixaFaturasArquivo/{id}`) OU a declaração "Declaro que não tenho fatura deste movimento", e depois o valor devolvido (pré-preenchido com `valor − fatura.montante`; diferença > 0,05 € só avisa). Depósito bancário e Outro fecham na criação (`semAcerto`), sem pergunta. Usada ao telemóvel para fotografar o talão: viewport `device-width` + opt-in `shell-mobile`. Escreve só `push()` em `caixaMovimentos` e `update()` por caminho em `caixaMovimentos/{id}` — nunca remove | Equipa |
| `loja-sao-bento.html` | Planta, checklists abertura/fecho, temperaturas HACCP, pedidos da loja | Equipa |
| `centro-de-controlo.html` | Painel da loja (`?loja=sb154`): câmaras go2rtc, A/C, e o cartão **Consumo** ligado a `contasBancarias/{abanca,revolut}/movimentos` — € mensal/anual dos débitos de eletricidade (despesa de `classificacaoMovimentos`/`classificacaoRegras` a casar `/eletric|edp|ibelectra/i`, fallback `IBELECTRA`, mesma normalização da `resultados.html`; só leitura). kWh pendente de um futuro nó `consumoEnergia/{AAAA-MM}`. Cartão **Vendas hoje** ligado a `vendasDiario/{AAAA-MM}/{AAAA-MM-DD}/resumo` (lê só os nós dos dias precisos, `bruto` c/ IVA): mostra hoje se o nó existir (selo "Hoje"), senão o mesmo dia da semana a −7/−14/−21/−28 dias, o primeiro que exista (selo "Ref. …", neutro); sem nenhum, placeholder. Comparação = a N.ª ocorrência do mesmo dia da semana no mês anterior (N = posição do dia no seu mês; sem N.ª, a última), chave AAAA-MM derivada de cada data — só a variação % na linha, valor absoluto no title. Resumo do mês (Faturação/Ticket/Média por dia) de `vendas/{AAAA-MM}/resumo` do mês corrente, senão o anterior rotulado "(fechado)". Usa o mesmo `.cc-valor` do cartão Consumo. Por baixo de Média/dia, o acumulado do dia médio até à hora atual (`vendas/{AAAA-MM}/porHora` do mesmo mês; `giocoAcumuladoHoras`, cópia tal e qual da função pura do `vendas.html` — alterar as duas juntas; aproximação linear dentro da hora; refresca a cada 60 s da memória). Restantes cartões em placeholder | Equipa |
| `contagens.html` | Contagens físicas de stock por data, com navegação ao teclado e conversão de unidades | Equipa |
| `equipa.html` | Três separadores: Escala (turnos), Pessoas (registo de colaboradores; criar uma pessoa gera os compromissos de tesouraria dela) e Recibos (importação de recibos de vencimento em PDF com pdf.js, conferência com 5 validações e histórico de custo por mês) | Equipa |
| `receitas.html` | Fichas técnicas: preparações e artigos, com custo calculado ao vivo e food cost | Equipa |
| `foodcost.html` | Duas secções independentes: (1) **mapa de produtos ZoneSoft → fichas técnicas**, sempre visível, alimentado pelos produtos distintos de `vendasDiario` nas últimas 4 semanas completas — a MESMA janela do painel "Encomenda sugerida" da `compras.html`, de que o mapa é pré-requisito — com sugestão automática, escolha manual, "Ignorar" e progresso "X de Y produtos tratados"; (2) **variância** de food cost: consumo teórico (vendas × ficha técnica) vs. real (contagem inicial + compras − contagem final), por período entre duas contagens fechadas. Só (2) depende das contagens: o estado vazio "ainda não há um período para comparar" está confinado a ela, e (1) continua utilizável com zero ou uma contagem | Equipa |
| `resultados.html` | P&L mensal **em ótica de caixa, valores com IVA** (decisão de 02/09/2026): receita = `vendas/{mes}/resumo.bruto` (o líquido fica informativo no drill-down); custos nos valores brutos das fontes, sem estimar nem deduzir IVA; entregas de IVA/impostos aparecem como saídas bancárias na reconciliação quando ocorrem. Rubricas: CMV (paymentRequests concluídos + saídas bancárias de fornecedores), Pessoal (linha única: recibos + TSU patronal via gioco-compromissos.js + sem recibo como estimativa), Fixos (sem pessoal/TSU). Reconciliação bancária movimento a movimento com "Não classificado" sempre visível. Exclusões reversíveis de linhas via `plAjustes/` (ver nós). Classificação de movimentos em DUAS dimensões: a rubrica do P&L e a despesa concreta ("Meta Ads", "EDP"), ambas aprendidas pelas mesmas regras; a despesa é metadado e nunca mexe em valores | Equipa |
| `padroes.html` | Vendas × contexto externo, **só leitura** (fase b, Set/2026). Calendário do mês com o desvio de cada dia face ao **esperado** = mediana do `bruto` de D-7/D-14/D-21/D-28 em `vendas/{mes}/porDia` (mín. 2 valores; lê também o mês anterior); "Esperado vs. real" (linha 2 séries + colunas com |desvio|, negativos a vermelho porque `barrasVerticais` não desenha negativos); cruzamento por fator sobre todo o histórico (chuva, chuva no horário, tMax, feriado, ponte, férias; dia da semana em média de bruto, não desvio) com regra n ≥ 8; detalhe do dia de `vendasDiario/{mes}/{dia}` (só o nó do dia, cache de sessão) + `contextoDiario/{dia}`. Contexto lido por intervalo `orderByKey().startAt/endAt` por mês. Nunca escreve | Equipa |
| `contabilidade.html` | Placeholder | — |
| `gestao.html` | Folha de cálculo de **ingredientes** e **produtos** (edição em massa, inline, grava ao sair da célula). Dois separadores: Ingredientes (uma linha por `ingredientes/`; contagem herdada da compra quando não existe `contagem/`) e Produtos (uma linha por `receitas/`, com custo/food cost via `gioco-custos.js`, artigo POS de `vendas/catalogo` e vendas do mês de `vendas/{mes}/produtos`). Escreve SEMPRE um `set()`/`remove()` por path de campo: `ingredientes/{id}/{campo}`, `ingredientes/{id}/compra/{unidade|fator}`, `ingredientes/{id}/contagem` (objeto `{unidade,fator}`, o mesmo formato do contagens.html), `receitas/{id}/{categoria|pvp}`, `vendas/catalogo/{chave}/{receitaId|categoria}`. Nunca escreve em `vendas/{mes}/produtos` nem `vendasDiario/`. Deep-links: `compras.html?ingrediente=ID` e `receitas.html?receita=ID`. Coluna Foto lê o manifesto `img/ingredientes/index.json` (array de slugs) — sem manifesto mostra "—" | Equipa |
| `gioco-custos.js` | Motor partilhado de custo/food cost (`GiocoCustos`): `custoIngrediente` (precoUltimaCompra ÷ compra.fator), `custoPreparacao`, `custoReceita` (→ custo, avisos[], foodCost %), `foodCost`, `converterFator`. Extraído do receitas.html em Set/2026 sem alterar um cêntimo; receitas.html e gestao.html usam-no — nunca reimplementar por página | — |
| `gioco-consumo.js` | Motor partilhado: explosão da ficha técnica (produto → receita → preparações recursivas → ingredientes, com as preparações de custo fixo só em euros) e consumo teórico a partir de `vendasDiario`. Factory `giocoConsumoEngine({getReceitas, getPreparacoes, getVendasDiario, getMapa})`, no molde do `gioco-compromissos.js`. Usado pelo `foodcost.html` (variância) e pela aba "Encomenda sugerida" da `compras.html` (procura e consumo desde a contagem) | — |
| `gioco-faturas.js` | Módulo partilhado de **leitura e arquivo de faturas** (`GiocoFaturas`), SÓ leitura — não escreve em lado nenhum. Extraído da `leitura-faturas.html` em Set/2026 sem alterar comportamento: constantes do Azure Document Intelligence (endpoint, chave F0 — risco aceite, ver comentário —, versão, modelo), `ler(file)` → `{fornecedorTexto, montante, referencia, data, prazoPagamento, linhas}`, `analyzeInvoice`, `fieldText/fieldDateIso/fieldAmount/extrairLinhas`, `fileToBase64/fileToDataUrl/compressImageDataUrl`, `prepararArquivoFatura(file)` (imagem comprimida a 1600 px JPEG 0.8, PDF tal e qual) e `abrirArquivoFatura(dataUrl)`, `normalizeNome` e `findMatchingSupplier(vendorName, allSuppliers)`. Cada página decide onde grava: `leitura-faturas.html` → `faturasProcessadas`/`faturasArquivo`; `caixa.html` → dentro do movimento. Nunca reimplementar por página | — |
| `gioco-reconciliacao.js` | Motor partilhado de **reconciliação bancária** (`giocoReconciliacaoEngine({getPaymentRequests, getPagamentosConcluidos, getMovimentos, getReconciliacao, compromissos: CE, ref})`, no molde do `gioco-compromissos.js`). `pagamentosConcluidos()` achata linhas pagas + ocorrências de compromissos; `calcular()` → `{itens, porEstado, contadores, autoNovas}`; `pesquisaManual(item)` (±30 dias, 90–110 % do valor); `ligar(chave, mov, 'auto'|'manual')`, `aplicarAutomaticas(res)` e `desligar(chave)` — as únicas escritas, sempre `update()` no caminho `reconciliacaoBancaria/{chave}` (desligar marca `ligado:false` + `excluidos/`, nunca `remove()`). Regra de match e estados documentados no cabeçalho do ficheiro e no nó abaixo. Usado só pela `tesouraria.html`; nunca reimplementar por página | — |
| `gioco-shell.css` | Design system: tokens de cor, tema claro/escuro, sidebar, vidro, `.card`, `.kpi`, `.status`, `.btn-add`, tabelas | — |
| `gioco-shell.js` | Sprite de ícones SVG, `giocoIcon()`, sidebar (hover/pin) e toggle de tema com persistência | — |
| `gioco-charts.css` | Camada de gráficos: barras horizontais/verticais, linha, donut, tokens `--fatia-*` | — |
| `gioco-charts.js` | `GiocoChart.*` — funções que desenham barras/colunas/linha/donut em HTML/SVG | — |
| `estilo.html` | Montra do design system: todos os componentes e a grelha de ícones | — |
| `tesouraria.html` | Compromissos fixos, calendário de saídas, TSU e **reconciliação bancária** (Set/2026): cada pagamento marcado como pago (linha de `paymentRequests` concluída ou ocorrência em `pagamentosConcluidos`) leva um selo com o estado face aos débitos de `contasBancarias/{abanca,revolut}/movimentos` — ✓ Confirmado · ⏳ Aguarda banco · ⚠ Sem movimento · ? Ambíguo · — Sem data — no separador Concluídos, no detalhe do calendário e na secção "Reconciliação bancária" (contador + cinco listas expansíveis: Ligar nos ambíguos e na pesquisa alargada dos sem movimento / sem data, Desligar com confirmação nos confirmados). A lógica é toda do `gioco-reconciliacao.js`; a página só liga os dados em memória e desenha. Lê os movimentos das duas contas só em leitura; a única escrita nova é em `reconciliacaoBancaria/` | Só Manel |
| `tarefas.html` | Tarefas, prazos e fixados do dia | Só Manel |
| `conta-bancaria.html` | Movimentos e saldo de uma conta (`?conta={slug}`) | Só Manel |
| `mrn-dashboard.html` | Dashboard privado: contas bancárias, vendas, pagamentos e compromissos, tarefas, pedidos da loja espelhados, depósitos bancários e reconciliação, central de notificações, armazenamento, e placeholders (Calendário Outlook, Instagram, Google Reviews) | Só Manel |

## Nós Firebase (RTDB)

```
suppliers             — fornecedores
paymentRequests       — pedidos de pagamento (status: pendente / concluido / anulado)
caixaMovimentos       — movimentos de caixa física. Campos novos (Set/2026, chaves
                         ausentes = null; só em saídas Compra / Pagamento a fornecedor):
                         temTroco (true|false — resposta a "Vai haver troco?"; os
                         'aberto' antigos sem o campo contam como true);
                         fatura { fornecedorTexto, fornecedorIdEncontrado, montante,
                         referencia, data, linhas, lidaEm, erroLeitura (string|null) }
                         só quando foi carregada fatura no Devolver Troco — com
                         erroLeitura preenchido a foto ficou na mesma arquivada;
                         semFatura:true + semFaturaDeclaradoPor (declaração explícita);
                         trocoEsperado = valor − fatura.montante quando há montante
                         lido; trocoConfere = |valorDevolvido − trocoEsperado| ≤ 0,05
                         (null sem fatura lida). Gasto real continua valor − valorDevolvido.
                         Escritas: push() na criação e update() por caminho em
                         caixaMovimentos/{id} — nunca set num nó pai, nunca remove.
                         REGRA: as faturas da caixa vivem SÓ dentro do movimento —
                         NUNCA vão para faturasProcessadas nem faturasArquivo, NUNCA
                         aparecem na leitura-faturas.html e NUNCA geram paymentRequests
caixaFaturasArquivo   — caixaFaturasArquivo/{movimentoId} = dataUrl da foto/PDF da
                         fatura do movimento de caixa, comprimido (mesmo formato de
                         faturasArquivo). Fora do movimento de propósito: o listener de
                         caixaMovimentos não carrega base64; a listagem lê on demand ao
                         clicar no badge "Fatura". Escrito só pela caixa.html (set() no
                         nó próprio, antes do update do movimento)
lojaChecklistTemplates / lojaChecklistRegistos — checklists abertura/fecho
equipamentos          — equipamentos da loja (nome, zona, tipo, limite, ordem, ativo);
                         nunca apagados, só desativados — lojaTemperaturas referencia-os por id
lojaTemperaturas / lojaTemperaturasFotos      — registos HACCP (fotos em base64)
lojaPedidos           — pedidos/sugestões do staff
pessoas               — membros da equipa; campos opcionais nif, categoria (SINGULAR),
                         dataAdmissao (YYYY-MM-DD) e vencimentoBase só são gravados
                         quando preenchidos. 'categorias' (plural) é descontinuado e
                         apagado a cada gravação — não confundir com 'categoria'
turnos                — escala semanal (confirmações manuais, chave {data}_{turnoId})
padroes               — padrão semanal recorrente por pessoa
ferias                — períodos de férias por pessoa
fechados              — loja encerrada por data: { diaTodo, turnos:{t1,t3,t2} }
notificacoes          — central de notificações (lida: bool, tipo, criadoEm)
tasks                 — tarefas do dashboard
preparacoes           — fichas técnicas de preparações internas (molhos, pestos…);
                         custo/kg = soma dos ingredientes ÷ rendimento, ou
                         custoManualPorUnidade quando custoManual=true
receitas              — fichas técnicas dos artigos vendidos (componentes =
                         ingredientes + preparações, pvp, avisos por confirmar)
recibos               — recibos de vencimento importados: recibos/{pessoaId}/{AAAA-MM}
                         (AAAA-MM COM zero à esquerda — NÃO é o formato AAAA-M do
                         periodo de pagamentosConcluidos). Guarda meta, pessoa,
                         linhas[], descontos[], totais, pagamento, textoBruto e
                         validacao. O PDF NÃO é guardado. Reimportar o mesmo mês
                         da mesma pessoa substitui o registo
compromissosFixos     — custos recorrentes (renda, NOS, EPAL, salários…): regra, não instância;
                         com valorDiario preenchido o montante é calculado por mês
                         (dias úteis seg-sex × valorDiario) e o campo valor é ignorado.
                         Campo opcional pessoaId (push key de pessoas) + parteRecibo
                         ('conta' = transferência | 'cartao' = carregamento do cartão
                         refeição): ligado a uma pessoa, o montante deixa de vir de
                         valor/valorDiario e passa a derivar dos recibos — valor real no
                         mês com recibo (confirmado), média dos últimos 3 nos meses sem
                         (estimado), corrigida pela diferença de vencimentoBase quando há
                         aumento ainda sem recibo (só na parte 'conta'). Enquanto a pessoa
                         não tiver recibo NENHUM valem as sementes (valor/valorDiario)
                         deixadas ao criá-la, marcadas 'estimado · sem recibos'; a partir
                         do primeiro recibo dessa pessoa nunca mais contam.
                         Criar uma pessoa em equipa.html gera dois destes compromissos
                         ('Salário — {iniciais}' e 'Cartão refeição — {iniciais}');
                         desativar a pessoa desativa-os, depois de um aviso que lista os
                         pagamentos pendentes. Nunca se apagam.
                         Um compromisso com pessoaId mas SEM parteRecibo é do modelo
                         anterior e gera as duas saídas de uma vez, a do cartão com id
                         {compromissoId}~cartao ('~' é chave válida no RTDB e não colide
                         com o '_' do período) e dia próprio em diaCartao.
                         Desde 1 Set/2026 já não há registos do modelo antigo: sal-AG e
                         sal-BC foram migrados (parteRecibo:'conta' + novos sal-AG-cartao
                         / sal-BC-cartao); o motor mantém o suporte por causa do
                         histórico de pagamentosConcluidos ({id}~cartao_...).
                         A semente valor:1700 do sal-AG fica INTENCIONALMENTE: nunca é
                         usada (a pessoa tem recibos, e a partir do primeiro recibo as
                         sementes nunca mais contam) — não corrigir nem remover.
                         Campo opcional derivaDe:'tsu' — entrada ÚNICA da Segurança
                         Social: ignora o campo valor e vale 34,75% sobre a soma dos
                         totais.sujeito de TODOS os recibos do mês anterior, arredondado
                         uma só vez no agregado (nunca somar valores já arredondados por
                         pessoa). Dia, método, IBAN e notas são do utilizador. Não é
                         gerada automaticamente nem existe uma TSU virtual.
                         ATENÇÃO: esta lógica está duplicada em tesouraria.html e em
                         mrn-dashboard.html e tem de ser igual nos dois ficheiros; a
                         equipa.html tem uma versão REDUZIDA (valorCompromissoDaPessoa)
                         só para o aviso de desativação
contextoDiario        — contexto externo por dia, chave AAAA-MM-DD, escrito SÓ pelo job
                         contexto_diario.py do repo mreymao/gioco-bank-sync (06:30 Lisboa);
                         aqui é só leitura (padroes.html). Sub-nós: calendario{diaSemana
                         0=seg, nomeDia, fimDeSemana, feriado, feriadoMunicipal, ponte,
                         semanaMes, ultimosDiasMes, feriasEscolares}, meteo{tMax, tMin,
                         t13h, precipMm, horasChuva, chuvaLoja, ventoMax, codigo, descricao,
                         nascer, por, fonte} (observado, Open-Meteo) e meteoPrevisao (mesma
                         forma, feita na véspera; coexiste com meteo). O RTDB descarta
                         nulls: feriado/feriadoMunicipal/feriasEscolares podem NÃO existir
                         — ausente = null. Chaves reservadas para o futuro: eventos,
                         marketing, operacao, fluxo, parlamento. Ler por intervalo
                         (orderByKey().startAt/endAt), nunca o nó todo, excepto o cruzamento
                         histórico da padroes.html (startAt 2026-05-01)
mapaProdutosReceitas  — ligação {codigoZoneSoft} -> uma de QUATRO formas,
                         escrita SÓ pela foodcost.html. O código é o das chaves de
                         vendasDiario/{AAAA-MM}/{dia}/produtos.
                         ATENÇÃO (Set/2026): a gestao.html guarda a ligação
                         artigo POS → ficha noutro sítio, em
                         vendas/catalogo/{chave}/receitaId (pedido do Manel).
                         Este mapa continua a ser o que o motor de consumo lê;
                         a gestao.html só o usa como SUGESTÃO de ligação.
                         Unificar os dois é trabalho pendente.
                           { receitaId }               — ficha técnica (forma original);
                             cada unidade vendida explode a receita normalmente.
                           { ignorado:true }            — para o que não consome
                             ingredientes (sacos, taxas, portes) — é diferente de não
                             estar mapeado, que aparece no balde "Sem mapa".
                           { ingredienteId, qtdBase }   — consumo direto: cada unidade
                             vendida consome qtdBase unidades (na unidade base do
                             ingrediente) desse ingrediente, sem passar por receita
                             nenhuma. Uso típico: bebidas de revenda (lata, garrafa).
                           { preparacaoId, qtdBase }    — dose de preparação: cada
                             unidade vendida consome qtdBase (unidade base da
                             preparação, normalmente kg) dessa preparação, que explode
                             recursivamente como quando uma receita a usa. Uso típico:
                             extras avulsos (ex. "Extra Pesto").
                         Todas as quatro formas são somadas pelo mesmo motor
                         (gioco-consumo.js, consumoDeVendidos) — foodcost.html
                         (variância) e compras.html (encomenda sugerida) não têm
                         lógica própria que as filtre, delegam sempre no motor.
                         A UI de mapeamento é independente das contagens e lista os
                         produtos das últimas 4 SEMANAS COMPLETAS (segunda a domingo,
                         a semana em curso fora): janelaMapa/MAPA_SEMANAS na
                         foodcost.html tem de continuar igual a
                         encJanelaSemanas/ENC_SEMANAS na compras.html — conjuntos
                         diferentes nas duas páginas seriam pior do que nenhum
pagamentosConcluidos  — ocorrências mensais de compromissosFixos marcadas como pagas,
                         chave {compromissoId}_{ano}-{mes} = { concluidoEm }
classificacaoRegras   — regras de classificação de movimentos bancários da
                         resultados.html: {idPush} = { padrao, rubrica, criadoEm,
                         origemExemplo, despesa? }. padrao = substring do
                         descritivo, normalizada (maiúsculas, sem acentos,
                         espaços colapsados); rubrica ∈ cmv | pessoal | fixos |
                         outros | impostos | interno. despesa é OPCIONAL (nome
                         de exibição da entidade concreta, ex.: "Meta Ads") —
                         uma regra pode trazer rubrica, despesa, ou ambas; sem
                         despesa comporta-se como antes. Se várias regras
                         casarem, ganha o padrão mais longo. Apagar uma regra é
                         permitido (é configuração, não dados), sempre com
                         confirmação na UI
classificacaoMovimentos — override individual por movimento bancário:
                         {conta}~{ref} = { rubrica, manual:true, regraId?,
                         criadoEm, despesa? }. Vence sempre sobre qualquer
                         regra. despesa é OPCIONAL, pelas mesmas razões.
                         PRIORIDADE de classificação na resultados.html:
                         (1) exclusão em plAjustes (o item sai do P&L e vai
                         para "Não classificado"); (2) lógica de reconciliação
                         existente (salários, renda, paymentRequests, internas)
                         — o classificador nunca atua sobre estes; (3) este
                         override; (4) regra de classificacaoRegras; (5) fica
                         "Não classificado". Com plAjustes e
                         classificacaoDespesas, são os QUATRO únicos nós onde a
                         resultados.html escreve, sempre um set() por registo
                         (nunca update multi-chave)
classificacaoDespesas — catálogo leve das despesas (a SEGUNDA dimensão de
                         classificação, a par da rubrica): {idDespesa} =
                         { nome, criadoEm }. idDespesa = nome normalizado
                         (maiúsculas, sem acentos, espaços colapsados,
                         caracteres não alfanuméricos → hífen): "Meta Ads" →
                         META-ADS. Serve APENAS para alimentar o autocomplete
                         do campo "Despesa (opcional)" e para dar um nome
                         canónico (evita "meta ads" vs "Meta Ads"). A entrada
                         é criada na primeira vez que uma despesa nova é usada
                         e NUNCA é apagada automaticamente; classificar sem
                         despesa não escreve aqui nada.
                         RESOLUÇÃO DAS DUAS DIMENSÕES: a rubrica diz onde o
                         movimento entra no P&L, a despesa diz o que ele é
                         concretamente. A despesa segue a mesma prioridade da
                         rubrica, campo a campo — a do override vence; senão
                         vale a da regra que casou; senão o movimento fica sem
                         despesa. Um override pode portanto corrigir só a
                         despesa mantendo a rubrica que veio da regra. A
                         despesa é METADADO: nunca entra em nenhum cálculo,
                         só aparece como segundo selo e no sumário "por
                         despesa" no topo do drill-down de cada rubrica do P&L
                         (onde "Sem despesa" fecha a soma com o total da
                         rubrica). Gerir o catálogo (renomear, fundir) ainda
                         não existe
reconciliacaoBancaria — ligação pagamento pago ↔ movimento bancário real (Set/2026),
                         escrita SÓ pelo gioco-reconciliacao.js a partir da tesouraria.html:
                         reconciliacaoBancaria/{chavePagamento} = { conta ('abanca'|'revolut'),
                         movimentoKey (chave em contasBancarias/{conta}/movimentos), valor,
                         dataMovimento (booking_date AAAA-MM-DD), metodo ('auto'|'manual'), em (ms) }.
                         chavePagamento: payreq:{ticketId}~{lineIdx} para linhas de
                         paymentRequests, fixo:{chave de pagamentosConcluidos} para
                         compromissos (ex. fixo:-Oz7_9bb..._2026-8, sufixo ~cartao incluído).
                         REGRA DE MATCH: candidato = movimento DBIT de qualquer conta com os
                         mesmos cêntimos, booking_date em [âncora−2, âncora+7], sem "INTERNA"
                         no descritivo e ainda não ligado; âncora = dia local de concluidoEm.
                         Débitos directos (metodoPagamento 'debito'): âncora = dia esperado
                         do compromisso no período (resolveDia), janela [−3, +5]. Liga
                         sozinho SÓ com exactamente 1 candidato, valor não estimado, e
                         se nenhum outro pagamento reclama o mesmo movimento. Um
                         movimentoKey nunca aparece em duas entradas (ligar() recusa).
                         ESTADOS calculados (não gravados): confirmado (há entrada) ·
                         aguarda (0 candidatos, janela ainda aberta) · semMovimento
                         (0 candidatos, janela passada) · ambiguo (2+ candidatos, ou 1
                         disputado / valor estimado) · semData (linha sem concluidoEm:
                         só ligação manual, pesquisa a ±30 dias e 90–110 % do valor com o
                         prazo como referência). Cada escrita é um update() no caminho da
                         chave. NUNCA há remove(): DESLIGAR (manual, com confirmação) é
                         um PATCH que mantém a entrada e escreve { ligado:false,
                         desligadoEm, excluidos/{movimentoKey}: ms } com os seis campos da
                         ligação (conta, movimentoKey, valor, dataMovimento, metodo, em)
                         a null — a única situação em que se escreve null, e só nesses
                         campos. Uma entrada só conta como confirmada com ligado !== false
                         E movimentoKey. O match automático ignora os movimentos em
                         excluidos/ dessa entrada (se depois de excluir sobrar exactamente
                         1 candidato, liga-o — é coerente); a pesquisa manual mostra-os na
                         mesma, marcados "excluído antes", e ligar à mão a um excluído é
                         permitido (o mesmo update tira a chave de excluidos/). Os
                         movimentos bancários e os pagamentos de origem nunca são alterados
plAjustes             — ajustes manuais do P&L (resultados.html, o ÚNICO que
                         escreve aqui): plAjustes/{AAAA-MM}/exclusoes/{idEstavel}
                         = { origem, motivo?, excluidoEm }. idEstavel identifica
                         o item de forma determinística ('/' e afins trocados
                         por '~'): payreq:{id}~{linha}, banco:{conta}~{ref},
                         caixa:{id}, recibo:{pessoaId}, fixo:{id}, tsu.
                         Exclusões são POR MÊS, sempre reversíveis (repor =
                         remove() desse path); um set() por exclusão, nunca
                         escritas multi-chave. Excluir nunca apaga dados de
                         origem — um item excluído com expressão bancária volta
                         a contar no "Não classificado" da reconciliação
contagens             — contagens físicas de stock: contagens/{AAAA-MM-DD} =
                         { estado: 'rascunho'|'fechada', criadaEm, fechadaEm,
                           itens: { {ingredienteId}: { qtdContada, unidadeContagem,
                           qtdBase, unidadeBase, registadoEm } } }.
                         qtdContada é o número tal como foi escrito na unidade de
                         contagem; qtdBase é esse número × o fator, na unidade base.
                         unidadeBase fica CONGELADA no item de propósito: sem ela, mudar
                         a unidade base do ingrediente mais tarde punha as contagens
                         antigas a mentir. Um ingrediente NÃO contado fica simplesmente
                         ausente de itens/ — nunca se gravam zeros implícitos; um 0
                         escrito à mão grava-se como 0. Cada item é um set() num path
                         próprio (podem estar duas sessões abertas ao mesmo tempo), e
                         estado/fechadaEm são duas escritas independentes.
                         Sem botão de apagar: só o Manel apaga, à mão, no Firebase.
encomendasConfig      — configuração do painel "Encomenda sugerida" da compras.html
                         (o ÚNICO que escreve aqui): { horizonteDias, margemPct }.
                         horizonteDias = para quantos dias de calendário se
                         encomenda (default 7, 1..60); margemPct = margem de
                         segurança em % sobre a necessidade (default 15, 0..200).
                         Duas chaves, DUAS escritas — um set() em
                         encomendasConfig/horizonteDias e outro em
                         encomendasConfig/margemPct, nunca um update multi-chave.
                         Nó em falta ou valor fora do intervalo = defaults
```

O `contagens.html` também escreve **`ingredientes/{id}/contagem`** = `{ unidade, fator }`
(o fator converte 1 unidade de contagem em unidades base; se forem a mesma, fator = 1) e,
**só quando está vazio**, `ingredientes/{id}/unidade`. São dois `set()` em dois paths
próprios — nunca um `set` em `ingredientes/{id}` inteiro nem um `update()` multi-chave,
que apagariam `precoUltimaCompra` e o resto da ficha.

A `leitura-faturas.html` (mini-modal ao associar linha→ingrediente) e a
`foodcost.html` (⚙ na linha) escrevem **`ingredientes/{id}/compra`** =
`{ unidade, fator }` — o fator converte 1 unidade de FATURA em unidades base
(ex.: «caixa 250g» com base kg → fator 0.25), espelho do formato `contagem`.
O painel "Encomenda sugerida" da `compras.html` também lê este `compra` — e é
por isso que um ingrediente **sem** formato de compra nunca recebe sugestão
nenhuma: sem `fator` não há conversão entre a unidade base e a unidade que se
encomenda, e um número inventado seria pior do que a ausência dele.

No foodcost, a quantidade de fatura é convertida (qtd × fator); o selo
«qtd da fatura» fica só nos ingredientes ainda sem `compra` definido.
Mesma regra de escrita: um `set()` só nesse path.

### Formatos de chave por período (três, e não são o mesmo)

| Nó | Formato | Exemplo |
|---|---|---|
| `vendas` / `vendasDiario` | `AAAA-MM` **com** zero (e os dias em `AAAA-MM-DD`) | `2026-08` |
| `recibos` | `AAAA-MM` **com** zero | `2026-08` |
| `contagens` | `AAAA-MM-DD` | `2026-08-31` |
| `pagamentosConcluidos` | `{id}_AAAA-M` **sem** zero no mês | `-Ox..._2026-8` |

O único sem zero à esquerda é o período do `pagamentosConcluidos`. Confundi-los é o erro
clássico deste modelo de dados.

### Loja SB154 — ar condicionado (`lojas/sb154/ac`)

O A/C Giatsu (módulo Midea, LAN da loja) é lido e comandado por um serviço Python
no **PC do POS** (`sb154`, tailnet `eatgioco.com`, IP Tailscale `100.97.211.74`),
não pelo browser. Código em `servicos/ac-bridge/` (sem segredos; a chave do
aparelho vive só no POS em `C:\gioco\ac\ac-sb154-midea.json`).

```
lojas/sb154/ac/estado              — escrito SÓ pelo serviço (PATCH raso a cada 30 s se
                                     mudou, heartbeat 5 min): ligado, modo (cool|heat|fan|
                                     dry|auto), tempAlvo, tempAmbiente, tempExterior,
                                     ventilacao (1–100), ventilacaoPreset (silencioso|baixo|
                                     medio|alto|max|auto|custom), eco, turbo, sleep (bool),
                                     alertaFiltro, codigoErro, atualizadoEm (ISO), fonte ('sb154'),
                                     erro? ('sem ligação ao A/C'). display e humidade só se o
                                     aparelho anunciar a capacidade (o da SB154 não anuncia).
lojas/sb154/ac/comandos/{pushId}   — escrito pela centro-de-controlo.html com push().set():
                                     tipo (ligar|desligar|tempAlvo|modo|ventilacao|
                                     ventilacaoPreset|eco|turbo|sleep|display), valor, pedidoEm,
                                     origem, estado (pendente|executado|falhou); o serviço
                                     acrescenta executadoEm e erro? folha a folha.
                                     NUNCA apagar; comandos > 10 min ficam 'falhou'/'expirado'.
```

- O cartão: dial SVG deslizante (pointer events, snap a graus inteiros, envia ao largar),
  chip de modo com dropdown, presets de ventilação e "Mais opções", que abre o
  **`giocoModal`** do shell (`gioco-shell.js`: `giocoModal.open({titulo, conteudo, onClose})`,
  `.close()`, `.isOpen()`; CSS `.gioco-modal-*` em `gioco-shell.css`; fecha com Esc, fundo ou ×).
  É o componente de painel sobreposto para todo o OS — não criar modais por página.
- A página considera o serviço "sem resposta" quando `atualizadoEm` tem mais de 2 min:
  dial neutro e botões desativados. Um comando sem resposta em 15 s é reposto no cliente.
- Operar no POS: `ssh POS@100.97.211.74` (Win32-OpenSSH, shell cmd.exe; chave pública do
  portátil do Manel em `administrators_authorized_keys`). Tarefa agendada
  `gioco-ac-bridge` (SYSTEM, ao arranque): reiniciar com
  `schtasks /End /TN gioco-ac-bridge` + `schtasks /Run /TN gioco-ac-bridge`.
  Log em `C:\gioco\ac\ac_bridge.log`.
- **Pendente quando as Rules fecharem:** `".indexOn": ["estado"]` em
  `lojas/$loja/ac/comandos` (hoje o serviço apanha o 400 e filtra localmente) e token do
  serviço na variável de ambiente `FIREBASE_AUTH` da tarefa.

## Restrições críticas (não ignorar)

1. **Repo PÚBLICO** — zero segredos no código (tokens, passwords, app secrets). IBANs já existem, risco assumido.
2. **Firebase Storage não activado** (exige plano Blaze/cartão) — fotos ficam em base64 no RTDB.
3. **mailto: falha no POS** — o computador da loja não tem cliente de email. Não usar mailto para fluxos críticos do staff.
4. **Microsoft 365 write tools indisponíveis** — só leitura. Sem automações cloud que dependam de M365.
5. **Firebase Auth adiado** — não implementar auth sem instrução explícita. O que existe é
   só a **sessão anónima**, obrigatória antes de qualquer leitura/escrita.
   O padrão é **um só, igual nas 13 páginas com Firebase** (retrofit feito em Set/2026):
   `autenticarEContinuar(callback)` com timeout de 8 s, caixa `#authErro` visível e botão
   "Tentar de novo" que volta a tentar sem recarregar.
   - O timeout não é zelo: sem rede o `signInAnonymously` fica **pendurado para sempre e
     nunca rejeita**. Sem ele a página ficava em branco e muda para quem está ao balcão.
   - `authArrancou` impede que um retry bem sucedido depois de um timeout monte a página
     uma segunda vez por cima da primeira.
   - `authCallback` guarda o callback à primeira chamada, para o botão de retry o repetir
     sem obrigar cada página a dar-lhe um nome (todas passam uma função anónima).
   - O markup (`#authErro` + `#authErroDetalhe` + `#authRetryBtn`) fica a seguir ao
     `.page-subtitle`, e o CSS (`#authErro`, `.auth-box`) no `<style>` da página.
   Se este bloco mudar numa página, tem de mudar em todas.

6. **Notificações push adiadas** — sem service worker e sem Web Push. Não implementar sem instrução explícita.
   O que já está feito é o **ícone de ecrã principal (iOS)**: `icons/` com os PNG 120→1024, e o bloco de tags
   (`apple-touch-icon` 180/167/152, `icon` 192/512, `theme-color`, `apple-mobile-web-app-*`) no `<head>` das
   14 páginas activas, logo a seguir ao `<meta charset>`. Ao criar uma página nova, copiar esse bloco e pôr o
   `apple-mobile-web-app-title` curto (é o nome debaixo do ícone no iPhone).
   **Sem `<link rel="manifest">`:** um manifest partilhado faz o iOS usar o `start_url` e o `short_name` dele,
   e todos os atalhos abrem no `index.html` com o mesmo nome. O `manifest.json` na raiz fica para as
   notificações, aí desenhado por página.
   Status bar fica em `black`: não há padding de safe-area, e com `black-translucent` o relógio/bateria
   sobrepunham-se ao header vermelho fixo.

## Padrão de desenvolvimento

- HTML puro num único ficheiro por módulo (CSS + JS inline)
- Firebase SDK via CDN (compat v8)
- Sem frameworks JS (sem React, Vue, etc.)
- Sem build step, sem package.json
- Após editar, fazer `git add`, `git commit`, `git push` directamente

### Definição de página shell completa

A fonte de verdade é o `estilo.html` + `gioco-shell.css`/`.js`. Uma página só está
"migrada" quando cumpre TUDO isto (o `scripts/verifica-shell.sh` verifica a parte
mecânica e é obrigatório antes de qualquer push que toque em páginas):

1. **Fontes.** Antonio 700 SÓ no h1/hero (`.greet-row h1`) e na marca da sidebar.
   Inter em todo o resto — nav, botões, tabelas, labels e NÚMEROS (`.num` =
   Inter + `tabular-nums`). **ZERO Space Mono** (decisão do Manel, 31 Ago/2026):
   nem `font-family`, nem no URL do Google Fonts. Nada de imports de fontes
   antigas. (O parágrafo antigo "Space Mono só se a página tiver números
   monoespaçados" está revogado.)
2. **Tokens.** Só os do shell (`--dough`, `--ink`, `--red`, `--white`…). Nenhum
   hex da família antiga: `#F5F2EC`, `#E2DDD1`, `#E8E2D4` — nem como fallback
   em JS (`tok('--line', '#E2DDD1')` conta como violação).
3. **Estrutura.** `.shell` > `.sidebar glass collapsed` (com `.glass-bend`,
   `.brand` com logo real, `<nav id="giocoNav">` + `giocoNav('pagina.html')`
   síncrono, `.sidebar-foot`) + `.main` > `.greet-row` (pin btn, h1 com `<b>`,
   toggle de tema) e conteúdo dentro de `.page`. **Nada do header vermelho
   antigo `● GIOCO®` nem do botão `🏠 Home`.**
4. **Cartões.** `.card`/`.panel`/`.kpi` sempre com `.glass-light` (ou `.glass`)
   na mesma tag; o hover levanta e ganha a **sombra dura vermelha**
   `4px 4px 0 var(--red)` — vem do shell, nunca duplicada por página.
5. **Sidebar.** Via nav partilhada (`giocoNav`), entrada ativa correta,
   allow-list (ver "Regra da navegação").
6. **Mobile.** Páginas usadas ao telemóvel: viewport `device-width` + opt-in
   `shell-mobile` (body class + `#navOverlay` + `giocoToggleMenu()` no pin).
   As restantes: `width=1200`, sem media queries próprias (só `@media print`).
7. **Tema.** Claro/escuro funcional via toggle do shell; qualquer cor local tem
   par `[data-theme="dark"]` quando o token não resolve sozinho.
8. **Ícones.** Sprite local do `gioco-shell.js` (`<use href="#i-…">`), zero CDN.
   Zero emoji pictográfico (📋💶🏦…) como ícone de UI — exceções: os emblemas
   de categoria dentro de `.cat-chip .circle` (conteúdo, não ícone) e o export
   PNG de turnos da equipa.html (artwork de marca, não UI). Glifos geométricos
   de texto (✓ ✕ ▸ ▾ ★ ⚠) são tolerados como affordance textual.
9. **Auth.** Bloco padrão `autenticarEContinuar` (ver Restrição 5) em todas as
   páginas com Firebase.
10. **Home.** Toda a página pública tem cartão no `index.html`; páginas privadas
    nunca são linkadas de páginas públicas.
11. **Cascata.** O `<style>` local vem depois do `<link>`: nunca criar classe
    local com nome de classe do shell.

Fora do âmbito (lista de exceções do script): `abanca-callback.html`,
`privacidade.html`, `termos.html` (páginas de suporte, design próprio),
`_referencia-fase0.html` (arquivo histórico) e `estilo.html` (montra — nav à
mão de propósito).

### Design system (`gioco-shell.css` / `gioco-shell.js`)

Páginas já migradas: `receitas.html`, `gestao.html`, `pagamentos.html`, `vendas.html`,
`equipa.html`, `mrn-dashboard.html`, `contagens.html`, `compras.html`, `tesouraria.html`, `tarefas.html`, `conta-bancaria.html`, `leitura-faturas.html`, `caixa.html`, `loja-sao-bento.html`, `foodcost.html` (nova, já no shell). Por migrar: `index.html` (e as de suporte:
`abanca-callback`, `privacidade`, `termos`).

Ao migrar uma página, no `<head>` a seguir ao bloco de ícones: as fontes
(`Antonio` + `Inter` — nunca Space Mono, ver checklist acima) e
`<link rel="stylesheet" href="gioco-shell.css">`. A seguir a
`<body>`, `<script src="gioco-shell.js"></script>` — antes de qualquer markup
com `<use href="#i-...">`, para o sprite já estar no DOM.

**Gráficos.** Qualquer página que precise de barras, colunas, linha ou donut
carrega `gioco-charts.css`/`.js` e usa `GiocoChart.*`. Nunca reimplementar por
página; correcções vão sempre para o `gioco-charts`, igual à regra do shell.

Funções disponíveis: `barra()` (linha de barra horizontal HTML/CSS, para
listas), `barrasHorizontais()` (conjunto horizontal com eixo e régua),
`barrasVerticais()` (colunas em SVG), `linha()` (linha suavizada, com
`opts.series` para multi-série), `donut()` e `cores()` (tokens do tema
activo). Ver o comentário de cabeçalho de `gioco-charts.js` para as opts de
cada uma.

`linha()` e `barrasVerticais()` não devolvem SVG directamente — devolvem um
`<div class="chart-host">` vazio, desenhado só depois de `GiocoChart.montar()`
medir a largura real do host (viewBox = essa largura, escala sempre 1:1,
nunca um viewBox fixo esticado por CSS). Chamar `GiocoChart.montar()` depois
de qualquer `innerHTML` que possa ter criado `.chart-host` novos — no
vendas.html isso é no fim de `renderVistas()` e ao expandir uma secção. Têm
também tooltip com realce ao passar o rato/tocar (snap à coluna/ponto mais
próximo).

O estilo é o padrão do OS para qualquer gráfico novo: gridlines ténues
(nunca eixos grossos), escala sempre em valores redondos — nunca presa ao
máximo exacto dos dados —, uma cor neutra para o que não é destaque e uma
única cor de destaque (nunca uma cor por barra, excepto no donut, que usa
as fatias `--fatia-*`).

**Tokens.** Nunca redeclarar num `<style>` de página o que o shell já dá. A
semântica é o que interessa, não o nome:

| Token | Papel |
|---|---|
| `--dough` | fundo da página |
| `--ink` | texto principal **e** superfície que inverte com o tema (`.cat-chip.active`) |
| `--white` | **superfície**, não branco: no tema escuro resolve para `#1f1c17` |
| `--red` | superfície vermelha e **títulos** — igual nos dois temas, decisão do Manel |
| `--red-ink` | vermelho **em texto** secundário: clareia no escuro (o `--red` dá lá 3,35:1) |
| `--on-red` | texto **por cima** de vermelho: branco fixo. Nunca `--white` aqui |
| `--lime` `--mustard` `--blush` `--navy` | superfícies de selo (continuam claras no escuro) |
| `--green` `--amber` (+ `-bg`) | cores de **estado** em texto e rebordo |
| `--muted` `--line` | texto secundário e riscas |

Sobre um selo cuja superfície não inverte, o texto é um literal fixo
(`#141414` / `#FFFFFF`) com par `[data-theme="dark"]` quando o fundo clareia —
é o que o shell já faz em `.status.ok/.warn/.high`.

**Armadilhas conhecidas** (todas já custaram uma sessão):

- `<button>` sem `color` explícita herda o preto do browser, não o `--ink`:
  ilegível no tema escuro. Aconteceu no `.cat-chip` (receitas) e no
  `.notif-item` (dashboard).
- O `.card` do shell **não tem fundo**: dá só raio e folga. O vidro vem de
  `.glass-light` (ou `.glass`), que tem de estar na mesma tag.
- O `::before` do `.glass-light` pinta por cima do conteúdo estático. Empurrar
  o conteúdo com `.card > *{ position:relative; z-index:1 }`.
- O shell dá `table{width:100%}`, `th{}` e `td{}` a elementos nus. Uma tabela
  estreita da página precisa de `width:auto` explícito.
- As regras `:nth-child` da sidebar param na **8ª** entrada (alargadas quando as
  Contagens entraram no menu): uma nav com mais perde a animação escalonada nas
  seguintes.
- O `<style>` da página vem **depois** do `<link>`: em empate de
  especificidade, o local ganha. Uma classe local com o nome de uma do shell
  (`.card`, `.num`) anula-a em silêncio. **Já acontece na `compras.html`**, que
  tem um `.card` próprio (o cartão de fornecedor: `display:flex`,
  `flex-direction:column`, `cursor:pointer`, `height:100%`). Secções novas
  dessa página usam `.panel glass-light`, não `.card` — senão herdam a coluna
  e o cursor de mão sem se perceber porquê.
- O `body` não inverte a **sua própria** `color`/`background` no tema escuro:
  os tokens mudam (o `--ink` do `body` fica claro) mas o `color` computado do
  `body` fica no valor claro. Os descendentes com `color:var(--ink)` explícita
  ficam bem; quem só **herda** fica a preto sobre fundo escuro. Numa tabela ou
  bloco de texto novo, declarar `color:var(--ink)` em vez de contar com a
  herança.

**Regra da navegação.** A lista de links da sidebar vive no `gioco-shell.js`
(`GIOCO_NAV_CONJUNTOS`), numa única definição. Cada página só declara a entrada
activa:

```html
<nav id="giocoNav"></nav>
<script>giocoNav('receitas.html');</script>
```

O `giocoNav(ativo, conjunto)` corre **síncrono**, num `<script>` logo a seguir
ao `<nav>`. Tem de ser assim: a `contagens.html` e a `equipa.html` têm JS
próprio que percorre `#sidebarEl .nav-row` antes do `DOMContentLoaded` (o menu
ao toque), e com a nav a aparecer mais tarde esse JS não encontrava linha
nenhuma. Não passar isto para `DOMContentLoaded`.

Há dois conjuntos, e é **allow-list, nunca deny-list**: o conjunto por omissão
é `publica` (8 entradas: Dashboard, Receitas, Compras, Pagamentos, Vendas,
Contagens, Equipa, Definições). O `mrn-dashboard.html` é privado e pede
`giocoNav('index.html', 'privada')` — lista própria (Home, Tesouraria, Tarefas,
Conta bancária) que **nunca se lista a si própria**. Nenhum conjunto contém
`mrn-dashboard.html`: numa deny-list, esquecer a flag numa página nova expunha
o link.

A primeira entrada do conjunto privado chama-se "Home" e não "Dashboard" de
propósito — nas páginas públicas há um `Dashboard → index.html` que convida a
ser "corrigido" para `mrn-dashboard.html`, e era assim que o link privado saía.

O `estilo.html` mantém a nav escrita à mão de propósito: são `<div>` sem href,
uma montra do componente `.nav-row`, não navegação a sério.

Depois de mexer em navegação, correr:

```
grep -rn 'href=[^>]*mrn-dashboard' --include=*.html .
```

Só `tesouraria.html` e `conta-bancaria.html` podem aparecer (os back-links
`← Dashboard`). Mais alguma coisa é fuga do link privado.

## Equipa (referência)
- **Manel** — Fundador
- **Alfredo Giangaspero** — Head of Operations (usa a loja e a caixa)
- **Mattia Pivetta** — Head of Product
- **Leonor Borges** — Head of Brand
