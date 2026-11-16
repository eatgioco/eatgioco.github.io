# Sazonalidade mensal do volume de negócios da restauração em Portugal — séries oficiais (Eurostat / INE)

Data de recolha de todos os ficheiros: **16 de Novembro de 2026** (≈23:37–23:46 UTC). Última actualização das fontes: Eurostat `sts_setu_m` e `sts_sepr_m` — 14/11/2026 11:00; INE — 13/11/2026. Último mês disponível para Portugal: **Setembro de 2026**.

URLs exactos dos pedidos (abreviados abaixo como **[E1]**, **[E2]**, **[I1]**, **[I2]**, **[I3]**):

- **[E1]** Eurostat, *Turnover in services – monthly data* (`sts_setu_m`): `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&geo=ES&geo=IT&nace_r2=I&nace_r2=I55&nace_r2=I56&nace_r2=I561&nace_r2=I562&nace_r2=I563&nace_r2=I55_I56&format=JSON&lang=EN&sinceTimePeriod=2010-01`
- **[E2]** Eurostat, *Production in services – monthly data* (`sts_sepr_m`): mesmo pedido com `sts_sepr_m` em vez de `sts_setu_m`.
- **[E3]** Eurostat, restrições de conteúdo do dataset (lista de códigos existentes): `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/contentconstraint/ESTAT/sts_setu_m`
- **[I1]** INE, indicador 0012794 (taxa de variação mensal do índice bruto), CAE 56: `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012794&Dim1=T&Dim3=56&lang=PT`
- **[I2]** INE, indicador 0014390 (índice bruto deflacionado), CAE 56: `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0014390&Dim1=T&Dim3=56&lang=PT`
- **[I3]** INE, metainformação dos indicadores: `https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0012794&lang=PT` (idem para 0012795, 0012796, 0012797, 0014390)

**Método do índice sazonal** (igual em todas as tabelas): para cada ano civil completo, valor do mês ÷ média aritmética dos 12 meses desse ano × 100; depois média, mínimo, máximo e desvio-padrão amostral (n−1) de cada mês entre anos. Calculado com os valores exactos do JSON (uma casa decimal). A série é o **índice de volume de negócios nominal** (`NETTUR`, preços correntes — inclui inflação), **bruto** (`NSA`: sem ajustamento sazonal nem de calendário), base 2021=100. Como cada ano é normalizado pela sua própria média, a inflação entre anos não afecta o índice; a inflação dentro do ano afecta ligeiramente (empurra os últimos meses para cima) — ver a comparação com a série deflacionada.

2020 e 2021 foram excluídos. 2022 é mostrado mas assinalado: Janeiro–Março de 2022 ainda estavam deprimidos (Jan 2022 = 103,2 contra média anual de 145,0, índice 71,2 contra ~83 nos outros anos), por isso o período pós-COVID "limpo" é **2023–2025**. 2026 só tem Jan–Set e não entra nos índices.

## 1. Que séries existem no Eurostat (s_adj, indic_bt, unit, NACE) para Portugal

### Takeaway
Para Portugal existem I, I55 e I56 — **não existe I561 nem I563** (nem I562) em `sts_setu_m`. Há série bruta (NSA) do volume de negócios nominal desde Jan/2010 até Set/2026 em base 2021, e série deflacionada (`VOL_SLS`) e de produção (`PRD`) só desde Jan/2021.

### Cited Findings
- O pedido [E1] incluía I561, I562, I563 e I55_I56; a resposta só devolveu `I`, `I55` e `I56` na dimensão `nace_r2` — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&geo=ES&geo=IT&nace_r2=I&nace_r2=I55&nace_r2=I56&nace_r2=I561&nace_r2=I562&nace_r2=I563&nace_r2=I55_I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)
- A lista de códigos do dataset (content constraint) só contém, na família I5x, `I55`, `I55_N79` e `I56` — sem 56.1/56.3 para nenhum país — [E3](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/contentconstraint/ESTAT/sts_setu_m)
- Valores de `s_adj` no dataset: `NSA` (não ajustado), `CA` (ajustado de calendário, não de sazonalidade), `SCA` (ajustado de sazonalidade e calendário). `indic_bt`: `NETTUR` (volume de negócios) e `VOL_SLS` (volume de vendas, deflacionado). `unit`: `I21`, `I15`, `I10`, `PCH_PRE`, `PCH_SM` — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)
- Cobertura para PT, igual em I, I55 e I56 — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01):

| indic_bt | s_adj | unit | Período PT I56 | N.º meses |
|---|---|---|---|---|
| NETTUR | NSA | I21 | 2010-01 → 2026-09 | 201 |
| NETTUR | SCA | I21 | 2010-01 → 2026-09 | 201 |
| NETTUR | CA | I21 | 2010-01 → 2020-12 (pára em 2020) | 132 |
| NETTUR | NSA / SCA | I15 | 2010-01 → 2023-11 | 167 |
| NETTUR | CA | I15 | 2018-01 → 2023-11 | 71 |
| NETTUR | NSA / SCA | I10 | 2010-01 → 2017-12 | 96 |
| NETTUR | CA | I10 | 2010-01 → 2017-11 | 92 |
| VOL_SLS | NSA / SCA | I21 | 2021-01 → 2026-09 | 69 |
| VOL_SLS | CA | — | não existe para PT | 0 |

- `sts_sepr_m` (produção nos serviços, volume): para PT existe `PRD` em `NSA` e `SCA`, unidade I21, 2021-01 → 2026-09 (69 meses), para I, I55 e I56; não há `CA` para PT — [E2](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_sepr_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)
- Espanha tem I/I55/I56 NETTUR em NSA, CA e SCA, I21, 2010-01 → 2026-08; Itália só 2021-01 → 2026-08 — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=ES&geo=IT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)
- A série PT I56 NETTUR NSA I21 não trazia nenhuma flag de estado (provisório, confidencial, etc.) em nenhum mês no ficheiro descarregado — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)

### Inferences
- A separação restaurantes (56.1) vs bares (56.3) não é possível com dados mensais oficiais publicados: nem o Eurostat nem o INE (ver secção 6) desagregam abaixo da divisão 56.
- A série `PRD` de `sts_sepr_m` para PT I56 é praticamente idêntica à `VOL_SLS` (diferenças de 0,1–0,5 pontos), ou seja, é o mesmo volume de negócios deflacionado; não acrescenta informação.

### Gaps
- O dataset de comércio `sts_trtu_m` não foi consultado (o pedido devolveu "resposta assíncrona", HTTP 413) — irrelevante para a secção I.
- Não confirmei na documentação do Eurostat porque é que a série CA em base 2021 pára em Dez/2020 para Portugal.

## 2. Série mensal bruta completa — CAE/NACE 56 Portugal (tabela ano × mês)

### Takeaway
Série completa de Jan/2010 a Set/2026, sem falhas. A média anual passou de 106,2 (2015) para 137,6 (2019), caiu para 90,9 em 2020 e está em 184,1 em 2025 (2021=100, valores nominais).

### Cited Findings
- Valores exactos tal como devolvidos pelo Eurostat (`geo=PT`, `nace_r2=I56`, `indic_bt=NETTUR`, `s_adj=NSA`, `unit=I21`); "Mean" é a média dos 12 meses calculada por mim; "n/c" = ano incompleto — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)

### PT I56 — NETTUR, NSA, I21 (2021=100), valores exactos
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2010 | 115.7 | 102.8 | 118.9 | 120.5 | 134.2 | 133.3 | 149.7 | 162.8 | 134.3 | 121.0 | 106.5 | 124.8 | 127.0 |
| 2011 | 110.0 | 101.5 | 115.3 | 116.7 | 124.8 | 128.1 | 146.8 | 155.9 | 126.4 | 112.8 | 99.3 | 116.2 | 121.1 |
| 2012 | 91.4 | 87.8 | 95.3 | 95.0 | 105.2 | 105.5 | 122.9 | 134.7 | 114.5 | 97.6 | 83.1 | 98.0 | 102.6 |
| 2013 | 80.6 | 76.8 | 88.4 | 88.3 | 100.9 | 102.2 | 117.7 | 135.3 | 108.8 | 95.3 | 85.9 | 99.8 | 98.3 |
| 2014 | 80.7 | 76.4 | 88.6 | 93.0 | 108.3 | 105.8 | 121.6 | 140.5 | 113.6 | 105.7 | 90.6 | 106.9 | 102.6 |
| 2015 | 88.9 | 83.9 | 95.0 | 99.2 | 111.5 | 107.2 | 124.5 | 141.7 | 112.3 | 103.9 | 95.3 | 111.3 | 106.2 |
| 2016 | 94.0 | 92.0 | 104.5 | 106.0 | 114.9 | 111.5 | 137.1 | 151.2 | 128.9 | 122.4 | 108.5 | 124.1 | 116.3 |
| 2017 | 105.4 | 101.4 | 111.1 | 123.7 | 127.1 | 130.1 | 147.1 | 158.9 | 138.7 | 126.9 | 116.7 | 131.7 | 126.6 |
| 2018 | 112.5 | 105.4 | 118.5 | 122.6 | 135.8 | 135.3 | 148.9 | 164.5 | 141.8 | 128.7 | 116.1 | 141.1 | 130.9 |
| 2019 | 114.8 | 112.1 | 129.8 | 131.5 | 141.4 | 142.9 | 151.4 | 173.0 | 146.7 | 136.0 | 124.9 | 146.2 | 137.6 |
| 2020 | 120.5 | 122.0 | 66.5 | 31.8 | 55.1 | 78.2 | 100.1 | 127.4 | 111.3 | 102.2 | 77.2 | 98.9 | 90.9 |
| 2021 | 61.4 | 42.0 | 53.6 | 72.0 | 102.0 | 106.8 | 117.5 | 141.2 | 124.5 | 131.0 | 120.6 | 127.3 | 100.0 |
| 2022 | 103.2 | 111.4 | 123.8 | 140.1 | 147.3 | 149.4 | 170.9 | 184.7 | 156.3 | 154.3 | 139.3 | 159.5 | 145.0 |
| 2023 | 138.1 | 132.0 | 150.6 | 163.0 | 168.7 | 171.5 | 192.0 | 206.4 | 174.4 | 165.6 | 153.9 | 176.3 | 166.0 |
| 2024 | 148.2 | 144.6 | 165.7 | 166.1 | 186.1 | 183.9 | 202.4 | 220.6 | 191.2 | 180.8 | 168.3 | 184.6 | 178.5 |
| 2025 | 154.8 | 146.3 | 168.2 | 171.6 | 191.6 | 191.7 | 209.8 | 230.0 | 193.2 | 189.4 | 173.6 | 189.3 | 184.1 |
| 2026 | 160.1 | 148.6 | 175.0 | 183.5 | 203.9 | 199.7 | 220.8 | 233.9 | 196.6 |  |  |  | n/c |

