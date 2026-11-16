# Ronda 2 — Séries mensais de presença de residentes e trabalhadores em Lisboa (INE / Eurostat)

Data de recolha de todos os dados: **16 Nov 2026** (extrações INE com `DataExtracao` 2026-11-16T23:38–23:55Z). Ferramentas: `curl` + `python3 -I`. Ficheiros brutos em `/tmp/claude-0/-home-user-eatgioco-github-io/c5c882ea-6f27-5f66-9a7f-45fbb783d52e/scratchpad/dl2/`, scripts em `/tmp/claude-0/-home-user-eatgioco-github-io/c5c882ea-6f27-5f66-9a7f-45fbb783d52e/scratchpad/scripts2/` (`wd.py`, `metro.py`, `es.py`) — o scratchpad é temporário.

**Método comum dos índices.** Para cada ano completo: índice do mês = valor do mês ÷ média dos 12 meses desse ano × 100. Depois média, mínimo e máximo entre os anos 2018, 2019, 2022, 2023, 2024, 2025 (2020–2021 excluídos, COVID). 2026 só tem Jan–Ago (metro/comboio) ou Jan–Jun (viagens), por isso não entra nos índices. Versão "por dia útil": valor do mês ÷ n.º de dias úteis do mês (seg–sex menos feriados nacionais e 13 Jun), depois o mesmo índice. Colunas das tabelas = Jan … Dez.

---

## 1. Metropolitano de Lisboa — passageiros mensais (a série principal)

### Takeaway
O indicador INE é o **0000898** (mensal, Jan 2004–Ago 2026, por sistema: Lisboa / Porto / Metro Sul do Tejo). Em bruto, Agosto vale em média **86,9** (mín 82,1; máx 95,0 em 2023, ano atípico) e Outubro é o pico (**116,2**); por dia útil, Agosto vale **84,8** e Julho **92,5** — ou seja, a quebra de Agosto é quase toda "pessoas fora", não "menos dias úteis", e Julho já está ~8–10 % abaixo de Maio/Junho por dia útil.

### Cited Findings
- Indicador: "Passageiros transportados (N.º) pelas empresas exploradoras de sistema ferroviário ligeiro por Sistema de metropolitano; Mensal — INE, Inquérito ao transporte por metropolitano", código 0000898, período Jan 2004 a Ago 2026, última atualização 2026-10-30. (O nome "por Localização geográfica" do pedido não existe; a dimensão chama-se "Sistema de metropolitano".) — [INE metadados 0000898](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0000898&lang=PT)
- Pedido exato usado (devolve toda a série, 272 meses): `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000898&Dim1=T&lang=PT`. Unidade: **milhares de passageiros** (ex.: Ago 2026 Lisboa `ind_string` "11 410" = 11,41 milhões). — [INE dados 0000898](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000898&Dim1=T&lang=PT)

**Tabela bruta — Metropolitano de Lisboa, milhares de passageiros (tal como devolvido)** — [INE 0000898](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000898&Dim1=T&lang=PT)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2017 | 12874 | 12225 | 15070 | 12835 | 14936 | 13384 | 12806 | 10907 | 13627 | 15425 | 14960 | 12442 | 161491 |
| 2018 | 13377 | 12483 | 14520 | 14181 | 15372 | 13790 | 13575 | 11959 | 14803 | 16520 | 14882 | 13706 | 169168 |
| 2019 | 14165 | 13691 | 15096 | 15076 | 16794 | 14550 | 15466 | 12958 | 15487 | 18220 | 15874 | 15698 | 183075 |
| 2020 (COVID) | 16072 | 15223 | 8565 | 2662 | 3300 | 4800 | 6096 | 6080 | 7265 | 7852 | 6531 | 6113 | 90559 |
| 2021 (COVID) | 4825 | 2900 | 3928 | 5423 | 7020 | 6823 | 6840 | 6719 | 8635 | 10623 | 10557 | 9393 | 83686 |
| 2022 | 8122 | 9170 | 11429 | 10840 | 12105 | 11020 | 11480 | 10264 | 12760 | 13606 | 13713 | 12186 | 136695 |
| 2023 | 13364 | 12552 | 15585 | 12988 | 14155 | 12915 | 12918 | 13131 | 14169 | 15309 | 15138 | 13580 | 165804 |
| 2024 | 13827 | 13857 | 14872 | 15443 | 15822 | 14017 | 14423 | 12091 | 15316 | 17176 | 15328 | 14476 | 176648 |
| 2025 | 14030 | 14012 | 15231 | 14275 | 16050 | 14023 | 14453 | 12171 | 14652 | 16441 | 15057 | 13056 | 173451 |
| 2026 | 13384 | 12729 | 15427 | 14049 | 15016 | 13350 | 13711 | 11410 | — | — | — | — | (8 meses) 109076 |

Para referência, mesma extração, outros sistemas (milhares) — [INE 0000898](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000898&Dim1=T&lang=PT):
- Porto 2024: 6831 6825 7163 7612 8066 7146 7476 6491 7737 8866 8211 7357; 2025: 7199 7435 7986 7593 8831 7809 8068 6859 8297 9281 8244 7123; 2026: 7224 6954 8632 8381 9068 7943 8277 6965.
- Metro Sul do Tejo 2024: 1611 1586 1669 1753 1847 1597 1657 1448 1628 1971 1808 1616; 2025: 1645 1616 1702 1640 1840 1652 1710 1478 1704 1907 1697 1453; 2026: 1557 1495 1879 1759 1847 1592 1671 1463.

