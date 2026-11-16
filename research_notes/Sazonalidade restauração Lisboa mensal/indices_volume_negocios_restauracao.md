# Índices de volume de negócios da restauração (CAE/NACE 56) em Portugal — sazonalidade mensal

> **AVISO PRINCIPAL (ler primeiro).** Data de recolha: 16/11/2026. Nesta sessão **não foi possível obter os valores mensais em nível** de nenhuma série oficial. O acesso de rede a `ec.europa.eu` (API Eurostat), `www.ine.pt` (API INE), `db.nomics.world` e `api.db.nomics.world` foi recusado (hosts fora dos domínios permitidos na sessão: `curl` → "CONNECT tunnel failed, 403"; WebFetch → "getaddrinfo ENOTFOUND"). Só a pesquisa web (snippets) funcionou. Consequência: **não há tabela mês × ano nem índices sazonais calculados nestas notas — e nenhum foi inventado.** O que se segue é (a) onde estão as séries e como as ir buscar, (b) os poucos números confirmados em snippets (quase todos taxas de variação homóloga, não níveis), (c) o que não existe. Todos os factos abaixo vêm de resumos de resultados de pesquisa, não de páginas lidas na íntegra — tratar como "a confirmar na fonte".
>
> Para desbloquear: autorizar `ec.europa.eu` e `www.ine.pt` nas definições de rede da sessão e repetir os pedidos listados na 1.ª secção.

## Quais são os valores mensais não ajustados do índice de volume de negócios da restauração e similares (CAE 56), por mês e ano?

### Takeaway
As séries existem e são públicas (INE, base 2021, série "bruto", mensal, por CAE Rev. 3; Eurostat `sts_setu_m`, NACE I56, PT), mas os valores não puderam ser descarregados nesta sessão por bloqueio de rede. Nenhum nível mensal foi recuperado.

