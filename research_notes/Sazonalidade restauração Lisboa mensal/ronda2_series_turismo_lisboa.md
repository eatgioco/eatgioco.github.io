# Ronda 2 — Séries mensais oficiais de turismo em Lisboa (INE + Eurostat) e índices sazonais

Data de extração de todos os dados: **16 Nov 2026** (curl, API JSON do INE e API de disseminação do Eurostat). Todos os valores abaixo foram descarregados e calculados por script; nenhum foi escrito à mão nem estimado.

**Método do índice sazonal:** para cada ano completo (12 meses), índice do mês = valor do mês ÷ média mensal desse ano × 100; depois média simples dos índices entre anos completos elegíveis (2018, 2019, 2022, 2023, 2024, 2025; 2020 e 2021 mostrados mas excluídos — COVID). Mín/Máx = extremos entre esses anos. "Quota do ano" = índice médio ÷ 12. Ago÷Jan = rácio dos valores brutos em cada ano, depois média. 2026 é parcial e não entra nos índices. Dado que **Jan–Fev de 2022 ainda estão deprimidos pela Ómicron** (índice de Jan 2022 ≈ 36 vs ≈ 62–70 nos outros anos), cada tabela traz também a linha "Média sem 2022" — é a que recomendo usar para os meses de Jan–Mar.