- Jan–Set 2026 somam 1 722,1 pontos contra 1 657,2 em Jan–Set 2025, isto é +3,9 % nominal (cálculo meu sobre a tabela acima) — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)

### Inferences
- 2020 e 2021 são inutilizáveis para sazonalidade (Abr/2020 = 31,8; Fev/2021 = 42,0). Em 2022 só o primeiro trimestre está visivelmente afectado.

### Gaps
- Nenhuma para esta série.

## 3. Índice sazonal Jan–Dez para I56 Portugal: pré-COVID vs pós-COVID

### Takeaway
O perfil é muito estável: Agosto ≈ 124–128 e Fevereiro ≈ 80 (média anual = 100). Entre 2015–2019 e 2023–2025 o pico de Agosto baixou cerca de 4 pontos (128,1 → 124,3) e Outubro/Novembro subiram (100,1 → 101,3 e 90,9 → 93,7); o resto mexeu menos de 2 pontos.

### Cited Findings
- Índices calculados a partir da tabela da secção 2 (linhas por ano = índice desse ano; depois média, mín., máx., desvio-padrão) — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)

**PT I56 2015-2019** — years used: 2015, 2016, 2017, 2018, 2019
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 83.7 | 79.0 | 89.4 | 93.4 | 105.0 | 100.9 | 117.2 | 133.4 | 105.7 | 97.8 | 89.7 | 104.8 |
| 2016 | 80.9 | 79.1 | 89.9 | 91.2 | 98.8 | 95.9 | 117.9 | 130.1 | 110.9 | 105.3 | 93.3 | 106.7 |
| 2017 | 83.3 | 80.1 | 87.8 | 97.7 | 100.4 | 102.8 | 116.2 | 125.5 | 109.6 | 100.3 | 92.2 | 104.1 |
| 2018 | 85.9 | 80.5 | 90.5 | 93.6 | 103.7 | 103.3 | 113.7 | 125.6 | 108.3 | 98.3 | 88.7 | 107.8 |
| 2019 | 83.5 | 81.5 | 94.4 | 95.6 | 102.8 | 103.9 | 110.1 | 125.8 | 106.6 | 98.9 | 90.8 | 106.3 |
| **mean** | **83.4** | **80.0** | **90.4** | **94.3** | **102.1** | **101.4** | **115.0** | **128.1** | **108.2** | **100.1** | **90.9** | **105.9** |
| min | 80.9 | 79.0 | 87.8 | 91.2 | 98.8 | 95.9 | 110.1 | 125.5 | 105.7 | 97.8 | 88.7 | 104.1 |
| max | 85.9 | 81.5 | 94.4 | 97.7 | 105.0 | 103.9 | 117.9 | 133.4 | 110.9 | 105.3 | 93.3 | 107.8 |
| std (sample) | 1.8 | 1.0 | 2.4 | 2.5 | 2.5 | 3.2 | 3.2 | 3.5 | 2.1 | 3.0 | 1.9 | 1.5 |
peak Aug 128.1; trough Feb 80.0; Aug/Jan 1.535; Mar 90.4 Apr 94.3; Nov 90.9 Dec 105.9

**PT I56 2022-2025 (2022 inclui jan-mar distorcidos)** — years used: 2022, 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2022 | 71.2 | 76.8 | 85.4 | 96.6 | 101.6 | 103.0 | 117.8 | 127.4 | 107.8 | 106.4 | 96.1 | 110.0 |
| 2023 | 83.2 | 79.5 | 90.7 | 98.2 | 101.6 | 103.3 | 115.6 | 124.3 | 105.0 | 99.7 | 92.7 | 106.2 |
| 2024 | 83.0 | 81.0 | 92.8 | 93.0 | 104.2 | 103.0 | 113.4 | 123.6 | 107.1 | 101.3 | 94.3 | 103.4 |
| 2025 | 84.1 | 79.5 | 91.4 | 93.2 | 104.1 | 104.1 | 113.9 | 124.9 | 104.9 | 102.9 | 94.3 | 102.8 |
| **mean** | **80.4** | **79.2** | **90.1** | **95.3** | **102.9** | **103.4** | **115.2** | **125.0** | **106.2** | **102.6** | **94.3** | **105.6** |
| min | 71.2 | 76.8 | 85.4 | 93.0 | 101.6 | 103.0 | 113.4 | 123.6 | 104.9 | 99.7 | 92.7 | 102.8 |
| max | 84.1 | 81.0 | 92.8 | 98.2 | 104.2 | 104.1 | 117.8 | 127.4 | 107.8 | 106.4 | 96.1 | 110.0 |
| std (sample) | 6.1 | 1.7 | 3.2 | 2.5 | 1.5 | 0.5 | 2.0 | 1.6 | 1.4 | 2.9 | 1.4 | 3.3 |
peak Aug 125.0; trough Feb 79.2; Aug/Jan 1.556; Mar 90.1 Apr 95.3; Nov 94.3 Dec 105.6

**PT I56 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 83.2 | 79.5 | 90.7 | 98.2 | 101.6 | 103.3 | 115.6 | 124.3 | 105.0 | 99.7 | 92.7 | 106.2 |
| 2024 | 83.0 | 81.0 | 92.8 | 93.0 | 104.2 | 103.0 | 113.4 | 123.6 | 107.1 | 101.3 | 94.3 | 103.4 |
| 2025 | 84.1 | 79.5 | 91.4 | 93.2 | 104.1 | 104.1 | 113.9 | 124.9 | 104.9 | 102.9 | 94.3 | 102.8 |
| **mean** | **83.4** | **80.0** | **91.6** | **94.8** | **103.3** | **103.5** | **114.3** | **124.3** | **105.7** | **101.3** | **93.7** | **104.1** |
| min | 83.0 | 79.5 | 90.7 | 93.0 | 101.6 | 103.0 | 113.4 | 123.6 | 104.9 | 99.7 | 92.7 | 102.8 |
| max | 84.1 | 81.0 | 92.8 | 98.2 | 104.2 | 104.1 | 115.6 | 124.9 | 107.1 | 102.9 | 94.3 | 106.2 |
| std (sample) | 0.6 | 0.9 | 1.1 | 2.9 | 1.5 | 0.6 | 1.2 | 0.7 | 1.2 | 1.6 | 0.9 | 1.8 |
peak Aug 124.3; trough Feb 80.0; Aug/Jan 1.490; Mar 91.6 Apr 94.8; Nov 93.7 Dec 104.1

**PT I56 conjunto 2015-19 + 2023-25** — years used: 2015, 2016, 2017, 2018, 2019, 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 83.7 | 79.0 | 89.4 | 93.4 | 105.0 | 100.9 | 117.2 | 133.4 | 105.7 | 97.8 | 89.7 | 104.8 |
| 2016 | 80.9 | 79.1 | 89.9 | 91.2 | 98.8 | 95.9 | 117.9 | 130.1 | 110.9 | 105.3 | 93.3 | 106.7 |
| 2017 | 83.3 | 80.1 | 87.8 | 97.7 | 100.4 | 102.8 | 116.2 | 125.5 | 109.6 | 100.3 | 92.2 | 104.1 |
| 2018 | 85.9 | 80.5 | 90.5 | 93.6 | 103.7 | 103.3 | 113.7 | 125.6 | 108.3 | 98.3 | 88.7 | 107.8 |
| 2019 | 83.5 | 81.5 | 94.4 | 95.6 | 102.8 | 103.9 | 110.1 | 125.8 | 106.6 | 98.9 | 90.8 | 106.3 |
| 2023 | 83.2 | 79.5 | 90.7 | 98.2 | 101.6 | 103.3 | 115.6 | 124.3 | 105.0 | 99.7 | 92.7 | 106.2 |
| 2024 | 83.0 | 81.0 | 92.8 | 93.0 | 104.2 | 103.0 | 113.4 | 123.6 | 107.1 | 101.3 | 94.3 | 103.4 |
| 2025 | 84.1 | 79.5 | 91.4 | 93.2 | 104.1 | 104.1 | 113.9 | 124.9 | 104.9 | 102.9 | 94.3 | 102.8 |
| **mean** | **83.4** | **80.0** | **90.9** | **94.5** | **102.6** | **102.2** | **114.8** | **126.6** | **107.3** | **100.5** | **92.0** | **105.3** |
| min | 80.9 | 79.0 | 87.8 | 91.2 | 98.8 | 95.9 | 110.1 | 123.6 | 104.9 | 97.8 | 88.7 | 102.8 |
| max | 85.9 | 81.5 | 94.4 | 98.2 | 105.0 | 104.1 | 117.9 | 133.4 | 110.9 | 105.3 | 94.3 | 107.8 |
| std (sample) | 1.4 | 0.9 | 2.0 | 2.4 | 2.1 | 2.7 | 2.5 | 3.3 | 2.2 | 2.5 | 2.1 | 1.8 |
peak Aug 126.6; trough Feb 80.0; Aug/Jan 1.518; Mar 90.9 Apr 94.5; Nov 92.0 Dec 105.3