**Índice sazonal bruto (mês ÷ média mensal do ano × 100) — calculado sobre a tabela acima**

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 94,9 | 88,5 | 103,0 | 100,6 | 109,0 | 97,8 | 96,3 | 84,8 | 105,0 | 117,2 | 105,6 | 97,2 |
| 2019 | 92,8 | 89,7 | 98,9 | 98,8 | 110,1 | 95,4 | 101,4 | 84,9 | 101,5 | 119,4 | 104,0 | 102,9 |
| 2022 | 71,3 | 80,5 | 100,3 | 95,2 | 106,3 | 96,7 | 100,8 | 90,1 | 112,0 | 119,4 | 120,4 | 107,0 |
| 2023 | 96,7 | 90,8 | 112,8 | 94,0 | 102,4 | 93,5 | 93,5 | 95,0 | 102,5 | 110,8 | 109,6 | 98,3 |
| 2024 | 93,9 | 94,1 | 101,0 | 104,9 | 107,5 | 95,2 | 98,0 | 82,1 | 104,0 | 116,7 | 104,1 | 98,3 |
| 2025 | 97,1 | 96,9 | 105,4 | 98,8 | 111,0 | 97,0 | 100,0 | 84,2 | 101,4 | 113,7 | 104,2 | 90,3 |
| **Média (6 anos)** | **91,1** | **90,1** | **103,6** | **98,7** | **107,7** | **95,9** | **98,3** | **86,9** | **104,4** | **116,2** | **108,0** | **99,0** |
| Mín | 71,3 | 80,5 | 98,9 | 94,0 | 102,4 | 93,5 | 93,5 | 82,1 | 101,4 | 110,8 | 104,0 | 90,3 |
| Máx | 97,1 | 96,9 | 112,8 | 104,9 | 111,0 | 97,8 | 101,4 | 95,0 | 112,0 | 119,4 | 120,4 | 107,0 |
| Média 2023–25 | 95,9 | 94,0 | 106,4 | 99,2 | 107,0 | 95,2 | 97,2 | 87,1 | 102,7 | 113,7 | 106,0 | 95,6 |

**Quebra de Agosto, medida de três formas (cálculo próprio sobre os dados INE)**

| Ano | Ago ÷ média(Mai, Jun, Set, Out), bruto | idem por dia útil | Jul ÷ média(Mai, Jun, Set, Out), bruto | idem por dia útil | Ago ÷ média(Mai, Jun), bruto | idem por dia útil |
|---|---|---|---|---|---|---|
| 2018 | 79,1 | 74,7 | 89,8 | 84,7 | 82,0 | 76,5 |
| 2019 | 79,7 | 78,4 | 95,1 | 85,4 | 82,7 | 76,2 |
| 2022 | 83,0 | 78,1 | 92,8 | 91,5 | 88,8 | 82,6 |
| 2023 | 92,9 | 88,7 | 91,4 | 91,4 | 97,0 | 92,6 |
| 2024 | 77,6 | 76,6 | 92,6 | 83,4 | 81,0 | 75,2 |
| 2025 | 79,6 | 83,2 | 94,5 | 86,0 | 80,9 | 78,9 |
| 2026 (só Mai/Jun disponíveis) | — | — | — | — | 80,4 | 76,6 |

- 2026 vs 2025, variação homóloga mensal do Metro de Lisboa (cálculo próprio): Jan −4,6 %, Fev −9,2 %, Mar +1,3 %, Abr −1,6 %, Mai −6,4 %, Jun −4,8 %, Jul −5,1 %, Ago −6,3 %. — [INE 0000898](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000898&Dim1=T&lang=PT)

### Inferences
- Excluindo 2023 (ver anomalias), o índice bruto de Agosto fica em 82,1–90,1 (média dos 5 anos ≈ 85,2); face aos meses "normais" vizinhos (Mai, Jun, Set, Out), Agosto vale **~78–83 % em bruto e ~75–83 % por dia útil**. Uma quebra de ~20 % é a leitura central.
- O metro subestima a saída de residentes em Agosto porque nesse mês há mais turistas a usá-lo (os turistas compensam parte dos passes que não são usados). Para um balcão de almoço de semana com clientela local/escritórios, a quebra real de presença deverá ser **maior** do que os ~20 % do metro; os ~20 % são um limite inferior.
- Anomalias visíveis nos dados (as causas abaixo são conhecimento prévio do investigador, **não verificadas nesta sessão** — os sites noticiosos e do Metro estão bloqueados):
  - **Ago 2023 = 95,0** (13 131 mil, acima de Julho 2023): coincide com a Jornada Mundial da Juventude em Lisboa (1–6 Ago 2023). Tratar 2023 como atípico para Agosto.
  - **Jan–Fev 2022 = 71,3 / 80,5**: ainda recuperação pós-Ómicron; 2022 tem tendência crescente ao longo do ano, o que infla Out–Dez (119–120) e deprime Jan–Abr. Para um índice "limpo" prefira a média 2023–25 ou 2018/2019/2024/2025.
  - **Abr–Jul 2023 baixos** (94,0 / 102,4 / 93,5 / 93,5) e **Mar 2023 alto** (112,8): padrão compatível com greves no Metro de Lisboa em 2023.
  - **Dez 2025 = 90,3** (13 056 mil, o Dezembro mais fraco da série recente): compatível com greve(s) em Dezembro de 2025.
  - **Fev 2026 −9,2 % homólogo**: outlier não explicado.
- Outubro é consistentemente o pico (110,8–119,4): tem 22–23 dias úteis e regresso pleno de aulas/universidades; Maio é o segundo pico.

### Gaps
- Não foi possível confirmar em fontes acessíveis as causas das anomalias (JMJ, greves, encerramentos de linha); só os dados mostram os outliers.
- O indicador mede passageiros (validações) de todo o tipo — não distingue residentes de turistas nem dias úteis de fins de semana. Não existe no INE série diária ou por tipo de título.
- Set–Dez 2026 ainda não publicados (último mês: Ago 2026, atualização de 30 Out 2026).

