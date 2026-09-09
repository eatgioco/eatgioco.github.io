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
  `caixa.html` (desde Set/2026: fotografar o talão no Devolver Troco),
  `loja-sao-bento.html` (desde 1 Set/2026: no computador da loja, que tem rato,
  nada muda — o critério é o hover) e `centro-de-controlo.html` (desde Set/2026:
  câmaras, controlo do A/C e música a partir do telemóvel).
  **Classe `shell-touch`.** O `gioco-shell.js` (`initShellTouch`) põe
  `body.shell-touch` quando o body tem `shell-mobile` E `matchMedia('(hover: none)')`
  casa; caso contrário tira-a. Corre no arranque do shell e volta a correr no
  `change` do matchMedia (iPad com rato ligado/desligado). É opt-in como o resto
  (sem `shell-mobile` não faz nada) e o critério é o hover, nunca a largura. Serve
  para uma página **reorganizar o layout** (grelha em coluna única, `order` de
  cartões, alvos de toque maiores) com regras `body.shell-touch …` no seu
  `<style>`, sem escrever `@media` próprios — que continuam a viver só no shell.
  Com rato a classe não existe e o layout desktop fica intacto.

## Ficheiros do repositório

| Ficheiro | Módulo | Audiência |
|---|---|---|
| `index.html` | Home / menu do OS | Equipa |
| `compras.html` | Base de dados de fornecedores + encomendas + ingredientes (abas "Por fornecedor" / "Por ingrediente" / "Encomenda sugerida") | Equipa |
| `pagamentos.html` | Ciclo de pedidos de pagamento (numeração N/MM/AA, anulação) | Equipa |
| `caixa.html` | Movimentos de dinheiro físico. Layout (Set/2026): resumo no topo ("Saldo hoje" e "Por acertar" — o Manel usa estes textos como indicador, não mudar) → **ferramenta de caixa** em duas colunas (registo à esquerda; "Por devolver troco" à direita, com TODOS os movimentos `aberto` sem filtro de data, ordem cronológica, e o único sítio onde vive o botão "↩ Devolver Troco") → **listagem completa** a toda a largura (filtros Hoje/7 dias/Mês/Tudo + motivos, mais "Sem fatura (declarado)" e "Troco não conferiu"; os `aberto` aparecem com badge "Por acertar" mas sem botão). Em saídas Compra / Pagamento a fornecedor o registo pergunta "Vai haver troco?" (obrigatório): Não → fechado logo (`temTroco:false`, `estado:'acertado'`, `valorDevolvido:0`); Sim → `aberto` até ao Devolver Troco, que exige fatura carregada (lida via `gioco-faturas.js`, foto arquivada em `caixaFaturasArquivo/{id}`) OU a declaração "Declaro que não tenho fatura deste movimento", e depois o valor devolvido (pré-preenchido com `valor − fatura.montante`; diferença > 0,05 € só avisa). Depósito bancário e Outro fecham na criação (`semAcerto`), sem pergunta. Usada ao telemóvel para fotografar o talão: viewport `device-width` + opt-in `shell-mobile`. Entrada **Devolução de depósito bancário** (detalhe livre opcional): nasce por alocar (`depositoOrigemId:null`, `alocadoEm:null`) — a caixa não pergunta nem mostra a que levantamento pertence, e nunca expõe estado bancário (`depositado`/`depositadoEm`/`movimentoContaRef`); alocar é só no `mrn-dashboard.html`. Nas saídas de Depósito bancário com `devolvidoDeposito > 0` mostra "Devolvido à caixa X · Depositado Y"; a linha de troco ("Devolvido … · Gasto real") é só de Compra/Pagamento. Escreve só `push()` em `caixaMovimentos` e `update()` por caminho em `caixaMovimentos/{id}` — nunca remove. **Secção Cofre** (Set/2026, ver nó `cofreMovimentos`): saída "Transferência para o cofre" (semAcerto) grava a saída na caixa como qualquer outra e, a seguir, a entrada par em `cofreMovimentos` com o mesmo `transferenciaId`; se o segundo push falhar, alerta explícito sem tentar desfazer nada. Secção própria com saldo do cofre em destaque (CUMULATIVO, nunca só do dia), lista dos movimentos dos últimos 30 dias e formulário in-page "Retirar do cofre" (Depósito bancário | Devolver à caixa — cria o par com entrada em `caixaMovimentos` | Outro); valor limitado ao saldo do cofre. A caixa.html NUNCA lê nem mostra `depositado`/`depositadoEm`/`movimentoContaRef`, nem para `caixaMovimentos` nem para `cofreMovimentos` — esse estado é exclusivo do `mrn-dashboard.html`. **Saldos vivos + Contar caixa** (Set/2026): dois cards no topo, antes do resumo "Saldo hoje" — **Caixa** mostra `saldoVivoCaixa()` (ver nó `caixaContagens`), ancorado na última contagem física confirmada e por isso nunca reseta à meia-noite (ao contrário do "Saldo hoje"), com "Última contagem: dd/mm HH:mm · pessoa" por baixo; sem contagem nenhuma mostra "Sem contagem registada" e o botão fica "Fazer primeira contagem" em destaque. **Cofre** é leitura defensiva de `cofreMovimentos` (o nó pode ainda não existir neste Firebase — só leitura, nunca escreve): `val() === null` na primeira leitura é estado válido, não erro, e mostra "A aguardar módulo do cofre" em vez de 0,00 €. O botão "Contar caixa" abre um painel inline (mesmo padrão do Devolver Troco) com a grelha de denominações (notas depois moedas, chip SVG cor+valor — nunca reprodução realista de numerário), input de quantidade por linha, subtotal e total ao vivo; diferença = total − saldoVivoCaixa() SEM tolerância nenhuma (mesmo 0,01 €), a verde só se for exactamente 0. Diferença ≠ 0 exige um "Porquê?" de texto livre (sem dropdown) antes de "Guardar contagem" destrancar; diferença 0 grava logo. Escreve só `push()` em `caixaContagens` — nunca update()/remove() depois de criado | Equipa |
| `loja-sao-bento.html` | Planta, checklists abertura/fecho, temperaturas HACCP, pedidos da loja | Equipa |
| `centro-de-controlo.html` | Painel da loja (`?loja=sb154`): câmaras go2rtc, A/C, cartão **Música** (Sonos via `lojas/sb154/sonos`, no padrão do A/C desde Set/2026 —
essencial no cartão, resto no `giocoModal`; ver secção "Loja SB154 — música"), e o cartão **Consumo** ligado a `contasBancarias/{abanca,revolut}/movimentos` — € mensal/anual dos débitos de eletricidade (despesa de `classificacaoMovimentos`/`classificacaoRegras` a casar `/eletric|edp|ibelectra/i`, fallback `IBELECTRA`, mesma normalização da `resultados.html`; só leitura). kWh pendente de um futuro nó `consumoEnergia/{AAAA-MM}`. Cartão **Vendas hoje** ligado a `vendasDiario/{AAAA-MM}/{AAAA-MM-DD}/resumo` (lê só os nós dos dias precisos, `bruto` c/ IVA): mostra hoje se o nó existir (selo "Hoje"), senão o mesmo dia da semana a −7/−14/−21/−28 dias, o primeiro que exista (selo "Ref. …", neutro); sem nenhum, placeholder. Comparação = a N.ª ocorrência do mesmo dia da semana no mês anterior (N = posição do dia no seu mês; sem N.ª, a última), chave AAAA-MM derivada de cada data — só a variação % na linha, valor absoluto no title. Resumo do mês (Faturação/Ticket/Média por dia) de `vendas/{AAAA-MM}/resumo` do mês corrente, senão o anterior rotulado "(fechado)". Usa o mesmo `.cc-valor` do cartão Consumo. Por baixo de Média/dia, o acumulado do dia médio até à hora atual (`vendas/{AAAA-MM}/porHora` do mesmo mês; `giocoAcumuladoHoras`, cópia tal e qual da função pura do `vendas.html` — alterar as duas juntas; aproximação linear dentro da hora; refresca a cada 60 s da memória). Restantes cartões em placeholder. **Telemóvel** (Set/2026): viewport `device-width` + opt-in `shell-mobile`; com `body.shell-touch` (sem hover) a `.cc-grid` passa a coluna única, `.cc-col`/`.cc-fila` a `display:contents`, e os cartões ordenam-se por `order`: 1 Câmara `#cam` · 2 A/C `#acCard` · 3 Música `#musicaCard` · 4 Vendas hoje `.vh-card` · 5 Consumo `#consumoCard` · 6 HACCP `#haccpCard` · 7 Equipa `#equipaCard` · 8 Entradas `#entradasCard` · 9 Mensagens `#chatCard`. Critério: ligados a dados primeiro, placeholders "Em breve" no fim — ao ligar um cartão novo, subir a sua `order`. Com rato nada disto aplica | Equipa |
| `contagens.html` | Contagens físicas de stock por data, com navegação ao teclado e conversão de unidades | Equipa |
| `equipa.html` | Quatro separadores: Escala (turnos), Pessoas (registo de colaboradores; criar uma pessoa gera os compromissos de tesouraria dela), Recibos (importação de recibos de vencimento em PDF com pdf.js, conferência com 5 validações e histórico de custo por mês) e **Admissões** (Set/2026, ver nós `admissoes` e `admissoesTemplate`): checklist de entrada de uma pessoa nova, de antes do primeiro dia ao fim do primeiro mês. Cada visto, link ou nota é gravado NO MOMENTO numa folha própria — nunca acumulado em memória como nas checklists da loja, porque uma admissão dura semanas e é retomada em várias sessões. Os itens são copiados do template na criação, e editar o template não mexe nas admissões já abertas. Toda a criação passa por `window.criarAdmissao(pessoaId, pessoaNome, dataInicio, origem, candidaturaId)` — ponto único, preparado para um futuro funil de candidaturas (`origem:'candidatura'`). Item em atraso a vermelho só quando NÃO está feito (`--red-ink` no texto, `--red` na barra); links de ficheiro validados com `new URL()` + https: obrigatório; anular é uma flag, nunca `remove()` | Equipa |
| `receitas.html` | Fichas técnicas: preparações e artigos, com custo calculado ao vivo e food cost | Equipa |
| `foodcost.html` | Duas secções independentes: (1) **mapa de produtos ZoneSoft → fichas técnicas**, sempre visível, alimentado pelos produtos distintos de `vendasDiario` nas últimas 4 semanas completas — a MESMA janela do painel "Encomenda sugerida" da `compras.html`, de que o mapa é pré-requisito — com sugestão automática, escolha manual, "Ignorar" e progresso "X de Y produtos tratados"; (2) **variância** de food cost: consumo teórico (vendas × ficha técnica) vs. real (contagem inicial + compras − contagem final), por período entre duas contagens fechadas. Só (2) depende das contagens: o estado vazio "ainda não há um período para comparar" está confinado a ela, e (1) continua utilizável com zero ou uma contagem | Equipa |
| `resultados.html` | P&L mensal **em ótica de caixa, valores com IVA** (decisão de 02/09/2026): receita = `vendas/{mes}/resumo.bruto` (o líquido fica informativo no drill-down); custos nos valores brutos das fontes, sem estimar nem deduzir IVA; entregas de IVA/impostos aparecem como saídas bancárias na reconciliação quando ocorrem. Rubricas: CMV (paymentRequests concluídos + saídas bancárias de fornecedores), Pessoal (linha única: recibos + TSU patronal via gioco-compromissos.js + sem recibo como estimativa), Fixos (sem pessoal/TSU). Reconciliação bancária movimento a movimento com "Não classificado" sempre visível. Exclusões reversíveis de linhas via `plAjustes/` (ver nós). Classificação de movimentos em DUAS dimensões: a rubrica do P&L e a despesa concreta ("Meta Ads", "EDP"), ambas aprendidas pelas mesmas regras; a despesa é metadado e nunca mexe em valores | Equipa |
| `padroes.html` | Vendas × contexto externo, **só leitura** (fase b, Set/2026). Calendário do mês com o desvio de cada dia face ao **esperado** = mediana do `bruto` de D-7/D-14/D-21/D-28 em `vendas/{mes}/porDia` (mín. 2 valores; lê também o mês anterior); "Esperado vs. real" (linha 2 séries + colunas com |desvio|, negativos a vermelho porque `barrasVerticais` não desenha negativos); cruzamento por fator sobre todo o histórico (chuva, chuva no horário, tMax, feriado, ponte, férias; dia da semana em média de bruto, não desvio) com regra n ≥ 8; detalhe do dia de `vendasDiario/{mes}/{dia}` (só o nó do dia, cache de sessão) + `contextoDiario/{dia}`. Contexto lido por intervalo `orderByKey().startAt/endAt` por mês. Nunca escreve | Equipa |
| `contabilidade.html` | Placeholder | — |
| `gestao.html` | Folha de cálculo de **ingredientes** e **produtos** (edição em massa, inline, grava ao sair da célula). Dois separadores: Ingredientes (uma linha por `ingredientes/`; contagem herdada da compra quando não existe `contagem/`) e Produtos (uma linha por `receitas/`, com custo/food cost via `gioco-custos.js`, artigo POS de `vendas/catalogo` e vendas do mês de `vendas/{mes}/produtos`). Escreve SEMPRE um `set()`/`remove()` por path de campo: `ingredientes/{id}/{campo}`, `ingredientes/{id}/compra/{unidade|fator}`, `ingredientes/{id}/contagem/{unidade|fator}` (FOLHA A FOLHA desde Set/2026 — nunca um `set()` no nó `contagem` inteiro, para gravar metade não apagar a outra metade; a única escrita no nó todo é o `remove()` do botão "herdar"), `receitas/{id}/{categoria|pvp}`, `vendas/catalogo/{chave}/{receitaId|categoria}`. Nunca escreve em `vendas/{mes}/produtos` nem `vendasDiario/`. **Preenchimento de unidades e contagem** (Set/2026, para a contagem física de 1 Out): barra de contadores-filtro no topo da aba Ingredientes (activos · sem unidade · sem contagem · sem formato de compra · sem preço) — clicar filtra a grelha, clicar outra vez limpa, e os números refazem-se a cada gravação; contam SEMPRE sobre `arquivado !== true`, mesmo com "Mostrar arquivados" ligado. "Sem contagem" é medido no nó PRÓPRIO (`ingredientes/{id}/contagem` com unidade e fator numérico), não no efectivo — é o critério do `configPronta()` da contagens.html, que ignora a herança do formato de compra que esta folha mostra em itálico. Selecção por caixa dentro da célula fixa do nome (shift-click estende pela ordem da grelha) + barra de edição em massa: aplica unidade base / unidade de contagem / fator de contagem a todas as linhas seleccionadas num só plano de escrita, com uma confirmação e um "Anular" que desfaz o lote inteiro. Conversão ao vivo ("1 caixa = 0,25 kg") ao lado do fator e por baixo do editor enquanto se escreve — é o que apanha o 4 escrito onde devia estar 0,25. Sugestão de fator lida da gramagem no nome ou num alias ("Farinha 00 25 kg" → 25; "Água 33 cl" com base L → 0,33), só quando a família da medida bate com a unidade base; aparece como chip com um botão "usar" e NUNCA é gravada sozinha. **Validações avisam, não bloqueiam** (`avisosContagem()`): meio preenchido grava na mesma e fica com ⚠ na célula (a contagens.html trata um nó incompleto como "por definir"); avisa-se unidade sem fator, fator sem unidade, contagem sem unidade base, unidade de contagem igual à base com fator ≠ 1, e fator > 100 ou < 0,001. As duas excepções que continuam a bloquear são valor negativo e `compra.fator` = 0 (é divisor do custo). Deep-links: `compras.html?ingrediente=ID` e `receitas.html?receita=ID`. Coluna Foto lê o manifesto `img/ingredientes/index.json` (array de slugs) — sem manifesto mostra "—" | Equipa |
| `gioco-custos.js` | Motor partilhado de custo/food cost (`GiocoCustos`): `custoIngrediente` (precoUltimaCompra ÷ compra.fator), `custoPreparacao`, `custoReceita` (→ custo, avisos[], foodCost %), `foodCost`, `converterFator`. Extraído do receitas.html em Set/2026 sem alterar um cêntimo; receitas.html e gestao.html usam-no — nunca reimplementar por página | — |
| `gioco-caixa.js` | Motor partilhado do **dinheiro físico** (`GiocoCaixa`), funções puras sobre os nós em memória, SÓ leitura: `ultimaContagem(contagens)`, `saldoVivoCaixa(contagens, movs)` (null sem contagem — nunca 0) e `saldoCofre(cofreMovs)` (cumulativo). Extraído da `caixa.html` em Set/2026 sem alterar um cêntimo; usado pela `caixa.html` (cards Caixa/Cofre) e pelo `mrn-dashboard.html` (cartão Posição Financeira). Nunca reimplementar por página | — |
| `gioco-consumo.js` | Motor partilhado: explosão da ficha técnica (produto → receita → preparações recursivas → ingredientes, com as preparações de custo fixo só em euros) e consumo teórico a partir de `vendasDiario`. Factory `giocoConsumoEngine({getReceitas, getPreparacoes, getVendasDiario, getMapa})`, no molde do `gioco-compromissos.js`. Usado pelo `foodcost.html` (variância) e pela aba "Encomenda sugerida" da `compras.html` (procura e consumo desde a contagem) | — |
| `gioco-faturas.js` | Módulo partilhado de **leitura e arquivo de faturas** (`GiocoFaturas`), SÓ leitura — não escreve em lado nenhum. Extraído da `leitura-faturas.html` em Set/2026 sem alterar comportamento: constantes do Azure Document Intelligence (endpoint, chave F0 — risco aceite, ver comentário —, versão, modelo), `ler(file)` → `{fornecedorTexto, montante, referencia, data, prazoPagamento, linhas}`, `analyzeInvoice`, `fieldText/fieldDateIso/fieldAmount/extrairLinhas`, `fileToBase64/fileToDataUrl/compressImageDataUrl`, `prepararArquivoFatura(file)` (imagem comprimida a 1600 px JPEG 0.8, PDF tal e qual) e `abrirArquivoFatura(dataUrl)`, `normalizeNome` e `findMatchingSupplier(vendorName, allSuppliers)`. Cada página decide onde grava: `leitura-faturas.html` → `faturasProcessadas`/`faturasArquivo`; `caixa.html` → dentro do movimento. Nunca reimplementar por página | — |
| `gioco-pagamentos.js` | Motor partilhado dos **itens planos de pagamentos** (`giocoPagamentosEngine({getPaymentRequests, getPagamentosConcluidos, compromissos: CE, parseMontante, formatDateDDMMYYYY, ordenaPorPrazo, reconciliacao?: RE})`, no molde do `gioco-reconciliacao.js`), SÓ leitura. Extraído verbatim da `tesouraria.html` em Set/2026: `ddmmyyyyToDate`, `lineStatus`, `periodoCompromisso` (`AAAA-M` SEM zero — o período de `pagamentosConcluidos`), `compromissoPago`, `linhasPaymentRequestsTodas` (exclui pedidos anulados; linhas sem prazo ficam com `prazoDate:null`, quem consome decide), `linhasCompromissosDoMes`, `itensDoMes`, `chaveLinha`, `chaveReconciliacao`. Forma dos itens documentada no cabeçalho. Usado pela `tesouraria.html` e pela `calendario.html`; nunca reimplementar por página | — |
| `gioco-eventos.js` / `gioco-eventos.css` | Motor partilhado dos **eventos** da agenda (`giocoEventosEngine({eventosRef, giocoModal})`, no molde dos outros motores). Extraído da `calendario.html` em Set/2026 sem alterar comportamento: `CATEGORIAS`/`categoria`, `normalizar(id, bruto)` (preserva `origem` e `ligacao`), `construirFormulario`, `abrirNovo(pre, {extra, onGravado, onFechado})`, `abrirEditar(id, bruto, {antes, onAnulado, onFechado})`, `criar(v, extra)` → Promise<id>, `editar`, `anular`, helpers `isoValida/horaValida/minutos/deMinutos/pad2/el`. As ÚNICAS escritas em `eventos/` vivem aqui (regras no cabeçalho e no nó abaixo); a flag anti-duplo-clique também. O CSS do formulário tem prefixo `.ev-` (`gioco-eventos.css`, carregado depois do shell) para não colidir com `.field`/`.modal-actions` locais das páginas. Usado pela `calendario.html` e pelo `mrn-dashboard.html` (botão Agendar); nunca reimplementar por página | — |
| `gioco-outlook.js` | Camada de LEITURA do calendário do Outlook via Microsoft Graph (`GiocoOutlook`, IIFE global, Set/2026). SEM Firebase e SEM escritas: `Calendars.Read` só, `GET /me/calendarView` só, e um evento do Outlook **NUNCA** é gravado em `eventos/` nem copiado para nenhum nó — vive só em memória, por intervalo visível, e desaparece com o separador. API: `init()` (idempotente; trata o `handleRedirectPromise` do fallback), `disponivel()` (o SDK carregou?), `estaLigado()`, `conta()` → `{email, nome}`, `ligar()` (`loginPopup`; só com o popup BLOQUEADO — `popup_window_error`/`empty_window_error` — cai para `loginRedirect`; um cancelamento do utilizador rejeita, nunca redirecciona), `desligar()` (LOCAL: `logoutRedirect` com `onRedirectNavigate:()=>false`, que limpa a cache do MSAL sem mandar o Manel à página de logout da Microsoft — que o tirava também do Outlook/Teams no mesmo browser; varredura das chaves do clientId como rede de segurança), `carregarEventos(ini, fim)` (`acquireTokenSilent` → popup só se falhar; header `Prefer: outlook.timezone="Europe/Lisbon"`, `$top=250`, `$orderby=start/dateTime`, paginação `@odata.nextLink` com tecto de 20 páginas, `isCancelled` fora). Devolve itens na MESMA lista normalizada da `calendario.html` com `origem:'outlook'` e `editavel:false`. Um evento que atravessa dias dá VÁRIOS itens (um por dia, tecto de 60): `isAllDay` tem o `end` EXCLUSIVO no Graph, e um evento com horas a atravessar dias fica início–23:59 / dias do meio como dia inteiro / 00:00–fim. As horas são lidas dos dígitos da string do Graph (que já vem no fuso pedido) — parsear com `new Date()` metia um desvio de fuso que não existe; o ramo `timeZone:'UTC'` é defensivo e assume o browser no fuso da loja. Config MSAL com `cacheLocation:'localStorage'` (a sessão tem de sobreviver a fechar o separador) e `redirectUri = origin + pathname` (sem query nem hash — o deep-link `?dia=` não pode entrar aí, senão dá `redirect_uri_mismatch`). **iOS / Safari** (Set/2026, depois de o login falhar no iPhone): `storeAuthStateInCookie:true` — OBRIGATÓRIO, porque com o ITP o `state` do fluxo de redirect guardado só em localStorage perde-se entre a ida à Microsoft e a volta; `navigateToLoginRequestUrl:false` — o `redirectUri` já é esta página, e o salto extra de regresso ao URL original é mais uma hipótese de perder estado. **`pronto()` é o portão**: `estaLigado()`, `conta()`, `token()`/`carregarEventos()` e `ligar()` esperam TODOS pelo `handleRedirectPromise` antes de tocarem no MSAL — sem isso, no regresso do redirect o `getAllAccounts()` responde vazio enquanto o hash ainda está a ser processado, a UI volta a pedir login por cima de um login bem sucedido e entra-se em ciclo (a armadilha clássica do fluxo de redirect). Para o render, que corre muitas vezes e não pode bloquear, há o `estado()` SÍNCRONO: `webview | indisponivel | a-verificar | ligado | desligado` — enquanto for `a-verificar` NINGUÉM pode concluir que não há sessão. `detetarAmbiente(ua, plataforma, toques)` é PURA e exportada: `webview` (apps embutidas FBAN/FBAV/Instagram/WhatsApp…, ou iOS sem "Safari" no UA — os browsers de terceiros do iPhone, CriOS/FxiOS/EdgiOS, TÊM "Safari" e são browsers a sério) e `ios` (inclui o iPad, que mente no UA e se apanha por `maxTouchPoints`). **Numa webview nem se constrói o MSAL** — a Microsoft bloqueia o login lá de propósito, e a página diz "Abre no Safari" em vez de deixar falhar. **Em iOS salta-se o `loginPopup` e vai-se directo a `loginRedirect`**; o popup só se tenta fora do iOS, com um **timeout nosso de 60 s** (o `loginPopup` do MSAL não tem nenhum, e um popup bloqueado no Safari deixava a promessa pendente para sempre, com o botão eternamente em "A ligar…"). O `POPUP_FALHOU` do ramo do popup inclui `user_cancelled` e `interaction_in_progress`, porque no Safari de secretária um popup bloqueado chega disfarçado de cancelamento; o cuidado de não disparar redirects não pedidos mantem-se por duas vias — só se cai para redirect DENTRO do clique em "Ligar Outlook", e no máximo uma vez por carregamento (`redirectTentado`). `diagnostico()` devolve o último erro INTEIRO (errorCode, errorMessage, subError, correlationId, stack) mais redirectUri, estado, ambiente, versão do MSAL e UA — é o que alimenta o painel da página. Testes: `scripts/testa-outlook-ambiente.js`. **Videochamada** (Set/2026): `$select` completo (`…,locations,isOnlineMeeting,onlineMeeting,onlineMeetingProvider,bodyPreview`; `onlineMeetingUrl` está DEPRECADO — nunca pedir) com rede de segurança: um **400 na primeira página** repete UMA vez com o `SELECT_MINIMO` e um `console.warn`, para um campo recusado por um tenant não deitar a camada inteira abaixo — perde-se a detecção, o calendário continua a aparecer. `detetarLinkReuniao(ev)` (PURA, exportada para teste) devolve `{url, servico}` ou null, por prioridade de campo: `onlineMeeting.joinUrl` → `location.displayName` → `locations[]` → `bodyPreview`. Reconhece Google Meet, Teams, Zoom, Whereby, Jitsi e Webex **por sufixo exacto de domínio** (`host === d || host termina em '.'+d`) — NUNCA `includes()`, senão `zoom.us.phishing.com` passava por Zoom. Só `https:`, e todo o URL passa por `new URL()` dentro de try/catch antes de chegar ao DOM. Um campo de LOCAL que seja **apenas** um URL é aceite como `servico:'Videochamada'` mesmo com host desconhecido; essa regra não se aplica ao `bodyPreview` (cheio de links alheios), onde só contam serviços conhecidos. Um evento `isCancelled` nunca dá link. O resultado vai para `extra.reuniao`, calculado UMA vez por evento em `expandirDias()` e partilhado por referência pelos itens-dia — um evento de três dias tem uma reunião, não três. Testes: `scripts/testa-outlook-reuniao.js` (Node, ou no browser com um shim de `require`/`assert`, como o `testa-correspondencia.js`). Usado só pela `calendario.html`; nunca reimplementar por página | — |
| `gioco-correspondencia.js` | Motor partilhado de **correspondência valor ↔ movimentos** (`giocoCorrespondencia({cents, dia, janela, movimentos, toleranciaCents, descritivosConhecidos, regexFallback, aprendido, estrategias})` → `{estado: confirmado|sugestao|ambiguo|semCandidato, movimentos, estrategia, confianca, candidatos}`), função PURA sem Firebase nem DOM (Set/2026). Pipeline que pára na primeira estratégia com resultado: `exacto` (mesmos cêntimos ± tolerância) → `soma2` (PAR de movimentos do mesmo dia de banco e da mesma conta cuja soma bate exactamente; tecto fixo em 2, nunca 3+) → `descritivo` (só com `cents:null` ou quando as anteriores deram zero: raiz normalizada em `descritivosConhecidos` → confirmado se `aprendido`, senão sugestao; `regexFallback` → sugestao; 2+ → ambiguo). `candidatos` é uma lista de GRUPOS (1 ou 2 movimentos), sempre ordenados por dia e depois id. É aqui que vive a ÚNICA `normalizarDescritivo` do OS (o `gioco-reconciliacao.js` só a re-exporta). Recebe movimentos JÁ filtrados pelo chamador (livres, sem INTERNA, sem excluídos) — disputas entre itens, escritas e UI ficam fora. Usado pelo `gioco-reconciliacao.js` (pagamentos em modo único `['exacto','soma2']`; receitas CD só `['exacto']`; débitos fixos `['exacto','soma2']`; débitos variáveis `['descritivo']`) e pelo `mrn-dashboard.html` (depósitos, `['exacto']`). Testes: `scripts/testa-correspondencia.js` (Node, ou no browser com um shim de `require`/`assert`). Carregar SEMPRE antes do `gioco-reconciliacao.js` (lança erro se faltar). Nunca reimplementar por página | — |
| `gioco-reconciliacao.js` | Motor partilhado de **reconciliação bancária** (`giocoReconciliacaoEngine({getPaymentRequests, getPagamentosConcluidos, getMovimentos, getReconciliacao, compromissos: CE, ref})`, no molde do `gioco-compromissos.js`). `pagamentosConcluidos()` achata linhas pagas + ocorrências de compromissos; `calcular()` → `{itens, porEstado, contadores, autoNovas}`; `pesquisaManual(item)` (±30 dias, 90–110 % do valor); `ligar(chave, mov, 'auto'|'manual')`, `aplicarAutomaticas(res)` e `desligar(chave)` — as únicas escritas, sempre `update()` no caminho `reconciliacaoBancaria/{chave}` (desligar marca `ligado:false` + `excluidos/`, nunca `remove()`). Generalizado em 05/09/2026: `movimentos(indicador, filtroRegex, excluirRegex)` (`movimentosDebito()` = DBIT sem INTERNA, `movimentosCredito()`), núcleo `reconciliar(itens, movs, hoje)` com janela/tolerâncias/modo (`unico`|`soma`)/filtro por item, estado `aproximado`, e `calcularReceitas()` sobre `getVendasDiario` (regras A/B no nó). Para receitas `ligar(chave, mov|[movs], metodo, item, estado)`. `calcular()` dos pagamentos ficou com resultado idêntico (testado antes/depois com os dados reais). Regra de match e estados documentados no cabeçalho do ficheiro e no nó abaixo. **Set/2026 (motor de correspondência):** `candidatosDe` foi substituída por `correspondenciaDe`, que chama o `gioco-correspondencia.js` — pagamentos com `['exacto','soma2']`, receitas CD só `['exacto']`; a passagem soma-de-N das receitas OU e a regra aproximada A2 ficaram FORA do motor, tal e qual. Cada item traz `it.correspondencia` (resultado do motor), `it.candidatosGrupos` (grupos: 1 ou 2 movs) e `it.candidatos` (lista plana, como antes). A camada de disputas (`reclamacoes`/`reservados`) continua por cima e conta também as metades de um par soma2. `candidatosDebitoFixo` → motor `['exacto','soma2']` (resolve a Mensalidade Abanca 10,00 + 0,40 sem código próprio); `candidatosDebitoVariavel` → motor `['descritivo']` com `aprendido = estadoAprendizagemDebito(...) === 'aprendido'`; em ambos, confirmado → automático, sugestao → clique, ambiguo/semCandidato → nada (pára, manual). `ligar()`/`registo()`/`desligar()` aceitam vários movimentos em QUALQUER chave (ver `movimentoKeys` no nó). Usado só pela `tesouraria.html`; nunca reimplementar por página | — |
| `gioco-shell.css` | Design system: tokens de cor, tema claro/escuro, sidebar, vidro, `.card`, `.kpi`, `.status`, `.btn-add`, tabelas | — |
| `gioco-shell.js` | Sprite de ícones SVG, `giocoIcon()`, sidebar (hover/pin) e toggle de tema com persistência | — |
| `gioco-charts.css` | Camada de gráficos: barras horizontais/verticais, linha, donut, tokens `--fatia-*` | — |
| `gioco-charts.js` | `GiocoChart.*` — funções que desenham barras/colunas/linha/donut em HTML/SVG | — |
| `estilo.html` | Montra do design system: todos os componentes e a grelha de ícones | — |
| `tesouraria.html` | Compromissos fixos, calendário de saídas, TSU e **reconciliação bancária** (Set/2026). **Semanas completas** (Set/2026): o calendário mensal e as barras "Por semana" trabalham sobre semanas de segunda a domingo INTEIRAS — a grelha entra pelo mês anterior e pelo seguinte (`itensGrelha()` = três `itensDoMes()`), as células de fora do mês levam `.outro-mes` (esbatidas, mas com valor, escala de calor e clique iguais às outras) e não há células `.empty`. O dia selecionado é a chave `chaveDia()` `'AAAA-MM-DD'`, nunca o número do dia. CONSEQUÊNCIA ACEITE: a soma das barras já NÃO é igual ao "Total a pagar em [mês]" — o total e a lista de pendentes continuam só do mês ativo, as barras são de semanas completas; não pôr avisos. Os itens planos (pedidos por linha + ocorrências de compromissos, `itensDoMes`, `chaveLinha`…) vêm do `gioco-pagamentos.js` desde Set/2026 (nomes destruturados, call sites iguais). **Deep-link** `?dia=AAAA-MM-DD[&chave=<chaveLinha>]` (usado pelo calendário): define mês/ano/dia ativos e abre o bloco de detalhe dessa linha se existir; sem parâmetros nada muda; só leitura. Reconciliação: cada pagamento marcado como pago (linha de `paymentRequests` concluída ou ocorrência em `pagamentosConcluidos`) leva um selo com o estado face aos débitos de `contasBancarias/{abanca,revolut}/movimentos` — ✓ Confirmado · ⏳ Aguarda banco · ⚠ Sem movimento · ? Ambíguo · — Sem data — no separador Concluídos, no detalhe do calendário e na secção "Reconciliação bancária" (contador + cinco listas expansíveis: Ligar nos ambíguos e na pesquisa alargada dos sem movimento / sem data, Desligar com confirmação nos confirmados). A lógica é toda do `gioco-reconciliacao.js`; a página só liga os dados em memória e desenha. Lê os movimentos das duas contas só em leitura; a única escrita nova é em `reconciliacaoBancaria/`. Secção **Receitas** (05/09/2026): tabela dia × meio (Cartão débito ↔ INTERCARD, Outro/TPA ↔ FECHO TPA) com faturado / crédito / Δ / selo (o selo "≈ Aproximado" é azul, tokens `--rec-aprox*` locais), filtros mês/estado, contador "N dias por confirmar", detalhe por célula (movimento ligado + Desligar, candidatos + Ligar, pesquisa alargada só em créditos) e "Créditos sem venda"; lê `vendasDiario/` só em leitura. Regras no nó `reconciliacaoBancaria`. **Débito direto — confirmação antes do clique** (Set/2026): para compromissos `metodoPagamento:'debito'` ainda pendentes (nem em `pagamentosConcluidos`), `RE.calcularDebitos()`/`RE.aplicarDebitosAutomaticos()` (chamados a par dos de sempre, dentro de `recalcularReconciliacao()`) confirmam sozinhos os de valor fixo com 1 candidato exacto de cêntimos, e os de valor variável (`valorVariavel:true`) com padrão de descritivo já aprendido em `historicoDescritivos` — escrevendo `pagamentosConcluidos/{chave}` e `reconciliacaoBancaria/{chave}` numa só passagem, `auto:true`. Sem padrão aprendido (ou que quebrou), a linha pendente mostra uma sugestão de 1 clique ("Movimento provável…") em vez do botão manual "✓ Pago" — `RE.confirmarSugestaoDebito()`, que também acrescenta ao histórico. Ver o cabeçalho do `gioco-reconciliacao.js` | Só Manel |
| `tarefas.html` | Tarefas, prazos e fixados do dia | Só Manel |
| `calendario.html` | Agenda pessoal (Set/2026): vistas Mês / Semana / Dia, eventos manuais no nó `eventos/` (criar, editar, anular por flag — nunca `remove()`). Modal é o `giocoModal` do shell. Preparada para fontes futuras: o render nunca toca no Firebase, recebe uma lista normalizada `{id, titulo, data, diaInteiro, horaInicio, horaFim, categoria, notas, origem, editavel}`; hoje só existe a fonte `manual` (`editavel:true`). Atalhos ← → T M S D N; vista persistida em `localStorage 'calendario.vista'`. **Camada Pagamentos** (Set/2026, SÓ leitura): fonte `'pagamentos'` via `gioco-pagamentos.js` + `gioco-compromissos.js` sobre os cinco nós da tesouraria (`paymentRequests`, `compromissosFixos`, `pagamentosConcluidos`, `recibos`, `pessoas` — lidos com `on('value')`, nenhum escrito); uma entrada por linha de pedido com prazo (`pag:payreq:{ticketId}~{lineIdx}`) e uma por ocorrência de compromisso dos meses visíveis (`pag:fixo:{id}_{AAAA-M}`), `editavel:false`, chips `--blush` com valor (✓ e esbatido quando pago), secção "Pagamentos" no painel do dia com total pendente, detalhe só de leitura no `giocoModal` com "Abrir na Tesouraria" (`tesouraria.html?dia&chave`). Toggle na barra (`localStorage 'calendario.camada.pagamentos'`, ligado por omissão) e "N sem data" para linhas sem prazo. Duplicados pedido/compromisso aceites (mesma decisão da tesouraria). O dashboard continua a contar só eventos manuais. **Set/2026:** formulário, validação e escritas passaram para o `gioco-eventos.js` (a página só decide a data por omissão e desenha). **Deep-link** `?dia=AAAA-MM-DD[&evento=ID]` (mesmo padrão da tesouraria, usado pelo dashboard): `dia` → vista Mês nesse mês com o painel do dia aberto; `evento` → abre o modal de edição no primeiro snapshot de `eventos/` em que o id existe e não está anulado (uma só vez; inválido ou anulado é ignorado); sem parâmetros nada muda. **Camada Outlook** (Set/2026, SÓ leitura): segunda camada, no mesmo padrão da dos pagamentos (`.camada-btn` + `aria-pressed` + `localStorage 'calendario.camada.outlook'`), mas **DESLIGADA por omissão** — obriga a sessão Microsoft e não vai buscar nada sem pedido explícito. Sem sessão, o mesmo botão mostra "Ligar Outlook"; com sessão, um botão ao lado abre o painel da conta no `giocoModal` (email + "Desligar conta", que é local — ver `gioco-outlook.js`). Os eventos vêm do `gioco-outlook.js` já normalizados (`origem:'outlook'`, `editavel:false`) e entram em `listaParaRender()` como terceira fonte; carregam-se pelo intervalo visível (`intervaloVisivel()`, fim exclusivo) e recarregam ao mudar de mês/semana/dia, com cache por intervalo — um erro do Graph fixa o intervalo na mesma para não martelar a API em ciclo com o render que ele próprio provoca, mostra um "Outlook sem resposta" discreto na barra e **nunca bloqueia o render**. Cor: par neutro `--out-bg`/`--out-ink` local (derivado da família `--line`/`--muted`, com par `[data-theme="dark"]`) — as seis superfícies de selo estão tomadas pelas categorias e o `--blush` é dos pagamentos, por isso a camada de leitura é cinzenta de propósito. Clicar abre o detalhe SÓ de leitura (mesmo padrão do dos pagamentos) com "Abrir no Outlook" para o `webLink` em nova janela — NUNCA o formulário de edição. **Videochamada** (Set/2026): com `extra.reuniao` (detectada no `gioco-outlook.js`), o chip / bloco / painel do dia levam o ícone `i-video` pela mesma porta do `i-store` (`iconeReuniao()`, 14px inline, CSS já existente em `.ev-chip .icon, .ev-bloco .icon, .dia-item-t .icon`) e o `title` do chip ganha o nome do serviço; o modal mostra a linha "Videochamada" e um botão **Entrar na reunião**. Ordem do rodapé: `[Fechar] [Entrar na reunião] [Abrir no Outlook]` — com reunião, o "Entrar" fica `.btn-add` e o "Abrir no Outlook" desce a `.ev-btn-outline` (a acção provável é entrar, e dois botões vermelhos lado a lado eram indistintos); sem reunião, o "Abrir no Outlook" continua primário. Quando o campo Local é **só** o URL da reunião, a linha "Local" não se mostra (redundante ao lado do botão); com texto à volta, mostra-se. O modificador `.pag-detalhe.out-detalhe` alarga a coluna de labels para 112px — "Videochamada" não cabia nos 90px do modal dos pagamentos, que fica intocado. **Diagnóstico e iOS** (Set/2026): o botão da camada reflecte o `GiocoOutlook.estado()` — "A verificar…" (desactivado) enquanto o `handleRedirectPromise` não assentar, "Abre no Safari" (desactivado) numa webview, "Ligar Outlook", ou "Outlook". O `#outErro` deixou de ser um `<span>` com `title=` e passou a **botão clicável** que abre um `giocoModal` de diagnóstico com o errorCode E o errorMessage completos, redirectUri, href, ambiente, versão do MSAL, UA e stack, mais um botão "Copiar" (com recurso a selecionar o texto quando o clipboard falha) — no telemóvel não há consola nem hover, e antes disto um login falhado mostrava três palavras e mais nada. A página guarda o objecto de erro INTEIRO (`outErroObj`), nunca uma string derivada, e mostra o `errorMessage` (que antes era deitado fora em favor do `errorCode`). **O `GiocoOutlook.init()` corre FORA do `autenticarEContinuar`**, em paralelo com o Firebase: são duas autenticações independentes e nenhuma pode esperar pela outra — dentro do callback, o `handleRedirectPromise` ficava até 8 s à espera do Firebase (ou para sempre, se ele falhasse) e o regresso do login da Microsoft ficava por processar sem ter nada a ver com a Microsoft. A página liga-se ao `pronto()` para voltar a desenhar quando o estado assentar. LIMITAÇÃO conhecida: a UI da camada continua a nascer dentro do bootstrap da página, que exige Firebase — como exige para o calendário todo; o que ficou independente é o arranque do MSAL e o processamento do redirect. A cor por fonte vive numa só função, `paleta(item)`, e o clique em `[data-id]` ramifica por **origem** (`pagamentos` → detalhe, `outlook` → detalhe, resto → edição), não por `!editavel`: uma quarta camada só de leitura acrescenta um ramo e uma fonte, sem refactor. Eventos com `ligacao.tipo === 'lojaPedido'` levam o ícone `i-store` antes do título (chip, bloco horário e painel do dia, sem categoria nova) e o modal de edição mostra por cima do formulário o bloco só de leitura "Pedido da loja" (descrição truncada a 200, pessoa, zona — lidos de `lojaPedidos/{id}` com um `once('value')`; "Pedido apagado na loja" se já não existir) com link "Ver no dashboard →" para `mrn-dashboard.html#cardPedidos` — a única página além da tesouraria/conta-bancaria autorizada a linkar o dashboard | Só Manel |
| `conta-bancaria.html` | Movimentos e saldo de uma conta (`?conta={slug}`) | Só Manel |
| `reconciliacao.html` | **Reconciliação POS ↔ TPA** (Set/2026), privada: o ÚNICO ponto de entrada é o cartão no `mrn-dashboard.html` (não está no `index.html` nem em `GIOCO_NAV_CONJUNTOS`; o back-link para o dashboard está na lista de excepções do `verifica-shell.sh`). Compara, transação a transação, os documentos do SAF-T (ZIP do ZoneSoft lido no browser com JSZip 3.10.1, mesmo padrão do `vendas.html` — NÃO altera a importação) contra o extrato CSV do TPA. Tudo em memória, perde-se ao recarregar (dito na interface); **NUNCA escreve no Firebase** — lê só `vendasDiario/{mês}` (`porPagamento`) para o modo degradado. Meios: `OU` = TPA ABANCA (código literal no `PaymentMechanism`, confirmado num SAF-T real), `CD` rotulado "CD" até se saber o que é depois de 27/08 (`parseIntercard()` lança "Parser por implementar", opção visível mas desactivada — não inventar colunas). Do SAF-T guarda TODOS os documentos e todas as linhas `Payment` (casa pelo `PaymentAmount`, nunca pelo `GrossTotal`; `InvoiceStatus = A` fora das somas, listados à parte; hora = `SystemEntryDate`). CSV ABANCA: preâmbulo até à linha `ESTABELECIMENTO;NOME ESTABELECIMENTO` (a linha `PERÍODO:` dá a cobertura de dias), colunas por nome, vírgula decimal, `Nº OPERAÇÃO` só para deduplicar entre uploads, `DATA DA OPERAÇÃO` é a data do check, `DATA DE LIQUIDAÇÃO` só informativa, montante negativo = devolução com sinal. Casamento por VALOR + HORA em passagens `JANELAS_MINUTOS = [2, 15, 60]` (constante no topo; a de 2 min entrou porque dois clientes com o mesmo artigo na mesma hora davam ambiguidade falsa): casa só quem tem o valor único de ambos os lados na janela; sobra com candidatos exactos = ambíguo (todos listados, nenhum escolhido). Às órfãs sem candidato exacto de nenhum lado aplica-se ainda o estado **"valor alterado no terminal"** (`detectarAlterados`, `JANELA_ALTERADO_MINUTOS = 2`): POS e terminal a ±2 min com valores diferentes = a mesma venda com gorjeta arredondada ao euro no terminal (acontece todos os dias); e a **conta dividida** = N transações a ±2 min cuja soma bate com UM documento (`TOLERANCIA_DIVISAO_CENTS_POR_PARCELA = 5`, `MAX_PARCELAS_DIVISAO = 6`), rotulada "dividida em N". Primeiro a dividida, depois o 1:1, ambos só quando a leitura é única. Estes pares contam como CASADOS (não são órfãs) e a soma das diferenças é a linha "Cobrado a mais do que faturado: X €" no topo do dia — o número que o Manel quer ver todos os dias (07/09: 2,20 + 1,70 + 0,07 = 3,97 €). O que sobrar sem candidato = só no POS / só no terminal. Zona 1 = lista de dias (verde bate, vermelho com o Nº DE LINHAS SEM PAR, cinzento sem ficheiros; "extrato sem linhas" quando o período do CSV cobre o dia mas não há linha dele); Zona 2 = detalhe sempre visível: sem par e ambíguas primeiro, casadas lado a lado, totais, anulados, e os documentos dos outros meios (NU…) numa lista à parte. Sem tolerâncias. CSS com prefixo `rec-` | Só Manel |
| `mrn-dashboard.html` | Dashboard privado (inclui a **alocação de devoluções de depósito**: bloco "Devoluções por alocar" na secção Depósitos Bancários, modal que lista os levantamentos pendentes com líquido suficiente, e o botão "↩ Devolver à caixa" que cria a entrada já alocada — ver o nó `caixaMovimentos`): contas bancárias, vendas, pagamentos e compromissos, tarefas, pedidos da loja espelhados, depósitos bancários e reconciliação, central de notificações, armazenamento, e placeholders (Calendário Outlook, Instagram, Google Reviews). **Cartão Posição Financeira** (Set/2026, Vista Rápida, a seguir a Contas Bancárias, SÓ leitura): total disponível = contas EUR com sincronização < 48 h (`resumoContas()`, a mesma função pura que alimenta o cartão Contas Bancárias) + por depositar (`depositosPendentes()`/`totalLiquido()`, os DOIS nós) + cofre (`saldoCofreDashboard()` → `GiocoCaixa.saldoCofre`); a caixa (`GiocoCaixa.saldoVivoCaixa` sobre `caixaContagens` — listener novo, só leitura — + `caixaMovimentos`) fica num bloco à parte com a nota do fundo de maneio e só entra no total com o switch "Incluir caixa no total" (off por omissão, estado só em memória). Parcela sem dados (conta não ligada / sync antiga / listener sem resposta / caixa sem contagem) fica "Sem dados", FORA da soma, e listada no subtítulo — nunca vale 0; o cofre sem movimentos é 0 válido. **Cofre** (Set/2026, ver nó `cofreMovimentos`): a página lê também `cofreMovimentos` com listener próprio e só reconcilia depois de os dois nós (`caixaMovimentos` + `cofreMovimentos`) estarem carregados. Um depósito bancário pendente pode ter origem em qualquer um dos dois — `listaMovimentosDeposito()` devolve a união, cada item marcado `origem:'caixa'|'cofre'`, e `refDoMovimento(item)` dá a ref certa para QUALQUER escrita (marcar depositado, reconciliação automática, alocação de devoluções, "Devolver à caixa"); as tabelas de pendentes/histórico e a lista "Devoluções por alocar" mostram a origem num badge discreto. Alocar uma devolução a um levantamento funciona entre nós diferentes (cada lado escreve no seu próprio nó). Linha "No cofre: X,XX€" na secção de Depósitos Bancários com o saldo cumulativo do cofre e a data do último movimento — informativa, NÃO entra no total de pendentes nem no cartão. **Agendar pedidos da loja** (Set/2026): no cartão Pedidos, cada pedido sem evento ativo (e não fechado) tem o botão "Agendar", que abre o formulário do `gioco-eventos.js` pré-preenchido (título = descrição truncada a 80 sem cortar palavra, dia inteiro, categoria `loja`, notas com pessoa/zona/prioridade + descrição completa, data por escolher) e grava `eventos/` com `origem:'lojaPedido'` + `ligacao:{tipo:'lojaPedido', id}`; a seguir escreve `lojaPedidos/{id}/eventoId` e `agendadoEm` (dois `set()` por campo — as únicas escritas novas no nó; se falharem o evento fica criado e o cartão mostra uma linha de erro, e um novo Agendar cria outro evento — aceite). Com evento ativo mostra o chip `.status.ok` "Agendado dd/mm[ HH:MM]" (link `calendario.html?dia&evento`) e "Reagendar" (cria evento novo e substitui o `eventoId`; o antigo NÃO é anulado automaticamente). Pedidos `feito`/`não avançar` mostram o chip se houver evento ativo mas não o botão. O snapshot de `eventos/` do cartão Calendário vive em `eventosPorId` e re-renderiza o cartão de pedidos: anular o evento no calendário faz o botão voltar sem escrever nada no pedido. O `update({estado, respondidoEm, resposta})` e a central de notificações não mudaram | Só Manel |

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
                         aparecem na leitura-faturas.html e NUNCA geram paymentRequests.
                         DEVOLUÇÃO DE DEPÓSITO BANCÁRIO (Set/2026, revisto): levanta-se
                         dinheiro da caixa para depositar e parte volta. A devolução é
                         uma ENTRADA com motivo 'Devolução de depósito bancário'
                         (detalhe livre OPCIONAL, gravado como "Label: detalhe" — quem
                         lê tem de comparar por PREFIXO, não por igualdade) e nasce
                         sempre POR ALOCAR: depositoOrigemId:null + alocadoEm:null. A
                         caixa.html NÃO pergunta, NÃO mostra e NÃO escreve ligação
                         nenhuma entre devoluções e levantamentos — o dinheiro em caixa
                         é fungível e quem regista na loja não sabe a correspondência.
                         ALOCAR é decisão do mrn-dashboard.html, o único que a faz:
                         escreve na entrada depositoOrigemId (id do levantamento) +
                         alocadoEm (ISO), e no levantamento devolvidoDeposito (soma
                         acumulada, 2 casas) + devolucoes/{idDaEntrada} =
                         { valor, dataHora, pessoa, pessoaId }. Uma devolução aloca-se
                         SEMPRE por inteiro a um só levantamento; se o valor exceder o
                         líquido, a alocação é recusada. Líquido de um levantamento =
                         valor − (devolvidoDeposito || 0) — é ele que o cartão soma, que
                         o histórico mostra e que a reconciliação bancária compara com o
                         crédito. Devolvido por inteiro (líquido 0) sai dos pendentes e
                         vai ao histórico como "Devolvido integralmente". O botão
                         "↩ Devolver à caixa" do dashboard cria a entrada já alocada
                         (parte do levantamento, a ligação é conhecida). NADA disto toca
                         em valorDevolvido, que é o troco das Compras/Pagamentos, nem em
                         contasBancarias. Só update() por path; nunca remove().
                         RECONCILIAÇÃO AUTOMÁTICA DOS DEPÓSITOS (mrn-dashboard.html,
                         Set/2026): usa o gioco-correspondencia.js com estrategias
                         ['exacto'], janela [0, +7] a partir do dia local de dataHora,
                         só créditos da ABANCA (os depósitos físicos só acontecem
                         nessa conta). DECISÃO DELIBERADA E EXCLUSIVA DESTE CASO: com
                         'ambiguo' (2+ créditos iguais na janela) o dashboard NÃO
                         pára — ordena os candidatos por booking_date ascendente (e
                         ref para desempate; nunca confia na ordem do motor) e liga o
                         MAIS ANTIGO, o mesmo greedy de sempre. Não é um padrão a
                         replicar nos outros usos do motor, onde ambiguo pede
                         confirmação manual. Escreve o que já escrevia (depositado,
                         reconciliadoAutomaticamente, reconciliadoEm,
                         movimentoContaRef, depositadoEm) — nada de novo.
                         COFRE (Set/2026): um levantamento de "Depósito bancário" pode
                         ter origem AQUI ou em cofreMovimentos (ver esse nó) — a caixa é
                         só um dos dois locais físicos de dinheiro que alimentam a
                         reconciliação bancária do mrn-dashboard.html. QUALQUER código
                         futuro que trate de depósitos (pendentes, histórico, alocação de
                         devoluções, reconciliação automática) tem de olhar para os DOIS
                         nós — nunca assumir que um depósito vem só de caixaMovimentos.
                         Transferência para o cofre (saída, motivo 'Transferência para o
                         cofre', semAcerto) gera sempre um par com uma entrada em
                         cofreMovimentos com o mesmo transferenciaId
caixaFaturasArquivo   — caixaFaturasArquivo/{movimentoId} = dataUrl da foto/PDF da
                         fatura do movimento de caixa, comprimido (mesmo formato de
                         faturasArquivo). Fora do movimento de propósito: o listener de
                         caixaMovimentos não carrega base64; a listagem lê on demand ao
                         clicar no badge "Fatura". Escrito só pela caixa.html (set() no
                         nó próprio, antes do update do movimento)
caixaContagens        — contagens físicas de caixa por denominação (Set/2026), escrito
                         SÓ por push() pela caixa.html (nunca update()/remove() depois de
                         criado). caixaContagens/{pushId} = { dataHora (ISO),
                         denominacoes: { "500","200","100","50","20","10","5" (notas) e
                         "2","1","0,5","0,2","0,1","0,05","0,02","0,01" (moedas) → nº de
                         unidades contadas }, total (soma de denominacoes[k] × o valor da
                         chave, 2 casas), esperado (saldoVivoCaixa() no MOMENTO da
                         contagem — null se ainda não havia âncora anterior; ausente no
                         RTDB quando null), diferenca (total − esperado, tratando null
                         como 0 só para este cálculo; pode ser 0), motivoDiferenca (texto
                         livre, obrigatório quando diferenca !== 0 — SEM tolerância
                         nenhuma, nem 0,01 €; null só quando diferenca === 0), pessoa,
                         pessoaId, notas: null }.
                         AS CHAVES DE denominacoes USAM VÍRGULA, NÃO PONTO: o RTDB proíbe
                         "." em chaves de objeto — "0,5" e não "0.5". O código
                         (DENOMINACOES em caixa.html) guarda "0.5" como identificador
                         interno (data-chave, DOM, estado em memória) e só troca para
                         "0,5" (chaveDb) ao escrever o registo; qualquer leitor futuro
                         deste nó tem de esperar vírgula, nunca ponto.
                         saldoVivoCaixa() (caixa.html): usa a contagem mais recente por
                         dataHora como baseline (contagem.total) e soma-lhe todos os
                         caixaMovimentos posteriores a essa dataHora, com a MESMA lógica
                         por movimento do resumo "Saldo hoje" (entrada: +valor; saída
                         'acertado': +(valor − valorDevolvido); saída 'aberto': +valor —
                         o dinheiro já saiu fisicamente mesmo por acertar). SEM contagem
                         nenhuma no nó, devolve null (não 0) — é o que faz o card "Caixa"
                         mostrar "Sem contagem registada" em vez de 0,00 €. Ao contrário
                         do "Saldo hoje", nunca reseta à meia-noite: é o saldo físico real
                         desde a última contagem confirmada
cofreMovimentos       — segundo local de dinheiro físico (Set/2026): o Alfredo tira
                         dinheiro da caixa e põe no cofre da loja; regra geral esse
                         dinheiro vai depois para o banco (levado pelo Manel), por
                         exceção volta à caixa. cofreMovimentos/{pushId} = { dataHora
                         (ISO), tipo: 'entrada'|'saida', valor, motivo, pessoa, pessoaId,
                         transferenciaId (string partilhada com o movimento PAR da
                         caixa, ou null — só existe quando o movimento nasce de uma
                         transferência caixa↔cofre), notas: null }.
                         SALDO CUMULATIVO desde sempre — ao CONTRÁRIO do saldo do dia da
                         caixa.html (que é só do próprio dia): saldo do cofre = soma das
                         entradas − soma das saídas de TODA a história do nó.
                         TRANSFERÊNCIAS: uma transferência entre caixa e cofre escreve
                         SEMPRE dois registos, um em cada nó, com o mesmo
                         transferenciaId (o id devolvido pelo push do primeiro registo).
                         Caixa → Cofre: caixa.html regista a saída (motivo
                         'Transferência para o cofre', semAcerto) e, a seguir, a entrada
                         par aqui (motivo 'Entrada da caixa'). Cofre → Caixa ("Devolver
                         à caixa" no cofre): caixa.html regista a saída aqui (motivo
                         'Devolução para a caixa') e a entrada par em caixaMovimentos
                         (motivo 'Entrada do cofre', estado 'acertado',
                         valorDevolvido:0 — entra no saldo do dia da caixa pelo caminho
                         normal, sem lógica adicional).
                         RETIRADAS SEM PAR: 'Depósito bancário' (saída direta para o
                         banco, transferenciaId:null) e 'Outro: <detalhe>'
                         (transferenciaId:null) não têm movimento par — o dinheiro sai
                         do cofre sem entrar na caixa.
                         DEPÓSITO BANCÁRIO: uma saída daqui com motivo 'Depósito
                         bancário' comporta-se EXATAMENTE como a mesma saída em
                         caixaMovimentos — depositado / depositadoEm / movimentoContaRef
                         / devolvidoDeposito / devolucoes/{idDaEntrada}, todos escritos
                         SÓ pelo mrn-dashboard.html (ver caixaMovimentos e o helper
                         refDoMovimento() nesse ficheiro). A caixa.html NUNCA lê nem
                         mostra esses campos, nem para movimentos deste nó nem para os
                         de caixaMovimentos.
                         Escritas: SEMPRE update()/push() em paths específicos — nunca
                         set() num nó já existente, nunca remove()
                         LEITURA DEFENSIVA (Set/2026): a caixa.html lê este nó só para o
                         card "Cofre" do saldo vivo — o nó pode ainda não existir neste
                         Firebase (outro módulo em curso). val() null na primeira leitura
                         do listener é estado válido, não erro: mostra "A aguardar módulo
                         do cofre" em vez de 0,00 €, sem alertas
lojaChecklistTemplates / lojaChecklistRegistos — checklists abertura/fecho
equipamentos          — equipamentos da loja (nome, zona, tipo, limite, ordem, ativo);
                         nunca apagados, só desativados — lojaTemperaturas referencia-os por id
lojaTemperaturas / lojaTemperaturasFotos      — registos HACCP (fotos em base64)
lojaPedidos           — pedidos/sugestões do staff. lojaPedidos/{pushId} = {
                         dataHora (ISO UTC), descricao, categoria? ('Compras/Material' |
                         'Manutenção/Avaria' | 'Equipamento'…; os antigos não têm),
                         prioridade? ('Alta' | 'Normal' | 'Baixa'; ausente = Normal), zona
                         (pode ser ''), pessoa, pessoaId, estado ('novo' | 'feito' |
                         'não avançar' — a loja; 'em análise' | 'aprovado' só o dashboard
                         os oferece e a loja mostra-os como 'novo'), resposta (null ou
                         texto, nunca limpo), respondidoEm? (ISO, escrito em cada
                         Guardar), subitens/{pushId} {texto, feito, criadoEm} e
                         comentarios/{pushId} {texto, pessoa, pessoaId, dataHora} (só a
                         loja), eventoId? e agendadoEm? (ms) — Set/2026, escritos SÓ pelo
                         mrn-dashboard.html, um set() por campo, ao agendar no calendário.
                         "Agendado" é DERIVADO (eventoId aponta para um evento existente e
                         não anulado), nunca um valor de estado; eventoId nunca é apagado
                         (Reagendar substitui-o). ESCRITAS: loja-sao-bento.html = push() do
                         objeto completo, update({estado, respondidoEm, resposta?}), push em
                         subitens/ e comentarios/, set em subitens/{id}/feito e o ÚNICO
                         remove() (apagar o pedido — um evento ligado fica com a ligacao a
                         apontar para um id inexistente, inofensivo); mrn-dashboard.html =
                         o mesmo update() + eventoId/agendadoEm; tarefas.html só lê.
                         Nunca set()/update() no nó pai depois da criação
pessoas               — membros da equipa; campos opcionais nif, categoria (SINGULAR),
                         dataAdmissao (YYYY-MM-DD) e vencimentoBase só são gravados
                         quando preenchidos. 'categorias' (plural) é descontinuado e
                         apagado a cada gravação — não confundir com 'categoria'
turnos                — escala semanal (confirmações manuais, chave {data}_{turnoId})
padroes               — padrão semanal recorrente por pessoa
ferias                — períodos de férias por pessoa
fechados              — loja encerrada por data: { diaTodo, turnos:{t1,t3,t2} }
admissoesTemplate     — molde das admissões (separador Admissões da equipa.html, o
                         ÚNICO que escreve aqui). admissoesTemplate/itens = ARRAY de
                         { id (slug estável, minúsculas, sem acentos, só [a-z0-9-] —
                         é chave de objecto em admissoes/{id}/itens e nunca muda quando
                         o texto é editado), texto, offsetDias (dias face à data de
                         início; negativo = antes), responsavel (texto livre, pode ser
                         ''), exigeLink (bool — mostra o campo de link do ficheiro) }.
                         É CONFIGURAÇÃO: aqui um set() do array INTEIRO é aceitável
                         (admissoesTemplateRef.child('itens').set(arr)), como no
                         lojaChecklistTemplates — e é a única escrita que existe.
                         Nó vazio no primeiro on('value') = semeado com os 13 itens do
                         ADM_TEMPLATE_DEFAULT da equipa.html; nunca sobrepõe um template
                         já existente.
                         EDITAR O TEMPLATE NÃO ALTERA AS ADMISSÕES JÁ CRIADAS — os itens
                         são copiados no momento da criação. É intencional, não um
                         defeito a corrigir: uma admissão a decorrer não muda de regras
                         a meio do caminho
admissoes             — uma admissão = a checklist de entrada de uma pessoa nova, de
                         antes do primeiro dia ao fim do primeiro mês. Escrita SÓ pela
                         equipa.html (separador Admissões).
                         admissoes/{pushId} = { pessoaId, pessoaNome, dataInicio
                         ('AAAA-MM-DD'), origem ('manual' | 'candidatura'),
                         candidaturaId (reservado, hoje sempre null), criadoEm (ISO),
                         concluidaEm (ISO ou ausente), anulado (bool), anuladoEm? (ISO),
                         itens: { {itemId do template}: { texto, offsetDias,
                         responsavel, exigeLink — COPIADOS do template —, prazo
                         ('AAAA-MM-DD' = dataInicio + offsetDias, somado em UTC para uma
                         mudança de hora não tirar nem pôr um dia), feito (bool),
                         feitoEm (ISO ou null), link (string, '' ou URL https:),
                         nota (string) } } }.
                         O RTDB descarta nulls: concluidaEm e candidaturaId NÃO existem
                         no nó enquanto valerem null — ausente = null, como no resto do OS.
                         ESCRITAS (invioláveis):
                         · criar = UM set() em admissoes/{novoId} com o objecto completo
                           — o único set() neste nó, e só na criação;
                         · marcar/desmarcar um item = update() APENAS em
                           admissoes/{id}/itens/{itemId} com { feito, feitoEm };
                         · link ou nota = update() na MESMA folha do item;
                         · concluidaEm = update() em admissoes/{id} (enche quando o
                           último item fica feito, esvazia se algum for desmarcado —
                           senão uma admissão reaberta ficava presa nas concluídas);
                         · anular = update({ anulado:true, anuladoEm }).
                         NUNCA um set() no nó pai admissoes/{id} (apagaria os itens),
                         NUNCA em admissoes/, e NUNCA remove(): anular é uma flag.
                         Cada visto é gravado NO MOMENTO. O padrão do
                         lojaChecklistRegistos (acumular em memória e gravar tudo num
                         push() no fim) NÃO serve aqui: uma admissão dura semanas e é
                         retomada em várias sessões, por várias pessoas.
                         CRIAÇÃO NUM SÓ SÍTIO: window.criarAdmissao(pessoaId,
                         pessoaNome, dataInicio, origem, candidaturaId) na equipa.html.
                         O botão "Nova admissão" chama-a com origem 'manual'; um futuro
                         funil de candidaturas chama exactamente esta função com
                         origem 'candidatura'. Não duplicar lógica de criação por página.
                         Criar uma admissão para uma pessoa SEM dataAdmissao grava-a
                         também em pessoas/{id}/dataAdmissao (set() só nessa folha).
                         LINKS DE FICHEIRO: URL colado à mão (OneDrive/SharePoint).
                         Passa sempre por new URL() dentro de try/catch e exige
                         protocolo https: ANTES de ser gravado ou de chegar ao DOM; um
                         link que não passe não é gravado. Abre com target="_blank"
                         rel="noopener noreferrer"
notificacoes          — central de notificações (lida: bool, tipo, criadoEm)
tasks                 — tarefas do dashboard
eventos               — agenda pessoal. Escrevem aqui a calendario.html e o
                         mrn-dashboard.html (botão Agendar), AMBOS só através do
                         gioco-eventos.js — nunca escritas diretas por página. eventos/{pushId} =
                         { titulo (trim, máx 120), data 'AAAA-MM-DD', diaInteiro (bool),
                         horaInicio 'HH:MM' e horaFim 'HH:MM' (AUSENTES se diaInteiro;
                         horaFim > horaInicio), categoria ∈ pessoal | trabalho | reuniao |
                         loja | prazo | outro, notas? (máx 2000, ausente se vazio),
                         origem ('manual' | 'lojaPedido'; no futuro 'outlook', 'tesouraria'…),
                         ligacao? ({ tipo:'lojaPedido', id:<chave de lojaPedidos> } — só
                         quando o evento nasce de outro registo, gravado no set() inicial
                         e nunca editado depois; a UI mostra-a, não a altera),
                         criadoEm, atualizadoEm (ms), anulado (bool), anuladoEm? (ms) }.
                         ESCRITAS: criar = push().set() com o objeto completo — o ÚNICO
                         set() no nó do evento, e só na criação; editar = um set() por
                         campo alterado em eventos/{id}/{campo} + eventos/{id}/atualizadoEm,
                         e remove() SÓ nas folhas horaInicio/horaFim/notas quando deixam
                         de existir; anular = dois set() (anulado:true, anuladoEm).
                         NUNCA set()/update() no nó pai depois de criado, NUNCA remove()
                         do evento. Leitura: on('value') do nó completo, anulado:true
                         ignorado na renderização. Sem restauro nesta fase
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
                         só para o aviso de desativação.
                         Débito direto de valor VARIÁVEL (Set/2026, ver reconciliacaoBancaria):
                         compromissos metodoPagamento:'debito' cujo valor real muda a cada
                         cobrança (hoje elet-001 Eletricidade, epal-001 EPAL) têm
                         valorVariavel:true. Sem esse campo (ou false), o débito é de valor
                         FIXO (ex.: Mensalidade Abanca, NOS, ZoneSoft POS) — a confirmação
                         automática compara cêntimos exactos; com ele, compara o descritivo
                         bancário. historicoDescritivos (array, só ACRESCENTADO nunca
                         substituído — set() do array completo lido de memória, escrito só
                         pelo gioco-reconciliacao.js) guarda o texto real de cada confirmação
                         já feita, para aprender a raiz (sem dígitos/datas) do descritivo e
                         confirmar sozinho quando o padrão for consistente. Ver o cabeçalho
                         do gioco-reconciliacao.js para a regra completa
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
                         chave {compromissoId}_{ano}-{mes} = { concluidoEm, auto?,
                         confirmadoManualmente?, anulado?, anuladoEm?, reconfirmadoEm? }.
                         O período (AAAA-M sem zero) é o periodoCompromisso() do
                         gioco-pagamentos.js e a leitura é compromissoPago() do mesmo
                         módulo — não reescrever.
                         "ESTÁ PAGO?" (Set/2026) = giocoPagamentosEngine.ocorrenciaPaga(reg)
                         = reg existe E reg.anulado !== true. É a fonte ÚNICA de verdade:
                         tesouraria.html, mrn-dashboard.html, equipa.html, calendario.html
                         (via compromissoPago) e gioco-reconciliacao.js passam todos por ela —
                         NUNCA decidir pela verdade booleana da chave.
                         ANULAR CONFIRMAÇÃO: RE.anularConfirmacao(chave) no
                         gioco-reconciliacao.js (botão "Anular" só no detalhe da linha da
                         tesouraria.html, para linhas fixo; nem no dashboard nem na secção
                         Reconciliação bancária). Ordem: (1) se reconciliacaoBancaria/
                         fixo:{chave} estiver ligada, o desligar() de sempre (PATCH,
                         movimentos para excluidos/, ficam livres para novo match); (2) só
                         depois update() com { anulado:true, anuladoEm } — concluidoEm/auto/
                         confirmadoManualmente ficam como rasto. Não toca em
                         historicoDescritivos. A ocorrência volta a pendente no sítio onde
                         estava (sem secção "Anulados"), com a nota "Confirmação anulada em
                         dd/mm" até ser reconfirmada. RECONFIRMAR (manual nas páginas ou
                         confirmarDebito no motor): chave nova → set({concluidoEm}) como
                         sempre; chave anulada → update({ concluidoEm, anulado:false,
                         reconfirmadoEm }), preservando anuladoEm. NUNCA remove() neste nó
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
                         movimentos bancários e os pagamentos de origem nunca são alterados.
                         VÁRIOS MOVIMENTOS NUMA ENTRADA (Set/2026, aditivo): quando o
                         motor de correspondência liga um PAR (estratégia soma2 — ex.
                         Mensalidade Abanca = 10,00 "MANUTENÇÃO DE CONTA" + 0,40
                         "IMP.SELO"), a entrada grava movimentoKey = a primeira chave
                         (formato de sempre), movimentoKeys = [as duas], valor = a
                         soma, e estrategia ('exacto' | 'soma2' | 'descritivo' —
                         metadado, só quando o motor a deu; ausente nas entradas
                         antigas e nas ligações manuais de 1 movimento). Isto vale
                         para QUALQUER família de chave (payreq:, fixo:, venda:), e
                         as entradas já gravadas não são migradas: quem lê usa
                         chavesDaEntrada(), que junta movimentoKey + movimentoKeys.
                         Desligar exclui TODAS as chaves da entrada e põe
                         movimentoKeys/estrategia a null (só quando existiam).
                         AMBIGUO PÁRA SEMPRE nos pagamentos e nos débitos directos (fixos
                         e variáveis): a UI mostra os candidatos — e, num par soma2
                         ambíguo, o botão "Ligar o par" — e espera pelo clique. A ÚNICA
                         excepção no OS é a reconciliação de depósitos do
                         mrn-dashboard.html (ver caixaMovimentos), que decide sozinha
                         pelo mais antigo; não replicar.
                         RECEITAS (05/09/2026, secção "Receitas" da tesouraria.html, mesmo
                         motor — calcularReceitas()): um item por dia e meio de pagamento de
                         vendasDiario/{AAAA-MM}/{dia}/porPagamento com bruto > 0, chaves
                         venda:{AAAA-MM-DD}~CD e venda:{AAAA-MM-DD}~OU, no MESMO nó. Campos:
                         conta, movimentoKey (+ movimentoKeys[] quando a regra B soma vários
                         fechos), dataMovimento, valorVenda, valorMovimento, diferenca
                         (= movimento − venda), estado ('confirmado'|'aproximado'), metodo,
                         ligado, em. Candidatos = CRDT de qualquer conta (hoje tudo ABANCA).
                         Regra A (CD ↔ /INTERCARD/i na remittance_information): exacto com
                         |Δ| ≤ 0,10 € e booking_date ∈ [dia, dia+5], 1 candidato não
                         disputado → confirmado; senão 1 único crédito INTERCARD livre na
                         janela com |Δ| ≤ 40 € → aproximado (ligado automaticamente, com
                         diferenca); 2+ → ambiguo; 0 e hoje ≤ dia+5 → aguarda; 0 e
                         hoje > dia+5 → semMovimento. Regra B (OU ↔ /^FECHO TPA/i — NUNCA
                         /TPA/i, apanha compras "TPA-UBR…"): modo soma = todos os créditos
                         FECHO TPA livres com booking_date = dia, sem valor mínimo (o
                         fecho chega à noite do próprio dia; o crédito de teste de 1,25
                         de 27/08 entra na soma — decisão definitiva); |Δ| ≤ 0,10 →
                         confirmado; |Δ| ≤ TOLERANCIA_OU_PCT (5 %, PROVISÓRIA — rever após 4
                         semanas de dados OU; constante no topo do módulo) → aproximado;
                         acima → ambiguo (só manual, botão "Ligar a soma"); sem fecho e
                         hoje ≤ dia+1 → aguarda, senão semMovimento. Um movimento ligado
                         nunca se reutiliza entre itens de receita (os DBIT dos pagamentos
                         e os CRDT das receitas nunca colidem). Desligar = o mesmo PATCH
                         (ligado:false + excluidos/{key} por cada chave, campos da
                         ligação a null), nunca remove(). A pesquisa manual das receitas
                         mostra só CRDT (sem filtro de família). Estado semDados (só
                         receitas): dia anterior ao primeiro booking_date presente em
                         qualquer conta em memória (RE.primeiroDiaBanco(), calculado —
                         nunca fixo; hoje 31/05/2026 na Revolut, 01/06 na ABANCA) — selo
                         cinzento "Sem dados bancários", sem acções, não escreve entrada
                         e não conta no "N dias por confirmar"; as entradas venda: de
                         Maio escritas antes disto ficam como estão (nunca apagar) e a UI
                         mostra semDados por cima. A página lê vendasDiario/
                         inteiro só em leitura; a secção tem filtros de mês/estado, contador
                         "N dias por confirmar" (aguarda + semMovimento + ambiguo, todo o
                         histórico) e a sub-lista "Créditos sem venda" (INTERCARD / FECHO
                         TPA livres fora da janela de qualquer dia; só listar). Sem cartão
                         no mrn-dashboard.html
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
ingredientes          — lista de ingredientes. Desde a migração de 08/09/2026 cada
                         registo ativo tem nome, categoria (CÓDIGO, resolvido por
                         categoriasIngredientes/{cod}/label — nunca o rótulo em texto),
                         origem ('compra') e bucket ('food' | 'bebida').
                         CICLO DE VIDA: nada se apaga, NUNCA. Um registo que sai da lista
                         viva leva arquivado:true e, quando foi absorvido por outro,
                         fundidoEm:{idCanonico} (fusão de duplicados) ou
                         movidoPara:'preparacoes/{id}' (passou a preparação). Um arquivado
                         sem nenhum dos dois é simplesmente um artigo fora da lista de
                         contagem. As referências antigas (receitas, faturas, contagens
                         fechadas) continuam a resolver — é essa a razão de não se apagar.
                         A contagem fechada de 2026-08-31 tem 9 itens em registos
                         arquivados; resolvem-se seguindo o fundidoEm.
                         QUEM ESCONDE: contagens.html esconde sempre; compras.html e
                         gestao.html escondem por omissão com toggle "Mostrar arquivados"
                         (e na compras um arquivado nunca entra na encomenda sugerida nem
                         no autocomplete); receitas.html, foodcost.html e
                         leitura-faturas.html NÃO escondem — senão as receitas e faturas
                         antigas deixavam de resolver — só marcam com selo e deixam de os
                         propor nas sugestões automáticas. Ao criar uma página que leia
                         este nó, decidir explicitamente em qual dos dois grupos entra.
                         Aliases vivem só aqui (a leitura-faturas casa linhas de fatura
                         por nome + aliases); numa fusão, os aliases do absorvido passam
                         para o canónico

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

### Loja SB154 — música / Sonos (`lojas/sb154/sonos`)

Duas Sonos Era 100 SL em **par estéreo** = uma única zona "SB154". A coordenadora
é `RINCON_74CA60A613FE01400` (192.168.1.70); o canal `RINCON_74CA60A0886A01400`
(192.168.1.69) é invisível — só aparece com `include_invisible=True` — e nunca é
comandado. Volume, mute, transporte e faixa são propriedades da **zona**, lidas e
escritas sempre na coordenadora (`group.coordinator`, resolvida em runtime se a
coordenação trocar). As escritas propagam em assíncrono: **`sleep(0.5)`** antes de
qualquer leitura de confirmação. Latências LAN < 25 ms.

Tal como o A/C, quem fala com as colunas é um serviço Python no PC do POS
(`servicos/sonos/sonos_bridge.py`, biblioteca `soco` 0.31.2, tarefa agendada
`gioco-sonos-bridge`, SYSTEM, ao arranque, log `C:\gioco\sonos\sonos_bridge.log`).
Sem segredos nem ficheiro de chave (UPnP na LAN). Config por env
`SONOS_BRIDGE_*` (UID, IP de recurso, `VOLUME_MAX`, LOJA, LOG).

```
lojas/sb154/sonos/estado            — escrito SÓ pelo serviço (PATCH raso a cada 3 s se mudou,
                                      heartbeat 5 min): ligado, transporte (PLAYING|PAUSED|STOPPED|
                                      TRANSITIONING), volume, mute, fonte (airplay|spotify|radio|
                                      fila|nada — derivada do URI da faixa), faixa {titulo, artista,
                                      album, posicao, duracao} (null sem música; a posição não conta
                                      como mudança).
                                      botoesBloqueados (inverso de buttons_enabled), luzEstado,
                                      sleepTimerRestante (segundos ou null), eq {graves, agudos, loudness},
                                      modo {aleatorio, repetir, crossfade}, filaTamanho, filaPosicao
                                      (1-based) — TODOS opcionais: um firmware que não exponha um deles
                                      deixa-o a null em vez de fazer falhar a leitura da zona; o essencial
                                      (transporte, faixa, volume, mute) é que não tem rede de segurança,
                                      porque aí uma falha É falha de ligação.
                                      favoritoAtual?, tocaDesde / paradoDesde (ISO:
                                      última passagem para / saída de PLAYING, recuperadas do nó ao
                                      reiniciar), atualizadoEm (ISO), fonteDados 'sb154', erro?.
                                      SEM URL de capa (é IP da LAN, não carrega fora da loja).
lojas/sb154/sonos/favoritos/{n}     — espelho de get_sonos_favorites (titulo, tipo, tocavel, uri, meta),
                                      PUT no nó favoritos no arranque e a cada 10 min. O tipo é a taxonomia
                                      dos FAVORITOS — radio | playlist | album | outro — e NUNCA 'nada'/'sem
                                      música', que é da outra taxonomia (a fonte a tocar). Decide-se pela
                                      classe DIDL do item e só depois pelo URI. Os "Sonos Radio" de fábrica
                                      não têm recurso nem referência utilizáveis pelo soco: ficam
                                      tipo:'radio' e tocavel:false, e a página desactiva-os em vez de
                                      oferecer um botão que ia falhar.
lojas/sb154/sonos/fila/{n}          — titulo, artista, posicao (posição REAL na fila, 1-based — é o valor
                                      que o comando saltarPara aceita). Até 30 itens A PARTIR da faixa a
                                      tocar (o item 0 é a actual). PUT no nó fila a cada 30 s e logo a
                                      seguir a mudança de faixa / saltarPara / tocarFavorito / proximo /
                                      anterior. Em AirPlay costuma vir vazia (a fila vive no telemóvel):
                                      escreve-se null, nunca conteúdo inventado.
lojas/sb154/sonos/config/predefinicoes — { abertura, normal, cheio }, níveis de volume 0–60 que o cartão
                                      oferece como atalhos. O serviço LÊ; só cria o nó UMA vez com
                                      25/38/50 se não existir, e nunca mais escreve lá (é configuração do
                                      utilizador — mudar à mão no Firebase). A página também só lê: o
                                      caminho para mudar o volume continua a ser o comando 'volume', as
                                      predefinições são só valores que a página envia. Sem o nó, a linha
                                      de atalhos desaparece do cartão.
lojas/sb154/sonos/diario/{AAAA-MM-DD} — acumulador do dia, PATCH raso do serviço uma vez por minuto com os
                                      totais ABSOLUTOS (nunca incrementos — um PATCH repetido ou perdido
                                      não estraga a conta): minutosATocar, minutosParado,
                                      minutosParadoHorarioLoja (12h–23h locais, a mesma janela do alerta do
                                      cartão), maiorPausa (minutos, com a pausa em curso incluída),
                                      nrPausas, volumeMedio (ponderado pelo tempo a tocar) e volumeMax,
                                      fontes {airplay, spotify, radio, fila} em minutos (só contam enquanto
                                      TOCA: parado, o URI da última faixa continua lá e inflaria a fonte
                                      anterior), atualizadoEm. Ao arrancar e à meia-noite o serviço lê o nó
                                      do dia e continua de onde estava — reiniciar não põe o dia a zero.
                                      Saltos > 30 s (serviço parado, PC suspenso) não são contados. Nenhuma
                                      página lê isto ainda.
lojas/sb154/sonos/unidades/{uid}    — inventário (ip, mac, modelo, firmware, papel coordenadora|canal,
                                      visivel, nome), PUT no nó unidades, mesmo ritmo. Nunca acima.
lojas/sb154/sonos/comandos/{pushId} — escrito pela centro-de-controlo.html com push().set():
                                      tipo (volume 0–60 | mute bool | play | pause | proximo |
                                      anterior | tocarFavorito índice-ou-uri | bloquearBotoes bool —
                                      o nó estado guarda o INVERSO de buttons_enabled | luzEstado bool |
                                      sleepTimer segundos, 0 cancela | eqGraves -10..10 | eqAgudos -10..10 |
                                      eqLoudness bool | aleatorio bool | repetir bool | crossfade bool |
                                      saltarPara posição 1-based na fila). O aleatorio e o repetir são as
                                      duas dimensões do MESMO play_mode: cada comando muda só a sua e
                                      preserva a outra; mexer no repetir colapsa um REPEAT_ONE em
                                      REPEAT_ALL (repetir uma faixa só não tem interruptor e não se
                                      inventa um estado intermédio). valor, pedidoEm,
                                      origem 'centro-de-controlo', estado (pendente|executado|falhou);
                                      o serviço acrescenta executadoEm e erro? folha a folha, estado
                                      por último. NUNCA apagar; > 10 min ficam 'falhou'/'expirado'.
```

- **Teto de volume 60** (`SONOS_BRIDGE_VOLUME_MAX`, default 60; acima é `falhou` com erro
  explícito) — o slider do cartão vai de 0 a 60, o mesmo teto. Depois de cada comando o
  serviço relê o estado de imediato (Event, como no A/C).
- **Decisão (Set/2026): a fonte é AirPlay do telemóvel da loja** e o volume do dia a dia
  gere-se nos botões físicos do telemóvel. O cartão "Música" da `centro-de-controlo.html`
  (a seguir ao A/C; `order:3` no telemóvel) serve para **monitorizar e ajustar à
  distância**. Desde Set/2026 está no **padrão do cartão A/C**: no cartão só o que se olha
  e se mexe ao balcão, o resto no painel "Mais opções".
  **No cartão:** selo de ligação (verde se `atualizadoEm` < 10 min, senão "Sem ligação ao
  POS" e controlos desativados), alerta "Sem música a tocar há X min" (só em horário de
  loja, 12h–23h de Lisboa, a partir de `paradoDesde`), faixa/artista e badge da fonte,
  slider de volume (envia só ao largar) + mute, os atalhos de volume de
  `config/predefinicoes` (linha escondida quando o nó não existe), play/pause,
  anterior/seguinte (com AirPlay levam o tooltip "pode não responder em AirPlay") e o botão
  **Mais opções**.
  **No painel** (o `giocoModal` do shell, com as MESMAS classes `.acp-*`, `.ac-mais` e
  `.ac-vent`/`.mu-pres` do A/C — componentes partilhados, nunca reimplementados por
  cartão): "A seguir" (a fila, tocar num item envia `saltarPara`), Favoritos (desactivados
  quando `tocavel:false`), Reprodução (aleatório / repetir / transição suave), Som (graves,
  agudos, loudness), Temporizador (15/30/60/90 min e Desligar) e Aparelho (botões
  bloqueados, luz de estado, fila, última leitura). Uma linha cujo campo o estado não
  expõe fica escondida, e uma secção só de interruptores desaparece inteira se nenhum
  deles existir — igual ao painel do A/C.
  Com AirPlay a tocar, saltar na fila ou tocar um favorito pede confirmação antes de
  cortar a música do telemóvel. Feedback pendente → executado/falhou igual ao A/C (o
  `sleepTimer` só se confirma a cancelar: ligado, o valor conta para trás e nunca voltaria
  a bater certo com o pedido).
- **Caminho futuro:** Spotify Connect (os favoritos já ficam espelhados e o
  `tocarFavorito` usa `add_to_queue` + `play_from_queue` para Spotify) e um **knob USB de
  volume** (teclas VK_VOLUME_*/VK_MEDIA_PLAY_PAUSE) no POS — o
  `servicos/sonos/teste_teclas.py` é o teste de 2 min para saber se as teclas chegam por
  cima do ZoneSoft em ecrã inteiro (correr à mão na sessão do utilizador, nunca SYSTEM).
- **Pendente quando as Rules fecharem:** `".indexOn": ["estado"]` em
  `lojas/$loja/sonos/comandos` (hoje o serviço apanha o 400 e filtra localmente),
  `FIREBASE_AUTH` na tarefa, e fechar `lojas/$loja/sonos/{fila,diario}` à escrita de
  qualquer cliente que não o serviço (a página só os lê).

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

5b. **A sessão Microsoft não é autenticação do OS.** A camada Outlook da `calendario.html`
   usa MSAL/Entra ID só para ler o calendário do Manel (`Calendars.Read`) — não autentica
   ninguém no GIOCO OS, não protege página nenhuma e não substitui a Restrição 5. As duas
   sessões são independentes: o Firebase anónimo continua obrigatório, e desligar a conta
   Microsoft não mexe nele. E são independentes também no ARRANQUE (Set/2026): o
   `GiocoOutlook.init()` corre fora do callback do `autenticarEContinuar`, em paralelo —
   pô-lo lá dentro atrasava o `handleRedirectPromise` até 8 s e partia o login em iOS. App registration `0450087b-b2a7-446b-babe-9116013ee5c8` (tenant
   `1c0bb082-...`), com `https://eatgioco.github.io/calendario.html` registado como SPA —
   o `redirectUri` é `origin + pathname` e tem de bater certo exactamente. Sem segredos:
   é fluxo público com PKCE, e o clientId não é segredo (Restrição 1 respeitada).

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
- **Bibliotecas de terceiros por CDN, nunca vendorizadas** (não há `vendor/` no repo, e não
  se cria um): Firebase compat v8 e pdf.js (`equipa.html`) do `gstatic`, e o **MSAL Browser
  2.38.2** do CDN da Microsoft (`https://alcdn.msauth.net/browser/2.38.2/js/msal-browser.min.js`),
  carregado pela `calendario.html` para a camada Outlook. Regras: **versão FIXA no URL,
  nunca `latest`**, e `integrity` + `crossorigin="anonymous"` sempre que o CDN sirva com
  CORS. O hash SRI do MSAL foi conferido contra o tarball oficial do npm (bytes idênticos)
  — ao subir de versão, refazer essa conferência. O `alcdn.msauth.net` só publica até à
  linha 2.x: as v3/v4 do `@azure/msal-browser` não existem lá.
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
   O sprite tem 49 símbolos (Set/2026: entrou `video`, para a videochamada nos eventos do Outlook da `calendario.html`; antes disso `chevron-left`, `calendar` e
   `clock` para o calendario.html, `music`, `play`, `pause`, `skip-back`,
   `skip-forward`, `volume-2`, `volume-x` para o cartão Música, e `wallet` para
   o cartão Posição Financeira do dashboard). A lista vive em `GIOCO_ICON_NAMES`.
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
`_referencia-fase0.html` (arquivo histórico), `estilo.html` (montra — nav à
mão de propósito) e `prototipo-barra-mobile.html` (protótipo descartável, sem shell).

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
| `--lime` `--mustard` `--blush` `--navy` `--sky` | superfícies de selo (continuam claras no escuro). `--sky` (#CFE2F3 / #5A8FC4 no escuro) entrou em Set/2026 para a 6.ª categoria do calendário |
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

Só `tesouraria.html`, `conta-bancaria.html`, `reconciliacao.html` (os back-links
`← Dashboard`) e `calendario.html` (o link "Ver no dashboard →" do bloco "Pedido da
loja") podem aparecer. Mais alguma coisa é fuga do link privado.

## Equipa (referência)
- **Manel** — Fundador
- **Alfredo Giangaspero** — Head of Operations (usa a loja e a caixa)
- **Mattia Pivetta** — Head of Product
- **Leonor Borges** — Head of Brand