- Resumo comparativo (médias):

| Período | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015–2019 (5 anos) | 83,4 | 80,0 | 90,4 | 94,3 | 102,1 | 101,4 | 115,0 | 128,1 | 108,2 | 100,1 | 90,9 | 105,9 |
| 2023–2025 (3 anos) | 83,4 | 80,0 | 91,6 | 94,8 | 103,3 | 103,5 | 114,3 | 124,3 | 105,7 | 101,3 | 93,7 | 104,1 |
| Diferença | 0,0 | 0,0 | +1,2 | +0,5 | +1,2 | +2,1 | −0,7 | −3,8 | −2,5 | +1,2 | +2,8 | −1,8 |

- A série ajustada só de calendário (CA, disponível até 2020) dá praticamente o mesmo perfil em 2015–2019, o que mostra que o efeito de dias úteis/calendário é pequeno neste sector — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01):

**PT I56 CA (ajustado de calendário) 2015-2019** — years used: 2015, 2016, 2017, 2018, 2019
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 83.4 | 79.3 | 89.6 | 94.0 | 103.6 | 101.2 | 118.1 | 132.6 | 106.2 | 97.6 | 89.4 | 105.0 |
| 2016 | 80.1 | 78.3 | 90.6 | 90.9 | 98.9 | 97.0 | 116.7 | 131.1 | 111.7 | 104.1 | 93.7 | 107.0 |
| 2017 | 83.7 | 80.7 | 88.4 | 96.3 | 101.3 | 103.9 | 115.0 | 126.4 | 109.3 | 100.1 | 92.6 | 102.3 |
| 2018 | 86.3 | 80.9 | 90.2 | 93.2 | 103.5 | 104.2 | 113.5 | 126.3 | 106.8 | 98.7 | 88.8 | 107.7 |
| 2019 | 83.8 | 81.9 | 93.3 | 95.8 | 103.5 | 101.9 | 110.9 | 125.1 | 106.1 | 100.2 | 90.2 | 107.2 |
| **mean** | **83.5** | **80.2** | **90.4** | **94.0** | **102.2** | **101.6** | **114.9** | **128.3** | **108.0** | **100.1** | **90.9** | **105.8** |
| min | 80.1 | 78.3 | 88.4 | 90.9 | 98.9 | 97.0 | 110.9 | 125.1 | 106.1 | 97.6 | 88.8 | 102.3 |
| max | 86.3 | 81.9 | 93.3 | 96.3 | 103.6 | 104.2 | 118.1 | 132.6 | 111.7 | 104.1 | 93.7 | 107.7 |
| std (sample) | 2.2 | 1.4 | 1.8 | 2.2 | 2.1 | 2.9 | 2.8 | 3.3 | 2.4 | 2.5 | 2.1 | 2.2 |
peak Aug 128.3; trough Feb 80.2; Aug/Jan 1.537; Mar 90.4 Apr 94.0; Nov 90.9 Dec 105.8

- Série deflacionada (`VOL_SLS`, só desde 2021): o perfil em volume (2023–2025) é quase igual ao nominal: Janeiro 85,6 contra 83,4, Fevereiro 81,5 contra 80,0, Agosto 123,5 contra 124,3 e Dezembro 102,3 contra 104,1 — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01):

### PT I56 — VOL_SLS (deflacionado), NSA, I21
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021 | 62.3 | 42.6 | 54.3 | 72.5 | 102.6 | 107.3 | 117.6 | 141.0 | 124.1 | 130.3 | 119.6 | 125.9 | 100.0 |
| 2022 | 100.8 | 107.8 | 119.1 | 133.9 | 139.8 | 140.9 | 159.8 | 171.7 | 144.0 | 140.6 | 126.4 | 144.2 | 135.8 |
| 2023 | 122.8 | 116.4 | 132.1 | 142.0 | 146.7 | 148.3 | 164.8 | 176.7 | 148.9 | 141.0 | 130.8 | 149.4 | 143.3 |
| 2024 | 123.8 | 120.1 | 136.9 | 136.6 | 152.9 | 150.6 | 165.3 | 179.4 | 155.1 | 146.2 | 135.9 | 148.6 | 146.0 |
| 2025 | 122.7 | 115.2 | 131.7 | 134.0 | 148.9 | 148.5 | 161.7 | 176.7 | 147.9 | 144.4 | 131.8 | 143.4 | 142.2 |
| 2026 | 119.5 | 110.2 | 129.0 | 134.8 | 149.4 | 145.7 | 160.2 | 169.0 | 141.5 |  |  |  | n/c |

**PT I56 VOL_SLS 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 85.7 | 81.2 | 92.2 | 99.1 | 102.4 | 103.5 | 115.0 | 123.3 | 103.9 | 98.4 | 91.3 | 104.2 |
| 2024 | 84.8 | 82.3 | 93.8 | 93.6 | 104.8 | 103.2 | 113.3 | 122.9 | 106.3 | 100.2 | 93.1 | 101.8 |
| 2025 | 86.3 | 81.0 | 92.6 | 94.2 | 104.7 | 104.4 | 113.7 | 124.2 | 104.0 | 101.5 | 92.7 | 100.8 |
| **mean** | **85.6** | **81.5** | **92.9** | **95.6** | **103.9** | **103.7** | **114.0** | **123.5** | **104.7** | **100.0** | **92.3** | **102.3** |
| min | 84.8 | 81.0 | 92.2 | 93.6 | 102.4 | 103.2 | 113.3 | 122.9 | 103.9 | 98.4 | 91.3 | 100.8 |
| max | 86.3 | 82.3 | 93.8 | 99.1 | 104.8 | 104.4 | 115.0 | 124.2 | 106.3 | 101.5 | 93.1 | 104.2 |
| std (sample) | 0.7 | 0.7 | 0.8 | 3.0 | 1.4 | 0.6 | 0.9 | 0.7 | 1.3 | 1.6 | 1.0 | 1.8 |
peak Aug 123.5; trough Feb 81.5; Aug/Jan 1.443; Mar 92.9 Apr 95.6; Nov 92.3 Dec 102.3

### Inferences
- A sazonalidade nacional da restauração achatou ligeiramente depois da pandemia (amplitude Ago−Fev: 48,1 pontos em 2015–2019, 44,3 em 2023–2025). Com apenas três anos pós-COVID, e desvios-padrão de 1–3 pontos, só a descida de Agosto e Setembro e a subida de Novembro excedem claramente a variação normal entre anos.
- Já dentro de 2015–2019 o índice de Agosto vinha a descer (133,4 em 2015 → 125,8 em 2019), por isso o achatamento é uma tendência anterior à pandemia e não um efeito dela.
- Atenção: este é o perfil **nacional**, que inclui o Algarve e o litoral de férias. Não é o perfil de Lisboa; uma loja urbana em Lisboa pode ter Agosto muito mais fraco do que 124.

### Gaps
- Não há série deflacionada antes de 2021, logo não é possível comparar o perfil em volume pré- e pós-COVID.

## 4. Pico, vale, rácio Agosto ÷ Janeiro, Novembro e Dezembro, e efeito da Páscoa (Março vs Abril)

### Takeaway
Pico em Agosto e vale em Fevereiro em todos os períodos; Agosto vale cerca de 1,5 vezes Janeiro. Dezembro fica 4–6 % acima da média anual e Novembro 6–9 % abaixo. A Páscoa desloca cerca de 3–4 pontos de índice entre Março e Abril.

### Cited Findings
- Todos os números desta secção são cálculos meus sobre a tabela da secção 2 — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01)
- Pico: Agosto (128,1 em 2015–19; 124,3 em 2023–25). Vale: Fevereiro (80,0 nos dois períodos); Janeiro é o segundo mais baixo (83,4 nos dois períodos).
- Rácio Agosto ÷ Janeiro das médias dos índices: 1,535 (2015–19) e 1,490 (2023–25). Rácio Agosto ÷ Janeiro dos valores brutos, ano a ano: 2015: 1.594 ; 2016: 1.609 ; 2017: 1.508 ; 2018: 1.462 ; 2019: 1.507 ; 2022: 1.790 ; 2023: 1.495 ; 2024: 1.489 ; 2025: 1.486 ; 2026: 1.461. (2022 está inflacionado pelo Janeiro deprimido.)
- Rácio Agosto ÷ Fevereiro das médias: 1,60 (2015–19) e 1,55 (2023–25).
- Dezembro: 105,9 (2015–19; intervalo 104,1–107,8) e 104,1 (2023–25; intervalo 102,8–106,2). Em 2024 e 2025 foi 103,4 e 102,8, os valores mais baixos da amostra.
- Novembro: 90,9 (2015–19; intervalo 88,7–93,3) e 93,7 (2023–25; intervalo 92,7–94,3). Novembro é o terceiro mês mais fraco, depois de Fevereiro e Janeiro.
- Março vs Abril, por ano (índice do ano; rácio Abr ÷ Mar dos valores brutos):