---

## 2. Comboio suburbano, transporte fluvial, autocarros urbanos

### Takeaway
Só o comboio pesado tem série mensal na API do INE (**0000901**, tipo de tráfego "Suburbano", **só Portugal, não Lisboa**) e mostra uma sazonalidade muito mais fraca do que o metro (Agosto ≈ 99 em bruto, ≈ 97 por dia útil em 2022–25); o fluvial só existe anual na API (0000896) e não encontrei série mensal de autocarros urbanos de Lisboa.

### Cited Findings
- Indicador 0000901 "Passageiros transportados (N.º) pelas empresas exploradoras de sistema ferroviário pesado por Tipo de tráfego; Mensal — INE, Inquérito ao tráfego por caminho de ferro", Jan 2004–Ago 2026, atualizado 2026-10-30; dimensões: Portugal × Total/Suburbano/Nacional/Internacional; nota do INE: "Informação com nova metodologia de cálculo a partir de abril de 2019". — [INE metadados 0000901](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0000901&lang=PT)
- Pedido usado (um por ano, exemplo 2025): `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000901&Dim1=S3A202501,S3A202502,…,S3A202512&Dim2=PT&Dim3=1&lang=PT` (códigos de período `S3AAAAAMM`; `Dim3=1` = Suburbano). O pedido com `Dim1=T` falha por timeout. — [INE dados 0000901](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000901&Dim1=S3A202508&Dim2=PT&Dim3=1&lang=PT)

**Tabela bruta — comboio suburbano, Portugal, milhares de passageiros** — [INE 0000901](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0000901&lang=PT)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 10968 | 9921 | 10629 | 11017 | 11688 | 10672 | 10942 | 9766 | 11528 | 12115 | 11371 | 10660 |
| 2019 (quebra de série em Abr) | 11634 | 10734 | 10966 | 12966 | 14015 | 12528 | 14291 | 13234 | 15221 | 17128 | 14644 | 14284 |
| 2020 (COVID) | 14469 | 13533 | 7559 | 1254 | 4352 | 6109 | 8228 | 7703 | 9242 | 9676 | 8543 | 7896 |
| 2021 (COVID) | 7594 | 4470 | 5885 | 7771 | 9468 | 9069 | 9566 | 9241 | 10936 | 12241 | 12722 | 11489 |
| 2022 | 10516 | 10688 | 12976 | 12541 | 13896 | 12766 | 13379 | 12616 | 14039 | 14391 | 14258 | 13003 |
| 2023 | 14027 | 12057 | 14694 | 13021 | 16525 | 15631 | 15538 | 16631 | 16605 | 17272 | 16674 | 15353 |
| 2024 | 16003 | 15317 | 16181 | 16670 | 17395 | 15976 | 17152 | 15440 | 17028 | 18098 | 16531 | 16066 |
| 2025 | 16239 | 15248 | 16634 | 16279 | 16765 | 16293 | 18114 | 15938 | 18291 | 18554 | 16408 | 15717 |
| 2026 | 15899 | 14439 | 17634 | 17373 | 17535 | 16587 | 17961 | 16205 | — | — | — | — |

**Índice sazonal, comboio suburbano PT, 2022–2025** (2018 fica de fora por ser da metodologia antiga e 2019 por ter a quebra em Abril; cálculo próprio)

| | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bruto — média | 91,8 | 86,4 | 98,5 | 95,1 | 105,3 | 98,8 | 104,3 | 98,8 | 107,4 | 111,2 | 104,4 | 98,1 |
| Bruto — mín | 81,4 | 78,6 | 95,8 | 84,9 | 100,3 | 96,9 | 101,3 | 93,6 | 103,3 | 109,8 | 98,2 | 94,1 |
| Bruto — máx | 97,2 | 92,9 | 100,4 | 101,1 | 107,8 | 101,9 | 108,4 | 108,4 | 109,5 | 112,6 | 110,3 | 100,6 |
| Por dia útil — média | 87,7 | 88,7 | 94,6 | 101,5 | 101,9 | 109,7 | 98,8 | 96,7 | 104,0 | 106,8 | 105,9 | 103,7 |
| Por dia útil — mín | 80,5 | 81,4 | 86,2 | 97,6 | 99,4 | 105,5 | 94,7 | 92,2 | 102,6 | 100,0 | 102,1 | 97,2 |
| Por dia útil — máx | 92,4 | 94,9 | 102,8 | 106,2 | 105,2 | 112,8 | 102,5 | 102,0 | 106,7 | 115,7 | 109,2 | 115,1 |

