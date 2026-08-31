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
- **Excepção: `equipa.html`.** A grelha de turnos tem de ser usável ao telemóvel, por isso
  usa `<meta name="viewport" content="width=device-width, initial-scale=1">`. Adapta-se com
  `overflow-x:auto` + coluna sticky e grelhas `minmax(min(Xpx,100%),1fr)`, e tem os ÚNICOS
  `@media` do OS fora do `@media print`: `(hover: hover)` / `(hover: none)`. O critério é a
  existência de hover, nunca a largura. Em `(hover: none)` a sidebar do shell deixa de ser
  lateral e passa a barra fixa no fundo, e o `#sidebarPinBtn` abre um painel para cima em vez
  de fixar a barra fechada — ao toque não há hover, e os itens do menu são `<a>`, por isso
  tocar neles navegava em vez de abrir. Isto vive só no `<style>` da equipa.html: o
  `gioco-shell.css`/`.js` não tem mobile, e esta página é o rascunho que mais tarde lá sobe.

## Ficheiros do repositório

| Ficheiro | Módulo | Audiência |
|---|---|---|
| `index.html` | Home / menu do OS | Equipa |
| `compras.html` | Base de dados de fornecedores + encomendas + ingredientes (abas "Por fornecedor" / "Por ingrediente") | Equipa |
| `pagamentos.html` | Ciclo de pedidos de pagamento (numeração N/MM/AA, anulação) | Equipa |
| `caixa.html` | Movimentos de dinheiro físico | Equipa |
| `loja-sao-bento.html` | Planta, checklists abertura/fecho, temperaturas HACCP, pedidos da loja | Equipa |
| `equipa.html` | Três separadores: Escala (turnos), Pessoas (registo de colaboradores; criar uma pessoa gera os compromissos de tesouraria dela) e Recibos (importação de recibos de vencimento em PDF com pdf.js, conferência com 5 validações e histórico de custo por mês) | Equipa |
| `receitas.html` | Fichas técnicas: preparações e artigos, com custo calculado ao vivo e food cost | Equipa |
| `contabilidade.html` | Placeholder | — |
| `mrn-dashboard.html` | Dashboard privado: pagamentos, tarefas, Instagram, pedidos espelhados | Só Manel |

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
pagamentosConcluidos  — ocorrências mensais de compromissosFixos marcadas como pagas,
                         chave {compromissoId}_{ano}-{mes} = { concluidoEm }
```

## Restrições críticas (não ignorar)

1. **Repo PÚBLICO** — zero segredos no código (tokens, passwords, app secrets). IBANs já existem, risco assumido.
2. **Firebase Storage não activado** (exige plano Blaze/cartão) — fotos ficam em base64 no RTDB.
3. **mailto: falha no POS** — o computador da loja não tem cliente de email. Não usar mailto para fluxos críticos do staff.
4. **Microsoft 365 write tools indisponíveis** — só leitura. Sem automações cloud que dependam de M365.
5. **Firebase Auth adiado** — não implementar auth sem instrução explícita.
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

## Equipa (referência)
- **Manel** — Fundador
- **Alfredo Giangaspero** — Head of Operations (usa a loja e a caixa)
- **Mattia Pivetta** — Head of Product
- **Leonor Borges** — Head of Brand