| Ano | Páscoa (domingo) | Índice Mar | Índice Abr | Abr ÷ Mar |
|---|---|---|---|---|
| 2016 | 27 Mar | 89,9 | 91,2 | 1,014 |
| 2018 | 1 Abr (Semana Santa em Março) | 90,5 | 93,6 | 1,035 |
| 2024 | 31 Mar | 92,8 | 93,0 | 1,002 |
| 2015 | 5 Abr | 89,4 | 93,4 | 1,044 |
| 2017 | 16 Abr | 87,8 | 97,7 | 1,113 |
| 2019 | 21 Abr | 94,4 | 95,6 | 1,013 |
| 2022 | 17 Abr (Mar ainda afectado pela COVID) | 85,4 | 96,6 | 1,132 |
| 2023 | 9 Abr | 90,7 | 98,2 | 1,082 |
| 2025 | 20 Abr | 91,4 | 93,2 | 1,020 |
| 2026 | 5 Abr | n/c | n/c | 1,049 |

- Médias: anos de Páscoa em Março (2016, 2018, 2024) — Abr ÷ Mar = 1,017, índice Mar 91,1 e Abr 92,6. Anos de Páscoa em Abril excluindo 2022 (2015, 2017, 2019, 2023, 2025) — índice Mar 90,7 e Abr 95,6; Abr ÷ Mar = 1,054 juntando 2026 (seis anos); 1,065 se 2022 também entrar.

### Inferences
- Com Páscoa em Abril, Abril fica cerca de 5 % acima de Março; com Páscoa em Março os dois meses ficam quase iguais (cerca de 2 % de diferença). O efeito aparece sobretudo em Abril (95,6 contra 92,6, cerca de 3 pontos); Março quase não muda (91,1 contra 90,7).
- O efeito é irregular: 2019 e 2025 (Páscoas tardias, 21 e 20 de Abril) tiveram rácios de apenas 1,013 e 1,020, enquanto 2017 e 2023 tiveram 1,113 e 1,082. A amostra (3 contra 5–6 anos) é pequena e o desvio-padrão do índice de Abril é 2,5–2,9 pontos, por isso o efeito da Páscoa deve ser tratado como aproximado.
- As datas da Páscoa são do calendário (conhecimento geral), não de uma fonte consultada nesta sessão.

### Gaps
- Não há dados diários ou semanais oficiais, por isso não é possível isolar a Semana Santa propriamente dita.

## 5. Comparação: alojamento (I55), secção I e Espanha/Itália

### Takeaway
O alojamento é muito mais sazonal do que a restauração (Agosto ≈ 163–176, Janeiro ≈ 47; rácio Ago ÷ Jan ≈ 3,4–3,7 contra ≈ 1,5 na restauração). Espanha tem um perfil de restauração parecido mas mais achatado, com pico em Julho.

### Cited Findings
- Portugal I55 (alojamento), valores brutos e índices — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I55&format=JSON&lang=EN&sinceTimePeriod=2010-01):

### PT I55 — NETTUR, NSA, I21 (2021=100), valores exactos
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2010 | 69.3 | 81.5 | 102.7 | 123.2 | 134.7 | 150.2 | 196.7 | 265.7 | 179.2 | 136.6 | 90.8 | 81.3 | 134.3 |
| 2011 | 66.4 | 75.3 | 106.4 | 139.1 | 144.2 | 166.3 | 209.8 | 274.3 | 194.1 | 144.8 | 85.9 | 74.8 | 140.1 |
| 2012 | 59.5 | 65.2 | 86.7 | 109.1 | 124.5 | 144.2 | 183.3 | 234.9 | 161.9 | 123.3 | 76.3 | 59.1 | 119.0 |
| 2013 | 53.9 | 65.6 | 87.7 | 101.7 | 128.4 | 150.1 | 188.5 | 235.7 | 160.9 | 119.8 | 73.7 | 66.6 | 119.4 |
| 2014 | 55.9 | 58.4 | 83.1 | 108.8 | 138.7 | 162.1 | 200.3 | 255.9 | 191.7 | 141.5 | 79.1 | 78.6 | 129.5 |
| 2015 | 71.3 | 73.7 | 105.7 | 135.3 | 166.7 | 185.7 | 233.9 | 283.0 | 208.3 | 165.0 | 94.1 | 83.0 | 150.5 |
| 2016 | 81.9 | 91.8 | 130.0 | 150.0 | 190.2 | 212.8 | 272.7 | 317.7 | 236.0 | 192.7 | 118.0 | 103.2 | 174.8 |
| 2017 | 89.8 | 100.3 | 136.2 | 185.7 | 214.3 | 236.1 | 289.2 | 331.3 | 267.3 | 222.6 | 129.1 | 113.5 | 193.0 |
| 2018 | 92.3 | 103.0 | 151.6 | 186.9 | 233.5 | 251.1 | 310.5 | 343.0 | 284.7 | 229.5 | 134.8 | 113.4 | 202.9 |
| 2019 | 107.5 | 110.9 | 157.9 | 205.0 | 242.6 | 275.9 | 314.6 | 367.5 | 311.9 | 243.0 | 154.2 | 142.7 | 219.5 |
| 2020 | 106.3 | 112.5 | 66.0 | 11.0 | 14.2 | 36.7 | 90.5 | 169.4 | 108.3 | 72.0 | 35.7 | 44.2 | 72.2 |
| 2021 | 23.2 | 16.0 | 21.4 | 31.9 | 67.7 | 113.8 | 144.9 | 246.3 | 175.5 | 168.2 | 111.0 | 80.3 | 100.0 |
| 2022 | 55.3 | 75.8 | 116.7 | 187.8 | 221.5 | 269.7 | 330.0 | 366.6 | 301.8 | 254.6 | 160.9 | 145.8 | 207.2 |
| 2023 | 110.7 | 120.9 | 169.9 | 238.2 | 272.6 | 301.9 | 355.2 | 388.4 | 315.8 | 272.5 | 160.8 | 143.3 | 237.5 |
| 2024 | 115.2 | 130.7 | 191.4 | 230.8 | 292.4 | 310.0 | 363.3 | 407.8 | 341.8 | 281.2 | 171.9 | 146.4 | 248.6 |
| 2025 | 129.2 | 134.8 | 186.8 | 255.3 | 316.7 | 331.6 | 398.7 | 426.4 | 358.6 | 294.5 | 171.2 | 155.0 | 263.2 |
| 2026 | 124.8 | 131.7 | 183.5 | 241.6 | 287.9 | 313.2 | 364.7 | 399.1 | 337.3 |  |  |  | n/c |

**PT I55 2015-2019** — years used: 2015, 2016, 2017, 2018, 2019
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 47.4 | 49.0 | 70.2 | 89.9 | 110.8 | 123.4 | 155.4 | 188.1 | 138.4 | 109.7 | 62.5 | 55.2 |
| 2016 | 46.9 | 52.5 | 74.4 | 85.8 | 108.8 | 121.8 | 156.1 | 181.8 | 135.1 | 110.3 | 67.5 | 59.1 |
| 2017 | 46.5 | 52.0 | 70.6 | 96.2 | 111.1 | 122.4 | 149.9 | 171.7 | 138.5 | 115.4 | 66.9 | 58.8 |
| 2018 | 45.5 | 50.8 | 74.7 | 92.1 | 115.1 | 123.8 | 153.1 | 169.1 | 140.3 | 113.1 | 66.5 | 55.9 |
| 2019 | 49.0 | 50.5 | 71.9 | 93.4 | 110.5 | 125.7 | 143.3 | 167.4 | 142.1 | 110.7 | 70.3 | 65.0 |
| **mean** | **47.1** | **51.0** | **72.4** | **91.5** | **111.3** | **123.4** | **151.6** | **175.6** | **138.9** | **111.8** | **66.7** | **58.8** |
| min | 45.5 | 49.0 | 70.2 | 85.8 | 108.8 | 121.8 | 143.3 | 167.4 | 135.1 | 109.7 | 62.5 | 55.2 |
| max | 49.0 | 52.5 | 74.7 | 96.2 | 115.1 | 125.7 | 156.1 | 188.1 | 142.1 | 115.4 | 70.3 | 65.0 |
| std (sample) | 1.3 | 1.4 | 2.1 | 3.9 | 2.3 | 1.5 | 5.2 | 8.9 | 2.6 | 2.4 | 2.8 | 3.9 |
peak Aug 175.6; trough Jan 47.1; Aug/Jan 3.732; Mar 72.4 Apr 91.5; Nov 66.7 Dec 58.8