### Cited Findings
- O portal do INE lista um índice de volume de negócios nos serviços mensal, não ajustado ("bruto"), base 2021, desagregado por atividade económica (CAE Rev. 3), nível geográfico Portugal, com data de atualização 13-10-2026 (segundo o snippet de pesquisa). — [INE, tema 1711](https://www.ine.pt/xportal/xmain?xpgid=ine_tema&xpid=INE&tema_cod=1711)
- O dados.gov.pt espelha conjuntos do INE "Índices de volume de negócios e emprego (Base 2021)", mensais, "bruto", por CAE Rev. 3 (encontrado o do emprego nos serviços; o do volume de negócios nos serviços não apareceu na pesquisa). — [dados.gov.pt](https://dados.gov.pt/en/datasets/indice-de-emprego-nos-servicos-bruto-base-2021/)
- O dataset Eurostat `sts_setu_m` ("Turnover in services - monthly data") inclui o subsetor [I56] Food and beverage service activities; o espelho DBnomics mostrava uma série de Portugal "net turnover, calendar adjusted, not seasonally adjusted, Index 2010=100" com dados só até 2017-12 e "updated by provider April 19, 2024" — ou seja, o espelho está desatualizado e o código do dataset pode ter sido substituído. — [DBnomics sts_setu_m](https://db.nomics.world/Eurostat/sts_setu_m)
- A DGE (Direção-Geral da Economia, ex-GEE) publica uma página "Índice de Volume de Negócios nos Serviços - INE" e fichas setoriais por CAE, incluindo um PDF "I_561" (CAE 561, restaurantes) datado de 07/2026. Conteúdo não lido. — [DGE, IVN Serviços](https://estatistica.dgeconomia.gov.pt/indice-de-volume-de-negocios-nos-servicos-ine-46/); [DGE, ficha I_561](https://estatistica.dgeconomia.gov.pt/wp-content/uploads/2026/07/I_561.pdf)
- Ficha setorial mais antiga do GEE para a divisão 56. — [GEE, 56 Restauração e similares](https://www.gee.gov.pt/pt/docs/publicacoes/estatisticas-setoriais/i-alojamento-restauracao-e-similares/56-restauracao-e-similares/2358-56-restauracao-e-similares/file)
- Os destaques mensais do INE dão taxas de variação homóloga para a secção I e, por vezes, para a divisão 56 em separado. Exemplos confirmados em snippets (taxas homólogas nominais, **não níveis**):
  - Restauração e similares: +7,2% em julho de 2024 e +2,7% em agosto de 2024. — [Jornal de Negócios](https://www.jornaldenegocios.pt/economia/conjuntura/detalhe/volume-de-negocios-nos-servicos-acelerou-56-em-agosto)
  - Secção "alojamento, restauração e similares": +3,3% em agosto de 2025 e +2,7% em setembro de 2025 (contributo de 0,6 p.p.). — [Folha Nacional](https://folhanacional.pt/2025/11/11/volume-de-negocios-nos-servicos-cresce-26-em-setembro/)
  - Secção "alojamento, restauração e similares": −0,5% em fevereiro e +0,6% em março (1.º trimestre de 2026, segundo o contexto do snippet; ano a confirmar). — [Jornal Económico](https://jornaleconomico.sapo.pt/noticias/ine-volume-de-negocios-nos-servicos-sobe-21-no-1-o-trimestre/)
  - Secção "alojamento, restauração e similares": −0,4% em agosto de 2026, segunda variação homóloga negativa consecutiva. — [Dinheiro Vivo](https://dinheirovivo.dn.pt/economia/volume-de-negcios-nos-servios-cresce-53-em-agosto)
  - Secção "alojamento, restauração e similares": cerca de −1,4% em setembro de 2026, terceiro mês negativo consecutivo (contributo −0,3 p.p.). — [Dinheiro Vivo](https://dinheirovivo.dn.pt/empresas/volume-de-negcios-nos-servios-aumenta-42-no-3-trimestre)
  - Restauração e similares: +112% em março de 2022 e +125,2% em fevereiro de 2022 (efeito de base COVID — confirma que 2020-2022 distorcem qualquer cálculo sazonal). — [ECO](https://eco.sapo.pt/2022/05/11/volume-de-negocios-nos-servicos-dispara-327-em-marco/)
- Índice TOTAL dos serviços (não é restauração), série nominal não ajustada: variação mensal −0,3% em agosto de 2025 (+1,6% em julho de 2025); +1,5% em agosto de 2026 (−1,0% em julho de 2026). — [INE, destaque agosto 2025](https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_destaques&DESTAQUESdest_boui=706224310&DESTAQUESmodo=2&xlang=pt); [Dinheiro Vivo](https://dinheirovivo.dn.pt/economia/volume-de-negcios-nos-servios-cresce-53-em-agosto)
- Dimensão anual do setor (contexto): a Informa D&B estima 5.595 M€ de faturação dos restaurantes em 2024 (+5,2%), 3.750 M€ em serviço de mesa e fast food com 29% do total; a Statista indica 15,73 mil M€ para a "food and beverage service industry" em 2024 (perímetros diferentes — não comparáveis). — [Informa D&B](https://blog.informadb.pt/2025/05/restaurantes-ultrapassaram-os-55-mil-milhoes-de-euros-de-faturacao-em-2024/); [Statista](https://www.statista.com/statistics/410442/turnover-food-beverage-service-portugal/)

### Inferences
- Pedidos a repetir quando a rede for aberta (não testados com sucesso):
  - Eurostat: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_setu_m?geo=PT&nace_r2=I56&s_adj=NSA&format=JSON` (e `I55`, `I`); se vier vazio, procurar o código atual no navegador de dados (a Eurostat reorganizou as estatísticas de curto prazo dos serviços; `sts_sepr_m` é o índice de produção/deflacionado). A série Eurostat disponível para PT pode ser só "CA" (ajustada de calendário) e não "NSA" — verificar.
  - INE: `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=<código>&lang=PT`; o código do indicador "Índice de volume de negócios nos serviços - bruto (Base 2021) por CAE Rev. 3; Mensal" não foi confirmado.
- Método a aplicar quando houver níveis: para cada ano completo, índice do mês = 100 × valor do mês ÷ média dos 12 meses desse ano; depois média, mínimo, máximo e desvio-padrão por mês entre anos (2015-2019 e 2022-2025; excluir 2020-2021 e tratar 2022 com cautela, porque janeiro-março de 2022 ainda tinham restrições).
- Atenção à mudança de base (2015=100 → 2021=100): os rácios intra-ano não dependem da base, mas não misturar séries de bases diferentes dentro do mesmo ano.

### Gaps
- **Todos os níveis mensais (CAE 56, 55 e secção I), 2015-2026: não obtidos** (bloqueio de rede a INE, Eurostat e DBnomics).
- Código exato do indicador INE e código atual do dataset Eurostat para I56: não confirmados.
- Não foi possível confirmar se a série INE por divisão (56 separada de 55) está publicada em nível na base de dados, ou só a secção I; os destaques citam taxas para "restauração e similares" em separado, o que sugere que sim.

## Qual é o índice sazonal médio de cada mês (média = 100) e a dispersão entre anos?

### Takeaway
Não calculado: sem os níveis mensais não há base para índices sazonais, e nenhuma fonte encontrada publica esses índices já feitos para a CAE 56.

### Cited Findings
- Nenhuma fonte encontrada publica índices sazonais mensais (média = 100) para a restauração em Portugal. O relatório do grupo de trabalho do IVA refere apenas que o INE disponibiliza o índice de volume de negócios nos serviços ajustado de sazonalidade para alojamento e restauração. — [GEP/MTSSS, IVA no Setor da Restauração e Alojamento](https://www.gep.mtsss.gov.pt/documents/10182/79271/gt_iva_2011_2015.pdf/c66d2b3e-8fc3-47fa-b677-69ecd7a8469d)

### Inferences
- Como o INE publica a série bruta e a série ajustada de calendário e sazonalidade, os fatores sazonais implícitos podem ser obtidos dividindo uma pela outra, como verificação cruzada do método do rácio à média anual.

### Gaps
- Índice sazonal Jan..Dez, mínimo, máximo e desvio-padrão: **em falta por inteiro**.

## Quão mais forte é agosto face a janeiro/fevereiro? Qual é o mínimo, o máximo e como se comporta dezembro?

### Takeaway
Sem resposta quantificada. As fontes encontradas só permitem afirmações qualitativas (verão forte, esplanadas de maio a setembro) e não dão o rácio agosto/janeiro nem o perfil de dezembro.

### Cited Findings
- SIBS Analytics: em julho-agosto de 2025 as transações na restauração cresceram 11% em número e 12% em valor face ao mesmo período de 2024; o distrito de Lisboa cresceu cerca de 1% no consumo total nesse período. É variação homóloga, não comparação entre meses. — [SIBS Analytics](https://www.sibsanalytics.com/noticias/portugueses-aumentam-em-9-o-consumo-nas-ferias-de-verao-dentro-e-fora-do-pais/)
- Fonte do setor (plataforma DIG-IN, via Grande Consumo): a sazonalidade do consumo fora de casa é descrita como "altamente previsível", com a época de esplanadas entre maio e setembro; sem valores mensais. Fonte comercial, qualitativa. — [Grande Consumo](https://grandeconsumo.com/esplanadas-e-jantares-tardios-definem-a-dinamica-da-restauracao-no-verao/)
- No índice total dos serviços (não restauração), agosto face a julho variou −0,3% em 2025 e +1,5% em 2026 na série nominal bruta. — [INE](https://www.ine.pt/xportal/xmain?xpid=INE&xpgid=ine_destaques&DESTAQUESdest_boui=706224310&DESTAQUESmodo=2&xlang=pt); [Dinheiro Vivo](https://dinheirovivo.dn.pt/economia/volume-de-negcios-nos-servios-cresce-53-em-agosto)

### Inferences
- O padrão nacional da CAE 56 é dominado por zonas turísticas e de férias; uma loja de balcão num bairro de escritórios/Parlamento em Lisboa pode ter agosto abaixo da média (clientela residente e de trabalho ausente) mesmo que o índice nacional tenha o pico em agosto. Isto é hipótese, não dado — os dados próprios da loja em `vendas/` são a melhor evidência.

### Gaps
- Rácio agosto ÷ janeiro e agosto ÷ fevereiro, mês de mínimo, mês de máximo e nível de dezembro: **não obtidos**.

## Existe algum corte regional (AML / NUTS II Lisboa / Grande Lisboa) da sazonalidade da restauração?

### Takeaway
Não foi encontrada nenhuma série pública mensal de volume de negócios da restauração para Lisboa ou para a AML. O índice do INE é de nível nacional; a alternativa mais próxima são dados de pagamentos da SIBS, que não são de acesso livre em série mensal.

### Cited Findings
- O índice mensal de volume de negócios nos serviços do INE tem como nível geográfico "Portugal". — [INE, tema 1711](https://www.ine.pt/xportal/xmain?xpgid=ine_tema&xpid=INE&tema_cod=1711)
- SIBS: em 2020, os pagamentos com cartão em catering, restauração e similares foram liderados pelo distrito de Lisboa, com 1,1 mil M€ no ano (valor anual, ano COVID). — [Dinheiro Vivo](https://dinheirovivo.dn.pt/gastos-em-alojamento-turistico-foram-de-833-milhoes-em-2020-13228043.html)
- O portal de estatísticas de consumo da SIBS Analytics baseia-se em pagamentos eletrónicos processados pela SIBS e apresenta apenas dois anos de dados. — [Grande Consumo](https://grandeconsumo.com/sibs-lanca-portal-de-estatisticas-sobre-o-consumo-em-portugal/)
- Lisboa lidera os distritos em despesa na semana anterior à Páscoa; os restaurantes tiveram ligeiro decréscimo de 2023 para 2024 nessa semana. — [JN](https://www.jn.pt/2358216340/consumo-na-semana-santa-subiu-300-milhoes-de-euros-em-dois-anos/amp/)
- O portal e-Fatura das Finanças só mostra despesas dedutíveis por categoria ao contribuinte; a pesquisa não encontrou estatísticas públicas mensais do e-fatura por setor e concelho. — [Portal das Finanças](https://faturas.portaldasfinancas.gov.pt/homeBeneficio.action)

### Inferences
- Para Lisboa, os substitutos disponíveis seriam dados de procura turística (dormidas mensais do INE por NUTS/município) — que medem alojamento, bem mais sazonal do que a restauração — e não a faturação de restaurantes.

### Gaps
- Nenhuma série mensal regional de faturação da restauração encontrada (INE, BdP, AT/e-fatura). "Não encontrado" com pesquisa limitada a snippets, não "comprovadamente inexistente"; em particular, as estatísticas mensais do e-fatura publicadas pelo INE/AT não foram verificadas.

## Há estudos académicos ou institucionais com efeitos mensais quantificados para a restauração em Portugal/Lisboa?

### Takeaway
Não foi encontrado nenhum estudo com efeitos de mês quantificados para restaurantes em Portugal ou Lisboa. Os estudos do Banco de Portugal sobre o setor são anuais (Central de Balanços) e as teses encontradas tratam de outros temas.

### Cited Findings
- Banco de Portugal, Estudos da Central de Balanços n.º 5 (2011) e n.º 17 (2014), e Nota de Informação Estatística 120/2016 (2011-2016): análises setoriais anuais do alojamento, restauração e similares; em 2015 o setor era 10% das empresas; a restauração e similares pesava 64% do volume de negócios do setor (edição a confirmar). — [BdP, estudo 5/2011](https://www.bportugal.pt/sites/default/files/anexos/pdf-boletim/estudos%20da%20cb%205_2011.pdf); [BdP, estudo 17/2014](https://www.bportugal.pt/sites/default/files/anexos/pdf-boletim/estudos%20da%20cb_17_2014.pdf); [BdP, NIE](https://www.bportugal.pt/comunicado/nota-de-informacao-estatistica-analise-setorial-do-alojamento-restauracao-e-similares-0)
- Em 2017 o setor alojamento e restauração representou 3% do volume de negócios nacional, cerca de 12 mil M€, +15,8% face a 2016. — [idealista/news](https://www.idealista.pt/news/node/38337)
- Em 2025 o volume de negócios na restauração aumentou 2,9% em termos nominais face a 2024, com preços a subir cerca de 6% (queda real, sobretudo no 4.º trimestre de 2025); a análise do BdP gerou polémica com o setor em abril de 2026. Números citados em snippets de notícias; atribuição exata (INE vs. BdP) a confirmar. — [Observador](https://observador.pt/2026/04/20/sera-assim-alvaro-santos-pereira-poe-em-causa-crise-na-restauracao-setor-diz-que-desde-inicio-do-ano-situacao-so-piorou/); [ECO](https://eco.sapo.pt/descodificador/santos-pereira-vs-restaurantes-ha-um-pesadelo-na-cozinha/)
- Tese ULisboa (2023) sobre potencial de venda de cerveja no canal Horeca em Lisboa e Porto: restaurantes são o tipo de estabelecimento mais comum e a hora de almoço o período de maior ocupação; sem sazonalidade mensal. — [Repositório ULisboa](https://repositorio.ulisboa.pt/handle/10400.5/29674)
- Outras referências encontradas mas sem dados mensais nos excertos: caracterização do setor dos restaurantes e similares (Univ. Coimbra) e análise económico-financeira da restauração do distrito de Setúbal. — [Estudo Geral UC](https://estudogeral.uc.pt/bitstream/10316/18758/1/Uma%20caracteriza%C3%A7%C3%A3o%20do%20setor%20dos%20Restaurantes%20e%20Similares%20em%20.pdf); [RCAAP](https://comum.rcaap.pt/server/api/core/bitstreams/e165a1ca-6966-468e-9fce-22f58b207412/content)

### Inferences
- A ausência de estudos quantificados torna o cálculo próprio a partir da série bruta do INE a única via para índices nacionais.

### Gaps
- Nenhum estudo com coeficientes mensais encontrado; os PDFs do BdP não foram lidos (só títulos e snippets), pelo que podem conter gráficos trimestrais não detetados.

## Como afetam os dias úteis e a Páscoa (móvel) março vs. abril?

### Takeaway
O INE já atribuiu explicitamente uma queda da restauração em março ao desfasamento da Páscoa entre anos; o efeito existe e é reconhecido, mas não foi encontrada a sua dimensão em pontos percentuais.

### Cited Findings
- Um destaque do INE (2006) atribuiu a queda da restauração em março ao "desfasamento temporal da Páscoa entre 2005 (em Março) e 2006 (em Abril)". — [INE, Índices de Volume de Negócios e Emprego](https://www.ine.pt/ngt_server/attachfileu.jsp?look_parentBoui=234452188&att_display=n&att_download=y)
- No índice total dos serviços, a série nominal não ajustada de sazonalidade nem de calendário aumentou 6,0% em março (1.º trimestre de 2026 segundo o contexto), enquanto a secção alojamento e restauração passou de −0,5% (fevereiro) para +0,6% (março) — ilustra a diferença entre série bruta e ajustada. — [Jornal Económico](https://jornaleconomico.sapo.pt/noticias/ine-volume-de-negocios-nos-servicos-sobe-21-no-1-o-trimestre/)
- A semana anterior à Páscoa é um pico de consumo, com Lisboa no topo dos distritos. — [JN](https://www.jn.pt/2358216340/consumo-na-semana-santa-subiu-300-milhoes-de-euros-em-dois-anos/amp/)

### Inferences
- Datas do Domingo de Páscoa (facto de calendário, não retirado de uma fonte desta pesquisa): 2015 — 5 abr; 2016 — 27 mar; 2017 — 16 abr; 2018 — 1 abr; 2019 — 21 abr; 2022 — 17 abr; 2023 — 9 abr; 2024 — 31 mar; 2025 — 20 abr; 2026 — 5 abr. Em 2016 e 2024 a Páscoa caiu em março, e em 2018 e 2026 a Semana Santa ficou repartida; nesses anos o índice sazonal de março sobe e o de abril desce. Ao calcular índices, convém tratar março+abril em conjunto ou mostrar os dois grupos de anos em separado.
- Outros efeitos de calendário a considerar na série bruta: número de sextas/sábados no mês e fevereiro com 28/29 dias; uma normalização por dia (valor ÷ dias do mês) reduz esse ruído.

### Gaps
- Dimensão do efeito Páscoa em março/abril para a CAE 56: não quantificada em nenhuma fonte encontrada.
- A série ajustada de calendário do INE/Eurostat, que permitiria isolar o efeito, não foi obtida.