**URLs exactos dos pedidos** (padrões; `{P}` = lista de períodos separada por vírgulas, ex. `S3A201801,…,S3A201812`, um pedido por ano):
- INE dormidas AML/Portugal (NUTS 2013, desde Jan 2017): `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0009808&Dim1={P}&Dim2=17,PT&Dim3=T`
- INE hóspedes AML/Portugal: `…varcd=0009812&Dim1={P}&Dim2=17,PT&Dim3=T`
- INE dormidas município de Lisboa + Grande Lisboa (NUTS 2024, desde Jan 2022): `…varcd=0012088&Dim1={P}&Dim2=1A01106,1A&Dim3=T`
- INE hóspedes município de Lisboa + Grande Lisboa: `…varcd=0012089&Dim1={P}&Dim2=1A01106,1A&Dim3=T`
- INE dormidas / hóspedes município de Lisboa, série NUTS 2013 (desde Jan 2020): `…varcd=0010735` / `0010736` `&Dim1={P}&Dim2=1701106,17&Dim3=T`
- INE Portugal por local de residência (desde Jan 2013): dormidas `…varcd=0010415&Dim1={P}&Dim2=PT&Dim3=T,PT,E`; hóspedes `…varcd=0010416…`
- Metadados: `https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=<código>&lang=PT`
- Eurostat NUTS 2 mensal: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nin2m?geo=PT17&geo=PT1A&geo=PT1B&geo=PT&sinceTimePeriod=2018-01&format=JSON&lang=EN`
- Eurostat Portugal mensal: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nim?geo=PT&sinceTimePeriod=2018-01&format=JSON&lang=EN` (filtro usado: nace_r2=I551-I553, unit=NR)
- Eurostat aeroporto: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/avia_paoa?rep_airp=PT_LPPT&freq=M&sinceTimePeriod=2018-01&format=JSON&lang=EN` (filtro: unit=PAS, tra_meas=PAS_CRD, schedule=TOTAL, tra_cov=TOTAL e INTL)

## 1. Que indicadores existem e o que cobrem (códigos INE / datasets Eurostat)

### Takeaway
O INE só publica na API dados mensais ao nível do **município de Lisboa desde Jan 2020** (0010735/0010736) e, na NUTS 2024, desde Jan 2022 (0012088/0012089); para 2018–2019 o nível mais fino disponível é a **AML (NUTS II 2013, código 17)**. A separação residentes / não residentes para a região de Lisboa só existe no Eurostat `tour_occ_nin2m` (2020–2025).

### Cited Findings
- 0009808 = "Dormidas (N.º) nos estabelecimentos de alojamento turístico por Localização geográfica (NUTS - 2013) e Tipo; Mensal", Jan 2017 → Set 2026, última actualização 2026-10-30; nível geográfico máximo NUTS II (AML = código 17). Jan–Ago 2026 provisórios, Set 2026 preliminar. Inclui alojamento local só com 10 ou mais camas — [INE metadados 0009808](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0009808&lang=PT)
- 0009812 = hóspedes, mesma estrutura — [INE lista de indicadores, tema Turismo](https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_base_dados&bdnivelgeo=00&contexto=bd&bdtemas=1713&bdfreetext=Palavra%28s%29+a+encontrar&bdind_por_pagina=200&xlang=pt)
- 0012088 (dormidas) e 0012089 (hóspedes) "por Localização geográfica (NUTS - 2024) e Segmento; Mensal", nível Município, Jan 2022 → Ago 2026 (actualizado 2026-10-15); município de Lisboa = `1A01106`, Grande Lisboa = `1A`, Península de Setúbal = `1B`. Jan–Jul 2026 provisórios, Ago 2026 preliminar — [INE metadados 0012088](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0012088&lang=PT)
- 0010735 (dormidas) e 0010736 (hóspedes), NUTS 2013 e Segmento, nível Município, Jan 2020 → Ago 2026; Lisboa = `1701106` — [INE metadados 0010735](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0010735&lang=PT). Os valores de 2022–2026 para o município são idênticos aos da 0012088 (verificado nas tabelas abaixo).
- 0010415 (dormidas) e 0010416 (hóspedes) "por Local de residência (Portugal, Estrangeiro); Mensal", Jan 2013 → Set 2026, **só nível Portugal** — [INE metadados 0010415](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0010415&lang=PT)
- Eurostat `tour_occ_nin2m` existe: "Nights spent at tourist accommodation establishments by month and NUTS 2 region (from 2020 onwards)", actualizado 2026-10-20; tem c_resid DOM/FOR/TOTAL; geo PT17 (AML, NUTS 2021) com dados 2020–2022 e PT1A (Grande Lisboa) / PT1B (Península de Setúbal) com dados 2023–2025 — [Eurostat tour_occ_nin2m](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nin2m?geo=PT17&geo=PT1A&geo=PT1B&geo=PT&sinceTimePeriod=2018-01&format=JSON&lang=EN)
- Eurostat `tour_occ_nim` (Portugal, mensal, DOM/FOR/TOTAL) tem dados 2018-01 → 2026-09, actualizado 2026-11-16 — [Eurostat tour_occ_nim](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nim?geo=PT&sinceTimePeriod=2018-01&format=JSON&lang=EN)
- Eurostat `avia_paoa` tem passageiros mensais do aeroporto PT_LPPT 2018-01 → 2026-09 no eixo temporal, mas com valores preenchidos só até Abr 2026 — [Eurostat avia_paoa](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/avia_paoa?rep_airp=PT_LPPT&freq=M&sinceTimePeriod=2018-01&format=JSON&lang=EN)
- Eurostat `mar_pa_qm_pt` (porto de Lisboa, PT_0PTLIS) é **trimestral** e **exclui passageiros de cruzeiro** — [Eurostat mar_pa_qm_pt](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/mar_pa_qm_pt?sinceTimePeriod=2025-Q1&format=JSON&lang=EN)

### Inferences
- A série AML (0009808) é a única que permite 6 anos "limpos" (2018, 2019, 2022–2025) e por isso a análise da Páscoa em Março (2018 e 2024); o município de Lisboa só tem 2022–2025 (uma única Páscoa em Março: 2024).
- Os totais INE Portugal (0010415) e Eurostat (tour_occ_nim, I551-I553) não coincidem (Eurostat mais alto, sobretudo em Jul–Ago e nos residentes) — o agregado Eurostat inclui parques de campismo (I553), que o indicador INE de "alojamento turístico" não inclui. São universos diferentes, não um erro.

### Gaps
- **Município de Lisboa 2018–2019 mensal: não obtido.** Não existe na API do INE (a série municipal começa em Jan 2020). Não tentei os PDFs dos destaques "Atividade turística" por limite de chamadas; fica por confirmar se os destaques de 2018–2019 traziam o município.
- **Residentes vs não residentes para o município de Lisboa: não existe** em nenhum indicador mensal encontrado. O mais próximo é Eurostat Grande Lisboa PT1A (2023–2025) e AML PT17 (2020–2022).
- **Passageiros de aeroporto pelo INE:** não procurei o indicador INE (tema Transportes); usei o Eurostat `avia_paoa`, que é a mesma fonte estatística transmitida pelo INE. Maio–Set 2026 ainda sem valores.
- **Cruzeiros mensais no porto de Lisboa: não obtido** — o dataset Eurostat encontrado é trimestral e exclui cruzeiros.

## 2. Perfil sazonal de Lisboa: pico, vale, Ago÷Jan, quota por mês

### Takeaway
Lisboa é muito menos sazonal do que o país: no município (dormidas, 2023–2025) o índice vai de ~67 em Janeiro a ~120 em Agosto (Ago÷Jan ≈ 1,8), contra 52 → 161 em Portugal (Ago÷Jan ≈ 3,1). De Abril a Outubro Lisboa está sempre acima da média (104–124); Maio, Setembro e Outubro valem quase tanto como Julho.

### Cited Findings
(índices médios; "sem 2022" = 2023–2025 para município/Grande Lisboa, 2018, 2019, 2023–2025 para AML/Portugal/aeroporto)

| Série | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lisboa município, dormidas, 2022–2025 | 59,4 | 71,7 | 94,8 | 106,3 | 114,7 | 109,0 | 116,3 | 123,7 | 116,7 | 117,0 | 92,3 | 77,9 |
| Lisboa município, dormidas, sem 2022 | 67,3 | 76,3 | 98,6 | 106,4 | 114,9 | 106,9 | 112,9 | 120,5 | 114,2 | 115,4 | 90,4 | 76,2 |
| Lisboa município, hóspedes, sem 2022 | 69,6 | 76,2 | 97,3 | 103,9 | 113,8 | 107,9 | 112,4 | 116,0 | 113,6 | 115,6 | 93,6 | 80,1 |
| AML (NUTS 2013), dormidas, 6 anos | 59,8 | 69,1 | 92,3 | 105,1 | 114,1 | 111,1 | 121,6 | 131,6 | 118,2 | 115,1 | 87,4 | 74,6 |
| AML, dormidas, sem 2022 | 64,5 | 71,5 | 94,7 | 104,8 | 114,2 | 109,9 | 119,8 | 130,0 | 116,9 | 113,9 | 86,2 | 73,7 |
| Grande Lisboa PT1A, não residentes (Eurostat 2023–25) | 61,4 | 70,7 | 95,0 | 106,7 | 118,0 | 109,8 | 118,8 | 130,4 | 119,0 | 117,6 | 85,2 | 67,3 |
| Grande Lisboa PT1A, residentes (Eurostat 2023–25) | 80,0 | 85,1 | 97,9 | 100,8 | 102,4 | 101,6 | 112,0 | 111,2 | 101,8 | 104,7 | 99,5 | 102,9 |
| Aeroporto de Lisboa, passageiros, sem 2022 | 78,6 | 78,2 | 93,8 | 102,1 | 106,6 | 108,4 | 116,5 | 118,0 | 112,4 | 108,9 | 88,5 | 88,0 |
| Portugal, dormidas (INE), sem 2022 | 52,3 | 60,9 | 81,3 | 101,4 | 113,0 | 118,9 | 138,7 | 160,6 | 128,1 | 112,2 | 71,4 | 61,1 |

- Município de Lisboa, dormidas (INE 0012088): pico Agosto (123,7), vale Janeiro (59,4); ordem Ago > Out > Set > Jul > Mai > Jun > Abr > Mar > Nov > Dez > Fev > Jan. Ago÷Jan por ano: 2022 = 3,73 (Ómicron), 2023 = 1,70, 2024 = 1,86, 2025 = 1,82. Quotas do ano (média 2022–25, %): Jan 4,95 · Fev 5,98 · Mar 7,90 · Abr 8,86 · Mai 9,56 · Jun 9,08 · Jul 9,69 · Ago 10,31 · Set 9,72 · Out 9,75 · Nov 7,69 · Dez 6,49 — [INE 0012088, município de Lisboa](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0012088&Dim1=S3A202501,S3A202502,S3A202503,S3A202504,S3A202505,S3A202506,S3A202507,S3A202508,S3A202509,S3A202510,S3A202511,S3A202512&Dim2=1A01106,1A&Dim3=T)
- Município de Lisboa em valores absolutos 2025: Jan 896 529 dormidas, Ago 1 629 263, Out 1 552 924, Nov 1 202 991, Dez 1 015 112; total 15 964 064 — [INE 0012088](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0012088&Dim1=S3A202501,S3A202502,S3A202503,S3A202504,S3A202505,S3A202506,S3A202507,S3A202508,S3A202509,S3A202510,S3A202511,S3A202512&Dim2=1A01106,1A&Dim3=T)
- AML dormidas (INE 0009808, 6 anos): pico Agosto 131,6, vale Janeiro 59,8; Ago÷Jan = 2,08 (2018), 2,06 (2019), 3,83 (2022), 1,89 (2023), 2,07 (2024), 1,99 (2025) — [INE 0009808, AML](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0009808&Dim1=S3A201901,S3A201902,S3A201903,S3A201904,S3A201905,S3A201906,S3A201907,S3A201908,S3A201909,S3A201910,S3A201911,S3A201912&Dim2=17,PT&Dim3=T)
- Portugal dormidas (INE 0010415, 6 anos): pico Agosto 162,4, vale Janeiro 49,3, pico÷vale 3,30; residentes Agosto 189,5; não residentes Agosto 150,6 e Janeiro 46,7 — [INE 0010415](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0010415&Dim1=S3A201901,S3A201902,S3A201903,S3A201904,S3A201905,S3A201906,S3A201907,S3A201908,S3A201909,S3A201910,S3A201911,S3A201912&Dim2=PT&Dim3=T,PT,E)
- Grande Lisboa, residentes vs não residentes (Eurostat PT1A, 2023–2025): não residentes pico Agosto 130,4 / vale Janeiro 61,4 (pico÷vale 2,13); residentes quase planos — pico Julho 112,0, vale Janeiro 80,0 (pico÷vale 1,40), com Dezembro a 102,9 — [Eurostat tour_occ_nin2m](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nin2m?geo=PT17&geo=PT1A&geo=PT1B&geo=PT&sinceTimePeriod=2018-01&format=JSON&lang=EN)
- Aeroporto de Lisboa (Eurostat avia_paoa, passageiros transportados, 6 anos): pico Agosto 119,2, vale Janeiro 74,1; Ago÷Jan 1,45–1,58 em todos os anos excepto 2022 (2,43); 2025: 36 083 879 passageiros, Ago 3 493 203, Jan 2 411 662 — [Eurostat avia_paoa](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/avia_paoa?rep_airp=PT_LPPT&freq=M&sinceTimePeriod=2018-01&format=JSON&lang=EN)
- 2026 até à data (município de Lisboa, dormidas, homólogo): Jan +5,6 %, Fev +3,1 %, Mar +1,4 %, Abr +1,6 %, Mai +1,1 %, Jun +2,7 %, Jul +0,4 %, Ago +1,1 % (dados provisórios/preliminares) — [INE 0012088, 2026](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0012088&Dim1=S3A202601,S3A202602,S3A202603,S3A202604,S3A202605,S3A202606,S3A202607,S3A202608&Dim2=1A01106,1A&Dim3=T)

### Inferences
- O município é ligeiramente **menos** concentrado em Jul–Ago do que a AML/Grande Lisboa (Ago 120,5 vs 125–130): o excedente de Verão da região vem das zonas de praia (Cascais, Sintra, Península de Setúbal), não da cidade. Para uma loja em São Bento o perfil do município é o mais relevante.
- Hóspedes são um pouco mais planos do que dormidas (estadas mais curtas no Inverno/ombro, mais longas em Agosto).
- A procura de Lisboa é dominada pelos não residentes, e é o perfil deles que desenha a curva; os residentes hospedados na Grande Lisboa quase não têm sazonalidade.
- O tráfego do aeroporto é mais plano (Jan ≈ 78) do que as dormidas (Jan ≈ 67) porque inclui residentes a sair e ligações — sobrestima a procura turística de Inverno.

### Gaps
- Índices de Janeiro–Março assentam em poucos anos para o município (2023–2025); o intervalo entre anos é estreito (Jan 64,8–69,8), mas n = 3.
- Dormidas em alojamento local com menos de 10 camas não estão em nenhuma destas séries (nota metodológica do INE), e são uma parte grande da oferta no centro de Lisboa.

## 3. Efeito Páscoa (Março vs Abril)

### Takeaway
O efeito existe mas é modesto em Lisboa: nos anos com Páscoa em Março/1 de Abril (2018, 2024) o índice de Março da AML sobe ~6 pontos (96,4 vs 90,3) e o de Abril desce ~4 (102,6 vs 106,3). Em Portugal o desvio é semelhante em Março mas maior em Abril (−7).

### Cited Findings
- Datas do Domingo de Páscoa usadas na classificação: 1 Abr 2018, 21 Abr 2019, 17 Abr 2022, 9 Abr 2023, 31 Mar 2024, 20 Abr 2025 (calendário; a Semana Santa de 2018 e 2024 caiu em Março).
- AML dormidas: Páscoa em Março (2018, 2024): Mar 96,4 · Abr 102,6; Páscoa em Abril (2019, 2022, 2023, 2025): Mar 90,3 · Abr 106,3. Por ano, Março: 94,7 (2018), 92,9 (2019), 80,6 (2022), 93,5 (2023), 98,1 (2024), 94,1 (2025); Abril: 102,2 · 105,3 · 106,5 · 107,3 · 103,1 · 106,0 — [INE 0009808](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0009808&Dim1=S3A202401,S3A202402,S3A202403,S3A202404,S3A202405,S3A202406,S3A202407,S3A202408,S3A202409,S3A202410,S3A202411,S3A202412&Dim2=17,PT&Dim3=T)
- Município de Lisboa dormidas: 2024 (Páscoa em Março) Mar 101,4 · Abr 104,7; 2023 Mar 96,9 · Abr 107,5; 2025 Mar 97,5 · Abr 107,0; 2022 Mar 83,5 · Abr 106,2 — [INE 0012088](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0012088&Dim1=S3A202401,S3A202402,S3A202403,S3A202404,S3A202405,S3A202406,S3A202407,S3A202408,S3A202409,S3A202410,S3A202411,S3A202412&Dim2=1A01106,1A&Dim3=T)
- Portugal dormidas (INE): Páscoa em Março: Mar 83,6 · Abr 97,0; Páscoa em Abril: Mar 77,1 · Abr 104,0. Residentes: Abr 88,1 vs 98,4 — [INE 0010415](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0010415&Dim1=S3A202401,S3A202402,S3A202403,S3A202404,S3A202405,S3A202406,S3A202407,S3A202408,S3A202409,S3A202410,S3A202411,S3A202412&Dim2=PT&Dim3=T,PT,E)
- Aeroporto de Lisboa: Páscoa em Março: Mar 94,5 · Abr 101,6; Páscoa em Abril: Mar 90,1 · Abr 102,0 — [Eurostat avia_paoa](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/avia_paoa?rep_airp=PT_LPPT&freq=M&sinceTimePeriod=2018-01&format=JSON&lang=EN)

### Inferences
- A média "Páscoa em Abril" de Março está puxada para baixo por 2022 (80,6, Ómicron). Comparando só anos limpos na AML — Março 2018/2024 (94,7; 98,1) contra Março 2019/2023/2025 (92,9; 93,5; 94,1) — o efeito líquido em Março é de ~+3 pontos de índice, e em Abril ~−3,5 (102,2; 103,1 vs 105,3; 107,3; 106,0). Ou seja, uma Páscoa em Março desloca cerca de 3 % de um mês médio de Abril para Março.
- Em 2026 a Páscoa foi a 5 de Abril (Semana Santa a cavalo entre Março e Abril): os homólogos de Março (+1,4 %) e Abril (+1,6 %) no município não mostram desvio relevante face a 2025.

### Gaps
- Só há dois anos com Páscoa em Março (um só, 2024, para o município) — a estimativa do efeito é indicativa, não robusta.

## 4. Junho (Santos Populares) e Novembro (Web Summit) destacam-se?

### Takeaway
Não nas dormidas: **Junho é sistematicamente mais fraco do que Maio** em Lisboa (município 2023–25: Mai 114,9 · Jun 106,9 · Jul 112,9) e Novembro cai a pique face a Outubro (115,4 → 90,4) — embora fique claramente acima de Dezembro (76,2) Janeiro e Fevereiro, sendo o melhor mês da época baixa (Nov–Fev).

### Cited Findings
- Município de Lisboa, dormidas, por ano (Mai / Jun / Jul): 2022 114,2 / 115,2 / 126,5; 2023 114,0 / 106,5 / 111,8; 2024 116,2 / 107,5 / 112,1; 2025 114,5 / 106,6 / 114,9. Junho − média(Mai, Jul) = −6,6 pontos na média 2022–25 — [INE 0012088](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0012088&Dim1=S3A202301,S3A202302,S3A202303,S3A202304,S3A202305,S3A202306,S3A202307,S3A202308,S3A202309,S3A202310,S3A202311,S3A202312&Dim2=1A01106,1A&Dim3=T)
- Município de Lisboa, dormidas (Out / Nov / Dez): 2022 122,0 / 98,0 / 83,2; 2023 115,7 / 90,2 / 76,7; 2024 113,7 / 90,6 / 75,5; 2025 116,7 / 90,4 / 76,3. Hóspedes (sem 2022): Out 115,6 · Nov 93,6 · Dez 80,1 — [INE 0012088 / 0012089](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0012089&Dim1=S3A202301,S3A202302,S3A202303,S3A202304,S3A202305,S3A202306,S3A202307,S3A202308,S3A202309,S3A202310,S3A202311,S3A202312&Dim2=1A01106,1A&Dim3=T)
- AML dormidas (6 anos): Mai 114,1 · Jun 111,1 · Jul 121,6; Out 115,1 · Nov 87,4 · Dez 74,6 — [INE 0009808](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0009808&Dim1=S3A202301,S3A202302,S3A202303,S3A202304,S3A202305,S3A202306,S3A202307,S3A202308,S3A202309,S3A202310,S3A202311,S3A202312&Dim2=17,PT&Dim3=T)
- Em Portugal Junho é mais forte do que Maio (119,7 vs 112,8) — o padrão "Junho abaixo de Maio" é específico de Lisboa — [INE 0010415](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0010415&Dim1=S3A202301,S3A202302,S3A202303,S3A202304,S3A202305,S3A202306,S3A202307,S3A202308,S3A202309,S3A202310,S3A202311,S3A202312&Dim2=PT&Dim3=T,PT,E)
- Novembro em Lisboa (município 90,4; AML 86,2) é relativamente bem mais forte do que no país (71,4) — [INE 0010415](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0010415&Dim1=S3A202301,S3A202302,S3A202303,S3A202304,S3A202305,S3A202306,S3A202307,S3A202308,S3A202309,S3A202310,S3A202311,S3A202312&Dim2=PT&Dim3=T,PT,E)
- Residentes na Grande Lisboa (Eurostat PT1A 2023–25): Nov 99,5 e Dez 102,9 — sem quebra de fim de ano; não residentes: Nov 85,2, Dez 67,3 — [Eurostat tour_occ_nin2m](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nin2m?geo=PT17&geo=PT1A&geo=PT1B&geo=PT&sinceTimePeriod=2018-01&format=JSON&lang=EN)

### Inferences
- Os Santos Populares são um evento de residentes e de rua: não aparecem nas dormidas (Junho tem 30 dias e fica ~7 % abaixo de Maio; por dia, Mai ≈ Jun). Qualquer efeito de Junho na restauração terá de vir de dados de consumo, não de turismo.
- Um evento de ~1 semana como a Web Summit não é visível numa série mensal; o que se vê é que Novembro em Lisboa retém ~78 % do nível de Outubro, muito acima da retenção nacional (~64 %), coerente com turismo urbano/negócios — mas a série não permite atribuir isso a um evento concreto.
- Normalizando por dias do mês, Fevereiro sobe (índice ×30,4/28): no município 76,3 → ~83, ficando acima de Dezembro por dia.

### Gaps
- Não há dados diários/semanais nestas fontes; o efeito isolado de Santo António (13 Jun) ou da semana da Web Summit não pode ser medido aqui.

## 5. Anexo — tabelas brutas completas (ano × mês, tal como extraídas) e índices calculados

### Takeaway
Abaixo estão todas as séries descarregadas a 16 Nov 2026, com valores exactos, índice por ano, média, média sem 2022, mín, máx, quota, e os diagnósticos (Páscoa, Junho, Novembro, homólogos de 2026).

### Cited Findings
Fontes de cada bloco: o código/dataset está no título do bloco; URLs no cabeçalho deste ficheiro — [INE API](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&lang=PT&varcd=0009808&Dim1=S3A201801&Dim2=17,PT&Dim3=T), [Eurostat API](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tour_occ_nim?geo=PT&sinceTimePeriod=2018-01&format=JSON&lang=EN).

#### INE AML (NUTS II 2013) dormidas total [0009808 geo=17]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 945 235 | 1 026 053 | 1 382 399 | 1 491 302 | 1 640 458 | 1 610 548 | 1 799 402 | 1 966 456 | 1 721 805 | 1 656 830 | 1 220 549 | 1 055 938 | 17 516 975 | 12 |
| 2019 | 999 656 | 1 057 221 | 1 443 330 | 1 636 193 | 1 773 863 | 1 750 628 | 1 874 219 | 2 057 193 | 1 821 478 | 1 728 503 | 1 329 017 | 1 167 761 | 18 639 062 | 12 |
| 2020 (COVID, excluído) | 1 082 826 | 1 113 308 | 510 510 | 40 771 | 66 383 | 138 646 | 319 160 | 628 027 | 503 158 | 396 225 | 215 790 | 239 550 | 5 254 354 | 12 |
| 2021 (COVID, excluído) | 186 812 | 123 161 | 153 987 | 222 261 | 397 428 | 551 385 | 651 841 | 1 166 724 | 1 056 749 | 1 330 915 | 1 111 639 | 778 611 | 7 731 513 | 12 |
| 2022 | 545 970 | 851 588 | 1 207 259 | 1 595 713 | 1 703 747 | 1 752 836 | 1 963 373 | 2 093 697 | 1 871 477 | 1 812 208 | 1 399 325 | 1 186 506 | 17 983 699 | 12 |
| 2023 | 1 123 648 | 1 230 929 | 1 576 798 | 1 809 425 | 1 914 989 | 1 825 243 | 1 978 727 | 2 128 028 | 1 987 962 | 1 947 186 | 1 461 593 | 1 253 949 | 20 238 477 | 12 |
| 2024 | 1 081 474 | 1 320 311 | 1 718 357 | 1 806 796 | 2 039 161 | 1 920 105 | 2 060 353 | 2 237 606 | 2 028 446 | 1 993 507 | 1 540 572 | 1 277 826 | 21 024 514 | 12 |
| 2025 | 1 150 784 | 1 254 790 | 1 665 358 | 1 877 226 | 2 027 130 | 1 924 803 | 2 124 587 | 2 284 926 | 2 043 387 | 2 047 481 | 1 540 936 | 1 301 221 | 21 242 629 | 12 |
| 2026 (parcial) | 1 201 495 | 1 274 139 | 1 679 364 | 1 887 683 | 2 047 296 | 1 965 980 | 2 144 777 | 2 310 459 | 2 098 747 | — | — | — | 16 609 940 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 64.8 | 70.3 | 94.7 | 102.2 | 112.4 | 110.3 | 123.3 | 134.7 | 118.0 | 113.5 | 83.6 | 72.3 | 2.08 |
| 2019 | 64.4 | 68.1 | 92.9 | 105.3 | 114.2 | 112.7 | 120.7 | 132.4 | 117.3 | 111.3 | 85.6 | 75.2 | 2.06 |
| 2022 | 36.4 | 56.8 | 80.6 | 106.5 | 113.7 | 117.0 | 131.0 | 139.7 | 124.9 | 120.9 | 93.4 | 79.2 | 3.83 |
| 2023 | 66.6 | 73.0 | 93.5 | 107.3 | 113.5 | 108.2 | 117.3 | 126.2 | 117.9 | 115.5 | 86.7 | 74.4 | 1.89 |
| 2024 | 61.7 | 75.4 | 98.1 | 103.1 | 116.4 | 109.6 | 117.6 | 127.7 | 115.8 | 113.8 | 87.9 | 72.9 | 2.07 |
| 2025 | 65.0 | 70.9 | 94.1 | 106.0 | 114.5 | 108.7 | 120.0 | 129.1 | 115.4 | 115.7 | 87.0 | 73.5 | 1.99 |
| **Média** | **59.8** | **69.1** | **92.3** | **105.1** | **114.1** | **111.1** | **121.6** | **131.6** | **118.2** | **115.1** | **87.4** | **74.6** | **2.32** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 64.5 | 71.5 | 94.7 | 104.8 | 114.2 | 109.9 | 119.8 | 130.0 | 116.9 | 113.9 | 86.2 | 73.7 | 2.02 |
| Mín | 36.4 | 56.8 | 80.6 | 102.2 | 112.4 | 108.2 | 117.3 | 126.2 | 115.4 | 111.3 | 83.6 | 72.3 | |
| Máx | 66.6 | 75.4 | 98.1 | 107.3 | 116.4 | 117.0 | 131.0 | 139.7 | 124.9 | 120.9 | 93.4 | 79.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.98 | 5.76 | 7.69 | 8.76 | 9.51 | 9.26 | 10.14 | 10.97 | 9.85 | 9.59 | 7.28 | 6.22 | |

Pico: Ago (131.6); vale: Jan (59.8); pico÷vale = 2.20. Ordem decrescente: Ago > Jul > Set > Out > Mai > Jun > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=96.4, Abr=102.6, Abr−Mar=6.3; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=90.3, Abr=106.3, Abr−Mar=16.0.
Junho vs vizinhos: Mai=114.1, Jun=111.1, Jul=121.6 (Jun − média(Mai,Jul) = -6.8). Novembro vs vizinhos: Out=115.1, Nov=87.4, Dez=74.6 (Nov − média(Out,Dez) = -7.5).
2026 vs 2025 (homólogo, %): Jan +4.4, Fev +1.5, Mar +0.8, Abr +0.6, Mai +1.0, Jun +2.1, Jul +1.0, Ago +1.1, Set +2.7

#### INE AML (NUTS II 2013) hóspedes total [0009812 geo=17]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 422 554 | 454 857 | 590 432 | 645 123 | 711 183 | 710 788 | 733 528 | 777 079 | 747 517 | 718 866 | 545 077 | 485 385 | 7 542 389 | 12 |
| 2019 | 459 380 | 487 096 | 636 285 | 697 925 | 788 719 | 778 115 | 782 999 | 832 926 | 804 643 | 775 999 | 619 300 | 553 294 | 8 216 681 | 12 |
| 2020 (COVID, excluído) | 511 041 | 507 502 | 222 422 | 14 899 | 31 727 | 71 275 | 150 764 | 272 339 | 232 229 | 192 469 | 102 940 | 123 564 | 2 433 171 | 12 |
| 2021 (COVID, excluído) | 84 971 | 56 032 | 73 498 | 110 644 | 201 015 | 249 804 | 286 379 | 480 506 | 462 824 | 569 725 | 473 944 | 355 636 | 3 404 978 | 12 |
| 2022 | 253 440 | 382 519 | 510 799 | 669 449 | 723 667 | 741 752 | 811 238 | 823 100 | 803 712 | 780 222 | 617 320 | 539 381 | 7 656 599 | 12 |
| 2023 | 509 980 | 544 368 | 690 128 | 775 558 | 832 963 | 803 808 | 844 574 | 860 180 | 865 620 | 852 475 | 657 352 | 582 475 | 8 819 481 | 12 |
| 2024 | 506 398 | 588 287 | 740 545 | 788 076 | 901 651 | 860 308 | 876 918 | 926 114 | 883 067 | 883 540 | 716 870 | 611 250 | 9 283 024 | 12 |
| 2025 | 550 099 | 583 296 | 754 353 | 824 794 | 902 673 | 859 755 | 908 068 | 948 811 | 901 385 | 924 784 | 729 108 | 628 283 | 9 515 409 | 12 |
| 2026 (parcial) | 576 629 | 600 923 | 755 074 | 840 495 | 931 756 | 878 176 | 910 794 | 951 950 | 917 570 | — | — | — | 7 363 367 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 67.2 | 72.4 | 93.9 | 102.6 | 113.1 | 113.1 | 116.7 | 123.6 | 118.9 | 114.4 | 86.7 | 77.2 | 1.84 |
| 2019 | 67.1 | 71.1 | 92.9 | 101.9 | 115.2 | 113.6 | 114.4 | 121.6 | 117.5 | 113.3 | 90.4 | 80.8 | 1.81 |
| 2022 | 39.7 | 60.0 | 80.1 | 104.9 | 113.4 | 116.3 | 127.1 | 129.0 | 126.0 | 122.3 | 96.8 | 84.5 | 3.25 |
| 2023 | 69.4 | 74.1 | 93.9 | 105.5 | 113.3 | 109.4 | 114.9 | 117.0 | 117.8 | 116.0 | 89.4 | 79.3 | 1.69 |
| 2024 | 65.5 | 76.0 | 95.7 | 101.9 | 116.6 | 111.2 | 113.4 | 119.7 | 114.2 | 114.2 | 92.7 | 79.0 | 1.83 |
| 2025 | 69.4 | 73.6 | 95.1 | 104.0 | 113.8 | 108.4 | 114.5 | 119.7 | 113.7 | 116.6 | 91.9 | 79.2 | 1.72 |
| **Média** | **63.0** | **71.2** | **91.9** | **103.5** | **114.2** | **112.0** | **116.8** | **121.8** | **118.0** | **116.1** | **91.3** | **80.0** | **2.02** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 67.7 | 73.4 | 94.3 | 103.2 | 114.4 | 111.1 | 114.8 | 120.3 | 116.4 | 114.9 | 90.2 | 79.1 | 1.78 |
| Mín | 39.7 | 60.0 | 80.1 | 101.9 | 113.1 | 108.4 | 113.4 | 117.0 | 113.7 | 113.3 | 86.7 | 77.2 | |
| Máx | 69.4 | 76.0 | 95.7 | 105.5 | 116.6 | 116.3 | 127.1 | 129.0 | 126.0 | 122.3 | 96.8 | 84.5 | |
| Quota do ano (%) = índice médio ÷ 12 | 5.25 | 5.93 | 7.66 | 8.62 | 9.52 | 9.33 | 9.74 | 10.15 | 9.83 | 9.68 | 7.61 | 6.67 | |

Pico: Ago (121.8); vale: Jan (63.0); pico÷vale = 1.93. Ordem decrescente: Ago > Set > Jul > Out > Mai > Jun > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=94.8, Abr=102.3, Abr−Mar=7.4; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=90.5, Abr=104.1, Abr−Mar=13.6.
Junho vs vizinhos: Mai=114.2, Jun=112.0, Jul=116.8 (Jun − média(Mai,Jul) = -3.5). Novembro vs vizinhos: Out=116.1, Nov=91.3, Dez=80.0 (Nov − média(Out,Dez) = -6.7).
2026 vs 2025 (homólogo, %): Jan +4.8, Fev +3.0, Mar +0.1, Abr +1.9, Mai +3.2, Jun +2.1, Jul +0.3, Ago +0.3, Set +1.8

#### INE Lisboa município dormidas total [0012088 geo=1A01106]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 397 427 | 644 518 | 927 644 | 1 180 321 | 1 268 685 | 1 279 928 | 1 406 190 | 1 481 283 | 1 379 144 | 1 356 202 | 1 088 916 | 923 979 | 13 334 237 | 12 |
| 2023 | 881 154 | 963 919 | 1 224 375 | 1 357 902 | 1 440 186 | 1 345 382 | 1 412 744 | 1 499 766 | 1 463 716 | 1 461 296 | 1 139 000 | 969 192 | 15 158 632 | 12 |
| 2024 | 850 329 | 1 044 727 | 1 330 306 | 1 373 264 | 1 524 129 | 1 410 505 | 1 470 367 | 1 579 133 | 1 488 400 | 1 490 764 | 1 188 181 | 990 259 | 15 740 364 | 12 |
| 2025 | 896 529 | 971 681 | 1 296 551 | 1 423 189 | 1 523 685 | 1 418 001 | 1 527 895 | 1 629 263 | 1 506 243 | 1 552 924 | 1 202 991 | 1 015 112 | 15 964 064 | 12 |
| 2026 (parcial) | 946 799 | 1 002 186 | 1 315 322 | 1 445 713 | 1 539 800 | 1 455 811 | 1 534 058 | 1 646 440 | — | — | — | — | 10 886 129 | 8 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 35.8 | 58.0 | 83.5 | 106.2 | 114.2 | 115.2 | 126.5 | 133.3 | 124.1 | 122.0 | 98.0 | 83.2 | 3.73 |
| 2023 | 69.8 | 76.3 | 96.9 | 107.5 | 114.0 | 106.5 | 111.8 | 118.7 | 115.9 | 115.7 | 90.2 | 76.7 | 1.70 |
| 2024 | 64.8 | 79.6 | 101.4 | 104.7 | 116.2 | 107.5 | 112.1 | 120.4 | 113.5 | 113.7 | 90.6 | 75.5 | 1.86 |
| 2025 | 67.4 | 73.0 | 97.5 | 107.0 | 114.5 | 106.6 | 114.9 | 122.5 | 113.2 | 116.7 | 90.4 | 76.3 | 1.82 |
| **Média** | **59.4** | **71.7** | **94.8** | **106.3** | **114.7** | **109.0** | **116.3** | **123.7** | **116.7** | **117.0** | **92.3** | **77.9** | **2.28** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 67.3 | 76.3 | 98.6 | 106.4 | 114.9 | 106.9 | 112.9 | 120.5 | 114.2 | 115.4 | 90.4 | 76.2 | 1.79 |
| Mín | 35.8 | 58.0 | 83.5 | 104.7 | 114.0 | 106.5 | 111.8 | 118.7 | 113.2 | 113.7 | 90.2 | 75.5 | |
| Máx | 69.8 | 79.6 | 101.4 | 107.5 | 116.2 | 115.2 | 126.5 | 133.3 | 124.1 | 122.0 | 98.0 | 83.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.95 | 5.98 | 7.90 | 8.86 | 9.56 | 9.08 | 9.69 | 10.31 | 9.72 | 9.75 | 7.69 | 6.49 | |

Pico: Ago (123.7); vale: Jan (59.4); pico÷vale = 2.08. Ordem decrescente: Ago > Out > Set > Jul > Mai > Jun > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=101.4, Abr=104.7, Abr−Mar=3.3; anos com Páscoa em Abril ([2022, 2023, 2025]): Mar=92.6, Abr=106.9, Abr−Mar=14.3.
Junho vs vizinhos: Mai=114.7, Jun=109.0, Jul=116.3 (Jun − média(Mai,Jul) = -6.6). Novembro vs vizinhos: Out=117.0, Nov=92.3, Dez=77.9 (Nov − média(Out,Dez) = -5.2).
2026 vs 2025 (homólogo, %): Jan +5.6, Fev +3.1, Mar +1.4, Abr +1.6, Mai +1.1, Jun +2.7, Jul +0.4, Ago +1.1

#### INE Lisboa município hóspedes total [0012089 geo=1A01106]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 175 214 | 272 314 | 377 475 | 481 826 | 523 701 | 532 405 | 581 603 | 595 200 | 579 545 | 569 790 | 465 437 | 401 644 | 5 556 154 | 12 |
| 2023 | 383 147 | 406 812 | 520 586 | 562 006 | 607 354 | 580 142 | 606 916 | 609 288 | 626 188 | 627 102 | 498 627 | 432 262 | 6 460 430 | 12 |
| 2024 | 379 856 | 445 045 | 553 494 | 579 505 | 653 948 | 619 978 | 627 417 | 659 338 | 631 956 | 639 255 | 531 767 | 449 539 | 6 771 098 | 12 |
| 2025 | 407 668 | 429 845 | 563 069 | 605 563 | 652 912 | 613 928 | 656 438 | 683 539 | 651 705 | 677 877 | 543 706 | 464 844 | 6 951 094 | 12 |
| 2026 (parcial) | 430 003 | 447 832 | 566 153 | 623 531 | 680 152 | 640 697 | 655 511 | 681 314 | — | — | — | — | 4 725 193 | 8 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 37.8 | 58.8 | 81.5 | 104.1 | 113.1 | 115.0 | 125.6 | 128.5 | 125.2 | 123.1 | 100.5 | 86.7 | 3.40 |
| 2023 | 71.2 | 75.6 | 96.7 | 104.4 | 112.8 | 107.8 | 112.7 | 113.2 | 116.3 | 116.5 | 92.6 | 80.3 | 1.59 |
| 2024 | 67.3 | 78.9 | 98.1 | 102.7 | 115.9 | 109.9 | 111.2 | 116.9 | 112.0 | 113.3 | 94.2 | 79.7 | 1.74 |
| 2025 | 70.4 | 74.2 | 97.2 | 104.5 | 112.7 | 106.0 | 113.3 | 118.0 | 112.5 | 117.0 | 93.9 | 80.2 | 1.68 |
| **Média** | **61.7** | **71.9** | **93.4** | **103.9** | **113.6** | **109.7** | **115.7** | **119.1** | **116.5** | **117.5** | **95.3** | **81.7** | **2.10** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 69.6 | 76.2 | 97.3 | 103.9 | 113.8 | 107.9 | 112.4 | 116.0 | 113.6 | 115.6 | 93.6 | 80.1 | 1.67 |
| Mín | 37.8 | 58.8 | 81.5 | 102.7 | 112.7 | 106.0 | 111.2 | 113.2 | 112.0 | 113.3 | 92.6 | 79.7 | |
| Máx | 71.2 | 78.9 | 98.1 | 104.5 | 115.9 | 115.0 | 125.6 | 128.5 | 125.2 | 123.1 | 100.5 | 86.7 | |
| Quota do ano (%) = índice médio ÷ 12 | 5.14 | 5.99 | 7.78 | 8.66 | 9.47 | 9.14 | 9.64 | 9.93 | 9.71 | 9.79 | 7.94 | 6.81 | |

Pico: Ago (119.1); vale: Jan (61.7); pico÷vale = 1.93. Ordem decrescente: Ago > Out > Set > Jul > Mai > Jun > Abr > Nov > Mar > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=98.1, Abr=102.7, Abr−Mar=4.6; anos com Páscoa em Abril ([2022, 2023, 2025]): Mar=91.8, Abr=104.3, Abr−Mar=12.5.
Junho vs vizinhos: Mai=113.6, Jun=109.7, Jul=115.7 (Jun − média(Mai,Jul) = -5.0). Novembro vs vizinhos: Out=117.5, Nov=95.3, Dez=81.7 (Nov − média(Out,Dez) = -4.3).
2026 vs 2025 (homólogo, %): Jan +5.5, Fev +4.2, Mar +0.5, Abr +3.0, Mai +4.2, Jun +4.4, Jul -0.1, Ago -0.3

#### INE Lisboa município dormidas total, série NUTS2013 [0010735 geo=1701106]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2020 (COVID, excluído) | 863 814 | 865 148 | 394 613 | 20 187 | 29 737 | 56 339 | 143 917 | 316 088 | 294 585 | 236 899 | 122 816 | 137 743 | 3 481 886 | 12 |
| 2021 (COVID, excluído) | 105 610 | 63 313 | 77 574 | 117 999 | 222 992 | 314 613 | 381 413 | 710 967 | 722 034 | 969 652 | 862 575 | 589 727 | 5 138 469 | 12 |
| 2022 | 397 427 | 644 518 | 927 644 | 1 180 321 | 1 268 685 | 1 279 928 | 1 406 190 | 1 481 283 | 1 379 144 | 1 356 202 | 1 088 916 | 923 979 | 13 334 237 | 12 |
| 2023 | 881 154 | 963 919 | 1 224 375 | 1 357 902 | 1 440 186 | 1 345 382 | 1 412 744 | 1 499 766 | 1 463 716 | 1 461 296 | 1 139 000 | 969 192 | 15 158 632 | 12 |
| 2024 | 850 329 | 1 044 727 | 1 330 306 | 1 373 264 | 1 524 129 | 1 410 505 | 1 470 367 | 1 579 133 | 1 488 400 | 1 490 764 | 1 188 181 | 990 259 | 15 740 364 | 12 |
| 2025 | 896 529 | 971 681 | 1 296 551 | 1 423 189 | 1 523 685 | 1 418 001 | 1 527 895 | 1 629 263 | 1 506 243 | 1 552 924 | 1 202 991 | 1 015 112 | 15 964 064 | 12 |
| 2026 (parcial) | 946 799 | 1 002 186 | 1 315 322 | 1 445 713 | 1 539 800 | 1 455 811 | 1 534 058 | 1 646 440 | — | — | — | — | 10 886 129 | 8 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 35.8 | 58.0 | 83.5 | 106.2 | 114.2 | 115.2 | 126.5 | 133.3 | 124.1 | 122.0 | 98.0 | 83.2 | 3.73 |
| 2023 | 69.8 | 76.3 | 96.9 | 107.5 | 114.0 | 106.5 | 111.8 | 118.7 | 115.9 | 115.7 | 90.2 | 76.7 | 1.70 |
| 2024 | 64.8 | 79.6 | 101.4 | 104.7 | 116.2 | 107.5 | 112.1 | 120.4 | 113.5 | 113.7 | 90.6 | 75.5 | 1.86 |
| 2025 | 67.4 | 73.0 | 97.5 | 107.0 | 114.5 | 106.6 | 114.9 | 122.5 | 113.2 | 116.7 | 90.4 | 76.3 | 1.82 |
| **Média** | **59.4** | **71.7** | **94.8** | **106.3** | **114.7** | **109.0** | **116.3** | **123.7** | **116.7** | **117.0** | **92.3** | **77.9** | **2.28** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 67.3 | 76.3 | 98.6 | 106.4 | 114.9 | 106.9 | 112.9 | 120.5 | 114.2 | 115.4 | 90.4 | 76.2 | 1.79 |
| Mín | 35.8 | 58.0 | 83.5 | 104.7 | 114.0 | 106.5 | 111.8 | 118.7 | 113.2 | 113.7 | 90.2 | 75.5 | |
| Máx | 69.8 | 79.6 | 101.4 | 107.5 | 116.2 | 115.2 | 126.5 | 133.3 | 124.1 | 122.0 | 98.0 | 83.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.95 | 5.98 | 7.90 | 8.86 | 9.56 | 9.08 | 9.69 | 10.31 | 9.72 | 9.75 | 7.69 | 6.49 | |

Pico: Ago (123.7); vale: Jan (59.4); pico÷vale = 2.08. Ordem decrescente: Ago > Out > Set > Jul > Mai > Jun > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=101.4, Abr=104.7, Abr−Mar=3.3; anos com Páscoa em Abril ([2022, 2023, 2025]): Mar=92.6, Abr=106.9, Abr−Mar=14.3.
Junho vs vizinhos: Mai=114.7, Jun=109.0, Jul=116.3 (Jun − média(Mai,Jul) = -6.6). Novembro vs vizinhos: Out=117.0, Nov=92.3, Dez=77.9 (Nov − média(Out,Dez) = -5.2).
2026 vs 2025 (homólogo, %): Jan +5.6, Fev +3.1, Mar +1.4, Abr +1.6, Mai +1.1, Jun +2.7, Jul +0.4, Ago +1.1

#### INE Lisboa município hóspedes total, série NUTS2013 [0010736 geo=1701106]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2020 (COVID, excluído) | 383 433 | 371 562 | 166 675 | 5 625 | 11 287 | 25 564 | 65 972 | 135 031 | 128 677 | 106 495 | 54 452 | 64 507 | 1 519 280 | 12 |
| 2021 (COVID, excluído) | 43 560 | 23 799 | 31 214 | 51 734 | 103 394 | 133 539 | 164 325 | 298 569 | 307 858 | 399 504 | 351 614 | 253 505 | 2 162 615 | 12 |
| 2022 | 175 214 | 272 314 | 377 475 | 481 826 | 523 701 | 532 405 | 581 603 | 595 200 | 579 545 | 569 790 | 465 437 | 401 644 | 5 556 154 | 12 |
| 2023 | 383 147 | 406 812 | 520 586 | 562 006 | 607 354 | 580 142 | 606 916 | 609 288 | 626 188 | 627 102 | 498 627 | 432 262 | 6 460 430 | 12 |
| 2024 | 379 856 | 445 045 | 553 494 | 579 505 | 653 948 | 619 978 | 627 417 | 659 338 | 631 956 | 639 255 | 531 767 | 449 539 | 6 771 098 | 12 |
| 2025 | 407 668 | 429 845 | 563 069 | 605 563 | 652 912 | 613 928 | 656 438 | 683 539 | 651 705 | 677 877 | 543 706 | 464 844 | 6 951 094 | 12 |
| 2026 (parcial) | 430 003 | 447 832 | 566 153 | 623 531 | 680 152 | 640 697 | 655 511 | 681 314 | — | — | — | — | 4 725 193 | 8 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 37.8 | 58.8 | 81.5 | 104.1 | 113.1 | 115.0 | 125.6 | 128.5 | 125.2 | 123.1 | 100.5 | 86.7 | 3.40 |
| 2023 | 71.2 | 75.6 | 96.7 | 104.4 | 112.8 | 107.8 | 112.7 | 113.2 | 116.3 | 116.5 | 92.6 | 80.3 | 1.59 |
| 2024 | 67.3 | 78.9 | 98.1 | 102.7 | 115.9 | 109.9 | 111.2 | 116.9 | 112.0 | 113.3 | 94.2 | 79.7 | 1.74 |
| 2025 | 70.4 | 74.2 | 97.2 | 104.5 | 112.7 | 106.0 | 113.3 | 118.0 | 112.5 | 117.0 | 93.9 | 80.2 | 1.68 |
| **Média** | **61.7** | **71.9** | **93.4** | **103.9** | **113.6** | **109.7** | **115.7** | **119.1** | **116.5** | **117.5** | **95.3** | **81.7** | **2.10** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 69.6 | 76.2 | 97.3 | 103.9 | 113.8 | 107.9 | 112.4 | 116.0 | 113.6 | 115.6 | 93.6 | 80.1 | 1.67 |
| Mín | 37.8 | 58.8 | 81.5 | 102.7 | 112.7 | 106.0 | 111.2 | 113.2 | 112.0 | 113.3 | 92.6 | 79.7 | |
| Máx | 71.2 | 78.9 | 98.1 | 104.5 | 115.9 | 115.0 | 125.6 | 128.5 | 125.2 | 123.1 | 100.5 | 86.7 | |
| Quota do ano (%) = índice médio ÷ 12 | 5.14 | 5.99 | 7.78 | 8.66 | 9.47 | 9.14 | 9.64 | 9.93 | 9.71 | 9.79 | 7.94 | 6.81 | |

Pico: Ago (119.1); vale: Jan (61.7); pico÷vale = 1.93. Ordem decrescente: Ago > Out > Set > Jul > Mai > Jun > Abr > Nov > Mar > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=98.1, Abr=102.7, Abr−Mar=4.6; anos com Páscoa em Abril ([2022, 2023, 2025]): Mar=91.8, Abr=104.3, Abr−Mar=12.5.
Junho vs vizinhos: Mai=113.6, Jun=109.7, Jul=115.7 (Jun − média(Mai,Jul) = -5.0). Novembro vs vizinhos: Out=117.5, Nov=95.3, Dez=81.7 (Nov − média(Out,Dez) = -4.3).
2026 vs 2025 (homólogo, %): Jan +5.5, Fev +4.2, Mar +0.5, Abr +3.0, Mai +4.2, Jun +4.4, Jul -0.1, Ago -0.3

#### INE Grande Lisboa (NUTS II 2024) dormidas total [0012088 geo=1A]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 499 228 | 791 282 | 1 131 610 | 1 485 917 | 1 589 126 | 1 617 906 | 1 795 053 | 1 907 831 | 1 729 637 | 1 688 346 | 1 317 996 | 1 114 189 | 16 668 121 | 12 |
| 2023 | 1 055 139 | 1 155 917 | 1 474 917 | 1 679 812 | 1 783 368 | 1 684 904 | 1 806 183 | 1 930 094 | 1 830 789 | 1 811 269 | 1 376 947 | 1 172 868 | 18 762 207 | 12 |
| 2024 | 1 015 785 | 1 239 841 | 1 605 916 | 1 681 670 | 1 890 809 | 1 767 180 | 1 880 406 | 2 026 635 | 1 864 873 | 1 851 394 | 1 440 682 | 1 195 261 | 19 460 452 | 12 |
| 2025 | 1 074 905 | 1 167 100 | 1 550 998 | 1 740 945 | 1 874 590 | 1 766 695 | 1 935 514 | 2 066 756 | 1 875 637 | 1 901 645 | 1 441 543 | 1 218 202 | 19 614 530 | 12 |
| 2026 (parcial) | 1 128 084 | 1 188 115 | 1 570 614 | 1 755 982 | 1 891 045 | 1 806 587 | 1 949 269 | 2 096 741 | — | — | — | — | 13 386 437 | 8 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 35.9 | 57.0 | 81.5 | 107.0 | 114.4 | 116.5 | 129.2 | 137.4 | 124.5 | 121.6 | 94.9 | 80.2 | 3.82 |
| 2023 | 67.5 | 73.9 | 94.3 | 107.4 | 114.1 | 107.8 | 115.5 | 123.4 | 117.1 | 115.8 | 88.1 | 75.0 | 1.83 |
| 2024 | 62.6 | 76.5 | 99.0 | 103.7 | 116.6 | 109.0 | 116.0 | 125.0 | 115.0 | 114.2 | 88.8 | 73.7 | 2.00 |
| 2025 | 65.8 | 71.4 | 94.9 | 106.5 | 114.7 | 108.1 | 118.4 | 126.4 | 114.7 | 116.3 | 88.2 | 74.5 | 1.92 |
| **Média** | **58.0** | **69.7** | **92.4** | **106.2** | **114.9** | **110.3** | **119.8** | **128.1** | **117.8** | **117.0** | **90.0** | **75.9** | **2.39** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 65.3 | 73.9 | 96.1 | 105.9 | 115.1 | 108.3 | 116.6 | 125.0 | 115.6 | 115.5 | 88.4 | 74.4 | 1.92 |
| Mín | 35.9 | 57.0 | 81.5 | 103.7 | 114.1 | 107.8 | 115.5 | 123.4 | 114.7 | 114.2 | 88.1 | 73.7 | |
| Máx | 67.5 | 76.5 | 99.0 | 107.4 | 116.6 | 116.5 | 129.2 | 137.4 | 124.5 | 121.6 | 94.9 | 80.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.83 | 5.81 | 7.70 | 8.85 | 9.58 | 9.19 | 9.98 | 10.67 | 9.82 | 9.75 | 7.50 | 6.32 | |

Pico: Ago (128.1); vale: Jan (58.0); pico÷vale = 2.21. Ordem decrescente: Ago > Jul > Set > Out > Mai > Jun > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=99.0, Abr=103.7, Abr−Mar=4.7; anos com Páscoa em Abril ([2022, 2023, 2025]): Mar=90.2, Abr=107.0, Abr−Mar=16.7.
Junho vs vizinhos: Mai=114.9, Jun=110.3, Jul=119.8 (Jun − média(Mai,Jul) = -7.0). Novembro vs vizinhos: Out=117.0, Nov=90.0, Dez=75.9 (Nov − média(Out,Dez) = -6.4).
2026 vs 2025 (homólogo, %): Jan +4.9, Fev +1.8, Mar +1.3, Abr +0.9, Mai +0.9, Jun +2.3, Jul +0.7, Ago +1.5

#### INE Grande Lisboa (NUTS II 2024) hóspedes total [0012089 geo=1A]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 225 896 | 346 749 | 471 516 | 615 403 | 665 829 | 679 757 | 743 187 | 754 249 | 736 773 | 720 511 | 575 330 | 499 181 | 7 034 381 | 12 |
| 2023 | 472 926 | 503 052 | 639 920 | 711 579 | 766 000 | 734 952 | 771 613 | 781 140 | 790 759 | 783 689 | 611 834 | 537 837 | 8 105 301 | 12 |
| 2024 | 469 108 | 543 525 | 684 620 | 725 462 | 826 796 | 784 876 | 800 473 | 842 059 | 805 130 | 808 879 | 661 903 | 563 490 | 8 516 321 | 12 |
| 2025 | 506 035 | 533 943 | 694 050 | 757 033 | 823 953 | 782 370 | 830 291 | 863 056 | 820 758 | 845 526 | 672 674 | 580 034 | 8 709 723 | 12 |
| 2026 (parcial) | 533 181 | 551 653 | 698 702 | 773 904 | 851 905 | 802 577 | 832 836 | 864 757 | — | — | — | — | 5 909 515 | 8 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 38.5 | 59.2 | 80.4 | 105.0 | 113.6 | 116.0 | 126.8 | 128.7 | 125.7 | 122.9 | 98.1 | 85.2 | 3.34 |
| 2023 | 70.0 | 74.5 | 94.7 | 105.4 | 113.4 | 108.8 | 114.2 | 115.6 | 117.1 | 116.0 | 90.6 | 79.6 | 1.65 |
| 2024 | 66.1 | 76.6 | 96.5 | 102.2 | 116.5 | 110.6 | 112.8 | 118.7 | 113.4 | 114.0 | 93.3 | 79.4 | 1.80 |
| 2025 | 69.7 | 73.6 | 95.6 | 104.3 | 113.5 | 107.8 | 114.4 | 118.9 | 113.1 | 116.5 | 92.7 | 79.9 | 1.71 |
| **Média** | **61.1** | **70.9** | **91.8** | **104.2** | **114.3** | **110.8** | **117.1** | **120.5** | **117.3** | **117.4** | **93.7** | **81.0** | **2.12** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 68.6 | 74.9 | 95.6 | 104.0 | 114.5 | 109.1 | 113.8 | 117.7 | 114.5 | 115.5 | 92.2 | 79.6 | 1.72 |
| Mín | 38.5 | 59.2 | 80.4 | 102.2 | 113.4 | 107.8 | 112.8 | 115.6 | 113.1 | 114.0 | 90.6 | 79.4 | |
| Máx | 70.0 | 76.6 | 96.5 | 105.4 | 116.5 | 116.0 | 126.8 | 128.7 | 125.7 | 122.9 | 98.1 | 85.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 5.09 | 5.91 | 7.65 | 8.68 | 9.52 | 9.23 | 9.75 | 10.04 | 9.78 | 9.78 | 7.81 | 6.75 | |

Pico: Ago (120.5); vale: Jan (61.1); pico÷vale = 1.97. Ordem decrescente: Ago > Out > Set > Jul > Mai > Jun > Abr > Nov > Mar > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=96.5, Abr=102.2, Abr−Mar=5.8; anos com Páscoa em Abril ([2022, 2023, 2025]): Mar=90.3, Abr=104.9, Abr−Mar=14.6.
Junho vs vizinhos: Mai=114.3, Jun=110.8, Jul=117.1 (Jun − média(Mai,Jul) = -4.9). Novembro vs vizinhos: Out=117.4, Nov=93.7, Dez=81.0 (Nov − média(Out,Dez) = -5.5).
2026 vs 2025 (homólogo, %): Jan +5.4, Fev +3.3, Mar +0.7, Abr +2.2, Mai +3.4, Jun +2.6, Jul +0.3, Ago +0.2

#### INE Portugal dormidas total [0010415]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 2 843 739 | 3 332 670 | 4 571 119 | 5 374 612 | 6 302 074 | 6 743 203 | 7 974 521 | 9 292 740 | 7 342 627 | 6 250 714 | 3 791 610 | 3 256 830 | 67 076 459 | 12 |
| 2019 | 3 034 284 | 3 365 240 | 4 606 922 | 5 981 300 | 6 557 840 | 7 177 554 | 8 231 230 | 9 633 427 | 7 624 574 | 6 358 685 | 4 071 968 | 3 515 940 | 70 158 964 | 12 |
| 2020 (COVID, excluído) | 3 258 226 | 3 817 043 | 1 875 506 | 133 212 | 261 593 | 1 031 062 | 2 631 261 | 5 082 349 | 3 534 350 | 2 300 257 | 920 058 | 953 382 | 25 798 299 | 12 |
| 2021 (COVID, excluído) | 688 039 | 459 904 | 615 727 | 921 028 | 2 024 210 | 3 401 792 | 4 538 643 | 7 507 272 | 5 585 513 | 5 468 960 | 3 556 760 | 2 564 574 | 37 332 422 | 12 |
| 2022 | 1 993 952 | 2 922 077 | 4 012 532 | 5 999 962 | 6 499 189 | 7 180 852 | 8 665 889 | 9 959 209 | 7 691 275 | 6 790 071 | 4 252 017 | 3 727 766 | 69 694 791 | 12 |
| 2023 | 3 434 232 | 4 015 685 | 5 085 292 | 6 837 609 | 7 144 581 | 7 456 723 | 8 816 485 | 10 146 558 | 8 238 579 | 7 384 027 | 4 574 288 | 4 045 091 | 77 179 150 | 12 |
| 2024 | 3 460 511 | 4 277 802 | 5 725 068 | 6 548 855 | 7 701 923 | 7 841 978 | 9 061 766 | 10 553 909 | 8 453 759 | 7 565 935 | 5 009 564 | 4 153 763 | 80 354 833 | 12 |
| 2025 | 3 659 360 | 4 163 822 | 5 556 754 | 7 123 799 | 7 801 025 | 8 074 409 | 9 412 435 | 10 700 547 | 8 509 433 | 7 712 397 | 5 036 891 | 4 260 786 | 82 011 658 | 12 |
| 2026 (parcial) | 3 741 952 | 4 203 862 | 5 625 115 | 7 150 714 | 7 996 616 | 8 131 586 | 9 583 880 | 10 887 648 | 8 683 670 | — | — | — | 66 005 043 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 50.9 | 59.6 | 81.8 | 96.2 | 112.7 | 120.6 | 142.7 | 166.2 | 131.4 | 111.8 | 67.8 | 58.3 | 3.27 |
| 2019 | 51.9 | 57.6 | 78.8 | 102.3 | 112.2 | 122.8 | 140.8 | 164.8 | 130.4 | 108.8 | 69.6 | 60.1 | 3.17 |
| 2022 | 34.3 | 50.3 | 69.1 | 103.3 | 111.9 | 123.6 | 149.2 | 171.5 | 132.4 | 116.9 | 73.2 | 64.2 | 4.99 |
| 2023 | 53.4 | 62.4 | 79.1 | 106.3 | 111.1 | 115.9 | 137.1 | 157.8 | 128.1 | 114.8 | 71.1 | 62.9 | 2.95 |
| 2024 | 51.7 | 63.9 | 85.5 | 97.8 | 115.0 | 117.1 | 135.3 | 157.6 | 126.2 | 113.0 | 74.8 | 62.0 | 3.05 |
| 2025 | 53.5 | 60.9 | 81.3 | 104.2 | 114.1 | 118.1 | 137.7 | 156.6 | 124.5 | 112.8 | 73.7 | 62.3 | 2.92 |
| **Média** | **49.3** | **59.1** | **79.3** | **101.7** | **112.8** | **119.7** | **140.5** | **162.4** | **128.8** | **113.0** | **71.7** | **61.6** | **3.39** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 52.3 | 60.9 | 81.3 | 101.4 | 113.0 | 118.9 | 138.7 | 160.6 | 128.1 | 112.2 | 71.4 | 61.1 | 3.07 |
| Mín | 34.3 | 50.3 | 69.1 | 96.2 | 111.1 | 115.9 | 135.3 | 156.6 | 124.5 | 108.8 | 67.8 | 58.3 | |
| Máx | 53.5 | 63.9 | 85.5 | 106.3 | 115.0 | 123.6 | 149.2 | 171.5 | 132.4 | 116.9 | 74.8 | 64.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.11 | 4.93 | 6.60 | 8.47 | 9.40 | 9.98 | 11.71 | 13.53 | 10.74 | 9.42 | 5.98 | 5.14 | |

Pico: Ago (162.4); vale: Jan (49.3); pico÷vale = 3.30. Ordem decrescente: Ago > Jul > Set > Jun > Out > Mai > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=83.6, Abr=97.0, Abr−Mar=13.3; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=77.1, Abr=104.0, Abr−Mar=27.0.
Junho vs vizinhos: Mai=112.8, Jun=119.7, Jul=140.5 (Jun − média(Mai,Jul) = -6.9). Novembro vs vizinhos: Out=113.0, Nov=71.7, Dez=61.6 (Nov − média(Out,Dez) = -15.6).
2026 vs 2025 (homólogo, %): Jan +2.3, Fev +1.0, Mar +1.2, Abr +0.4, Mai +2.5, Jun +0.7, Jul +1.8, Ago +1.7, Set +2.0

#### INE Portugal dormidas residentes [0010415 dim3=PT]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 892 582 | 1 049 841 | 1 284 400 | 1 436 772 | 1 486 774 | 1 914 297 | 2 427 991 | 3 294 934 | 2 115 509 | 1 563 660 | 1 140 849 | 1 219 425 | 19 827 034 | 12 |
| 2019 | 965 897 | 1 037 720 | 1 356 548 | 1 682 873 | 1 622 910 | 2 162 647 | 2 510 032 | 3 437 515 | 2 220 480 | 1 521 585 | 1 311 601 | 1 277 324 | 21 107 132 | 12 |
| 2020 (COVID, excluído) | 1 073 638 | 1 299 262 | 550 395 | 96 673 | 212 346 | 885 081 | 1 775 740 | 3 392 135 | 2 023 670 | 1 179 962 | 527 399 | 582 308 | 13 598 609 | 12 |
| 2021 (COVID, excluído) | 414 828 | 324 361 | 442 406 | 651 461 | 1 226 562 | 1 985 950 | 2 663 892 | 4 197 587 | 2 519 595 | 1 892 278 | 1 242 947 | 1 109 895 | 18 671 762 | 12 |
| 2022 | 852 273 | 1 145 492 | 1 279 542 | 1 887 811 | 1 780 514 | 2 327 718 | 2 881 749 | 3 723 845 | 2 426 190 | 1 834 476 | 1 319 456 | 1 429 842 | 22 888 908 | 12 |
| 2023 | 1 152 894 | 1 341 547 | 1 477 112 | 2 022 782 | 1 767 914 | 2 167 096 | 2 798 245 | 3 485 919 | 2 346 699 | 1 838 022 | 1 351 739 | 1 569 088 | 23 319 057 | 12 |
| 2024 | 1 141 227 | 1 382 980 | 1 623 464 | 1 772 485 | 1 895 450 | 2 247 157 | 2 737 795 | 3 661 833 | 2 333 208 | 1 844 845 | 1 637 454 | 1 563 176 | 23 841 074 | 12 |
| 2025 | 1 258 312 | 1 366 118 | 1 659 269 | 1 980 749 | 1 991 539 | 2 366 206 | 2 905 177 | 3 820 000 | 2 443 846 | 1 937 748 | 1 644 571 | 1 650 456 | 25 023 991 | 12 |
| 2026 (parcial) | 1 320 087 | 1 405 271 | 1 612 335 | 1 957 283 | 2 125 739 | 2 453 299 | 3 024 725 | 3 873 458 | 2 518 730 | — | — | — | 20 290 927 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 54.0 | 63.5 | 77.7 | 87.0 | 90.0 | 115.9 | 147.0 | 199.4 | 128.0 | 94.6 | 69.0 | 73.8 | 3.69 |
| 2019 | 54.9 | 59.0 | 77.1 | 95.7 | 92.3 | 123.0 | 142.7 | 195.4 | 126.2 | 86.5 | 74.6 | 72.6 | 3.56 |
| 2022 | 44.7 | 60.1 | 67.1 | 99.0 | 93.3 | 122.0 | 151.1 | 195.2 | 127.2 | 96.2 | 69.2 | 75.0 | 4.37 |
| 2023 | 59.3 | 69.0 | 76.0 | 104.1 | 91.0 | 111.5 | 144.0 | 179.4 | 120.8 | 94.6 | 69.6 | 80.7 | 3.02 |
| 2024 | 57.4 | 69.6 | 81.7 | 89.2 | 95.4 | 113.1 | 137.8 | 184.3 | 117.4 | 92.9 | 82.4 | 78.7 | 3.21 |
| 2025 | 60.3 | 65.5 | 79.6 | 95.0 | 95.5 | 113.5 | 139.3 | 183.2 | 117.2 | 92.9 | 78.9 | 79.1 | 3.04 |
| **Média** | **55.1** | **64.5** | **76.5** | **95.0** | **92.9** | **116.5** | **143.6** | **189.5** | **122.8** | **92.9** | **73.9** | **76.7** | **3.48** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 57.2 | 65.3 | 78.4 | 94.2 | 92.8 | 115.4 | 142.2 | 188.3 | 121.9 | 92.3 | 74.9 | 77.0 | 3.30 |
| Mín | 44.7 | 59.0 | 67.1 | 87.0 | 90.0 | 111.5 | 137.8 | 179.4 | 117.2 | 86.5 | 69.0 | 72.6 | |
| Máx | 60.3 | 69.6 | 81.7 | 104.1 | 95.5 | 123.0 | 151.1 | 199.4 | 128.0 | 96.2 | 82.4 | 80.7 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.59 | 5.37 | 6.38 | 7.92 | 7.74 | 9.71 | 11.97 | 15.79 | 10.23 | 7.75 | 6.16 | 6.39 | |

Pico: Ago (189.5); vale: Jan (55.1); pico÷vale = 3.44. Ordem decrescente: Ago > Jul > Set > Jun > Abr > Out > Mai > Dez > Mar > Nov > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=79.7, Abr=88.1, Abr−Mar=8.4; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=74.9, Abr=98.4, Abr−Mar=23.5.
Junho vs vizinhos: Mai=92.9, Jun=116.5, Jul=143.6 (Jun − média(Mai,Jul) = -1.8). Novembro vs vizinhos: Out=92.9, Nov=73.9, Dez=76.7 (Nov − média(Out,Dez) = -10.9).
2026 vs 2025 (homólogo, %): Jan +4.9, Fev +2.9, Mar -2.8, Abr -1.2, Mai +6.7, Jun +3.7, Jul +4.1, Ago +1.4, Set +3.1

#### INE Portugal dormidas não residentes [0010415 dim3=E]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 1 951 157 | 2 282 829 | 3 286 719 | 3 937 840 | 4 815 300 | 4 828 906 | 5 546 530 | 5 997 806 | 5 227 118 | 4 687 054 | 2 650 761 | 2 037 405 | 47 249 425 | 12 |
| 2019 | 2 068 387 | 2 327 520 | 3 250 374 | 4 298 427 | 4 934 930 | 5 014 907 | 5 721 198 | 6 195 912 | 5 404 094 | 4 837 100 | 2 760 367 | 2 238 616 | 49 051 832 | 12 |
| 2020 (COVID, excluído) | 2 184 588 | 2 517 781 | 1 325 111 | 36 539 | 49 247 | 145 981 | 855 521 | 1 690 214 | 1 510 680 | 1 120 295 | 392 659 | 371 074 | 12 199 690 | 12 |
| 2021 (COVID, excluído) | 273 211 | 135 543 | 173 321 | 269 567 | 797 648 | 1 415 842 | 1 874 751 | 3 309 685 | 3 065 918 | 3 576 682 | 2 313 813 | 1 454 679 | 18 660 660 | 12 |
| 2022 | 1 141 679 | 1 776 585 | 2 732 990 | 4 112 151 | 4 718 675 | 4 853 134 | 5 784 140 | 6 235 364 | 5 265 085 | 4 955 595 | 2 932 561 | 2 297 924 | 46 805 883 | 12 |
| 2023 | 2 281 338 | 2 674 138 | 3 608 180 | 4 814 827 | 5 376 667 | 5 289 627 | 6 018 240 | 6 660 639 | 5 891 880 | 5 546 005 | 3 222 549 | 2 476 003 | 53 860 093 | 12 |
| 2024 | 2 319 284 | 2 894 822 | 4 101 604 | 4 776 370 | 5 806 473 | 5 594 821 | 6 323 971 | 6 892 076 | 6 120 551 | 5 721 090 | 3 372 110 | 2 590 587 | 56 513 759 | 12 |
| 2025 | 2 401 048 | 2 797 704 | 3 897 485 | 5 143 050 | 5 809 486 | 5 708 203 | 6 507 258 | 6 880 547 | 6 065 587 | 5 774 649 | 3 392 320 | 2 610 330 | 56 987 667 | 12 |
| 2026 (parcial) | 2 421 865 | 2 798 591 | 4 012 780 | 5 193 431 | 5 870 877 | 5 678 287 | 6 559 155 | 7 014 190 | 6 164 940 | — | — | — | 45 714 116 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 49.6 | 58.0 | 83.5 | 100.0 | 122.3 | 122.6 | 140.9 | 152.3 | 132.8 | 119.0 | 67.3 | 51.7 | 3.07 |
| 2019 | 50.6 | 56.9 | 79.5 | 105.2 | 120.7 | 122.7 | 140.0 | 151.6 | 132.2 | 118.3 | 67.5 | 54.8 | 3.00 |
| 2022 | 29.3 | 45.5 | 70.1 | 105.4 | 121.0 | 124.4 | 148.3 | 159.9 | 135.0 | 127.1 | 75.2 | 58.9 | 5.46 |
| 2023 | 50.8 | 59.6 | 80.4 | 107.3 | 119.8 | 117.9 | 134.1 | 148.4 | 131.3 | 123.6 | 71.8 | 55.2 | 2.92 |
| 2024 | 49.2 | 61.5 | 87.1 | 101.4 | 123.3 | 118.8 | 134.3 | 146.3 | 130.0 | 121.5 | 71.6 | 55.0 | 2.97 |
| 2025 | 50.6 | 58.9 | 82.1 | 108.3 | 122.3 | 120.2 | 137.0 | 144.9 | 127.7 | 121.6 | 71.4 | 55.0 | 2.87 |
| **Média** | **46.7** | **56.7** | **80.4** | **104.6** | **121.6** | **121.1** | **139.1** | **150.6** | **131.5** | **121.8** | **70.8** | **55.1** | **3.38** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 50.2 | 59.0 | 82.5 | 104.4 | 121.7 | 120.4 | 137.2 | 148.7 | 130.8 | 120.8 | 69.9 | 54.3 | 2.97 |
| Mín | 29.3 | 45.5 | 70.1 | 100.0 | 119.8 | 117.9 | 134.1 | 144.9 | 127.7 | 118.3 | 67.3 | 51.7 | |
| Máx | 50.8 | 61.5 | 87.1 | 108.3 | 123.3 | 124.4 | 148.3 | 159.9 | 135.0 | 127.1 | 75.2 | 58.9 | |
| Quota do ano (%) = índice médio ÷ 12 | 3.89 | 4.73 | 6.70 | 8.72 | 10.13 | 10.09 | 11.59 | 12.55 | 10.96 | 10.15 | 5.90 | 4.59 | |

Pico: Ago (150.6); vale: Jan (46.7); pico÷vale = 3.23. Ordem decrescente: Ago > Jul > Set > Out > Mai > Jun > Abr > Mar > Nov > Fev > Dez > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=85.3, Abr=100.7, Abr−Mar=15.4; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=78.0, Abr=106.5, Abr−Mar=28.5.
Junho vs vizinhos: Mai=121.6, Jun=121.1, Jul=139.1 (Jun − média(Mai,Jul) = -9.2). Novembro vs vizinhos: Out=121.8, Nov=70.8, Dez=55.1 (Nov − média(Out,Dez) = -17.7).
2026 vs 2025 (homólogo, %): Jan +0.9, Fev +0.0, Mar +3.0, Abr +1.0, Mai +1.1, Jun -0.5, Jul +0.8, Ago +1.9, Set +1.6

#### INE Portugal hóspedes total [0010416]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 1 169 618 | 1 326 917 | 1 773 889 | 2 099 720 | 2 421 499 | 2 473 840 | 2 678 035 | 3 103 645 | 2 736 676 | 2 376 320 | 1 558 139 | 1 437 030 | 25 155 328 | 12 |
| 2019 | 1 273 443 | 1 393 567 | 1 863 147 | 2 331 199 | 2 625 708 | 2 740 152 | 2 849 319 | 3 335 024 | 2 896 432 | 2 500 447 | 1 755 112 | 1 578 866 | 27 142 416 | 12 |
| 2020 (COVID, excluído) | 1 419 505 | 1 585 501 | 681 811 | 46 971 | 126 627 | 476 660 | 1 025 974 | 1 877 772 | 1 352 118 | 990 434 | 398 463 | 448 764 | 10 430 600 | 12 |
| 2021 (COVID, excluído) | 296 172 | 202 024 | 274 336 | 446 342 | 969 144 | 1 352 387 | 1 633 781 | 2 537 993 | 2 053 453 | 2 128 258 | 1 452 112 | 1 116 009 | 14 462 011 | 12 |
| 2022 | 849 349 | 1 242 777 | 1 572 516 | 2 342 684 | 2 533 868 | 2 670 797 | 3 030 807 | 3 380 778 | 2 899 683 | 2 637 687 | 1 740 976 | 1 617 799 | 26 519 721 | 12 |
| 2023 | 1 447 386 | 1 644 704 | 2 058 884 | 2 732 376 | 2 840 168 | 2 856 589 | 3 160 427 | 3 549 245 | 3 171 914 | 2 872 798 | 1 900 838 | 1 793 561 | 30 028 890 | 12 |
| 2024 | 1 481 248 | 1 762 148 | 2 309 801 | 2 630 805 | 3 110 262 | 3 048 643 | 3 217 992 | 3 766 530 | 3 263 886 | 2 978 613 | 2 163 562 | 1 854 697 | 31 588 187 | 12 |
| 2025 | 1 595 206 | 1 768 393 | 2 313 123 | 2 846 213 | 3 191 104 | 3 119 023 | 3 361 251 | 3 804 433 | 3 294 084 | 3 076 729 | 2 171 584 | 1 933 858 | 32 475 001 | 12 |
| 2026 (parcial) | 1 663 436 | 1 775 035 | 2 331 204 | 2 908 800 | 3 309 568 | 3 144 049 | 3 387 939 | 3 876 059 | 3 375 383 | — | — | — | 25 771 473 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 55.8 | 63.3 | 84.6 | 100.2 | 115.5 | 118.0 | 127.8 | 148.1 | 130.5 | 113.4 | 74.3 | 68.6 | 2.65 |
| 2019 | 56.3 | 61.6 | 82.4 | 103.1 | 116.1 | 121.1 | 126.0 | 147.4 | 128.1 | 110.5 | 77.6 | 69.8 | 2.62 |
| 2022 | 38.4 | 56.2 | 71.2 | 106.0 | 114.7 | 120.9 | 137.1 | 153.0 | 131.2 | 119.4 | 78.8 | 73.2 | 3.98 |
| 2023 | 57.8 | 65.7 | 82.3 | 109.2 | 113.5 | 114.2 | 126.3 | 141.8 | 126.8 | 114.8 | 76.0 | 71.7 | 2.45 |
| 2024 | 56.3 | 66.9 | 87.7 | 99.9 | 118.2 | 115.8 | 122.2 | 143.1 | 124.0 | 113.2 | 82.2 | 70.5 | 2.54 |
| 2025 | 58.9 | 65.3 | 85.5 | 105.2 | 117.9 | 115.3 | 124.2 | 140.6 | 121.7 | 113.7 | 80.2 | 71.5 | 2.38 |
| **Média** | **53.9** | **63.2** | **82.3** | **103.9** | **116.0** | **117.5** | **127.3** | **145.7** | **127.0** | **114.2** | **78.2** | **70.9** | **2.77** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 57.0 | 64.6 | 84.5 | 103.5 | 116.2 | 116.9 | 125.3 | 144.2 | 126.2 | 113.1 | 78.1 | 70.4 | 2.53 |
| Mín | 38.4 | 56.2 | 71.2 | 99.9 | 113.5 | 114.2 | 122.2 | 140.6 | 121.7 | 110.5 | 74.3 | 68.6 | |
| Máx | 58.9 | 66.9 | 87.7 | 109.2 | 118.2 | 121.1 | 137.1 | 153.0 | 131.2 | 119.4 | 82.2 | 73.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.49 | 5.27 | 6.86 | 8.66 | 9.66 | 9.79 | 10.61 | 12.14 | 10.59 | 9.51 | 6.52 | 5.90 | |

Pico: Ago (145.7); vale: Jan (53.9); pico÷vale = 2.70. Ordem decrescente: Ago > Jul > Set > Jun > Mai > Out > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=86.2, Abr=100.1, Abr−Mar=13.9; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=80.3, Abr=105.9, Abr−Mar=25.5.
Junho vs vizinhos: Mai=116.0, Jun=117.5, Jul=127.3 (Jun − média(Mai,Jul) = -4.1). Novembro vs vizinhos: Out=114.2, Nov=78.2, Dez=70.9 (Nov − média(Out,Dez) = -14.3).
2026 vs 2025 (homólogo, %): Jan +4.3, Fev +0.4, Mar +0.8, Abr +2.2, Mai +3.7, Jun +0.8, Jul +0.8, Ago +1.9, Set +2.5

#### INE Portugal hóspedes residentes [0010416 dim3=PT]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 545 358 | 622 684 | 724 709 | 786 586 | 823 523 | 916 271 | 1 008 771 | 1 255 817 | 1 002 247 | 842 349 | 664 397 | 735 452 | 9 928 164 | 12 |
| 2019 | 586 824 | 630 101 | 792 282 | 878 629 | 899 471 | 1 054 058 | 1 069 363 | 1 368 363 | 1 048 655 | 850 546 | 777 264 | 776 746 | 10 732 302 | 12 |
| 2020 (COVID, excluído) | 661 615 | 779 059 | 293 952 | 41 615 | 114 054 | 426 746 | 747 793 | 1 312 110 | 881 371 | 639 397 | 288 605 | 339 338 | 6 525 655 | 12 |
| 2021 (COVID, excluído) | 223 728 | 172 718 | 229 891 | 364 347 | 694 800 | 906 815 | 1 037 129 | 1 497 000 | 1 078 964 | 991 554 | 702 659 | 644 533 | 8 544 138 | 12 |
| 2022 | 502 097 | 671 373 | 709 507 | 983 624 | 949 382 | 1 087 222 | 1 203 847 | 1 417 395 | 1 115 943 | 981 391 | 750 377 | 824 653 | 11 196 811 | 12 |
| 2023 | 680 206 | 771 471 | 837 115 | 1 062 423 | 962 816 | 1 065 615 | 1 225 402 | 1 393 000 | 1 126 963 | 975 488 | 775 405 | 914 611 | 11 790 515 | 12 |
| 2024 | 680 174 | 797 115 | 906 348 | 960 482 | 1 050 697 | 1 139 810 | 1 183 595 | 1 495 655 | 1 119 482 | 1 005 867 | 944 165 | 920 755 | 12 204 145 | 12 |
| 2025 | 744 619 | 816 793 | 952 127 | 1 053 172 | 1 096 853 | 1 156 449 | 1 250 646 | 1 543 989 | 1 162 972 | 1 046 613 | 951 601 | 990 502 | 12 766 336 | 12 |
| 2026 (parcial) | 790 750 | 819 501 | 917 327 | 1 051 228 | 1 174 050 | 1 195 828 | 1 296 307 | 1 571 743 | 1 205 696 | — | — | — | 10 022 430 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 65.9 | 75.3 | 87.6 | 95.1 | 99.5 | 110.7 | 121.9 | 151.8 | 121.1 | 101.8 | 80.3 | 88.9 | 2.30 |
| 2019 | 65.6 | 70.5 | 88.6 | 98.2 | 100.6 | 117.9 | 119.6 | 153.0 | 117.3 | 95.1 | 86.9 | 86.8 | 2.33 |
| 2022 | 53.8 | 72.0 | 76.0 | 105.4 | 101.7 | 116.5 | 129.0 | 151.9 | 119.6 | 105.2 | 80.4 | 88.4 | 2.82 |
| 2023 | 69.2 | 78.5 | 85.2 | 108.1 | 98.0 | 108.5 | 124.7 | 141.8 | 114.7 | 99.3 | 78.9 | 93.1 | 2.05 |
| 2024 | 66.9 | 78.4 | 89.1 | 94.4 | 103.3 | 112.1 | 116.4 | 147.1 | 110.1 | 98.9 | 92.8 | 90.5 | 2.20 |
| 2025 | 70.0 | 76.8 | 89.5 | 99.0 | 103.1 | 108.7 | 117.6 | 145.1 | 109.3 | 98.4 | 89.4 | 93.1 | 2.07 |
| **Média** | **65.2** | **75.2** | **86.0** | **100.0** | **101.0** | **112.4** | **121.5** | **148.4** | **115.3** | **99.8** | **84.8** | **90.1** | **2.30** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 67.5 | 75.9 | 88.0 | 99.0 | 100.9 | 111.6 | 120.0 | 147.8 | 114.5 | 98.7 | 85.7 | 90.5 | 2.19 |
| Mín | 53.8 | 70.5 | 76.0 | 94.4 | 98.0 | 108.5 | 116.4 | 141.8 | 109.3 | 95.1 | 78.9 | 86.8 | |
| Máx | 70.0 | 78.5 | 89.5 | 108.1 | 103.3 | 117.9 | 129.0 | 153.0 | 121.1 | 105.2 | 92.8 | 93.1 | |
| Quota do ano (%) = índice médio ÷ 12 | 5.44 | 6.27 | 7.17 | 8.34 | 8.42 | 9.37 | 10.13 | 12.37 | 9.61 | 8.31 | 7.07 | 7.51 | |

Pico: Ago (148.4); vale: Jan (65.2); pico÷vale = 2.28. Ordem decrescente: Ago > Jul > Set > Jun > Mai > Abr > Out > Dez > Mar > Nov > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=88.4, Abr=94.8, Abr−Mar=6.4; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=84.8, Abr=102.7, Abr−Mar=17.9.
Junho vs vizinhos: Mai=101.0, Jun=112.4, Jul=121.5 (Jun − média(Mai,Jul) = +1.1). Novembro vs vizinhos: Out=99.8, Nov=84.8, Dez=90.1 (Nov − média(Out,Dez) = -10.2).
2026 vs 2025 (homólogo, %): Jan +6.2, Fev +0.3, Mar -3.7, Abr -0.2, Mai +7.0, Jun +3.4, Jul +3.7, Ago +1.8, Set +3.7

#### INE Portugal hóspedes não residentes [0010416 dim3=E]

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 624 260 | 704 233 | 1 049 180 | 1 313 134 | 1 597 976 | 1 557 569 | 1 669 264 | 1 847 828 | 1 734 429 | 1 533 971 | 893 742 | 701 578 | 15 227 164 | 12 |
| 2019 | 686 619 | 763 466 | 1 070 865 | 1 452 570 | 1 726 237 | 1 686 094 | 1 779 956 | 1 966 661 | 1 847 777 | 1 649 901 | 977 848 | 802 120 | 16 410 114 | 12 |
| 2020 (COVID, excluído) | 757 890 | 806 442 | 387 859 | 5 356 | 12 573 | 49 914 | 278 181 | 565 662 | 470 747 | 351 037 | 109 858 | 109 426 | 3 904 945 | 12 |
| 2021 (COVID, excluído) | 72 444 | 29 306 | 44 445 | 81 995 | 274 344 | 445 572 | 596 652 | 1 040 993 | 974 489 | 1 136 704 | 749 453 | 471 476 | 5 917 873 | 12 |
| 2022 | 347 252 | 571 404 | 863 009 | 1 359 060 | 1 584 486 | 1 583 575 | 1 826 960 | 1 963 383 | 1 783 740 | 1 656 296 | 990 599 | 793 146 | 15 322 910 | 12 |
| 2023 | 767 180 | 873 233 | 1 221 769 | 1 669 953 | 1 877 352 | 1 790 974 | 1 935 025 | 2 156 245 | 2 044 951 | 1 897 310 | 1 125 433 | 878 950 | 18 238 375 | 12 |
| 2024 | 801 074 | 965 033 | 1 403 453 | 1 670 323 | 2 059 565 | 1 908 833 | 2 034 397 | 2 270 875 | 2 144 404 | 1 972 746 | 1 219 397 | 933 942 | 19 384 042 | 12 |
| 2025 | 850 587 | 951 600 | 1 360 996 | 1 793 041 | 2 094 251 | 1 962 574 | 2 110 605 | 2 260 444 | 2 131 112 | 2 030 116 | 1 219 983 | 943 356 | 19 708 665 | 12 |
| 2026 (parcial) | 872 686 | 955 534 | 1 413 877 | 1 857 572 | 2 135 518 | 1 948 221 | 2 091 632 | 2 304 316 | 2 169 687 | — | — | — | 15 749 043 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 49.2 | 55.5 | 82.7 | 103.5 | 125.9 | 122.7 | 131.5 | 145.6 | 136.7 | 120.9 | 70.4 | 55.3 | 2.96 |
| 2019 | 50.2 | 55.8 | 78.3 | 106.2 | 126.2 | 123.3 | 130.2 | 143.8 | 135.1 | 120.7 | 71.5 | 58.7 | 2.86 |
| 2022 | 27.2 | 44.7 | 67.6 | 106.4 | 124.1 | 124.0 | 143.1 | 153.8 | 139.7 | 129.7 | 77.6 | 62.1 | 5.65 |
| 2023 | 50.5 | 57.5 | 80.4 | 109.9 | 123.5 | 117.8 | 127.3 | 141.9 | 134.5 | 124.8 | 74.0 | 57.8 | 2.81 |
| 2024 | 49.6 | 59.7 | 86.9 | 103.4 | 127.5 | 118.2 | 125.9 | 140.6 | 132.8 | 122.1 | 75.5 | 57.8 | 2.83 |
| 2025 | 51.8 | 57.9 | 82.9 | 109.2 | 127.5 | 119.5 | 128.5 | 137.6 | 129.8 | 123.6 | 74.3 | 57.4 | 2.66 |
| **Média** | **46.4** | **55.2** | **79.8** | **106.4** | **125.8** | **120.9** | **131.1** | **143.9** | **134.8** | **123.6** | **73.9** | **58.2** | **3.30** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 50.3 | 57.3 | 82.2 | 106.4 | 126.1 | 120.3 | 128.7 | 141.9 | 133.8 | 122.4 | 73.2 | 57.4 | 2.83 |
| Mín | 27.2 | 44.7 | 67.6 | 103.4 | 123.5 | 117.8 | 125.9 | 137.6 | 129.8 | 120.7 | 70.4 | 55.3 | |
| Máx | 51.8 | 59.7 | 86.9 | 109.9 | 127.5 | 124.0 | 143.1 | 153.8 | 139.7 | 129.7 | 77.6 | 62.1 | |
| Quota do ano (%) = índice médio ÷ 12 | 3.87 | 4.60 | 6.65 | 8.87 | 10.48 | 10.08 | 10.92 | 11.99 | 11.23 | 10.30 | 6.16 | 4.85 | |

Pico: Ago (143.9); vale: Jan (46.4); pico÷vale = 3.10. Ordem decrescente: Ago > Set > Jul > Mai > Out > Jun > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=84.8, Abr=103.4, Abr−Mar=18.7; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=77.3, Abr=107.9, Abr−Mar=30.6.
Junho vs vizinhos: Mai=125.8, Jun=120.9, Jul=131.1 (Jun − média(Mai,Jul) = -7.5). Novembro vs vizinhos: Out=123.6, Nov=73.9, Dez=58.2 (Nov − média(Out,Dez) = -17.0).
2026 vs 2025 (homólogo, %): Jan +2.6, Fev +0.4, Mar +3.9, Abr +3.6, Mai +2.0, Jun -0.7, Jul -0.9, Ago +1.9, Set +1.8

#### Eurostat tour_occ_nin2m AML PT17 (NUTS 2021) dormidas total

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2020 (COVID, excluído) | 1 157 052 | 1 186 901 | 549 334 | 43 383 | 81 461 | 208 580 | 452 108 | 804 526 | 630 592 | 482 614 | 258 345 | 279 301 | 6 134 197 | 12 |
| 2021 (COVID, excluído) | 218 471 | 147 979 | 190 865 | 267 665 | 462 773 | 637 915 | 807 104 | 1 382 863 | 1 205 936 | 1 448 503 | 1 173 727 | 826 695 | 8 770 496 | 12 |
| 2022 | 589 521 | 902 359 | 1 266 062 | 1 687 139 | 1 808 971 | 1 884 061 | 2 185 305 | 2 394 208 | 2 046 213 | 1 926 300 | 1 462 907 | 1 237 941 | 19 390 987 | 12 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 36.5 | 55.8 | 78.3 | 104.4 | 111.9 | 116.6 | 135.2 | 148.2 | 126.6 | 119.2 | 90.5 | 76.6 | 4.06 |
| **Média** | **36.5** | **55.8** | **78.3** | **104.4** | **111.9** | **116.6** | **135.2** | **148.2** | **126.6** | **119.2** | **90.5** | **76.6** | **4.06** |
| Mín | 36.5 | 55.8 | 78.3 | 104.4 | 111.9 | 116.6 | 135.2 | 148.2 | 126.6 | 119.2 | 90.5 | 76.6 | |
| Máx | 36.5 | 55.8 | 78.3 | 104.4 | 111.9 | 116.6 | 135.2 | 148.2 | 126.6 | 119.2 | 90.5 | 76.6 | |
| Quota do ano (%) = índice médio ÷ 12 | 3.04 | 4.65 | 6.53 | 8.70 | 9.33 | 9.72 | 11.27 | 12.35 | 10.55 | 9.93 | 7.54 | 6.38 | |

Pico: Ago (148.2); vale: Jan (36.5); pico÷vale = 4.06. Ordem decrescente: Ago > Jul > Set > Out > Jun > Mai > Abr > Nov > Mar > Dez > Fev > Jan

Páscoa: por ano — 2022: Mar=78.3, Abr=104.4
Junho vs vizinhos: Mai=111.9, Jun=116.6, Jul=135.2 (Jun − média(Mai,Jul) = -7.0). Novembro vs vizinhos: Out=119.2, Nov=90.5, Dez=76.6 (Nov − média(Out,Dez) = -7.4).

#### Eurostat tour_occ_nin2m AML PT17 (NUTS 2021) dormidas não residentes (FOR)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2020 (COVID, excluído) | 811 771 | 828 319 | 383 677 | 13 967 | 19 660 | 47 419 | 168 802 | 396 841 | 312 530 | 226 533 | 99 463 | 106 361 | 3 415 343 | 12 |
| 2021 (COVID, excluído) | 79 424 | 39 776 | 52 131 | 86 835 | 199 683 | 335 453 | 430 448 | 829 845 | 780 404 | 1 026 830 | 843 437 | 523 081 | 5 227 347 | 12 |
| 2022 | 357 558 | 611 318 | 928 346 | 1 272 135 | 1 381 575 | 1 412 841 | 1 610 974 | 1 752 741 | 1 538 619 | 1 497 145 | 1 095 735 | 873 586 | 14 332 573 | 12 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 29.9 | 51.2 | 77.7 | 106.5 | 115.7 | 118.3 | 134.9 | 146.7 | 128.8 | 125.3 | 91.7 | 73.1 | 4.90 |
| **Média** | **29.9** | **51.2** | **77.7** | **106.5** | **115.7** | **118.3** | **134.9** | **146.7** | **128.8** | **125.3** | **91.7** | **73.1** | **4.90** |
| Mín | 29.9 | 51.2 | 77.7 | 106.5 | 115.7 | 118.3 | 134.9 | 146.7 | 128.8 | 125.3 | 91.7 | 73.1 | |
| Máx | 29.9 | 51.2 | 77.7 | 106.5 | 115.7 | 118.3 | 134.9 | 146.7 | 128.8 | 125.3 | 91.7 | 73.1 | |
| Quota do ano (%) = índice médio ÷ 12 | 2.49 | 4.27 | 6.48 | 8.88 | 9.64 | 9.86 | 11.24 | 12.23 | 10.74 | 10.45 | 7.65 | 6.10 | |

Pico: Ago (146.7); vale: Jan (29.9); pico÷vale = 4.90. Ordem decrescente: Ago > Jul > Set > Out > Jun > Mai > Abr > Nov > Mar > Dez > Fev > Jan

Páscoa: por ano — 2022: Mar=77.7, Abr=106.5
Junho vs vizinhos: Mai=115.7, Jun=118.3, Jul=134.9 (Jun − média(Mai,Jul) = -7.0). Novembro vs vizinhos: Out=125.3, Nov=91.7, Dez=73.1 (Nov − média(Out,Dez) = -7.5).

#### Eurostat tour_occ_nin2m AML PT17 (NUTS 2021) dormidas residentes (DOM)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2020 (COVID, excluído) | 345 281 | 358 582 | 165 657 | 29 416 | 61 801 | 161 161 | 283 306 | 407 685 | 318 062 | 256 081 | 158 882 | 172 940 | 2 718 854 | 12 |
| 2021 (COVID, excluído) | 139 047 | 108 203 | 138 734 | 180 830 | 263 090 | 302 462 | 376 656 | 553 018 | 425 532 | 421 673 | 330 290 | 303 614 | 3 543 149 | 12 |
| 2022 | 231 963 | 291 041 | 337 716 | 415 004 | 427 396 | 471 220 | 574 331 | 641 467 | 507 594 | 429 155 | 367 172 | 364 355 | 5 058 414 | 12 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2022

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022 | 55.0 | 69.0 | 80.1 | 98.5 | 101.4 | 111.8 | 136.2 | 152.2 | 120.4 | 101.8 | 87.1 | 86.4 | 2.77 |
| **Média** | **55.0** | **69.0** | **80.1** | **98.5** | **101.4** | **111.8** | **136.2** | **152.2** | **120.4** | **101.8** | **87.1** | **86.4** | **2.77** |
| Mín | 55.0 | 69.0 | 80.1 | 98.5 | 101.4 | 111.8 | 136.2 | 152.2 | 120.4 | 101.8 | 87.1 | 86.4 | |
| Máx | 55.0 | 69.0 | 80.1 | 98.5 | 101.4 | 111.8 | 136.2 | 152.2 | 120.4 | 101.8 | 87.1 | 86.4 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.59 | 5.75 | 6.68 | 8.20 | 8.45 | 9.32 | 11.35 | 12.68 | 10.03 | 8.48 | 7.26 | 7.20 | |

Pico: Ago (152.2); vale: Jan (55.0); pico÷vale = 2.77. Ordem decrescente: Ago > Jul > Set > Jun > Out > Mai > Abr > Nov > Dez > Mar > Fev > Jan

Páscoa: por ano — 2022: Mar=80.1, Abr=98.5
Junho vs vizinhos: Mai=101.4, Jun=111.8, Jul=136.2 (Jun − média(Mai,Jul) = -7.0). Novembro vs vizinhos: Out=101.8, Nov=87.1, Dez=86.4 (Nov − média(Out,Dez) = -7.0).

#### Eurostat tour_occ_nin2m Grande Lisboa PT1A dormidas total

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 1 071 081 | 1 173 137 | 1 496 573 | 1 711 128 | 1 817 421 | 1 718 612 | 1 856 957 | 2 004 597 | 1 872 791 | 1 847 976 | 1 398 739 | 1 192 886 | 19 161 898 | 12 |
| 2024 | 1 030 598 | 1 257 403 | 1 634 037 | 1 713 851 | 1 933 251 | 1 805 707 | 1 939 797 | 2 100 867 | 1 908 064 | 1 888 375 | 1 465 690 | 1 216 551 | 19 894 191 | 12 |
| 2025 | 1 090 667 | 1 185 001 | 1 575 407 | 1 772 964 | 1 916 071 | 1 804 917 | 1 990 991 | 2 138 991 | 1 917 310 | 1 936 273 | 1 463 078 | 1 235 882 | 20 027 552 | 12 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 67.1 | 73.5 | 93.7 | 107.2 | 113.8 | 107.6 | 116.3 | 125.5 | 117.3 | 115.7 | 87.6 | 74.7 | 1.87 |
| 2024 | 62.2 | 75.8 | 98.6 | 103.4 | 116.6 | 108.9 | 117.0 | 126.7 | 115.1 | 113.9 | 88.4 | 73.4 | 2.04 |
| 2025 | 65.3 | 71.0 | 94.4 | 106.2 | 114.8 | 108.1 | 119.3 | 128.2 | 114.9 | 116.0 | 87.7 | 74.1 | 1.96 |
| **Média** | **64.9** | **73.4** | **95.6** | **105.6** | **115.1** | **108.2** | **117.5** | **126.8** | **115.8** | **115.2** | **87.9** | **74.0** | **1.96** |
| Mín | 62.2 | 71.0 | 93.7 | 103.4 | 113.8 | 107.6 | 116.3 | 125.5 | 114.9 | 113.9 | 87.6 | 73.4 | |
| Máx | 67.1 | 75.8 | 98.6 | 107.2 | 116.6 | 108.9 | 119.3 | 128.2 | 117.3 | 116.0 | 88.4 | 74.7 | |
| Quota do ano (%) = índice médio ÷ 12 | 5.41 | 6.12 | 7.96 | 8.80 | 9.59 | 9.02 | 9.79 | 10.57 | 9.65 | 9.60 | 7.32 | 6.17 | |

Pico: Ago (126.8); vale: Jan (64.9); pico÷vale = 1.95. Ordem decrescente: Ago > Jul > Set > Out > Mai > Jun > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=98.6, Abr=103.4, Abr−Mar=4.8; anos com Páscoa em Abril ([2023, 2025]): Mar=94.1, Abr=106.7, Abr−Mar=12.6.
Junho vs vizinhos: Mai=115.1, Jun=108.2, Jul=117.5 (Jun − média(Mai,Jul) = -8.1). Novembro vs vizinhos: Out=115.2, Nov=87.9, Dez=74.0 (Nov − média(Out,Dez) = -6.7).

#### Eurostat tour_occ_nin2m Grande Lisboa PT1A dormidas não residentes (FOR)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 812 862 | 911 429 | 1 195 244 | 1 409 723 | 1 506 945 | 1 417 309 | 1 520 115 | 1 686 734 | 1 558 374 | 1 536 640 | 1 116 090 | 880 600 | 15 552 065 | 12 |
| 2024 | 797 088 | 994 711 | 1 340 162 | 1 405 734 | 1 617 021 | 1 477 287 | 1 598 259 | 1 758 375 | 1 605 505 | 1 571 284 | 1 149 575 | 908 445 | 16 223 446 | 12 |
| 2025 | 841 449 | 921 502 | 1 263 601 | 1 447 727 | 1 593 976 | 1 493 434 | 1 631 070 | 1 767 898 | 1 591 272 | 1 593 862 | 1 138 949 | 902 502 | 16 187 242 | 12 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 62.7 | 70.3 | 92.2 | 108.8 | 116.3 | 109.4 | 117.3 | 130.1 | 120.2 | 118.6 | 86.1 | 67.9 | 2.08 |
| 2024 | 59.0 | 73.6 | 99.1 | 104.0 | 119.6 | 109.3 | 118.2 | 130.1 | 118.8 | 116.2 | 85.0 | 67.2 | 2.21 |
| 2025 | 62.4 | 68.3 | 93.7 | 107.3 | 118.2 | 110.7 | 120.9 | 131.1 | 118.0 | 118.2 | 84.4 | 66.9 | 2.10 |
| **Média** | **61.4** | **70.7** | **95.0** | **106.7** | **118.0** | **109.8** | **118.8** | **130.4** | **119.0** | **117.6** | **85.2** | **67.3** | **2.13** |
| Mín | 59.0 | 68.3 | 92.2 | 104.0 | 116.3 | 109.3 | 117.3 | 130.1 | 118.0 | 116.2 | 84.4 | 66.9 | |
| Máx | 62.7 | 73.6 | 99.1 | 108.8 | 119.6 | 110.7 | 120.9 | 131.1 | 120.2 | 118.6 | 86.1 | 67.9 | |
| Quota do ano (%) = índice médio ÷ 12 | 5.11 | 5.89 | 7.92 | 8.89 | 9.83 | 9.15 | 9.90 | 10.87 | 9.92 | 9.80 | 7.10 | 5.61 | |

Pico: Ago (130.4); vale: Jan (61.4); pico÷vale = 2.13. Ordem decrescente: Ago > Set > Jul > Mai > Out > Jun > Abr > Mar > Nov > Fev > Dez > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=99.1, Abr=104.0, Abr−Mar=4.9; anos com Páscoa em Abril ([2023, 2025]): Mar=92.9, Abr=108.0, Abr−Mar=15.1.
Junho vs vizinhos: Mai=118.0, Jun=109.8, Jul=118.8 (Jun − média(Mai,Jul) = -8.6). Novembro vs vizinhos: Out=117.6, Nov=85.2, Dez=67.3 (Nov − média(Out,Dez) = -7.3).

#### Eurostat tour_occ_nin2m Grande Lisboa PT1A dormidas residentes (DOM)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 258 219 | 261 708 | 301 329 | 301 405 | 310 476 | 301 303 | 336 842 | 317 863 | 314 417 | 311 336 | 282 649 | 312 286 | 3 609 833 | 12 |
| 2024 | 233 510 | 262 692 | 293 875 | 308 117 | 316 230 | 328 420 | 341 538 | 342 492 | 302 559 | 317 091 | 316 115 | 308 106 | 3 670 745 | 12 |
| 2025 | 249 218 | 263 499 | 311 806 | 325 237 | 322 095 | 311 483 | 359 921 | 371 093 | 326 038 | 342 411 | 324 129 | 333 380 | 3 840 310 | 12 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 85.8 | 87.0 | 100.2 | 100.2 | 103.2 | 100.2 | 112.0 | 105.7 | 104.5 | 103.5 | 94.0 | 103.8 | 1.23 |
| 2024 | 76.3 | 85.9 | 96.1 | 100.7 | 103.4 | 107.4 | 111.7 | 112.0 | 98.9 | 103.7 | 103.3 | 100.7 | 1.47 |
| 2025 | 77.9 | 82.3 | 97.4 | 101.6 | 100.6 | 97.3 | 112.5 | 116.0 | 101.9 | 107.0 | 101.3 | 104.2 | 1.49 |
| **Média** | **80.0** | **85.1** | **97.9** | **100.8** | **102.4** | **101.6** | **112.0** | **111.2** | **101.8** | **104.7** | **99.5** | **102.9** | **1.40** |
| Mín | 76.3 | 82.3 | 96.1 | 100.2 | 100.6 | 97.3 | 111.7 | 105.7 | 98.9 | 103.5 | 94.0 | 100.7 | |
| Máx | 85.8 | 87.0 | 100.2 | 101.6 | 103.4 | 107.4 | 112.5 | 116.0 | 104.5 | 107.0 | 103.3 | 104.2 | |
| Quota do ano (%) = índice médio ÷ 12 | 6.67 | 7.09 | 8.16 | 8.40 | 8.53 | 8.47 | 9.34 | 9.27 | 8.48 | 8.73 | 8.29 | 8.58 | |

Pico: Jul (112.0); vale: Jan (80.0); pico÷vale = 1.40. Ordem decrescente: Jul > Ago > Out > Dez > Mai > Set > Jun > Abr > Nov > Mar > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2024]): Mar=96.1, Abr=100.7, Abr−Mar=4.7; anos com Páscoa em Abril ([2023, 2025]): Mar=98.8, Abr=100.9, Abr−Mar=2.1.
Junho vs vizinhos: Mai=102.4, Jun=101.6, Jul=112.0 (Jun − média(Mai,Jul) = -5.6). Novembro vs vizinhos: Out=104.7, Nov=99.5, Dez=102.9 (Nov − média(Out,Dez) = -4.3).

#### Eurostat tour_occ_nim Portugal dormidas total

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 3 070 104 | 3 587 122 | 4 857 288 | 5 667 386 | 6 703 344 | 7 319 580 | 9 336 437 | 11 529 632 | 8 140 560 | 6 669 915 | 4 030 291 | 3 495 937 | 74 407 596 | 12 |
| 2019 | 3 268 183 | 3 620 522 | 4 930 374 | 6 366 620 | 6 975 485 | 7 839 486 | 9 515 559 | 11 814 839 | 8 426 036 | 6 745 691 | 4 325 512 | 3 765 947 | 77 594 254 | 12 |
| 2020 (COVID, excluído) | 3 538 320 | 4 132 773 | 2 083 870 | 151 693 | 328 500 | 1 354 186 | 3 344 257 | 6 346 171 | 4 089 064 | 2 586 086 | 1 092 392 | 1 110 488 | 30 157 800 | 12 |
| 2021 (COVID, excluído) | 823 329 | 566 520 | 744 504 | 1 070 124 | 2 265 000 | 3 836 522 | 5 394 167 | 9 046 821 | 6 238 202 | 5 874 621 | 3 815 275 | 2 776 833 | 42 451 918 | 12 |
| 2022 | 2 216 999 | 3 166 426 | 4 289 599 | 6 390 718 | 6 963 204 | 7 833 472 | 9 955 861 | 11 975 008 | 8 449 795 | 7 199 166 | 4 530 212 | 3 977 525 | 76 947 985 | 12 |
| 2023 | 3 706 561 | 4 329 139 | 5 409 896 | 7 367 393 | 7 659 090 | 8 093 126 | 10 139 683 | 12 179 773 | 9 008 782 | 7 836 033 | 4 842 199 | 4 315 155 | 84 886 830 | 12 |
| 2024 | 3 725 357 | 4 581 101 | 6 100 656 | 6 980 064 | 8 257 287 | 8 508 117 | 10 341 444 | 12 628 773 | 9 224 413 | 7 976 674 | 5 312 271 | 4 437 426 | 88 073 583 | 12 |
| 2025 | 3 930 241 | 4 451 805 | 5 884 536 | 7 560 422 | 8 309 138 | 8 765 191 | 10 609 003 | 12 616 076 | 9 277 395 | 8 165 254 | 5 322 850 | 4 535 611 | 89 427 522 | 12 |
| 2026 (parcial) | 4 018 236 | 4 438 515 | 5 938 216 | 7 574 370 | 8 506 474 | 8 784 263 | 10 763 380 | 12 677 043 | 9 463 481 | — | — | — | 72 163 978 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 49.5 | 57.9 | 78.3 | 91.4 | 108.1 | 118.0 | 150.6 | 185.9 | 131.3 | 107.6 | 65.0 | 56.4 | 3.76 |
| 2019 | 50.5 | 56.0 | 76.2 | 98.5 | 107.9 | 121.2 | 147.2 | 182.7 | 130.3 | 104.3 | 66.9 | 58.2 | 3.62 |
| 2022 | 34.6 | 49.4 | 66.9 | 99.7 | 108.6 | 122.2 | 155.3 | 186.7 | 131.8 | 112.3 | 70.6 | 62.0 | 5.40 |
| 2023 | 52.4 | 61.2 | 76.5 | 104.1 | 108.3 | 114.4 | 143.3 | 172.2 | 127.4 | 110.8 | 68.5 | 61.0 | 3.29 |
| 2024 | 50.8 | 62.4 | 83.1 | 95.1 | 112.5 | 115.9 | 140.9 | 172.1 | 125.7 | 108.7 | 72.4 | 60.5 | 3.39 |
| 2025 | 52.7 | 59.7 | 79.0 | 101.5 | 111.5 | 117.6 | 142.4 | 169.3 | 124.5 | 109.6 | 71.4 | 60.9 | 3.21 |
| **Média** | **48.4** | **57.8** | **76.7** | **98.4** | **109.5** | **118.2** | **146.6** | **178.2** | **128.5** | **108.9** | **69.1** | **59.8** | **3.78** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 51.2 | 59.4 | 78.6 | 98.1 | 109.7 | 117.4 | 144.9 | 176.4 | 127.8 | 108.2 | 68.8 | 59.4 | 3.45 |
| Mín | 34.6 | 49.4 | 66.9 | 91.4 | 107.9 | 114.4 | 140.9 | 169.3 | 124.5 | 104.3 | 65.0 | 56.4 | |
| Máx | 52.7 | 62.4 | 83.1 | 104.1 | 112.5 | 122.2 | 155.3 | 186.7 | 131.8 | 112.3 | 72.4 | 62.0 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.04 | 4.81 | 6.39 | 8.20 | 9.12 | 9.85 | 12.22 | 14.85 | 10.71 | 9.07 | 5.76 | 4.99 | |

Pico: Ago (178.2); vale: Jan (48.4); pico÷vale = 3.68. Ordem decrescente: Ago > Jul > Set > Jun > Mai > Out > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=80.7, Abr=93.3, Abr−Mar=12.5; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=74.6, Abr=100.9, Abr−Mar=26.3.
Junho vs vizinhos: Mai=109.5, Jun=118.2, Jul=146.6 (Jun − média(Mai,Jul) = -9.8). Novembro vs vizinhos: Out=108.9, Nov=69.1, Dez=59.8 (Nov − média(Out,Dez) = -15.2).
2026 vs 2025 (homólogo, %): Jan +2.2, Fev -0.3, Mar +0.9, Abr +0.2, Mai +2.4, Jun +0.2, Jul +1.5, Ago +0.5, Set +2.0

#### Eurostat tour_occ_nim Portugal dormidas não residentes (FOR)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 2 085 357 | 2 430 260 | 3 447 701 | 4 085 235 | 5 024 647 | 5 019 663 | 5 939 316 | 6 548 318 | 5 468 232 | 4 878 176 | 2 769 278 | 2 156 141 | 49 852 324 | 12 |
| 2019 | 2 206 645 | 2 473 749 | 3 405 793 | 4 474 457 | 5 139 742 | 5 216 934 | 6 067 752 | 6 706 219 | 5 646 606 | 5 021 387 | 2 872 603 | 2 360 367 | 51 592 254 | 12 |
| 2020 (COVID, excluído) | 2 336 978 | 2 687 040 | 1 450 609 | 50 645 | 69 593 | 177 642 | 975 310 | 1 886 131 | 1 621 803 | 1 218 975 | 468 373 | 438 795 | 13 381 894 | 12 |
| 2021 (COVID, excluído) | 343 298 | 188 168 | 219 120 | 307 645 | 853 491 | 1 507 387 | 2 042 433 | 3 583 710 | 3 244 328 | 3 754 561 | 2 449 664 | 1 573 392 | 20 067 197 | 12 |
| 2022 | 1 269 440 | 1 915 926 | 2 893 674 | 4 298 642 | 4 961 864 | 5 082 128 | 6 188 372 | 6 768 570 | 5 525 658 | 5 162 638 | 3 082 891 | 2 434 856 | 49 584 659 | 12 |
| 2023 | 2 455 304 | 2 868 352 | 3 799 203 | 5 065 974 | 5 666 811 | 5 533 485 | 6 423 496 | 7 216 929 | 6 165 007 | 5 771 979 | 3 363 604 | 2 617 059 | 56 947 203 | 12 |
| 2024 | 2 487 298 | 3 080 160 | 4 321 383 | 5 007 819 | 6 112 733 | 5 846 604 | 6 738 496 | 7 438 345 | 6 401 052 | 5 940 794 | 3 531 346 | 2 751 343 | 59 657 373 | 12 |
| 2025 | 2 573 831 | 2 978 322 | 4 092 756 | 5 372 577 | 6 098 590 | 5 974 746 | 6 898 530 | 7 391 145 | 6 343 618 | 6 007 624 | 3 534 889 | 2 755 827 | 60 022 455 | 12 |
| 2026 (parcial) | 2 590 879 | 2 932 681 | 4 188 799 | 5 404 423 | 6 134 817 | 5 899 650 | 6 913 053 | 7 481 726 | 6 426 180 | — | — | — | 47 972 208 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 50.2 | 58.5 | 83.0 | 98.3 | 120.9 | 120.8 | 143.0 | 157.6 | 131.6 | 117.4 | 66.7 | 51.9 | 3.14 |
| 2019 | 51.3 | 57.5 | 79.2 | 104.1 | 119.5 | 121.3 | 141.1 | 156.0 | 131.3 | 116.8 | 66.8 | 54.9 | 3.04 |
| 2022 | 30.7 | 46.4 | 70.0 | 104.0 | 120.1 | 123.0 | 149.8 | 163.8 | 133.7 | 124.9 | 74.6 | 58.9 | 5.33 |
| 2023 | 51.7 | 60.4 | 80.1 | 106.8 | 119.4 | 116.6 | 135.4 | 152.1 | 129.9 | 121.6 | 70.9 | 55.1 | 2.94 |
| 2024 | 50.0 | 62.0 | 86.9 | 100.7 | 123.0 | 117.6 | 135.5 | 149.6 | 128.8 | 119.5 | 71.0 | 55.3 | 2.99 |
| 2025 | 51.5 | 59.5 | 81.8 | 107.4 | 121.9 | 119.5 | 137.9 | 147.8 | 126.8 | 120.1 | 70.7 | 55.1 | 2.87 |
| **Média** | **47.6** | **57.4** | **80.2** | **103.6** | **120.8** | **119.8** | **140.4** | **154.5** | **130.4** | **120.1** | **70.1** | **55.2** | **3.39** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 50.9 | 59.6 | 82.2 | 103.5 | 121.0 | 119.2 | 138.6 | 152.6 | 129.7 | 119.1 | 69.2 | 54.5 | 3.00 |
| Mín | 30.7 | 46.4 | 70.0 | 98.3 | 119.4 | 116.6 | 135.4 | 147.8 | 126.8 | 116.8 | 66.7 | 51.9 | |
| Máx | 51.7 | 62.0 | 86.9 | 107.4 | 123.0 | 123.0 | 149.8 | 163.8 | 133.7 | 124.9 | 74.6 | 58.9 | |
| Quota do ano (%) = índice médio ÷ 12 | 3.96 | 4.78 | 6.68 | 8.63 | 10.07 | 9.98 | 11.70 | 12.87 | 10.86 | 10.01 | 5.84 | 4.60 | |

Pico: Ago (154.5); vale: Jan (47.6); pico÷vale = 3.25. Ordem decrescente: Ago > Jul > Set > Mai > Out > Jun > Abr > Mar > Nov > Fev > Dez > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=85.0, Abr=99.5, Abr−Mar=14.6; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=77.8, Abr=105.6, Abr−Mar=27.8.
Junho vs vizinhos: Mai=120.8, Jun=119.8, Jul=140.4 (Jun − média(Mai,Jul) = -10.8). Novembro vs vizinhos: Out=120.1, Nov=70.1, Dez=55.2 (Nov − média(Out,Dez) = -17.5).
2026 vs 2025 (homólogo, %): Jan +0.7, Fev -1.5, Mar +2.3, Abr +0.6, Mai +0.6, Jun -1.3, Jul +0.2, Ago +1.2, Set +1.3

#### Eurostat tour_occ_nim Portugal dormidas residentes (DOM)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 984 747 | 1 156 862 | 1 409 587 | 1 582 151 | 1 678 697 | 2 299 917 | 3 397 121 | 4 981 314 | 2 672 328 | 1 791 739 | 1 261 013 | 1 339 796 | 24 555 272 | 12 |
| 2019 | 1 061 538 | 1 146 773 | 1 524 581 | 1 892 163 | 1 835 743 | 2 622 552 | 3 447 807 | 5 108 620 | 2 779 430 | 1 724 304 | 1 452 909 | 1 405 580 | 26 002 000 | 12 |
| 2020 (COVID, excluído) | 1 201 342 | 1 445 733 | 633 261 | 101 048 | 258 907 | 1 176 544 | 2 368 947 | 4 460 040 | 2 467 261 | 1 367 111 | 624 019 | 671 693 | 16 775 906 | 12 |
| 2021 (COVID, excluído) | 480 031 | 378 352 | 525 384 | 762 479 | 1 411 509 | 2 329 135 | 3 351 734 | 5 463 111 | 2 993 874 | 2 120 060 | 1 365 611 | 1 203 441 | 22 384 721 | 12 |
| 2022 | 947 559 | 1 250 500 | 1 395 925 | 2 092 076 | 2 001 340 | 2 751 344 | 3 767 489 | 5 206 438 | 2 924 137 | 2 036 528 | 1 447 321 | 1 542 669 | 27 363 326 | 12 |
| 2023 | 1 251 257 | 1 460 787 | 1 610 693 | 2 301 419 | 1 992 279 | 2 559 641 | 3 716 187 | 4 962 844 | 2 843 775 | 2 064 054 | 1 478 595 | 1 698 096 | 27 939 627 | 12 |
| 2024 | 1 238 059 | 1 500 941 | 1 779 273 | 1 972 245 | 2 144 554 | 2 661 513 | 3 602 948 | 5 190 428 | 2 823 361 | 2 035 880 | 1 780 925 | 1 686 083 | 28 416 210 | 12 |
| 2025 | 1 356 410 | 1 473 483 | 1 791 780 | 2 187 845 | 2 210 548 | 2 790 445 | 3 710 473 | 5 224 931 | 2 933 777 | 2 157 630 | 1 787 961 | 1 779 784 | 29 405 067 | 12 |
| 2026 (parcial) | 1 427 357 | 1 505 834 | 1 749 417 | 2 169 947 | 2 371 657 | 2 884 613 | 3 850 327 | 5 195 317 | 3 037 301 | — | — | — | 24 191 770 | 9 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 48.1 | 56.5 | 68.9 | 77.3 | 82.0 | 112.4 | 166.0 | 243.4 | 130.6 | 87.6 | 61.6 | 65.5 | 5.06 |
| 2019 | 49.0 | 52.9 | 70.4 | 87.3 | 84.7 | 121.0 | 159.1 | 235.8 | 128.3 | 79.6 | 67.1 | 64.9 | 4.81 |
| 2022 | 41.6 | 54.8 | 61.2 | 91.7 | 87.8 | 120.7 | 165.2 | 228.3 | 128.2 | 89.3 | 63.5 | 67.7 | 5.49 |
| 2023 | 53.7 | 62.7 | 69.2 | 98.8 | 85.6 | 109.9 | 159.6 | 213.2 | 122.1 | 88.7 | 63.5 | 72.9 | 3.97 |
| 2024 | 52.3 | 63.4 | 75.1 | 83.3 | 90.6 | 112.4 | 152.2 | 219.2 | 119.2 | 86.0 | 75.2 | 71.2 | 4.19 |
| 2025 | 55.4 | 60.1 | 73.1 | 89.3 | 90.2 | 113.9 | 151.4 | 213.2 | 119.7 | 88.1 | 73.0 | 72.6 | 3.85 |
| **Média** | **50.0** | **58.4** | **69.7** | **88.0** | **86.8** | **115.0** | **158.9** | **225.5** | **124.7** | **86.5** | **67.3** | **69.1** | **4.56** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 51.7 | 59.1 | 71.3 | 87.2 | 86.6 | 113.9 | 157.7 | 225.0 | 124.0 | 86.0 | 68.1 | 69.4 | 4.38 |
| Mín | 41.6 | 52.9 | 61.2 | 77.3 | 82.0 | 109.9 | 151.4 | 213.2 | 119.2 | 79.6 | 61.6 | 64.9 | |
| Máx | 55.4 | 63.4 | 75.1 | 98.8 | 90.6 | 121.0 | 166.0 | 243.4 | 130.6 | 89.3 | 75.2 | 72.9 | |
| Quota do ano (%) = índice médio ÷ 12 | 4.17 | 4.87 | 5.80 | 7.33 | 7.23 | 9.59 | 13.24 | 18.79 | 10.39 | 7.21 | 5.61 | 5.76 | |

Pico: Ago (225.5); vale: Jan (50.0); pico÷vale = 4.51. Ordem decrescente: Ago > Jul > Set > Jun > Abr > Mai > Out > Mar > Dez > Nov > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=72.0, Abr=80.3, Abr−Mar=8.3; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=68.5, Abr=91.8, Abr−Mar=23.3.
Junho vs vizinhos: Mai=86.8, Jun=115.0, Jul=158.9 (Jun − média(Mai,Jul) = -7.8). Novembro vs vizinhos: Out=86.5, Nov=67.3, Dez=69.1 (Nov − média(Out,Dez) = -10.5).
2026 vs 2025 (homólogo, %): Jan +5.2, Fev +2.2, Mar -2.4, Abr -0.8, Mai +7.3, Jun +3.4, Jul +3.8, Ago -0.6, Set +3.5

#### Eurostat avia_paoa aeroporto Lisboa (PT_LPPT) passageiros transportados, total

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 1 917 258 | 1 852 938 | 2 233 214 | 2 464 914 | 2 582 871 | 2 655 244 | 2 884 070 | 2 896 524 | 2 756 958 | 2 642 488 | 2 086 417 | 2 072 807 | 29 045 703 | 12 |
| 2019 | 1 979 540 | 1 893 861 | 2 382 144 | 2 685 788 | 2 762 210 | 2 912 654 | 3 107 819 | 3 131 379 | 2 958 462 | 2 804 231 | 2 281 620 | 2 290 417 | 31 190 125 | 12 |
| 2020 (COVID, excluído) | 2 185 396 | 2 116 019 | 1 110 046 | 26 786 | 62 764 | 155 072 | 504 426 | 876 576 | 743 387 | 600 532 | 359 033 | 526 925 | 9 266 962 | 12 |
| 2021 (COVID, excluído) | 418 626 | 123 452 | 198 615 | 357 485 | 563 814 | 858 704 | 1 243 710 | 1 697 781 | 1 631 598 | 1 850 050 | 1 719 901 | 1 491 011 | 12 154 747 | 12 |
| 2022 | 1 211 722 | 1 410 179 | 1 890 714 | 2 365 697 | 2 529 142 | 2 716 578 | 2 933 676 | 2 948 520 | 2 824 200 | 2 773 083 | 2 345 971 | 2 295 528 | 28 245 010 | 12 |
| 2023 | 2 242 460 | 2 247 800 | 2 629 884 | 2 836 821 | 2 928 516 | 2 989 747 | 3 265 079 | 3 299 171 | 3 143 470 | 3 067 203 | 2 497 407 | 2 488 925 | 33 636 483 | 12 |
| 2024 | 2 256 786 | 2 418 703 | 2 828 252 | 2 961 286 | 3 129 491 | 3 102 114 | 3 320 636 | 3 382 006 | 3 276 262 | 3 171 325 | 2 616 992 | 2 585 949 | 35 049 802 | 12 |
| 2025 | 2 411 662 | 2 358 318 | 2 840 299 | 3 092 634 | 3 266 024 | 3 234 636 | 3 413 305 | 3 493 203 | 3 313 968 | 3 285 448 | 2 707 699 | 2 666 683 | 36 083 879 | 12 |
| 2026 (parcial) | 2 495 309 | 2 433 242 | 2 909 606 | 3 133 319 | — | — | — | — | — | — | — | — | 10 971 476 | 4 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 79.2 | 76.6 | 92.3 | 101.8 | 106.7 | 109.7 | 119.2 | 119.7 | 113.9 | 109.2 | 86.2 | 85.6 | 1.51 |
| 2019 | 76.2 | 72.9 | 91.6 | 103.3 | 106.3 | 112.1 | 119.6 | 120.5 | 113.8 | 107.9 | 87.8 | 88.1 | 1.58 |
| 2022 | 51.5 | 59.9 | 80.3 | 100.5 | 107.5 | 115.4 | 124.6 | 125.3 | 120.0 | 117.8 | 99.7 | 97.5 | 2.43 |
| 2023 | 80.0 | 80.2 | 93.8 | 101.2 | 104.5 | 106.7 | 116.5 | 117.7 | 112.1 | 109.4 | 89.1 | 88.8 | 1.47 |
| 2024 | 77.3 | 82.8 | 96.8 | 101.4 | 107.1 | 106.2 | 113.7 | 115.8 | 112.2 | 108.6 | 89.6 | 88.5 | 1.50 |
| 2025 | 80.2 | 78.4 | 94.5 | 102.8 | 108.6 | 107.6 | 113.5 | 116.2 | 110.2 | 109.3 | 90.0 | 88.7 | 1.45 |
| **Média** | **74.1** | **75.1** | **91.6** | **101.9** | **106.8** | **109.6** | **117.8** | **119.2** | **113.7** | **110.4** | **90.4** | **89.5** | **1.66** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 78.6 | 78.2 | 93.8 | 102.1 | 106.6 | 108.4 | 116.5 | 118.0 | 112.4 | 108.9 | 88.5 | 88.0 | 1.50 |
| Mín | 51.5 | 59.9 | 80.3 | 100.5 | 104.5 | 106.2 | 113.5 | 115.8 | 110.2 | 107.9 | 86.2 | 85.6 | |
| Máx | 80.2 | 82.8 | 96.8 | 103.3 | 108.6 | 115.4 | 124.6 | 125.3 | 120.0 | 117.8 | 99.7 | 97.5 | |
| Quota do ano (%) = índice médio ÷ 12 | 6.17 | 6.26 | 7.63 | 8.49 | 8.90 | 9.13 | 9.82 | 9.93 | 9.48 | 9.20 | 7.53 | 7.46 | |

Pico: Ago (119.2); vale: Jan (74.1); pico÷vale = 1.61. Ordem decrescente: Ago > Jul > Set > Out > Jun > Mai > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=94.5, Abr=101.6, Abr−Mar=7.1; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=90.1, Abr=102.0, Abr−Mar=11.9.
Junho vs vizinhos: Mai=106.8, Jun=109.6, Jul=117.8 (Jun − média(Mai,Jul) = -2.7). Novembro vs vizinhos: Out=110.4, Nov=90.4, Dez=89.5 (Nov − média(Out,Dez) = -9.6).
2026 vs 2025 (homólogo, %): Jan +3.5, Fev +3.2, Mar +2.4, Abr +1.3

#### Eurostat avia_paoa aeroporto Lisboa (PT_LPPT) passageiros transportados, internacional

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total ano | N meses |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 1 668 564 | 1 620 175 | 1 951 925 | 2 164 178 | 2 264 182 | 2 321 347 | 2 523 767 | 2 513 408 | 2 412 903 | 2 324 383 | 1 832 309 | 1 815 660 | 25 412 801 | 12 |
| 2019 | 1 732 995 | 1 662 189 | 2 097 452 | 2 375 203 | 2 451 301 | 2 580 558 | 2 741 058 | 2 750 312 | 2 606 579 | 2 502 750 | 2 040 420 | 2 041 950 | 27 582 767 | 12 |
| 2020 (COVID, excluído) | 1 955 696 | 1 894 608 | 987 583 | 25 670 | 58 481 | 139 445 | 433 347 | 728 718 | 618 263 | 494 666 | 301 026 | 452 724 | 8 090 227 | 12 |
| 2021 (COVID, excluído) | 355 903 | 96 236 | 148 292 | 273 567 | 453 001 | 692 187 | 1 032 888 | 1 424 162 | 1 387 691 | 1 603 970 | 1 521 887 | 1 305 370 | 10 295 154 | 12 |
| 2022 | 1 065 380 | 1 254 822 | 1 680 300 | 2 061 931 | 2 218 037 | 2 366 514 | 2 564 222 | 2 558 414 | 2 473 456 | 2 445 144 | 2 079 468 | 2 027 394 | 24 795 082 | 12 |
| 2023 | 1 980 013 | 1 985 824 | 2 323 123 | 2 488 159 | 2 590 641 | 2 636 620 | 2 871 823 | 2 902 923 | 2 776 982 | 2 730 500 | 2 229 020 | 2 206 944 | 29 722 572 | 12 |
| 2024 | 2 008 456 | 2 154 838 | 2 511 080 | 2 622 919 | 2 772 393 | 2 744 175 | 2 938 522 | 2 988 258 | 2 903 808 | 2 824 216 | 2 335 238 | 2 310 561 | 31 114 464 | 12 |
| 2025 | 2 157 499 | 2 112 267 | 2 529 291 | 2 738 593 | 2 907 734 | 2 873 494 | 3 027 304 | 3 088 938 | 2 952 240 | 2 939 855 | 2 433 861 | 2 401 333 | 32 162 409 | 12 |
| 2026 (parcial) | 2 253 744 | 2 188 910 | 2 615 442 | 2 799 023 | — | — | — | — | — | — | — | — | 9 857 119 | 4 |

Índice sazonal (mês ÷ média mensal do ano × 100). Anos completos usados: 2018, 2019, 2022, 2023, 2024, 2025

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Ago÷Jan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2018 | 78.8 | 76.5 | 92.2 | 102.2 | 106.9 | 109.6 | 119.2 | 118.7 | 113.9 | 109.8 | 86.5 | 85.7 | 1.51 |
| 2019 | 75.4 | 72.3 | 91.3 | 103.3 | 106.6 | 112.3 | 119.3 | 119.7 | 113.4 | 108.9 | 88.8 | 88.8 | 1.59 |
| 2022 | 51.6 | 60.7 | 81.3 | 99.8 | 107.3 | 114.5 | 124.1 | 123.8 | 119.7 | 118.3 | 100.6 | 98.1 | 2.40 |
| 2023 | 79.9 | 80.2 | 93.8 | 100.5 | 104.6 | 106.4 | 115.9 | 117.2 | 112.1 | 110.2 | 90.0 | 89.1 | 1.47 |
| 2024 | 77.5 | 83.1 | 96.8 | 101.2 | 106.9 | 105.8 | 113.3 | 115.2 | 112.0 | 108.9 | 90.1 | 89.1 | 1.49 |
| 2025 | 80.5 | 78.8 | 94.4 | 102.2 | 108.5 | 107.2 | 113.0 | 115.3 | 110.1 | 109.7 | 90.8 | 89.6 | 1.43 |
| **Média** | **73.9** | **75.3** | **91.6** | **101.5** | **106.8** | **109.3** | **117.5** | **118.3** | **113.6** | **111.0** | **91.1** | **90.1** | **1.65** |
| Média sem 2022 (Jan–Fev 2022 ainda afetados pela Ómicron) | 78.4 | 78.2 | 93.7 | 101.9 | 106.7 | 108.3 | 116.1 | 117.2 | 112.3 | 109.5 | 89.2 | 88.5 | 1.50 |
| Mín | 51.6 | 60.7 | 81.3 | 99.8 | 104.6 | 105.8 | 113.0 | 115.2 | 110.1 | 108.9 | 86.5 | 85.7 | |
| Máx | 80.5 | 83.1 | 96.8 | 103.3 | 108.5 | 114.5 | 124.1 | 123.8 | 119.7 | 118.3 | 100.6 | 98.1 | |
| Quota do ano (%) = índice médio ÷ 12 | 6.16 | 6.27 | 7.64 | 8.46 | 8.90 | 9.11 | 9.79 | 9.86 | 9.46 | 9.25 | 7.59 | 7.51 | |

Pico: Ago (118.3); vale: Jan (73.9); pico÷vale = 1.60. Ordem decrescente: Ago > Jul > Set > Out > Jun > Mai > Abr > Mar > Nov > Dez > Fev > Jan

Páscoa: anos com Páscoa em Março/1 Abr ([2018, 2024]): Mar=94.5, Abr=101.7, Abr−Mar=7.2; anos com Páscoa em Abril ([2019, 2022, 2023, 2025]): Mar=90.2, Abr=101.4, Abr−Mar=11.3.
Junho vs vizinhos: Mai=106.8, Jun=109.3, Jul=117.5 (Jun − média(Mai,Jul) = -2.8). Novembro vs vizinhos: Out=111.0, Nov=91.1, Dez=90.1 (Nov − média(Out,Dez) = -9.4).
2026 vs 2025 (homólogo, %): Jan +4.5, Fev +3.6, Mar +3.4, Abr +2.2

### Quadro-resumo dos índices médios

| Série (anos) | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| INE AML (NUTS II 2013) dormidas total [0009808 geo=17] — SEM 2022 (2018–2025, n=5) | 64.5 | 71.5 | 94.7 | 104.8 | 114.2 | 109.9 | 119.8 | 130.0 | 116.9 | 113.9 | 86.2 | 73.7 |
| INE AML (NUTS II 2013) dormidas total [0009808 geo=17] (2018–2025, n=6) | 59.8 | 69.1 | 92.3 | 105.1 | 114.1 | 111.1 | 121.6 | 131.6 | 118.2 | 115.1 | 87.4 | 74.6 |
| INE AML (NUTS II 2013) hóspedes total [0009812 geo=17] — SEM 2022 (2018–2025, n=5) | 67.7 | 73.4 | 94.3 | 103.2 | 114.4 | 111.1 | 114.8 | 120.3 | 116.4 | 114.9 | 90.2 | 79.1 |
| INE AML (NUTS II 2013) hóspedes total [0009812 geo=17] (2018–2025, n=6) | 63.0 | 71.2 | 91.9 | 103.5 | 114.2 | 112.0 | 116.8 | 121.8 | 118.0 | 116.1 | 91.3 | 80.0 |
| INE Lisboa município dormidas total [0012088 geo=1A01106] — SEM 2022 (2023–2025, n=3) | 67.3 | 76.3 | 98.6 | 106.4 | 114.9 | 106.9 | 112.9 | 120.5 | 114.2 | 115.4 | 90.4 | 76.2 |
| INE Lisboa município dormidas total [0012088 geo=1A01106] (2022–2025, n=4) | 59.4 | 71.7 | 94.8 | 106.3 | 114.7 | 109.0 | 116.3 | 123.7 | 116.7 | 117.0 | 92.3 | 77.9 |
| INE Lisboa município hóspedes total [0012089 geo=1A01106] — SEM 2022 (2023–2025, n=3) | 69.6 | 76.2 | 97.3 | 103.9 | 113.8 | 107.9 | 112.4 | 116.0 | 113.6 | 115.6 | 93.6 | 80.1 |
| INE Lisboa município hóspedes total [0012089 geo=1A01106] (2022–2025, n=4) | 61.7 | 71.9 | 93.4 | 103.9 | 113.6 | 109.7 | 115.7 | 119.1 | 116.5 | 117.5 | 95.3 | 81.7 |
| INE Lisboa município dormidas total, série NUTS2013 [0010735 geo=1701106] — SEM 2022 (2023–2025, n=3) | 67.3 | 76.3 | 98.6 | 106.4 | 114.9 | 106.9 | 112.9 | 120.5 | 114.2 | 115.4 | 90.4 | 76.2 |
| INE Lisboa município dormidas total, série NUTS2013 [0010735 geo=1701106] (2022–2025, n=4) | 59.4 | 71.7 | 94.8 | 106.3 | 114.7 | 109.0 | 116.3 | 123.7 | 116.7 | 117.0 | 92.3 | 77.9 |
| INE Lisboa município hóspedes total, série NUTS2013 [0010736 geo=1701106] — SEM 2022 (2023–2025, n=3) | 69.6 | 76.2 | 97.3 | 103.9 | 113.8 | 107.9 | 112.4 | 116.0 | 113.6 | 115.6 | 93.6 | 80.1 |
| INE Lisboa município hóspedes total, série NUTS2013 [0010736 geo=1701106] (2022–2025, n=4) | 61.7 | 71.9 | 93.4 | 103.9 | 113.6 | 109.7 | 115.7 | 119.1 | 116.5 | 117.5 | 95.3 | 81.7 |
| INE Grande Lisboa (NUTS II 2024) dormidas total [0012088 geo=1A] — SEM 2022 (2023–2025, n=3) | 65.3 | 73.9 | 96.1 | 105.9 | 115.1 | 108.3 | 116.6 | 125.0 | 115.6 | 115.5 | 88.4 | 74.4 |
| INE Grande Lisboa (NUTS II 2024) dormidas total [0012088 geo=1A] (2022–2025, n=4) | 58.0 | 69.7 | 92.4 | 106.2 | 114.9 | 110.3 | 119.8 | 128.1 | 117.8 | 117.0 | 90.0 | 75.9 |
| INE Grande Lisboa (NUTS II 2024) hóspedes total [0012089 geo=1A] — SEM 2022 (2023–2025, n=3) | 68.6 | 74.9 | 95.6 | 104.0 | 114.5 | 109.1 | 113.8 | 117.7 | 114.5 | 115.5 | 92.2 | 79.6 |
| INE Grande Lisboa (NUTS II 2024) hóspedes total [0012089 geo=1A] (2022–2025, n=4) | 61.1 | 70.9 | 91.8 | 104.2 | 114.3 | 110.8 | 117.1 | 120.5 | 117.3 | 117.4 | 93.7 | 81.0 |
| INE Portugal dormidas total [0010415] — SEM 2022 (2018–2025, n=5) | 52.3 | 60.9 | 81.3 | 101.4 | 113.0 | 118.9 | 138.7 | 160.6 | 128.1 | 112.2 | 71.4 | 61.1 |
| INE Portugal dormidas total [0010415] (2018–2025, n=6) | 49.3 | 59.1 | 79.3 | 101.7 | 112.8 | 119.7 | 140.5 | 162.4 | 128.8 | 113.0 | 71.7 | 61.6 |
| INE Portugal dormidas residentes [0010415 dim3=PT] — SEM 2022 (2018–2025, n=5) | 57.2 | 65.3 | 78.4 | 94.2 | 92.8 | 115.4 | 142.2 | 188.3 | 121.9 | 92.3 | 74.9 | 77.0 |
| INE Portugal dormidas residentes [0010415 dim3=PT] (2018–2025, n=6) | 55.1 | 64.5 | 76.5 | 95.0 | 92.9 | 116.5 | 143.6 | 189.5 | 122.8 | 92.9 | 73.9 | 76.7 |
| INE Portugal dormidas não residentes [0010415 dim3=E] — SEM 2022 (2018–2025, n=5) | 50.2 | 59.0 | 82.5 | 104.4 | 121.7 | 120.4 | 137.2 | 148.7 | 130.8 | 120.8 | 69.9 | 54.3 |
| INE Portugal dormidas não residentes [0010415 dim3=E] (2018–2025, n=6) | 46.7 | 56.7 | 80.4 | 104.6 | 121.6 | 121.1 | 139.1 | 150.6 | 131.5 | 121.8 | 70.8 | 55.1 |
| INE Portugal hóspedes total [0010416] — SEM 2022 (2018–2025, n=5) | 57.0 | 64.6 | 84.5 | 103.5 | 116.2 | 116.9 | 125.3 | 144.2 | 126.2 | 113.1 | 78.1 | 70.4 |
| INE Portugal hóspedes total [0010416] (2018–2025, n=6) | 53.9 | 63.2 | 82.3 | 103.9 | 116.0 | 117.5 | 127.3 | 145.7 | 127.0 | 114.2 | 78.2 | 70.9 |
| INE Portugal hóspedes residentes [0010416 dim3=PT] — SEM 2022 (2018–2025, n=5) | 67.5 | 75.9 | 88.0 | 99.0 | 100.9 | 111.6 | 120.0 | 147.8 | 114.5 | 98.7 | 85.7 | 90.5 |
| INE Portugal hóspedes residentes [0010416 dim3=PT] (2018–2025, n=6) | 65.2 | 75.2 | 86.0 | 100.0 | 101.0 | 112.4 | 121.5 | 148.4 | 115.3 | 99.8 | 84.8 | 90.1 |
| INE Portugal hóspedes não residentes [0010416 dim3=E] — SEM 2022 (2018–2025, n=5) | 50.3 | 57.3 | 82.2 | 106.4 | 126.1 | 120.3 | 128.7 | 141.9 | 133.8 | 122.4 | 73.2 | 57.4 |
| INE Portugal hóspedes não residentes [0010416 dim3=E] (2018–2025, n=6) | 46.4 | 55.2 | 79.8 | 106.4 | 125.8 | 120.9 | 131.1 | 143.9 | 134.8 | 123.6 | 73.9 | 58.2 |
| Eurostat tour_occ_nin2m AML PT17 (NUTS 2021) dormidas total (2022–2022, n=1) | 36.5 | 55.8 | 78.3 | 104.4 | 111.9 | 116.6 | 135.2 | 148.2 | 126.6 | 119.2 | 90.5 | 76.6 |
| Eurostat tour_occ_nin2m AML PT17 (NUTS 2021) dormidas não residentes (FOR) (2022–2022, n=1) | 29.9 | 51.2 | 77.7 | 106.5 | 115.7 | 118.3 | 134.9 | 146.7 | 128.8 | 125.3 | 91.7 | 73.1 |
| Eurostat tour_occ_nin2m AML PT17 (NUTS 2021) dormidas residentes (DOM) (2022–2022, n=1) | 55.0 | 69.0 | 80.1 | 98.5 | 101.4 | 111.8 | 136.2 | 152.2 | 120.4 | 101.8 | 87.1 | 86.4 |
| Eurostat tour_occ_nin2m Grande Lisboa PT1A dormidas total (2023–2025, n=3) | 64.9 | 73.4 | 95.6 | 105.6 | 115.1 | 108.2 | 117.5 | 126.8 | 115.8 | 115.2 | 87.9 | 74.0 |
| Eurostat tour_occ_nin2m Grande Lisboa PT1A dormidas não residentes (FOR) (2023–2025, n=3) | 61.4 | 70.7 | 95.0 | 106.7 | 118.0 | 109.8 | 118.8 | 130.4 | 119.0 | 117.6 | 85.2 | 67.3 |
| Eurostat tour_occ_nin2m Grande Lisboa PT1A dormidas residentes (DOM) (2023–2025, n=3) | 80.0 | 85.1 | 97.9 | 100.8 | 102.4 | 101.6 | 112.0 | 111.2 | 101.8 | 104.7 | 99.5 | 102.9 |
| Eurostat tour_occ_nim Portugal dormidas total — SEM 2022 (2018–2025, n=5) | 51.2 | 59.4 | 78.6 | 98.1 | 109.7 | 117.4 | 144.9 | 176.4 | 127.8 | 108.2 | 68.8 | 59.4 |
| Eurostat tour_occ_nim Portugal dormidas total (2018–2025, n=6) | 48.4 | 57.8 | 76.7 | 98.4 | 109.5 | 118.2 | 146.6 | 178.2 | 128.5 | 108.9 | 69.1 | 59.8 |
| Eurostat tour_occ_nim Portugal dormidas não residentes (FOR) — SEM 2022 (2018–2025, n=5) | 50.9 | 59.6 | 82.2 | 103.5 | 121.0 | 119.2 | 138.6 | 152.6 | 129.7 | 119.1 | 69.2 | 54.5 |
| Eurostat tour_occ_nim Portugal dormidas não residentes (FOR) (2018–2025, n=6) | 47.6 | 57.4 | 80.2 | 103.6 | 120.8 | 119.8 | 140.4 | 154.5 | 130.4 | 120.1 | 70.1 | 55.2 |
| Eurostat tour_occ_nim Portugal dormidas residentes (DOM) — SEM 2022 (2018–2025, n=5) | 51.7 | 59.1 | 71.3 | 87.2 | 86.6 | 113.9 | 157.7 | 225.0 | 124.0 | 86.0 | 68.1 | 69.4 |
| Eurostat tour_occ_nim Portugal dormidas residentes (DOM) (2018–2025, n=6) | 50.0 | 58.4 | 69.7 | 88.0 | 86.8 | 115.0 | 158.9 | 225.5 | 124.7 | 86.5 | 67.3 | 69.1 |
| Eurostat avia_paoa aeroporto Lisboa (PT_LPPT) passageiros transportados, total — SEM 2022 (2018–2025, n=5) | 78.6 | 78.2 | 93.8 | 102.1 | 106.6 | 108.4 | 116.5 | 118.0 | 112.4 | 108.9 | 88.5 | 88.0 |
| Eurostat avia_paoa aeroporto Lisboa (PT_LPPT) passageiros transportados, total (2018–2025, n=6) | 74.1 | 75.1 | 91.6 | 101.9 | 106.8 | 109.6 | 117.8 | 119.2 | 113.7 | 110.4 | 90.4 | 89.5 |
| Eurostat avia_paoa aeroporto Lisboa (PT_LPPT) passageiros transportados, internacional — SEM 2022 (2018–2025, n=5) | 78.4 | 78.2 | 93.7 | 101.9 | 106.7 | 108.3 | 116.1 | 117.2 | 112.3 | 109.5 | 89.2 | 88.5 |
| Eurostat avia_paoa aeroporto Lisboa (PT_LPPT) passageiros transportados, internacional (2018–2025, n=6) | 73.9 | 75.3 | 91.6 | 101.5 | 106.8 | 109.3 | 117.5 | 118.3 | 113.6 | 111.0 | 91.1 | 90.1 |

### Inferences
- As duas séries municipais do INE (0012088 NUTS 2024 e 0010735 NUTS 2013) dão valores idênticos para Lisboa em 2022–2026, pelo que 2020–2021 da 0010735 são comparáveis (mas distorcidos pela COVID).
- Eurostat PT17 (2022) e INE AML (2022) diferem em nível (19,39 M vs 17,98 M dormidas) pela inclusão de campismo no Eurostat; a forma sazonal é que interessa.

### Gaps
- Eurostat `tour_occ_nin2m`: PT17 só tem 2020–2022 e PT1A só 2023–2025 (mudança NUTS), pelo que a divisão residentes/não residentes não tem série contínua nem 2018–2019.
- Aeroporto: Mai–Set 2026 sem valores no Eurostat à data de extração.
- Ficheiros brutos e scripts ficaram só no scratchpad da sessão (não persistente): /tmp/claude-0/-home-user-eatgioco-github-io/c5c882ea-6f27-5f66-9a7f-45fbb783d52e/scratchpad/dl_turismo e /tmp/claude-0/-home-user-eatgioco-github-io/c5c882ea-6f27-5f66-9a7f-45fbb783d52e/scratchpad/scripts_turismo