**PT I55 2022-2025 (2022 inclui jan-mar distorcidos)** — years used: 2022, 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2022 | 26.7 | 36.6 | 56.3 | 90.6 | 106.9 | 130.2 | 159.3 | 176.9 | 145.7 | 122.9 | 77.7 | 70.4 |
| 2023 | 46.6 | 50.9 | 71.5 | 100.3 | 114.8 | 127.1 | 149.5 | 163.5 | 133.0 | 114.7 | 67.7 | 60.3 |
| 2024 | 46.3 | 52.6 | 77.0 | 92.8 | 117.6 | 124.7 | 146.2 | 164.1 | 137.5 | 113.1 | 69.2 | 58.9 |
| 2025 | 49.1 | 51.2 | 71.0 | 97.0 | 120.3 | 126.0 | 151.5 | 162.0 | 136.2 | 111.9 | 65.0 | 58.9 |
| **mean** | **42.2** | **47.8** | **69.0** | **95.2** | **114.9** | **127.0** | **151.6** | **166.6** | **138.1** | **115.7** | **69.9** | **62.1** |
| min | 26.7 | 36.6 | 56.3 | 90.6 | 106.9 | 124.7 | 146.2 | 162.0 | 133.0 | 111.9 | 65.0 | 58.9 |
| max | 49.1 | 52.6 | 77.0 | 100.3 | 120.3 | 130.2 | 159.3 | 176.9 | 145.7 | 122.9 | 77.7 | 70.4 |
| std (sample) | 10.4 | 7.5 | 8.9 | 4.3 | 5.8 | 2.3 | 5.6 | 6.9 | 5.4 | 5.0 | 5.5 | 5.5 |
peak Aug 166.6; trough Jan 42.2; Aug/Jan 3.950; Mar 69.0 Apr 95.2; Nov 69.9 Dec 62.1

**PT I55 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 46.6 | 50.9 | 71.5 | 100.3 | 114.8 | 127.1 | 149.5 | 163.5 | 133.0 | 114.7 | 67.7 | 60.3 |
| 2024 | 46.3 | 52.6 | 77.0 | 92.8 | 117.6 | 124.7 | 146.2 | 164.1 | 137.5 | 113.1 | 69.2 | 58.9 |
| 2025 | 49.1 | 51.2 | 71.0 | 97.0 | 120.3 | 126.0 | 151.5 | 162.0 | 136.2 | 111.9 | 65.0 | 58.9 |
| **mean** | **47.3** | **51.6** | **73.2** | **96.7** | **117.6** | **125.9** | **149.1** | **163.2** | **135.6** | **113.2** | **67.3** | **59.4** |
| min | 46.3 | 50.9 | 71.0 | 92.8 | 114.8 | 124.7 | 146.2 | 162.0 | 133.0 | 111.9 | 65.0 | 58.9 |
| max | 49.1 | 52.6 | 77.0 | 100.3 | 120.3 | 127.1 | 151.5 | 164.1 | 137.5 | 114.7 | 69.2 | 60.3 |
| std (sample) | 1.5 | 0.9 | 3.3 | 3.7 | 2.8 | 1.2 | 2.7 | 1.1 | 2.3 | 1.4 | 2.1 | 0.8 |
peak Aug 163.2; trough Jan 47.3; Aug/Jan 3.447; Mar 73.2 Apr 96.7; Nov 67.3 Dec 59.4

**PT I55 conjunto 2015-19 + 2023-25** — years used: 2015, 2016, 2017, 2018, 2019, 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 47.4 | 49.0 | 70.2 | 89.9 | 110.8 | 123.4 | 155.4 | 188.1 | 138.4 | 109.7 | 62.5 | 55.2 |
| 2016 | 46.9 | 52.5 | 74.4 | 85.8 | 108.8 | 121.8 | 156.1 | 181.8 | 135.1 | 110.3 | 67.5 | 59.1 |
| 2017 | 46.5 | 52.0 | 70.6 | 96.2 | 111.1 | 122.4 | 149.9 | 171.7 | 138.5 | 115.4 | 66.9 | 58.8 |
| 2018 | 45.5 | 50.8 | 74.7 | 92.1 | 115.1 | 123.8 | 153.1 | 169.1 | 140.3 | 113.1 | 66.5 | 55.9 |
| 2019 | 49.0 | 50.5 | 71.9 | 93.4 | 110.5 | 125.7 | 143.3 | 167.4 | 142.1 | 110.7 | 70.3 | 65.0 |
| 2023 | 46.6 | 50.9 | 71.5 | 100.3 | 114.8 | 127.1 | 149.5 | 163.5 | 133.0 | 114.7 | 67.7 | 60.3 |
| 2024 | 46.3 | 52.6 | 77.0 | 92.8 | 117.6 | 124.7 | 146.2 | 164.1 | 137.5 | 113.1 | 69.2 | 58.9 |
| 2025 | 49.1 | 51.2 | 71.0 | 97.0 | 120.3 | 126.0 | 151.5 | 162.0 | 136.2 | 111.9 | 65.0 | 58.9 |
| **mean** | **47.2** | **51.2** | **72.7** | **93.5** | **113.6** | **124.4** | **150.6** | **171.0** | **137.6** | **112.4** | **66.9** | **59.0** |
| min | 45.5 | 49.0 | 70.2 | 85.8 | 108.8 | 121.8 | 143.3 | 162.0 | 133.0 | 109.7 | 62.5 | 55.2 |
| max | 49.1 | 52.6 | 77.0 | 100.3 | 120.3 | 127.1 | 156.1 | 188.1 | 142.1 | 115.4 | 70.3 | 65.0 |
| std (sample) | 1.3 | 1.2 | 2.4 | 4.5 | 4.0 | 1.9 | 4.4 | 9.3 | 2.9 | 2.1 | 2.4 | 3.0 |
peak Aug 171.0; trough Jan 47.2; Aug/Jan 3.625; Mar 72.7 Apr 93.5; Nov 66.9 Dec 59.0

- Portugal secção I (alojamento + restauração), valores brutos e índices — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I&format=JSON&lang=EN&sinceTimePeriod=2010-01):

### PT I — NETTUR, NSA, I21 (2021=100), valores exactos
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2010 | 101.5 | 96.3 | 113.9 | 121.3 | 134.4 | 138.5 | 164.1 | 194.4 | 148.1 | 125.8 | 101.7 | 111.5 | 129.3 |
| 2011 | 96.6 | 93.4 | 112.5 | 123.6 | 130.7 | 139.8 | 166.1 | 192.2 | 147.2 | 122.6 | 95.2 | 103.5 | 126.9 |
| 2012 | 81.6 | 80.8 | 92.7 | 99.3 | 111.2 | 117.4 | 141.5 | 165.5 | 129.1 | 105.5 | 81.0 | 86.0 | 107.6 |
| 2013 | 72.4 | 73.4 | 88.2 | 92.4 | 109.4 | 116.9 | 139.4 | 166.1 | 124.8 | 102.8 | 82.2 | 89.6 | 104.8 |
| 2014 | 73.1 | 70.9 | 86.9 | 97.9 | 117.6 | 123.1 | 145.8 | 175.9 | 137.6 | 116.7 | 87.0 | 98.2 | 110.9 |
| 2015 | 83.5 | 80.8 | 98.3 | 110.3 | 128.5 | 131.3 | 158.1 | 185.1 | 141.8 | 122.6 | 94.9 | 102.6 | 119.8 |
| 2016 | 90.3 | 91.9 | 112.3 | 119.5 | 138.1 | 142.6 | 178.8 | 202.4 | 161.8 | 144.0 | 111.4 | 117.7 | 134.2 |
| 2017 | 100.6 | 101.1 | 118.8 | 142.8 | 153.9 | 162.6 | 190.7 | 211.8 | 178.2 | 156.3 | 120.5 | 126.1 | 147.0 |
| 2018 | 106.3 | 104.6 | 128.7 | 142.4 | 165.8 | 170.9 | 198.5 | 219.3 | 185.7 | 159.7 | 121.9 | 132.6 | 153.0 |
| 2019 | 112.5 | 111.7 | 138.4 | 154.1 | 172.5 | 183.8 | 201.5 | 232.8 | 197.4 | 168.8 | 133.9 | 145.2 | 162.7 |
| 2020 | 116.2 | 119.1 | 66.4 | 25.4 | 42.5 | 65.4 | 97.1 | 140.3 | 110.4 | 92.9 | 64.4 | 82.1 | 85.2 |
| 2021 | 49.7 | 34.0 | 43.7 | 59.7 | 91.5 | 108.9 | 125.9 | 173.5 | 140.2 | 142.4 | 117.7 | 112.9 | 100.0 |
| 2022 | 88.5 | 100.4 | 121.6 | 154.7 | 170.1 | 186.4 | 219.8 | 240.6 | 201.0 | 185.1 | 145.9 | 155.3 | 164.1 |
| 2023 | 129.7 | 128.6 | 156.5 | 186.1 | 200.7 | 211.6 | 242.1 | 262.3 | 217.8 | 198.5 | 156.0 | 166.1 | 188.0 |
| 2024 | 138.0 | 140.3 | 173.6 | 185.9 | 218.8 | 222.7 | 251.8 | 278.1 | 237.5 | 211.7 | 169.4 | 172.8 | 200.0 |
| 2025 | 146.9 | 142.8 | 173.9 | 197.3 | 230.0 | 234.7 | 267.8 | 290.4 | 244.0 | 221.7 | 172.9 | 178.8 | 208.4 |
| 2026 | 149.2 | 143.4 | 177.6 | 201.4 | 229.7 | 234.6 | 265.0 | 284.6 | 239.8 |  |  |  | n/c |

