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
  Aderem hoje: `equipa.html`, `contagens.html`, `tesouraria.html` e
  `loja-sao-bento.html` (desde 1 Set/2026: no computador da loja, que tem rato,
  nada muda — o critério é o hover).

## Ficheiros do repositório

| Ficheiro | Módulo | Audiência |
|---|---|---|
| `index.html` | Home / menu do OS | Equipa |
| `compras.html` | Base de dados de fornecedores + encomendas + ingredientes (abas "Por fornecedor" / "Por ingrediente" / "Encomenda sugerida") | Equipa |
| `pagamentos.html` | Ciclo de pedidos de pagamento (numeração N/MM/AA, anulação) | Equipa |
| `caixa.html` | Movimentos de dinheiro físico | Equipa |
| `loja-sao-bento.html` | Planta, checklists abertura/fecho, temperaturas HACCP, pedidos da loja | Equipa |
| `contagens.html` | Contagens físicas de stock por data, com navegação ao teclado e conversão de unidades | Equipa |
| `equipa.html` | Três separadores: Escala (turnos), Pessoas (registo de colaboradores; criar uma pessoa gera os compromissos de tesouraria dela) e Recibos (importação de recibos de vencimento em PDF com pdf.js, conferência com 5 validações e histórico de custo por mês) | Equipa |
| `receitas.html` | Fichas técnicas: preparações e artigos, com custo calculado ao vivo e food cost | Equipa |
| `foodcost.html` | Variância de food cost: consumo teórico (vendas × ficha técnica) vs. real (contagem inicial + compras − contagem final), por período entre duas contagens fechadas | Equipa |
| `resultados.html` | P&L mensal **em ótica de caixa, valores com IVA** (decisão de 02/09/2026): receita = `vendas/{mes}/resumo.bruto` (o líquido fica informativo no drill-down); custos nos valores brutos das fontes, sem estimar nem deduzir IVA; entregas de IVA/impostos aparecem como saídas bancárias na reconciliação quando ocorrem. Rubricas: CMV (paymentRequests concluídos + saídas bancárias de fornecedores), Pessoal (linha única: recibos + TSU patronal via gioco-compromissos.js + sem recibo como estimativa), Fixos (sem pessoal/TSU). Reconciliação bancária movimento a movimento com "Não classificado" sempre visível. Exclusões reversíveis de linhas via `plAjustes/` (ver nós) | Equipa |
| `contabilidade.html` | Placeholder | — |
| `gioco-consumo.js` | Motor partilhado: explosão da ficha técnica (produto → receita → preparações recursivas → ingredientes, com as preparações de custo fixo só em euros) e consumo teórico a partir de `vendasDiario`. Factory `giocoConsumoEngine({getReceitas, getPreparacoes, getVendasDiario, getMapa})`, no molde do `gioco-compromissos.js`. Usado pelo `foodcost.html` (variância) e pela aba "Encomenda sugerida" da `compras.html` (procura e consumo desde a contagem) | — |
| `gioco-shell.css` | Design system: tokens de cor, tema claro/escuro, sidebar, vidro, `.card`, `.kpi`, `.status`, `.btn-add`, tabelas | — |
| `gioco-shell.js` | Sprite de 24 ícones SVG, `giocoIcon()`, sidebar (hover/pin) e toggle de tema com persistência | — |
| `estilo.html` | Montra do design system: todos os componentes e a grelha de ícones | — |
| `tesouraria.html` | Compromissos fixos, calendário de saídas, TSU | Só Manel |
| `tarefas.html` | Tarefas, prazos e fixados do dia | Só Manel |
| `conta-bancaria.html` | Movimentos e saldo de uma conta (`?conta={slug}`) | Só Manel |
| `mrn-dashboard.html` | Dashboard privado: contas bancárias, vendas, pagamentos e compromissos, tarefas, pedidos da loja espelhados, depósitos bancários e reconciliação, central de notificações, armazenamento, e placeholders (Calendário Outlook, Instagram, Google Reviews) | Só Manel |

## Nós Firebase (RTDB)

```
suppliers             — fornecedores
paymentRequests       — pedidos de pagamento (status: pendente / concluido / anulado)
caixaMovimentos       — movimentos de caixa física
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
mapaProdutosReceitas  — ligação {codigoZoneSoft} -> { receitaId } ou { ignorado:true },
                         escrita SÓ pela foodcost.html. O código é o das chaves de
                         vendasDiario/{AAAA-MM}/{dia}/produtos. 'ignorado' é para o que
                         não consome ingredientes (sacos, taxas, portes) — é diferente de
                         não estar mapeado, que aparece no balde "Sem mapa"
pagamentosConcluidos  — ocorrências mensais de compromissosFixos marcadas como pagas,
                         chave {compromissoId}_{ano}-{mes} = { concluidoEm }
classificacaoRegras   — regras de classificação de movimentos bancários da
                         resultados.html: {idPush} = { padrao, rubrica, criadoEm,
                         origemExemplo }. padrao = substring do descritivo,
                         normalizada (maiúsculas, sem acentos, espaços
                         colapsados); rubrica ∈ cmv | pessoal | fixos | outros |
                         impostos | interno. Se várias regras casarem, ganha o
                         padrão mais longo. Apagar uma regra é permitido (é
                         configuração, não dados), sempre com confirmação na UI
classificacaoMovimentos — override individual por movimento bancário:
                         {conta}~{ref} = { rubrica, manual:true, regraId?,
                         criadoEm }. Vence sempre sobre qualquer regra.
                         PRIORIDADE de classificação na resultados.html:
                         (1) exclusão em plAjustes (o item sai do P&L e vai
                         para "Não classificado"); (2) lógica de reconciliação
                         existente (salários, renda, paymentRequests, internas)
                         — o classificador nunca atua sobre estes; (3) este
                         override; (4) regra de classificacaoRegras; (5) fica
                         "Não classificado". Com plAjustes, são os TRÊS únicos
                         nós onde a resultados.html escreve, sempre um set()
                         por registo (nunca update multi-chave)
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

Páginas já migradas: `receitas.html`, `pagamentos.html`, `vendas.html`,
`equipa.html`, `mrn-dashboard.html`, `contagens.html`, `compras.html`, `tesouraria.html`, `tarefas.html`, `conta-bancaria.html`, `leitura-faturas.html`, `caixa.html`, `loja-sao-bento.html`, `foodcost.html` (nova, já no shell). Por migrar: `index.html` (e as de suporte:
`abanca-callback`, `privacidade`, `termos`).

Ao migrar uma página, no `<head>` a seguir ao bloco de ícones: as fontes
(`Antonio` + `Inter` — nunca Space Mono, ver checklist acima) e
`<link rel="stylesheet" href="gioco-shell.css">`. A seguir a
`<body>`, `<script src="gioco-shell.js"></script>` — antes de qualquer markup
com `<use href="#i-...">`, para o sprite já estar no DOM.

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