- Com a metodologia antiga, 2018 dava Agosto = 9766 vs média anual 10 940 → índice 89,3 (cálculo próprio sobre a linha de 2018). — [INE 0000901](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0000901&lang=PT)
- Fluvial: na API só existe o indicador **anual** 0000896 "Movimento de passageiros em vias navegáveis interiores (N.º) por Carreira fluvial (Passageiros); Anual — INE, Inquérito ao transporte fluvial de passageiros e veículos" (último período 2025). — [INE metadados 0000896](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0000896&lang=PT)
- O INE divulga o fluvial trimestralmente nos destaques "Atividade dos transportes" (um resumo de pesquisa refere ~5,1 milhões de passageiros no 1.º trimestre de 2026 e 69,3 milhões no metro no mesmo trimestre; valores vistos só em snippet, não no PDF). — [INE destaque (xurl/doc/761757054)](https://www.ine.pt/xurl/doc/761757054)

### Inferences
- O suburbano nacional pós-2019 quase não cai em Agosto (93,6–108,4), ao contrário do metro. Explicações plausíveis: é uma série nacional que inclui linhas usadas para a praia (ex.: Cascais) e os suburbanos do Porto, forte crescimento tendencial 2022–25 (passes baratos) e 2023 distorcido (Ago 2023 = 108,4, JMJ; Fev/Abr 2023 muito baixos, compatível com greves na CP). **Não recomendo** usar esta série para a quebra de Agosto de trabalhadores em Lisboa; o metro é melhor proxy.
- Mesmo assim confirma o perfil geral: Jan–Fev fracos (86–92), Out pico (111), Dez perto de 98.

### Gaps
- Não há série mensal INE de comboio suburbano **só da AML**, nem mensal de transporte fluvial (Transtejo/Soflusa), nem de autocarros urbanos de Lisboa (Carris) na API consultada. Os PDFs dos destaques trimestrais não foram descarregados (limite de chamadas; a API do INE devolve "connection reset" com frequência).
- Varri os códigos 0000880–0000910 e 0007160–0007176: não apareceu nenhum indicador mensal fluvial ou rodoviário urbano. Uma pesquisa exaustiva do catálogo do INE não foi feita.

---

## 3. Procura turística dos residentes — distribuição mensal de viagens e dormidas (INE e Eurostat)

### Takeaway
Agosto concentra **~16,5 % das viagens** dos residentes em Portugal mas **~28–30 % das dormidas por motivos pessoais** e **~36–41 % das dormidas em viagens longas (4+ noites)**; Julho leva mais ~16–21 % das dormidas. Julho + Agosto somam ~45 % das noites pessoais fora de casa e ~55–62 % das noites de férias longas.

### Cited Findings
- INE tem série **mensal** de viagens: indicador 0007171 "Viagens (N.º) feitas pelos turistas por Sexo e Grupo etário; Mensal — INE, Inquérito às deslocações dos residentes", Jan 2009–Jun 2026, atualizado 2026-10-28 (todas as viagens com dormida, todos os motivos e destinos). — [INE metadados 0007171](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0007171&lang=PT)
- Pedido usado (um por ano): `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0007171&Dim1=S3A202501,…,S3A202512&Dim2=PT&Dim3=T&Dim4=T&lang=PT`. — [INE dados 0007171](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0007171&Dim1=S3A202508&Dim2=PT&Dim3=T&Dim4=T&lang=PT)
- As séries mensais/trimestrais INE de **dormidas** dos residentes (0007160, 0007162, 0007163, 0007166) estão descontinuadas (último período: Setembro / 3.º trimestre de 2012). — [INE metadados 0007162](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0007162&lang=PT)

**INE 0007171 — viagens dos residentes (N.º), total, por mês** — [INE 0007171](https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=0007171&lang=PT)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 1305317 | 1436150 | 1733489 | 1406850 | 1434343 | 1906754 | 2433228 | 3618532 | 1753922 | 1382211 | 1308960 | 2359291 |
| 2019 | 1500729 | 1538796 | 1633640 | 2060163 | 1539492 | 2000687 | 2607155 | 4121550 | 1938526 | 1443060 | 1555043 | 2523963 |
| 2022 | 1372667 | 1538148 | 1430697 | 1971696 | 1455700 | 1900818 | 2565059 | 3613797 | 1777625 | 1269540 | 1349632 | 2381201 |
| 2023 | 1570097 | 1780813 | 1502267 | 2177089 | 1545644 | 1932679 | 2522780 | 3684602 | 1806199 | 1296598 | 1266495 | 2582632 |
| 2024 | 1287657 | 1497026 | 1688566 | 1377769 | 1504645 | 2016775 | 2383542 | 3994973 | 1843791 | 1363824 | 1455739 | 2487025 |
| 2025 | 1751098 | 1735062 | 1700658 | 2091480 | 1648716 | 2240053 | 2687845 | 4308606 | 1879631 | 1464272 | 1725034 | 2816668 |
| 2026 | 1815126 | 1871655 | 1864725 | 2019542 | 1739971 | 2128583 | — | — | — | — | — | — |

Quota de cada mês no total do ano (%), cálculo próprio:

| | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Média | 6,2 | 6,7 | 6,9 | 7,8 | 6,4 | 8,5 | 10,7 | 16,5 | 7,8 | 5,8 | 6,1 | 10,7 |
| Mín | 5,6 | 6,3 | 6,3 | 6,0 | 6,3 | 8,2 | 10,3 | 15,6 | 7,2 | 5,5 | 5,4 | 10,3 |
| Máx | 6,7 | 7,5 | 7,9 | 9,2 | 6,6 | 8,8 | 11,3 | 17,4 | 8,1 | 6,3 | 6,6 | 10,9 |

- Eurostat `tour_dem_tnmd` (noites) e `tour_dem_ttmd` (viagens) por **mês de partida**, anual, PT, 2012–2025. Pedidos: `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_tnmd/?format=TSV&compressed=false` e `.../tour_dem_ttmd/?format=TSV&compressed=false` (ficheiro completo, filtrado localmente por `geo=PT`). Dimensões: destino (DOM / FOR / WORLD), motivo (PER pessoal / PROF profissional / TOTAL), duração (N_GE1 = 1+ noites, N1-3, N_GE4 = 4+ noites). — [Eurostat tour_dem_tnmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_tnmd/?format=TSV&compressed=false); [Eurostat tour_dem_ttmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_ttmd/?format=TSV&compressed=false)

**Eurostat tour_dem_tnmd — noites dos residentes PT, motivo pessoal, todos os destinos (WORLD), 1+ noites** — [Eurostat tour_dem_tnmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_tnmd/?format=TSV&compressed=false)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 2150929 | 2526513 | 3730084 | 2802804 | 3224525 | 5378504 | 10894828 | 17993469 | 4931495 | 2758522 | 2601093 | 3627816 |
| 2019 | 2907823 | 3053647 | 3118715 | 5072564 | 3360410 | 6034824 | 11415191 | 21413682 | 5958721 | 3251442 | 2841936 | 3858340 |
| 2022 | 2777043 | 3173424 | 3311109 | 4893823 | 3037426 | 5619442 | 11919132 | 19406241 | 5752773 | 3359684 | 2812334 | 3885112 |
| 2023 | 3453250 | 3822496 | 2963276 | 5340497 | 3442415 | 5905002 | 11535344 | 19907142 | 6211330 | 3160859 | 2787133 | 4086069 |
| 2024 | 2514201 | 3255432 | 4224623 | 3459063 | 3984161 | 6332810 | 10659463 | 20599725 | 6050049 | 3297140 | 2843768 | 4223573 |
| 2025 | 3459759 | 3822237 | 3565651 | 5187358 | 3838413 | 6699349 | 11586246 | 21624724 | 5617969 | 3312766 | 3587191 | 4839299 |
| **Quota média %** | 4,0 | 4,6 | 4,9 | 6,2 | 4,9 | 8,4 | 16,0 | **28,4** | 8,1 | 4,5 | 4,1 | 5,7 |
| Mín % | 3,4 | 4,0 | 4,1 | 4,5 | 4,3 | 8,0 | 14,9 | 27,4 | 7,3 | 4,3 | 3,8 | 5,3 |
| Máx % | 4,8 | 5,3 | 6,0 | 7,4 | 5,6 | 8,9 | 17,4 | 29,6 | 8,6 | 4,8 | 4,7 | 6,3 |

**Idem, só viagens longas (4+ noites), WORLD, pessoal** — [Eurostat tour_dem_tnmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_tnmd/?format=TSV&compressed=false)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 884508 | 1128656 | 2079526 | 1440314 | 1678460 | 3694462 | 9173711 | 15882493 | 3385593 | 1395775 | 1230020 | 1757554 |
| 2019 | 1370538 | 1530809 | 1429791 | 3087771 | 1747835 | 4156664 | 9587240 | 19013036 | 4179026 | 1679290 | 1165127 | 1863630 |
| 2022 | 1296099 | 1406922 | 1809270 | 2833078 | 1604378 | 3779207 | 10126324 | 17219502 | 4192696 | 2016120 | 1419546 | 1774736 |
| 2023 | 1792241 | 1901746 | 1238215 | 2964078 | 1901178 | 3899939 | 9786464 | 17883631 | 4623452 | 1790716 | 1436466 | 1755954 |
| 2024 | 1089482 | 1556774 | 2398823 | 1977908 | 2409458 | 4423495 | 9005124 | 18445637 | 4574252 | 1839369 | 1226758 | 2207127 |
| 2025 | 1679003 | 2093737 | 1710780 | 2982946 | 2094899 | 4584437 | 9570171 | 19029549 | 3874931 | 1688835 | 1798714 | 2393811 |
| **Quota média %** | 2,7 | 3,2 | 3,6 | 5,1 | 3,8 | 8,2 | 19,2 | **35,9** | 8,3 | 3,5 | 2,8 | 3,9 |
| Mín % | 2,0 | 2,6 | 2,4 | 3,3 | 3,2 | 7,6 | 17,6 | 34,8 | 7,2 | 3,2 | 2,3 | 3,4 |
| Máx % | 3,5 | 3,9 | 4,8 | 6,1 | 4,7 | 8,6 | 21,0 | 37,4 | 9,1 | 4,1 | 3,4 | 4,5 |

**Destino doméstico (DOM), motivo pessoal — quotas médias % 2018/19/22–25 (mín–máx em Agosto)** — [Eurostat tour_dem_tnmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_tnmd/?format=TSV&compressed=false); [Eurostat tour_dem_ttmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_ttmd/?format=TSV&compressed=false)

| Série | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Noites, 1+ noites | 4,0 | 4,3 | 4,5 | 5,8 | 4,6 | 8,0 | 16,7 | 30,2 (29,1–31,2) | 7,7 | 4,3 | 3,8 | 5,9 |
| Noites, 4+ noites | 2,2 | 2,4 | 2,7 | 4,2 | 3,0 | 7,4 | 21,0 | 40,7 (38,9–42,4) | 7,7 | 2,9 | 2,0 | 3,8 |
| Viagens, 1+ noites | 6,4 | 6,8 | 6,8 | 7,6 | 6,6 | 8,5 | 11,1 | 17,1 (16,1–17,8) | 8,0 | 6,1 | 6,1 | 8,8 |
| Viagens, 4+ noites | 2,3 | 2,9 | 3,1 | 5,1 | 3,4 | 7,9 | 18,0 | 37,1 (34,9–38,4) | 8,8 | 3,3 | 2,4 | 5,7 |

Linhas brutas DOM/PER (noites 1+): 2018: 1801484 2047566 2682910 1952526 2495064 4127375 9293126 15666268 3949042 2251454 2021473 3050304 · 2019: 2005752 2160477 2366259 3824630 2556141 4478537 9555204 18017088 4717621 2481194 2237458 3287254 · 2022: 2337858 2438374 2402761 3691147 2411621 4385553 10165035 16701688 4573570 2474753 2002222 3182108 · 2023: 2605648 2790660 2327878 4113410 2607095 4466848 9612492 16758417 4450155 2449411 2023688 3311567 · 2024: 2071503 2404119 3032496 2386878 2580994 4679907 8447575 16565558 4360232 2457482 2049278 3361331 · 2025: 2606082 2623225 2385157 3498666 2802367 4807889 9051354 17826420 3901023 2311322 2440365 3746064. — [Eurostat tour_dem_tnmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_tnmd/?format=TSV&compressed=false)

- Viagens **profissionais** domésticas (Eurostat ttmd, DOM, PROF, 1+ noites) têm o perfil inverso: quota média Jan 10,4 %, Fev 10,0 %, Mar 10,2 %, Abr 8,6 %, Mai 9,0 %, Jun 6,9 %, Jul 6,5 %, **Ago 4,9 % (2,9–5,9)**, Set 7,0 %, Out 7,9 %, Nov 9,9 %, Dez 8,8 % — a atividade profissional em Agosto cai para cerca de 59 % da média mensal (4,9 ÷ 8,33). Valores pequenos e alguns com flag `u` (baixa fiabilidade). — [Eurostat tour_dem_ttmd](https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/tour_dem_ttmd/?format=TSV&compressed=false)

### Inferences
- Para o índice "quem está fora": expressas como índice (quota ÷ 8,33 × 100), as noites pessoais fora de casa valem Agosto ≈ **341**, Julho ≈ 192, Junho ≈ 101, Setembro ≈ 97, Dezembro ≈ 68, Abril ≈ 74 (Páscoa; oscila 54–89 conforme a Páscoa cai em Março ou Abril), restantes meses 48–59.
- As noites são atribuídas ao **mês de partida**: uma viagem que começa a 28 de Julho conta toda em Julho, o que desloca ligeiramente noites de Agosto para Julho e de Setembro para Agosto.
- A Páscoa explica a alternância Mar/Abr (2018 e 2024: Páscoa em Março/1 Abr → Março alto, Abril baixo).
- Estes dados são do país inteiro; os residentes da AML têm rendimento acima da média e provavelmente viajam mais, mas isso não foi medido aqui.
- Ordem de grandeza (cálculo ilustrativo, população ~10,7 milhões assumida, **não recolhida nesta sessão**): 21,6 milhões de noites pessoais com partida em Ago 2025 ÷ (10,7 M × 31 dias) ≈ 6,5 % das pessoas-dia fora de casa em Agosto, contra ~1–1,5 % num mês como Novembro. A saída de férias com dormida explica só parte da quebra de ~20 % do metro; o resto será férias passadas em casa, teletrabalho, fecho de escolas/universidades e pausa parlamentar.

### Gaps
- Não há no INE série mensal atual de dormidas dos residentes por motivo (descontinuada em 2012); a quebra por motivo "lazer, recreio ou férias" só existe trimestral/anual (ex.: 0007172 trimestral por sexo e idade; 0007176 anual por motivo) — não descarregadas.
- Sem desagregação por região de residência (AML) em nenhuma das séries mensais.
- Eurostat 2026 ainda não disponível (série anual; último ano 2025).

---

## 4. Dias úteis por mês — 2025, 2026, 2027

### Takeaway
Calculado em Python: dias úteis = seg–sex menos feriados nacionais e 13 Jun (Lisboa) que caem em dia de semana. 2025 = 250, 2026 = 252, 2027 = 253 dias úteis; os meses mais curtos são Jun 2025 (18) e, em 2026, Fev/Mai/Jun/Dez (20).

### Cited Findings
Sem fonte externa: é cálculo de calendário (script `scripts2/wd.py`; Páscoa pelo algoritmo gregoriano anónimo — Meeus/Jones/Butcher; Sexta-feira Santa = Páscoa − 2 dias; Corpo de Deus = Páscoa + 60 dias; Carnaval = Páscoa − 47 dias). Feriados usados: 1 Jan, Sexta-feira Santa, Domingo de Páscoa, 25 Abr, 1 Mai, Corpo de Deus, 10 Jun, 13 Jun (municipal de Lisboa), 15 Ago, 5 Out, 1 Nov, 1 Dez, 8 Dez, 25 Dez. **Terça-feira de Carnaval NÃO foi descontada** (tolerância de ponto, não é feriado obrigatório) — está assinalada com *.

Datas móveis: Páscoa 20 Abr 2025, 5 Abr 2026, 28 Mar 2027. Carnaval 4 Mar 2025, 17 Fev 2026, 9 Fev 2027.

Feriados em dia útil — 2025 (11): 1 Jan (qua), 18 Abr (sex), 25 Abr (sex), 1 Mai (qui), 10 Jun (ter), 13 Jun (sex), 19 Jun (qui), 15 Ago (sex), 1 Dez (seg), 8 Dez (seg), 25 Dez (qui). Ao fim de semana: Páscoa, 5 Out (dom), 1 Nov (sáb).
— 2026 (9): 1 Jan (qui), 3 Abr (sex), 1 Mai (sex), 4 Jun (qui), 10 Jun (qua), 5 Out (seg), 1 Dez (ter), 8 Dez (ter), 25 Dez (sex). Ao fim de semana: Páscoa, 25 Abr (sáb), 13 Jun (sáb), 15 Ago (sáb), 1 Nov (dom).
— 2027 (8): 1 Jan (sex), 26 Mar (sex), 27 Mai (qui), 10 Jun (qui), 5 Out (ter), 1 Nov (seg), 1 Dez (qua), 8 Dez (qua). Ao fim de semana: Páscoa, 25 Abr (dom), 1 Mai (sáb), 13 Jun (dom), 15 Ago (dom), 25 Dez (sáb).

| Mês | 2025 seg–sex | fer. | **úteis** | sáb | dom | 2026 seg–sex | fer. | **úteis** | sáb | dom | 2027 seg–sex | fer. | **úteis** | sáb | dom |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Jan | 23 | 1 | **22** | 4 | 4 | 22 | 1 | **21** | 5 | 4 | 21 | 1 | **20** | 5 | 5 |
| Fev | 20 | 0 | **20** | 4 | 4 | 20 | 0 | **20*** | 4 | 4 | 20 | 0 | **20*** | 4 | 4 |
| Mar | 21 | 0 | **21*** | 5 | 5 | 22 | 0 | **22** | 4 | 5 | 23 | 1 | **22** | 4 | 4 |
| Abr | 22 | 2 | **20** | 4 | 4 | 22 | 1 | **21** | 4 | 4 | 22 | 0 | **22** | 4 | 4 |
| Mai | 22 | 1 | **21** | 5 | 4 | 21 | 1 | **20** | 5 | 5 | 21 | 1 | **20** | 5 | 5 |
| Jun | 21 | 3 | **18** | 4 | 5 | 22 | 2 | **20** | 4 | 4 | 22 | 1 | **21** | 4 | 4 |
| Jul | 23 | 0 | **23** | 4 | 4 | 23 | 0 | **23** | 4 | 4 | 22 | 0 | **22** | 5 | 4 |
| Ago | 21 | 1 | **20** | 5 | 5 | 21 | 0 | **21** | 5 | 5 | 22 | 0 | **22** | 4 | 5 |
| Set | 22 | 0 | **22** | 4 | 4 | 22 | 0 | **22** | 4 | 4 | 22 | 0 | **22** | 4 | 4 |
| Out | 23 | 0 | **23** | 4 | 4 | 22 | 1 | **21** | 5 | 4 | 21 | 1 | **20** | 5 | 5 |
| Nov | 20 | 0 | **20** | 5 | 5 | 21 | 0 | **21** | 4 | 5 | 22 | 1 | **21** | 4 | 4 |
| Dez | 23 | 3 | **20** | 4 | 4 | 23 | 3 | **20** | 4 | 4 | 23 | 2 | **21** | 4 | 4 |
| **Ano** | | | **250** | | | | | **252** | | | | | **253** | | |

\* mês com terça-feira de Carnaval (não descontada; se a loja/escritórios fecharem, subtrair 1).

Dias úteis dos anos históricos usados nas divisões (mesmo método): 2018: 22 20 21 20 21 20 22 22 20 22 21 20 · 2019: 22 20 21 20 22 17 23 21 21 23 20 21 · 2022: 21 20 23 19 22 19 21 22 22 20 21 20 · 2023: 22 20 23 18 22 20 21 22 21 21 21 18 · 2024: 22 21 20 21 21 18 23 21 21 23 20 21.

### Inferences
- Em 2026 o 13 Jun e o 15 Ago caem a um sábado: Junho e Agosto de 2026 têm mais dias úteis do que em 2025 (20 vs 18; 21 vs 20). Em 2027 Agosto tem 22 dias úteis (15 Ago ao domingo).
- Pontes prováveis (não descontadas): 2 Mai 2025 (sex após 1 Mai qui), 20 Jun 2025, 26 Dez 2025; 5 Jun 2026 (sex após Corpo de Deus), 7 Dez 2026 (seg antes de 8 Dez); 28 Mai 2027, 11 Jun 2027.

### Gaps
- Tolerâncias de ponto do Governo (Carnaval, 24/26/31 Dez) e férias judiciais/parlamentares não estão modeladas.

---

## 5. Combinação — metro por dia útil (separar "menos dias úteis" de "pessoas fora")

### Takeaway
Dividindo os passageiros do Metro de Lisboa pelos dias úteis, Agosto fica em **84,8** (mín 80,5; máx 89,4) e Julho em **92,5**; o efeito do calendário pesa sobretudo em Junho (bruto 95,9 → 107,4 por dia útil, por causa dos 3 feriados), Abril e Dezembro, não em Agosto. Num mês "plano" Lisboa tem ~700–780 mil passageiros por dia útil; em Agosto ~540–620 mil.

### Cited Findings
Tudo abaixo é cálculo próprio sobre [INE 0000898](https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0000898&Dim1=T&lang=PT) e a tabela de dias úteis da secção 4.

**Passageiros do Metro de Lisboa por dia útil (milhares) = passageiros do mês ÷ dias úteis do mês** (o numerador inclui fins de semana e feriados, por isso sobrestima o tráfego de um dia útil real)

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 608,0 | 624,1 | 691,4 | 709,0 | 732,0 | 689,5 | 617,0 | 543,6 | 740,1 | 750,9 | 708,7 | 685,3 |
| 2019 | 643,9 | 684,5 | 718,9 | 753,8 | 763,4 | 855,9 | 672,4 | 617,0 | 737,5 | 792,2 | 793,7 | 747,5 |
| 2022 | 386,8 | 458,5 | 496,9 | 570,5 | 550,2 | 580,0 | 546,7 | 466,5 | 580,0 | 680,3 | 653,0 | 609,3 |
| 2023 | 607,5 | 627,6 | 677,6 | 721,6 | 643,4 | 645,8 | 615,1 | 596,9 | 674,7 | 729,0 | 720,9 | 754,4 |
| 2024 | 628,5 | 659,9 | 743,6 | 735,4 | 753,4 | 778,7 | 627,1 | 575,8 | 729,3 | 746,8 | 766,4 | 689,3 |
| 2025 | 637,7 | 700,6 | 725,3 | 713,8 | 764,3 | 779,1 | 628,4 | 608,5 | 666,0 | 714,8 | 752,9 | 652,8 |
| 2026 | 637,3 | 636,5 | 701,2 | 669,0 | 750,8 | 667,5 | 596,1 | 543,3 | — | — | — | — |

**Índice sazonal por dia útil (cada ano ÷ média dos seus 12 meses × 100)**

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2018 | 90,1 | 92,5 | 102,4 | 105,0 | 108,4 | 102,2 | 91,4 | 80,5 | 109,7 | 111,2 | 105,0 | 101,5 |
| 2019 | 88,0 | 93,6 | 98,2 | 103,0 | 104,3 | 117,0 | 91,9 | 84,3 | 100,8 | 108,3 | 108,5 | 102,2 |
| 2022 | 70,5 | 83,6 | 90,6 | 104,1 | 100,4 | 105,8 | 99,7 | 85,1 | 105,8 | 124,1 | 119,1 | 111,1 |
| 2023 | 91,0 | 94,0 | 101,5 | 108,0 | 96,3 | 96,7 | 92,1 | 89,4 | 101,0 | 109,2 | 107,9 | 113,0 |
| 2024 | 89,4 | 93,9 | 105,8 | 104,6 | 107,2 | 110,8 | 89,2 | 81,9 | 103,8 | 106,3 | 109,0 | 98,1 |
| 2025 | 91,7 | 100,8 | 104,3 | 102,6 | 109,9 | 112,0 | 90,4 | 87,5 | 95,8 | 102,8 | 108,3 | 93,9 |
| **Média** | **86,8** | **93,0** | **100,5** | **104,6** | **104,4** | **107,4** | **92,5** | **84,8** | **102,8** | **110,3** | **109,6** | **103,3** |
| Mín | 70,5 | 83,6 | 90,6 | 102,6 | 96,3 | 96,7 | 89,2 | 80,5 | 95,8 | 102,8 | 105,0 | 93,9 |
| Máx | 91,7 | 100,8 | 105,8 | 108,0 | 109,9 | 117,0 | 99,7 | 89,4 | 109,7 | 124,1 | 119,1 | 113,0 |
| Média 2023–25 | 90,7 | 96,2 | 103,9 | 105,1 | 104,5 | 106,5 | 90,6 | 86,3 | 100,2 | 106,1 | 108,4 | 101,6 |

**Variante "dia-equivalente"** (pressuposto do investigador, não medido: dia útil = 1, sábado = 0,5, domingo ou feriado em dia de semana = 0,35) — corrige o facto de a divisão simples atribuir todo o tráfego de fim de semana aos dias úteis:

| | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Média | 88,2 | 95,1 | 100,9 | 102,5 | 105,3 | 102,4 | 94,3 | 85,0 | 104,2 | 112,2 | 109,5 | 100,4 |
| Mín | 70,1 | 85,4 | 94,4 | 100,1 | 98,6 | 96,1 | 91,7 | 81,2 | 99,1 | 107,0 | 106,1 | 91,7 |
| Máx | 93,6 | 102,8 | 105,9 | 105,8 | 109,2 | 106,4 | 99,1 | 91,4 | 109,5 | 120,6 | 120,8 | 108,0 |

**Decomposição (média dos 6 anos): índice bruto vs por dia útil**

| | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bruto | 91,1 | 90,1 | 103,6 | 98,7 | 107,7 | 95,9 | 98,3 | 86,9 | 104,4 | 116,2 | 108,0 | 99,0 |
| Por dia útil | 86,8 | 93,0 | 100,5 | 104,6 | 104,4 | 107,4 | 92,5 | 84,8 | 102,8 | 110,3 | 109,6 | 103,3 |
| Diferença (efeito calendário) | +4,3 | −2,9 | +3,1 | −5,9 | +3,3 | −11,5 | +5,8 | +2,1 | +1,6 | +5,9 | −1,6 | −4,3 |

### Inferences
- **Agosto**: o calendário não explica a quebra (Agosto tem 20–22 dias úteis, como um mês normal); os 13–15 pontos abaixo de 100 são "pessoas fora". Face a Maio/Junho, por dia útil, Agosto vale 75–83 % (2023 à parte).
- **Julho**: em bruto parece normal (98,3) só porque tem 21–23 dias úteis; por dia útil está em 89–92 em cinco dos seis anos — já há ~8–10 % de ausência (fim das aulas, início das férias).
- **Junho**: o bruto (95,9) esconde um mês forte por dia útil (107,4; ~102 na variante dia-equivalente) — é um mês com poucos dias úteis (17–20 em Lisboa) mas com muita gente na cidade (Santos Populares e turismo inflacionam o metro; a parte que interessa a um almoço de semana é menor).
- **Dezembro e Abril**: perdem 4–6 pontos em bruto só por feriados; por dia útil estão em ~103–105. Mas a divisão simples sobrestima-os, porque nas pontes e na semana do Natal/Páscoa a presença de escritórios é baixa — a variante dia-equivalente dá 100,4 (Dez) e 102,5 (Abr).
- **Janeiro** é fraco mesmo por dia útil (86,8; 90,7 em 2023–25): primeira semana de férias escolares e arranque lento.
- Para um balcão que só vende ao almoço em dias úteis, o multiplicador mensal relevante é aproximadamente: **dias úteis do mês × índice por dia útil**. Sugestão de índice de presença por dia útil (média 2023–25 arredondada, Agosto corrigido para excluir 2023): Jan 91, Fev 96, Mar 104, Abr 105, Mai 105, Jun 106, Jul 91, Ago ~84, Set 100, Out 106, Nov 108, Dez 102 — com a ressalva de que Agosto real para clientela local é provavelmente pior (turistas no metro) e Junho/Dezembro provavelmente piores (pontes e festas).

### Gaps
- Os pesos de sábado/domingo (0,5 / 0,35) são um pressuposto; não encontrei dados oficiais de validações por tipo de dia no Metro de Lisboa (metrolisboa.pt e AMT estão bloqueados nesta sessão).
- Não foi possível separar turistas de residentes no metro; uma série de passes mensais vendidos/validados (TML/Navegante) seria o proxy ideal de residentes, mas não está em fontes acessíveis.
- 2026 só tem 8 meses e não entra nos índices; os valores por dia útil de 2026 (Jul 596, Ago 543) estão abaixo dos de 2024–25, coerentes com a descida homóloga geral de ~5 %.