**PT I 2015-2019** — years used: 2015, 2016, 2017, 2018, 2019
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 69.7 | 67.4 | 82.0 | 92.1 | 107.2 | 109.6 | 132.0 | 154.5 | 118.3 | 102.3 | 79.2 | 85.6 |
| 2016 | 67.3 | 68.5 | 83.7 | 89.0 | 102.9 | 106.2 | 133.2 | 150.8 | 120.5 | 107.3 | 83.0 | 87.7 |
| 2017 | 68.5 | 68.8 | 80.8 | 97.2 | 104.7 | 110.6 | 129.8 | 144.1 | 121.3 | 106.4 | 82.0 | 85.8 |
| 2018 | 69.5 | 68.4 | 84.1 | 93.1 | 108.3 | 111.7 | 129.7 | 143.3 | 121.3 | 104.4 | 79.7 | 86.6 |
| 2019 | 69.1 | 68.6 | 85.1 | 94.7 | 106.0 | 113.0 | 123.8 | 143.1 | 121.3 | 103.7 | 82.3 | 89.2 |
| **mean** | **68.8** | **68.3** | **83.1** | **93.2** | **105.8** | **110.2** | **129.7** | **147.2** | **120.6** | **104.8** | **81.2** | **87.0** |
| min | 67.3 | 67.4 | 80.8 | 89.0 | 102.9 | 106.2 | 123.8 | 143.1 | 118.3 | 102.3 | 79.2 | 85.6 |
| max | 69.7 | 68.8 | 85.1 | 97.2 | 108.3 | 113.0 | 133.2 | 154.5 | 121.3 | 107.3 | 83.0 | 89.2 |
| std (sample) | 1.0 | 0.5 | 1.7 | 3.0 | 2.1 | 2.6 | 3.6 | 5.2 | 1.3 | 2.0 | 1.7 | 1.5 |
peak Aug 147.2; trough Feb 68.3; Aug/Jan 2.139; Mar 83.1 Apr 93.2; Nov 81.2 Dec 87.0

**PT I 2022-2025 (2022 inclui jan-mar distorcidos)** — years used: 2022, 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2022 | 53.9 | 61.2 | 74.1 | 94.3 | 103.6 | 113.6 | 133.9 | 146.6 | 122.5 | 112.8 | 88.9 | 94.6 |
| 2023 | 69.0 | 68.4 | 83.2 | 99.0 | 106.8 | 112.6 | 128.8 | 139.5 | 115.9 | 105.6 | 83.0 | 88.4 |
| 2024 | 69.0 | 70.1 | 86.8 | 92.9 | 109.4 | 111.3 | 125.9 | 139.0 | 118.7 | 105.8 | 84.7 | 86.4 |
| 2025 | 70.5 | 68.5 | 83.4 | 94.7 | 110.3 | 112.6 | 128.5 | 139.3 | 117.1 | 106.4 | 83.0 | 85.8 |
| **mean** | **65.6** | **67.1** | **81.9** | **95.2** | **107.5** | **112.5** | **129.3** | **141.1** | **118.5** | **107.6** | **84.9** | **88.8** |
| min | 53.9 | 61.2 | 74.1 | 92.9 | 103.6 | 111.3 | 125.9 | 139.0 | 115.9 | 105.6 | 83.0 | 85.8 |
| max | 70.5 | 70.1 | 86.8 | 99.0 | 110.3 | 113.6 | 133.9 | 146.6 | 122.5 | 112.8 | 88.9 | 94.6 |
| std (sample) | 7.8 | 4.0 | 5.4 | 2.6 | 3.0 | 0.9 | 3.4 | 3.7 | 2.9 | 3.4 | 2.8 | 4.0 |
peak Aug 141.1; trough Jan 65.6; Aug/Jan 2.151; Mar 81.9 Apr 95.2; Nov 84.9 Dec 88.8

**PT I 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 69.0 | 68.4 | 83.2 | 99.0 | 106.8 | 112.6 | 128.8 | 139.5 | 115.9 | 105.6 | 83.0 | 88.4 |
| 2024 | 69.0 | 70.1 | 86.8 | 92.9 | 109.4 | 111.3 | 125.9 | 139.0 | 118.7 | 105.8 | 84.7 | 86.4 |
| 2025 | 70.5 | 68.5 | 83.4 | 94.7 | 110.3 | 112.6 | 128.5 | 139.3 | 117.1 | 106.4 | 83.0 | 85.8 |
| **mean** | **69.5** | **69.0** | **84.5** | **95.5** | **108.8** | **112.2** | **127.7** | **139.3** | **117.2** | **105.9** | **83.5** | **86.8** |
| min | 69.0 | 68.4 | 83.2 | 92.9 | 106.8 | 111.3 | 125.9 | 139.0 | 115.9 | 105.6 | 83.0 | 85.8 |
| max | 70.5 | 70.1 | 86.8 | 99.0 | 110.3 | 112.6 | 128.8 | 139.5 | 118.7 | 106.4 | 84.7 | 88.4 |
| std (sample) | 0.9 | 1.0 | 2.0 | 3.1 | 1.9 | 0.7 | 1.6 | 0.3 | 1.4 | 0.4 | 1.0 | 1.3 |
peak Aug 139.3; trough Feb 69.0; Aug/Jan 2.005; Mar 84.5 Apr 95.5; Nov 83.5 Dec 86.8

**PT I conjunto 2015-19 + 2023-25** — years used: 2015, 2016, 2017, 2018, 2019, 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 69.7 | 67.4 | 82.0 | 92.1 | 107.2 | 109.6 | 132.0 | 154.5 | 118.3 | 102.3 | 79.2 | 85.6 |
| 2016 | 67.3 | 68.5 | 83.7 | 89.0 | 102.9 | 106.2 | 133.2 | 150.8 | 120.5 | 107.3 | 83.0 | 87.7 |
| 2017 | 68.5 | 68.8 | 80.8 | 97.2 | 104.7 | 110.6 | 129.8 | 144.1 | 121.3 | 106.4 | 82.0 | 85.8 |
| 2018 | 69.5 | 68.4 | 84.1 | 93.1 | 108.3 | 111.7 | 129.7 | 143.3 | 121.3 | 104.4 | 79.7 | 86.6 |
| 2019 | 69.1 | 68.6 | 85.1 | 94.7 | 106.0 | 113.0 | 123.8 | 143.1 | 121.3 | 103.7 | 82.3 | 89.2 |
| 2023 | 69.0 | 68.4 | 83.2 | 99.0 | 106.8 | 112.6 | 128.8 | 139.5 | 115.9 | 105.6 | 83.0 | 88.4 |
| 2024 | 69.0 | 70.1 | 86.8 | 92.9 | 109.4 | 111.3 | 125.9 | 139.0 | 118.7 | 105.8 | 84.7 | 86.4 |
| 2025 | 70.5 | 68.5 | 83.4 | 94.7 | 110.3 | 112.6 | 128.5 | 139.3 | 117.1 | 106.4 | 83.0 | 85.8 |
| **mean** | **69.1** | **68.6** | **83.6** | **94.1** | **107.0** | **110.9** | **128.9** | **144.2** | **119.3** | **105.2** | **82.1** | **86.9** |
| min | 67.3 | 67.4 | 80.8 | 89.0 | 102.9 | 106.2 | 123.8 | 139.0 | 115.9 | 102.3 | 79.2 | 85.6 |
| max | 70.5 | 70.1 | 86.8 | 99.0 | 110.3 | 113.0 | 133.2 | 154.5 | 121.3 | 107.3 | 84.7 | 89.2 |
| std (sample) | 0.9 | 0.7 | 1.8 | 3.1 | 2.4 | 2.2 | 3.0 | 5.7 | 2.1 | 1.6 | 1.8 | 1.3 |
peak Aug 144.2; trough Feb 68.6; Aug/Jan 2.088; Mar 83.6 Apr 94.1; Nov 82.1 Dec 86.9

- Séries deflacionadas I55 e I (só desde 2021) — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I55&format=JSON&lang=EN&sinceTimePeriod=2010-01):

### PT I55 — VOL_SLS (deflacionado), NSA, I21
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021 | 27.8 | 19.3 | 25.0 | 34.5 | 70.1 | 114.4 | 140.4 | 226.0 | 167.3 | 167.5 | 119.2 | 88.6 | 100.0 |
| 2022 | 62.2 | 80.9 | 117.7 | 155.8 | 179.0 | 191.7 | 230.6 | 242.0 | 194.2 | 179.9 | 134.4 | 133.0 | 158.5 |
| 2023 | 103.4 | 108.6 | 138.7 | 158.0 | 169.7 | 181.7 | 218.4 | 217.2 | 186.8 | 171.8 | 122.4 | 120.2 | 158.1 |
| 2024 | 102.4 | 111.8 | 145.4 | 152.4 | 160.5 | 180.3 | 219.5 | 237.0 | 185.2 | 168.5 | 125.3 | 117.2 | 158.8 |
| 2025 | 104.9 | 109.9 | 140.4 | 163.3 | 185.0 | 196.1 | 236.4 | 244.3 | 207.9 | 186.9 | 128.0 | 118.4 | 168.5 |
| 2026 | 102.6 | 106.4 | 137.3 | 154.7 | 173.2 | 184.1 | 216.8 | 228.7 | 189.2 |  |  |  | n/c |

**PT I55 VOL_SLS 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 65.4 | 68.7 | 87.7 | 100.0 | 107.4 | 114.9 | 138.2 | 137.4 | 118.2 | 108.7 | 77.4 | 76.0 |
| 2024 | 64.5 | 70.4 | 91.6 | 96.0 | 101.1 | 113.5 | 138.2 | 149.3 | 116.6 | 106.1 | 78.9 | 73.8 |
| 2025 | 62.3 | 65.2 | 83.3 | 96.9 | 109.8 | 116.4 | 140.3 | 145.0 | 123.4 | 110.9 | 76.0 | 70.3 |
| **mean** | **64.1** | **68.1** | **87.6** | **97.6** | **106.1** | **115.0** | **138.9** | **143.9** | **119.4** | **108.6** | **77.4** | **73.4** |
| min | 62.3 | 65.2 | 83.3 | 96.0 | 101.1 | 113.5 | 138.2 | 137.4 | 116.6 | 106.1 | 76.0 | 70.3 |
| max | 65.4 | 70.4 | 91.6 | 100.0 | 109.8 | 116.4 | 140.3 | 149.3 | 123.4 | 110.9 | 78.9 | 76.0 |
| std (sample) | 1.6 | 2.6 | 4.1 | 2.1 | 4.5 | 1.4 | 1.2 | 6.0 | 3.6 | 2.4 | 1.5 | 2.9 |
peak Aug 143.9; trough Jan 64.1; Aug/Jan 2.246; Mar 87.6 Apr 97.6; Nov 77.4 Dec 73.4

### PT I — VOL_SLS (deflacionado), NSA, I21
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021 | 51.7 | 35.4 | 45.3 | 60.8 | 92.6 | 109.5 | 124.6 | 167.1 | 137.4 | 141.7 | 119.5 | 114.4 | 100.0 |
| 2022 | 89.0 | 99.6 | 118.7 | 140.7 | 151.9 | 156.5 | 181.5 | 193.3 | 159.4 | 152.7 | 128.8 | 140.7 | 142.7 |
| 2023 | 116.8 | 114.0 | 134.1 | 147.0 | 153.8 | 158.6 | 181.3 | 189.2 | 160.6 | 150.4 | 128.2 | 140.4 | 147.9 |
| 2024 | 117.2 | 117.5 | 139.5 | 141.5 | 155.2 | 159.7 | 181.9 | 197.1 | 164.4 | 153.1 | 132.7 | 138.9 | 149.9 |
| 2025 | 117.2 | 113.6 | 134.4 | 143.0 | 160.0 | 163.1 | 184.7 | 197.5 | 166.3 | 157.5 | 130.6 | 135.7 | 150.3 |
| 2026 | 114.3 | 109.0 | 131.5 | 140.9 | 156.7 | 157.5 | 177.6 | 187.4 | 156.2 |  |  |  | n/c |

**PT I VOL_SLS 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 79.0 | 77.1 | 90.7 | 99.4 | 104.0 | 107.3 | 122.6 | 128.0 | 108.6 | 101.7 | 86.7 | 95.0 |
| 2024 | 78.2 | 78.4 | 93.1 | 94.4 | 103.5 | 106.5 | 121.4 | 131.5 | 109.7 | 102.1 | 88.5 | 92.7 |
| 2025 | 78.0 | 75.6 | 89.4 | 95.1 | 106.5 | 108.5 | 122.9 | 131.4 | 110.6 | 104.8 | 86.9 | 90.3 |
| **mean** | **78.4** | **77.0** | **91.1** | **96.3** | **104.7** | **107.4** | **122.3** | **130.3** | **109.6** | **102.9** | **87.4** | **92.6** |
| min | 78.0 | 75.6 | 89.4 | 94.4 | 103.5 | 106.5 | 121.4 | 128.0 | 108.6 | 101.7 | 86.7 | 90.3 |
| max | 79.0 | 78.4 | 93.1 | 99.4 | 106.5 | 108.5 | 122.9 | 131.5 | 110.6 | 104.8 | 88.5 | 95.0 |
| std (sample) | 0.5 | 1.4 | 1.9 | 2.7 | 1.6 | 1.0 | 0.8 | 2.0 | 1.0 | 1.7 | 1.0 | 2.3 |
peak Aug 130.3; trough Feb 77.0; Aug/Jan 1.662; Mar 91.1 Apr 96.3; Nov 87.4 Dec 92.6

- Espanha I56 (dados até Ago/2026) — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=ES&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01):

### ES I56 — NETTUR, NSA, I21
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 96.7 | 91.0 | 103.8 | 107.6 | 116.1 | 114.9 | 124.4 | 122.3 | 115.8 | 115.7 | 105.0 | 116.8 | 110.8 |
| 2016 | 103.7 | 99.0 | 111.2 | 112.0 | 121.3 | 124.1 | 133.7 | 129.7 | 125.6 | 122.5 | 110.3 | 122.7 | 118.0 |
| 2017 | 104.9 | 101.5 | 114.4 | 121.8 | 125.8 | 134.2 | 141.0 | 136.9 | 132.2 | 126.6 | 114.1 | 127.1 | 123.4 |
| 2018 | 108.9 | 105.0 | 121.2 | 121.2 | 132.1 | 137.0 | 144.9 | 141.5 | 137.2 | 130.4 | 117.6 | 134.4 | 127.6 |
| 2019 | 113.2 | 109.7 | 126.7 | 127.0 | 136.3 | 143.9 | 151.6 | 146.5 | 138.2 | 131.7 | 123.3 | 137.7 | 132.2 |
| 2020 | 118.0 | 117.1 | 53.0 | 8.0 | 23.0 | 70.3 | 98.8 | 103.7 | 90.1 | 79.2 | 58.7 | 74.8 | 74.6 |
| 2021 | 55.1 | 51.3 | 74.7 | 77.9 | 96.7 | 108.6 | 128.4 | 135.4 | 125.3 | 125.2 | 107.8 | 113.6 | 100.0 |
| 2022 | 97.3 | 102.6 | 114.1 | 129.3 | 136.1 | 143.0 | 157.5 | 154.2 | 140.5 | 137.1 | 121.5 | 137.2 | 130.9 |
| 2023 | 117.3 | 115.0 | 133.3 | 142.3 | 144.8 | 154.6 | 167.4 | 162.0 | 153.0 | 147.9 | 130.3 | 149.6 | 143.1 |
| 2024 | 125.5 | 126.5 | 146.7 | 144.2 | 158.8 | 166.0 | 175.4 | 177.5 | 160.4 | 154.9 | 139.5 | 153.4 | 152.4 |
| 2025 | 131.3 | 129.0 | 145.1 | 155.0 | 168.6 | 170.5 | 182.5 | 179.8 | 162.2 | 162.4 | 144.0 | 154.9 | 157.1 |
| 2026 | 137.4 | 132.5 | 152.2 | 162.4 | 174.1 | 172.6 | 184.2 | 180.8 |  |  |  |  | n/c |

**ES I56 2015-2019** — years used: 2015, 2016, 2017, 2018, 2019
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2015 | 87.2 | 82.1 | 93.6 | 97.1 | 104.7 | 103.7 | 112.2 | 110.3 | 104.5 | 104.4 | 94.7 | 105.4 |
| 2016 | 87.9 | 83.9 | 94.3 | 94.9 | 102.8 | 105.2 | 113.3 | 109.9 | 106.5 | 103.8 | 93.5 | 104.0 |
| 2017 | 85.0 | 82.3 | 92.7 | 98.7 | 102.0 | 108.8 | 114.3 | 111.0 | 107.2 | 102.6 | 92.5 | 103.0 |
| 2018 | 85.3 | 82.3 | 95.0 | 95.0 | 103.5 | 107.4 | 113.5 | 110.9 | 107.5 | 102.2 | 92.2 | 105.3 |
| 2019 | 85.7 | 83.0 | 95.9 | 96.1 | 103.1 | 108.9 | 114.7 | 110.9 | 104.6 | 99.7 | 93.3 | 104.2 |
| **mean** | **86.2** | **82.7** | **94.3** | **96.4** | **103.2** | **106.8** | **113.6** | **110.6** | **106.0** | **102.5** | **93.2** | **104.4** |
| min | 85.0 | 82.1 | 92.7 | 94.9 | 102.0 | 103.7 | 112.2 | 109.9 | 104.5 | 99.7 | 92.2 | 103.0 |
| max | 87.9 | 83.9 | 95.9 | 98.7 | 104.7 | 108.9 | 114.7 | 111.0 | 107.5 | 104.4 | 94.7 | 105.4 |
| std (sample) | 1.3 | 0.8 | 1.2 | 1.6 | 1.0 | 2.3 | 1.0 | 0.4 | 1.4 | 1.8 | 1.0 | 1.0 |
peak Jul 113.6; trough Feb 82.7; Aug/Jan 1.283; Mar 94.3 Apr 96.4; Nov 93.2 Dec 104.4

**ES I56 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 82.0 | 80.3 | 93.1 | 99.4 | 101.2 | 108.0 | 117.0 | 113.2 | 106.9 | 103.3 | 91.0 | 104.5 |
| 2024 | 82.3 | 83.0 | 96.3 | 94.6 | 104.2 | 108.9 | 115.1 | 116.5 | 105.2 | 101.6 | 91.5 | 100.7 |
| 2025 | 83.6 | 82.1 | 92.4 | 98.7 | 107.3 | 108.5 | 116.2 | 114.4 | 103.2 | 103.4 | 91.7 | 98.6 |
| **mean** | **82.6** | **81.8** | **93.9** | **97.6** | **104.2** | **108.5** | **116.1** | **114.7** | **105.1** | **102.8** | **91.4** | **101.3** |
| min | 82.0 | 80.3 | 92.4 | 94.6 | 101.2 | 108.0 | 115.1 | 113.2 | 103.2 | 101.6 | 91.0 | 98.6 |
| max | 83.6 | 83.0 | 96.3 | 99.4 | 107.3 | 108.9 | 117.0 | 116.5 | 106.9 | 103.4 | 91.7 | 104.5 |
| std (sample) | 0.8 | 1.4 | 2.1 | 2.6 | 3.1 | 0.5 | 0.9 | 1.7 | 1.8 | 1.0 | 0.3 | 3.0 |
peak Jul 116.1; trough Feb 81.8; Aug/Jan 1.388; Mar 93.9 Apr 97.6; Nov 91.4 Dec 101.3

- Itália I56 (série só desde 2021; dados até Ago/2026) — [E1](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=IT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01):

### IT I56 — NETTUR, NSA, I21
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021 | 41.7 | 55.3 | 61.2 | 82.0 | 83.9 | 98.0 | 151.6 | 124.2 | 146.3 | 119.0 | 106.9 | 129.9 | 100.0 |
| 2022 | 72.7 | 89.9 | 137.4 | 128.6 | 165.1 | 151.5 | 170.7 | 152.0 | 174.2 | 148.7 | 128.6 | 156.3 | 139.6 |
| 2023 | 96.0 | 111.0 | 169.5 | 155.0 | 179.5 | 163.9 | 186.3 | 161.0 | 191.2 | 160.6 | 141.1 | 163.4 | 156.5 |
| 2024 | 102.3 | 121.9 | 181.0 | 155.7 | 195.9 | 167.7 | 184.8 | 166.8 | 192.7 | 162.3 | 150.9 | 169.7 | 162.6 |
| 2025 | 100.0 | 119.1 | 182.2 | 159.1 | 204.0 | 175.3 | 188.6 | 170.0 | 195.5 | 164.5 | 151.1 | 172.3 | 165.1 |
| 2026 | 101.5 | 121.4 | 181.4 | 161.2 | 210.9 | 172.1 | 189.9 | 167.7 |  |  |  |  | n/c |

**IT I56 2023-2025** — years used: 2023, 2024, 2025
| Stat | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | 61.3 | 70.9 | 108.3 | 99.0 | 114.7 | 104.7 | 119.0 | 102.8 | 122.1 | 102.6 | 90.1 | 104.4 |
| 2024 | 62.9 | 75.0 | 111.3 | 95.7 | 120.4 | 103.1 | 113.6 | 102.6 | 118.5 | 99.8 | 92.8 | 104.3 |
| 2025 | 60.6 | 72.1 | 110.3 | 96.3 | 123.5 | 106.2 | 114.2 | 102.9 | 118.4 | 99.6 | 91.5 | 104.3 |
| **mean** | **61.6** | **72.7** | **110.0** | **97.0** | **119.5** | **104.7** | **115.6** | **102.8** | **119.7** | **100.7** | **91.5** | **104.4** |
| min | 60.6 | 70.9 | 108.3 | 95.7 | 114.7 | 103.1 | 113.6 | 102.6 | 118.4 | 99.6 | 90.1 | 104.3 |
| max | 62.9 | 75.0 | 111.3 | 99.0 | 123.5 | 106.2 | 119.0 | 102.9 | 122.1 | 102.6 | 92.8 | 104.4 |
| std (sample) | 1.2 | 2.1 | 1.5 | 1.7 | 4.5 | 1.5 | 3.0 | 0.2 | 2.1 | 1.7 | 1.3 | 0.0 |
peak Sep 119.7; trough Jan 61.6; Aug/Jan 1.669; Mar 110.0 Apr 97.0; Nov 91.5 Dec 104.4

- Produção nos serviços PT I56 (`sts_sepr_m`), para referência — [E2](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_sepr_m?geo=PT&nace_r2=I56&format=JSON&lang=EN&sinceTimePeriod=2010-01):

### PT I56 — PRD (sts_sepr_m), NSA, I21
| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021 | 62.4 | 42.6 | 54.4 | 72.5 | 102.4 | 107.1 | 117.5 | 140.8 | 124.2 | 130.3 | 119.7 | 126.1 | 100.0 |
| 2022 | 100.9 | 108.0 | 119.3 | 133.9 | 139.8 | 140.8 | 159.5 | 171.3 | 143.9 | 140.5 | 126.4 | 144.2 | 135.7 |
| 2023 | 122.7 | 116.4 | 132.1 | 141.9 | 146.6 | 148.3 | 164.4 | 176.3 | 148.7 | 140.9 | 130.7 | 149.3 | 143.2 |
| 2024 | 123.7 | 119.9 | 136.8 | 136.5 | 152.8 | 150.5 | 164.9 | 178.9 | 154.8 | 146.0 | 135.7 | 148.4 | 145.7 |
| 2025 | 122.6 | 115.1 | 131.5 | 133.7 | 148.7 | 148.2 | 161.3 | 176.0 | 147.5 | 144.2 | 131.6 | 143.0 | 141.9 |
| 2026 | 119.2 | 109.9 | 128.7 | 134.5 | 148.9 | 145.3 | 159.8 | 168.5 | 141.2 |  |  |  | n/c |

### Inferences
- No alojamento, a série deflacionada é muito menos sazonal do que a nominal (Agosto 2023–25 = 143,9 em volume contra 163,2 em valor), porque os preços dos hotéis sobem no Verão. Na restauração essa diferença quase não existe (Agosto 123,5 em volume contra 124,3 em valor), ou seja, a sazonalidade da restauração é de quantidade e não de preço.
- O perfil mensal de Itália I56 é irregular (Março > Abril, Maio > Junho, Setembro > Agosto em todos os anos), com um padrão que se repete de três em três meses. Parece um artefacto de compilação (por exemplo, declarações trimestrais concentradas no último mês do trimestre) e não sazonalidade real; não deve ser usado como comparador. Isto é uma interpretação minha, não confirmada em documentação.
- Espanha tem pico em Julho (não em Agosto) e amplitude menor (Julho 113,6 em 2015–19 e 116,1 em 2023–25; Fevereiro 82,7 e 81,8).

### Gaps
- Não verifiquei a metodologia italiana para confirmar a causa do padrão trimestral.

## 6. Verificação cruzada com o INE e existência de indicador regional

### Takeaway
O INE publica a mesma série (é a fonte do Eurostat): as taxas de variação mensal do índice bruto do INE coincidem com as implícitas no Eurostat, e o índice deflacionado coincide exactamente. **Não existe indicador mensal regional** (NUTS II, Grande Lisboa ou AML) do volume de negócios da restauração: a única geografia destes indicadores é "Portugal".

### Cited Findings
- Indicador INE 0012794, "Índice de volume de negócios nos serviços - bruto (Taxa de variação mensal - Base 2021 - %) por Atividade económica (CAE Rev. 3); Mensal", fonte "Índices de volume de negócios e emprego (Base 2021)"; Fev/2005 → Set/2026; actualizado em 13/11/2026 — [I3](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0012794&lang=PT)
- Comparei a taxa de variação mensal do INE para a CAE 56 com a variação implícita na série Eurostat PT I56 NETTUR NSA I21 em 141 meses (Jan/2015 → Set/2026): só um mês difere mais de 0,15 pontos percentuais (Mai/2020: INE 73,5 % contra 73,27 % implícito, diferença de arredondamento sobre uma base muito baixa). Exemplo de 2025 no INE: Jan −16,1; Fev −5,5; Mar +15,0; Abr +2,0; Mai +11,7; Jun 0,0; Jul +9,4; Ago +9,7; Set −16,0; Out −2,0; Nov −8,3; Dez +9,0 — [I1](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012794&Dim1=T&Dim3=56&lang=PT)
- Indicador INE 0014390, "Índice de volume de negócios nos serviços - bruto deflacionado (Base - 2021) por Atividade económica (CAE Rev. 3); Mensal", Jan/2021 → Set/2026: os 69 meses da CAE 56 coincidem com a série Eurostat `VOL_SLS` NSA I21 (nenhuma diferença acima de 0,05; o INE publica com duas casas decimais, por exemplo Ago/2025 = 176,72 e Ago/2026 = 169,05) — [I2](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0014390&Dim1=T&Dim3=56&lang=PT)
- Na metainformação dos indicadores 0012794, 0012795 (taxa homóloga), 0012796 (taxa média anual), 0012797 (emprego) e 0014390, a dimensão geográfica tem uma única categoria, "PT – Portugal", e a dimensão de actividade inclui, na secção I, apenas "I – Alojamento, restauração e similares", "55 – Alojamento" e "56 – Restauração e similares" — [I3](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0014390&lang=PT)
- Outros códigos da mesma família referidos em catálogos: 0014392 (taxa mensal, deflacionado) e 0014393 (taxa homóloga, deflacionado) — [dados.gov.pt](https://dados.gov.pt/en/datasets/indice-de-volume-de-negocios-nos-servicos-bruto-deflacionado-base-2021/) (catálogo de terceiros; não verificados no INE nesta sessão)

### Inferences
- Como as taxas mensais e o índice deflacionado coincidem, a série Eurostat usada nas secções 2–5 é a série do INE; a verificação cruzada não é uma segunda medição independente, é a confirmação de que os valores descarregados estão correctos.
- Para a sazonalidade de Lisboa não há série oficial mensal de volume de negócios; seria preciso recorrer a indicadores indirectos (por exemplo dormidas por região, que o INE publica mensalmente por NUTS II), o que está fora deste âmbito.

### Gaps
- **Não encontrei o código do indicador INE do índice bruto em nível** ("Índice de volume de negócios nos serviços - bruto (Base - 2021)"). A pesquisa do portal do INE não devolveu resultados utilizáveis por script e os códigos vizinhos (0012786–0012793) são de outros inquéritos. A verificação foi por isso feita com a taxa de variação mensal (0012794) e com o índice deflacionado (0014390), não com o índice bruto em nível.
- A conclusão "não há indicador regional" baseia-se na metainformação desta família de indicadores (geografia só "Portugal") e não numa pesquisa exaustiva do catálogo do INE, que não consegui percorrer. Não vi nenhum indício de um indicador mensal regional de restauração.
- Desagregação 56.1 / 56.3: não existe em nenhuma das duas fontes, por isso a comparação restaurantes vs bares não pôde ser feita.
