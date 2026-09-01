/* ==========================================================================
   GIOCO OS — gioco-compromissos.js
   Motor dos compromissos fixos (salários por recibo, TSU, modelo antigo).
   Extraído VERBATIM do bloco que estava duplicado em tesouraria.html e
   mrn-dashboard.html (byte a byte idêntico); a equipa.html abandonou a sua
   versão reduzida (valorCompromissoDaPessoa) e passou a usar isto.

   Semântica intocável (decisão do Manel, 31 Ago/2026):
   - TSU arredondada UMA vez sobre a base agregada (nunca somar arredondados);
   - ajuste de base (estimado-base) só na parte 'conta';
   - modelo antigo (pessoaId sem parteRecibo) devolve conta+cartão;
   - recibos sem partes utilizáveis ficam fora da média;
   - arredondamento em arredCentimos().

   Uso (dentro do closure de cada página, depois de formatEuro/parseMontante/
   MESES_PT e das vars allCompromissos/allRecibos/allPessoas existirem):

     var CE = giocoCompromissosEngine({
       getCompromissos: function(){ return allCompromissos; },
       getRecibos:      function(){ return allRecibos; },
       getPessoas:      function(){ return allPessoas; },
       formatEuro: formatEuro, parseMontante: parseMontante, MESES_PT: MESES_PT
     });

   e depois destruturar os nomes usados, para os call sites não mudarem.
   ========================================================================== */
function giocoCompromissosEngine(deps){
  'use strict';
  var formatEuro   = deps.formatEuro;
  var parseMontante= deps.parseMontante;
  var MESES_PT     = deps.MESES_PT;
  function __RECIBOS(){ return deps.getRecibos() || {}; }
  function __PESSOAS(){ return deps.getPessoas() || {}; }
  function __COMPROMISSOS(){ return deps.getCompromissos() || {}; }

  // Registos antigos não têm 'tipo'; contam como fixo, que era o default
  // com que o nó foi semeado.
  function tipoDe(c){
    return (c && c.tipo) || 'fixo';
  }


  function diasNoMes(ano, mes){
    return new Date(ano, mes, 0).getDate();
  }

  // Dias de segunda a sexta do mês. Não exclui feriados — é a base de
  // cálculo de compromissos tipo subsídio de refeição, que variam com o
  // número de dias úteis e por isso não podem ter um valor fixo no registo.
  function diasUteis(ano, mes){
    var total = 0;
    var nd = diasNoMes(ano, mes);
    for (var d = 1; d <= nd; d++){
      var dow = new Date(ano, mes - 1, d).getDay();
      if (dow >= 1 && dow <= 5) total++;
    }
    return total;
  }

  /* ---------- Recibos → compromissos pessoais ----------
     Um compromisso ligado a uma pessoa (pessoaId) não usa valor/valorDiario
     como verdade: o montante vem dos recibos. Mês COM recibo usa o valor
     real (confirmado); mês SEM recibo usa a média dos últimos 3 (estimado).
     Os valores nunca se somam — a existência do recibo desliga a estimativa
     desse mês.

     'parteRecibo' diz QUAL das duas saídas do recibo é que este compromisso
     representa: 'conta' (transferência) ou 'cartao' (carregamento do cartão
     de refeição). São dois compromissos separados, gerados ao criar a
     pessoa, cada um com o seu dia e o seu método de pagamento.

     Enquanto a pessoa não tiver recibo nenhum, valem as SEMENTES deixadas
     ao criá-la (valor / valorDiario), marcadas «estimado · sem recibos».
     A partir do primeiro recibo dessa pessoa as sementes nunca mais contam.

     'derivaDe: "tsu"' marca a entrada única da Segurança Social: ignora o
     campo valor e calcula 34,75% sobre a soma dos totais sujeitos de TODOS
     os recibos do mês. Tudo o resto (dia, método, IBAN, notas) é do
     utilizador.

     Um compromisso com pessoaId mas SEM parteRecibo é do modelo anterior e
     continua a gerar as duas saídas de uma vez — não se mexe no que existe.

     ATENÇÃO: este bloco está duplicado em tesouraria.html e em
     mrn-dashboard.html e tem de ser igual nos dois. */

  // Taxa social única: 23,75% a cargo da empresa + 11% de quotização já
  // retida ao trabalhador no recibo. A empresa entrega as duas partes num
  // só pagamento, por isso o compromisso de tesouraria é o total.
  var TSU_TAXA_TOTAL = 0.3475;
  var TSU_TAXA_PATRONAL = 0.2375;
  var TSU_TAXA_TRABALHADOR = 0.11;

  // Sufixo do id da ocorrência do cartão nos compromissos do modelo antigo
  // (pessoaId sem parteRecibo), que geram as duas saídas de uma vez. A
  // ocorrência da transferência fica com o id do compromisso tal como
  // estava, para que os pagamentos já marcados como concluídos continuem a
  // bater certo. '~' é caracter válido numa chave do RTDB ('.', '$', '#',
  // '[', ']' e '/' não são) e não colide com o '_' que separa o período em
  // pagamentosConcluidos.
  var SUFIXO_CARTAO = '~cartao';

  // Nome longo de propósito: mrn-dashboard.html já tem um centimos() que
  // devolve cêntimos inteiros para a reconciliação da caixa.
  function arredCentimos(v){
    var n = Number(v);
    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }

  function numOuNull(v){
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }

  // Os recibos são indexados por AAAA-MM COM zero à esquerda. O 'periodo'
  // de pagamentosConcluidos é AAAA-M SEM zero (ver periodoCompromisso) —
  // são formatos diferentes e nunca se misturam.
  function periodoRecibo(ano, mes){
    return ano + '-' + (mes < 10 ? '0' + mes : String(mes));
  }

  function mesAnterior(ano, mes){
    return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano: ano, mes: mes - 1 };
  }

  function labelPeriodoRecibo(periodo){
    var p = String(periodo).split('-');
    var m = parseInt(p[1], 10);
    if (!p[0] || isNaN(m) || m < 1 || m > 12) return String(periodo);
    return MESES_PT[m - 1] + ' ' + p[0];
  }

  function reciboDoMes(pessoaId, ano, mes){
    var m = __RECIBOS()[pessoaId];
    return (m && m[periodoRecibo(ano, mes)]) || null;
  }

  function normalizaRecibo(periodo, r){
    r = r || {};
    return { periodo: periodo, totais: r.totais || {}, pessoa: r.pessoa || {}, pagamento: r.pagamento || {} };
  }

  // Os recibos da pessoa que servem de base à estimativa de um mês sem
  // recibo: os anteriores, do mais recente para o mais antigo. Se o mês
  // pedido é anterior a todos (pessoa que só tem recibos mais recentes),
  // usam-se os mais antigos que existem — assim que há UM recibo, é sempre
  // um recibo a mandar, e a semente nunca mais volta a contar.
  function recibosParaEstimar(pessoaId, ano, mes){
    var m = __RECIBOS()[pessoaId] || {};
    var limite = periodoRecibo(ano, mes);
    var todos = Object.keys(m).sort();
    var anteriores = todos.filter(function(p){ return p < limite; }).reverse();
    var base = anteriores.length ? anteriores : todos;
    return base.map(function(p){ return normalizaRecibo(p, m[p]); });
  }

  function pessoaTemRecibos(pessoaId){
    return !!(__RECIBOS()[pessoaId] && Object.keys(__RECIBOS()[pessoaId]).length);
  }

  function liquidoDoRecibo(r){
    return numOuNull(r && r.totais ? r.totais.liquido : null);
  }

  // As duas saídas de um recibo. O cartão é o valor lido (é o carregamento
  // exacto que se faz) e a conta é o resto do líquido — assim conta+cartão
  // dá SEMPRE o líquido, sem precisar de confiar em dois números que podem
  // vir desalinhados de um PDF. Um recibo com pagamento incoerente já é
  // marcado como «por rever» na importação; aqui não se inventa um terceiro
  // valor nem se soma um cêntimo que não existe.
  function partesDoRecibo(r){
    if (!r) return null;
    var pg = r.pagamento || {};
    var cartao = numOuNull(pg.cartao);
    var conta = numOuNull(pg.conta);
    var liq = liquidoDoRecibo(r);

    if (liq === null){
      if (cartao === null && conta === null) return null;
      liq = (cartao || 0) + (conta || 0);
    }
    liq = arredCentimos(liq);

    if (cartao === null) cartao = (conta === null) ? 0 : liq - conta;
    cartao = arredCentimos(cartao);
    if (liq >= 0) cartao = Math.min(Math.max(cartao, 0), liq);

    return { conta: arredCentimos(liq - cartao), cartao: cartao, liquido: liq };
  }

  function baseDoRecibo(r){
    return numOuNull(r && r.pessoa ? r.pessoa.vencimentoBase : null);
  }

  function baseAtualDaPessoa(pessoaId){
    return numOuNull(__PESSOAS()[pessoaId] ? __PESSOAS()[pessoaId].vencimentoBase : null);
  }

  function nomeDaPessoa(pessoaId){
    var p = __PESSOAS()[pessoaId];
    return (p && p.nome) || null;
  }

  function temRecibos(){
    return Object.keys(__RECIBOS()).some(function(pid){
      return __RECIBOS()[pid] && Object.keys(__RECIBOS()[pid]).length > 0;
    });
  }

  /* ---------- Segurança Social (TSU) ---------- */

  // Contribuição de UMA pessoa num mês, já separada nas duas componentes.
  // Os valores por pessoa são informativos: o que se paga é o agregado,
  // arredondado uma só vez (ver discriminacaoTSU).
  function contribuicaoPessoa(base){
    return {
      base: base,
      empresa: arredCentimos(base * TSU_TAXA_PATRONAL),
      trabalhador: arredCentimos(base * TSU_TAXA_TRABALHADOR),
      total: arredCentimos(base * TSU_TAXA_TOTAL)
    };
  }

  // Base agregada da Segurança Social de um mês de recibos: soma dos
  // 'totais.sujeito' de TODOS os recibos desse mês, sem arredondar pelo
  // caminho — a SS arredonda no agregado, e somar valores já arredondados
  // por pessoa dá um cêntimo a mais (julho 2026: 749,03 e não 749,04).
  function baseSSDoMes(ano, mes){
    var periodo = periodoRecibo(ano, mes);
    var total = 0;
    var pessoas = [];
    Object.keys(__RECIBOS()).forEach(function(pessoaId){
      var r = __RECIBOS()[pessoaId] && __RECIBOS()[pessoaId][periodo];
      var s = numOuNull(r && r.totais ? r.totais.sujeito : null);
      if (s === null) return;
      total += s;
      pessoas.push({
        pessoaId: pessoaId,
        nome: nomeDaPessoa(pessoaId) || (r.pessoa && r.pessoa.nome) || '(pessoa apagada)',
        contribuicao: contribuicaoPessoa(s)
      });
    });
    if (!pessoas.length) return null;
    pessoas.sort(function(a, b){ return String(a.nome).localeCompare(String(b.nome), 'pt'); });
    return { base: total, n: pessoas.length, periodo: periodo, pessoas: pessoas };
  }

  // Mês de recibos mais recente que existe, usado como base estimada quando
  // o mês pedido ainda não tem recibos nenhuns.
  function ultimaBaseSS(){
    var periodos = {};
    Object.keys(__RECIBOS()).forEach(function(pessoaId){
      Object.keys(__RECIBOS()[pessoaId] || {}).forEach(function(p){ periodos[p] = true; });
    });
    var ordenados = Object.keys(periodos).sort().reverse();
    for (var i = 0; i < ordenados.length; i++){
      var p = ordenados[i].split('-');
      var agg = baseSSDoMes(parseInt(p[0], 10), parseInt(p[1], 10));
      if (agg) return agg;
    }
    return null;
  }

  // A TSU que se paga no mês (ano, mes) refere-se aos recibos do mês
  // ANTERIOR — a de julho entrega-se em agosto. Sem recibos desse mês,
  // estima com a base mais recente que existir.
  function agregadoTSU(ano, mes){
    var ref = mesAnterior(ano, mes);
    var agg = baseSSDoMes(ref.ano, ref.mes);
    if (agg) return { agg: agg, estimado: false, refPeriodo: periodoRecibo(ref.ano, ref.mes) };
    var ultima = ultimaBaseSS();
    if (ultima) return { agg: ultima, estimado: true, refPeriodo: periodoRecibo(ref.ano, ref.mes) };
    return null;
  }

  function detalheTSU(ano, mes){
    var r = agregadoTSU(ano, mes);
    if (!r) return { valor: 0, conta: null, cartao: null, estado: null, nota: 'sem recibos importados' };
    var valor = arredCentimos(r.agg.base * TSU_TAXA_TOTAL);
    if (!r.estimado){
      return {
        valor: valor, conta: null, cartao: null, estado: 'confirmado',
        nota: '34,75% sobre ' + formatEuro(arredCentimos(r.agg.base)) + ' · ' + r.agg.n +
              (r.agg.n === 1 ? ' recibo de ' : ' recibos de ') + labelPeriodoRecibo(r.agg.periodo)
      };
    }
    return {
      valor: valor, conta: null, cartao: null, estado: 'estimado',
      nota: 'sem recibos de ' + labelPeriodoRecibo(r.refPeriodo) + ' · base de ' +
            labelPeriodoRecibo(r.agg.periodo) + ' (' + formatEuro(arredCentimos(r.agg.base)) + ')'
    };
  }

  // Discriminação por pessoa do mês pago em (ano, mes). A soma das partes
  // individuais pode diferir do agregado em cêntimos — quem paga é o
  // agregado, e é isso que se diz no ecrã.
  function discriminacaoTSU(ano, mes){
    var r = agregadoTSU(ano, mes);
    if (!r) return null;
    var somaEmpresa = 0, somaTrabalhador = 0, somaTotal = 0;
    r.agg.pessoas.forEach(function(p){
      somaEmpresa += p.contribuicao.empresa;
      somaTrabalhador += p.contribuicao.trabalhador;
      somaTotal += p.contribuicao.total;
    });
    var agregado = {
      base: arredCentimos(r.agg.base),
      empresa: arredCentimos(r.agg.base * TSU_TAXA_PATRONAL),
      trabalhador: arredCentimos(r.agg.base * TSU_TAXA_TRABALHADOR),
      total: arredCentimos(r.agg.base * TSU_TAXA_TOTAL)
    };
    return {
      periodo: r.agg.periodo,
      estimado: r.estimado,
      pessoas: r.agg.pessoas,
      agregado: agregado,
      somaIndividual: { empresa: arredCentimos(somaEmpresa), trabalhador: arredCentimos(somaTrabalhador), total: arredCentimos(somaTotal) },
      // Verdadeiro quando somar por pessoa dá diferente de arredondar no
      // agregado. É o caso normal, não é um erro — mas tem de estar dito.
      difereDoAgregado: arredCentimos(somaTotal) !== agregado.total
    };
  }

  function derivaTSU(c){
    return !!(c && c.derivaDe === 'tsu');
  }

  /* ---------- Montante de um compromisso ---------- */

  // O id de uma ocorrência é o id do compromisso, mais o sufixo do cartão
  // quando é a segunda saída de um compromisso do modelo antigo. Tudo o que
  // lê um compromisso a partir de uma ocorrência (ou de uma chave de
  // pagamentosConcluidos) passa por aqui.
  function ehOcorrenciaCartao(id){
    return String(id).slice(-SUFIXO_CARTAO.length) === SUFIXO_CARTAO;
  }

  function idBase(id){
    return ehOcorrenciaCartao(id) ? String(id).slice(0, -SUFIXO_CARTAO.length) : id;
  }

  function compromissoPorId(id){
    return __COMPROMISSOS()[idBase(id)];
  }

  function idsCompromissos(){
    return Object.keys(__COMPROMISSOS());
  }

  // Montante de um compromisso num mês concreto, com a origem do número:
  //   'confirmado'        — recibo desse mês gravado, valor real
  //   'estimado'          — média dos últimos 3 recibos da pessoa
  //   'estimado-base'     — média corrigida por um vencimento base novo que
  //                         ainda não apareceu em nenhum recibo
  //   'estimado-semente'  — pessoa ainda sem recibos: vale a semente
  //                         deixada ao criá-la
  //   null                — regra do próprio registo (valorDiario ou valor)
  // 'conta' e 'cartao' só vêm preenchidos nos compromissos do modelo antigo
  // (pessoaId sem parteRecibo), que geram as duas saídas de uma vez.
  // Ponto ÚNICO de leitura do montante: alterar aqui, em mais lado nenhum.
  function detalheCompromisso(c, ano, mes){
    if (!c) return { valor: 0, conta: null, cartao: null, estado: null, nota: '' };
    if (derivaTSU(c)) return detalheTSU(ano, mes);

    if (c.pessoaId && pessoaTemRecibos(c.pessoaId)){
      var parte = c.parteRecibo === 'conta' || c.parteRecibo === 'cartao' ? c.parteRecibo : null;
      var comValor = function(valor, estado, nota){
        return { valor: arredCentimos(valor), conta: null, cartao: null, estado: estado, nota: nota };
      };
      // Modelo antigo: a soma das duas saídas É o montante, construída a
      // partir delas e não verificada depois.
      var comPartes = function(conta, cartao, estado, nota){
        var pc = arredCentimos(conta), pk = arredCentimos(cartao);
        return { valor: arredCentimos(pc + pk), conta: pc, cartao: pk, estado: estado, nota: nota };
      };

      var partesMes = partesDoRecibo(reciboDoMes(c.pessoaId, ano, mes));
      if (partesMes){
        var doMes = 'recibo de ' + labelPeriodoRecibo(periodoRecibo(ano, mes));
        if (parte === 'conta') return comValor(partesMes.conta, 'confirmado', 'transferência do ' + doMes);
        if (parte === 'cartao') return comValor(partesMes.cartao, 'confirmado', 'cartão do ' + doMes);
        return comPartes(partesMes.conta, partesMes.cartao, 'confirmado',
          'líquido do ' + doMes + ' · conta ' + formatEuro(partesMes.conta) + ' + cartão ' + formatEuro(partesMes.cartao));
      }

      var candidatos = recibosParaEstimar(c.pessoaId, ano, mes).filter(function(r){
        return partesDoRecibo(r) !== null;
      });
      if (candidatos.length){
        var usados = candidatos.slice(0, 3);
        // A média é feita SEPARADAMENTE por destino: o cartão é um valor
        // com vida própria (dias de subsídio), não uma fatia do líquido.
        var somaConta = 0, somaCartao = 0;
        usados.forEach(function(r){
          var p = partesDoRecibo(r);
          somaConta += p.conta;
          somaCartao += p.cartao;
        });
        var mediaConta = somaConta / usados.length;
        var mediaCartao = somaCartao / usados.length;
        var quantos = usados.length + (usados.length === 1 ? ' recibo' : ' recibos');

        // Se o vencimento base ATUAL da pessoa já não é o do último recibo,
        // houve aumento (ou redução) ainda não refletido em recibo nenhum e
        // a média está obsoleta. O aumento de base entra na TRANSFERÊNCIA:
        // não muda o subsídio de refeição, que depende dos dias e não do
        // vencimento. As rubricas variáveis (KM, suplementar) continuam a
        // vir da média, que é o melhor que se consegue.
        var baseAtual = baseAtualDaPessoa(c.pessoaId);
        var baseUltimo = baseDoRecibo(usados[0]);
        var ajuste = (baseAtual !== null && baseUltimo !== null && Math.abs(baseAtual - baseUltimo) >= 0.005)
          ? baseAtual - baseUltimo : 0;
        var notaBase = ajuste ? ' · base ' + formatEuro(arredCentimos(baseUltimo)) + ' → ' + formatEuro(arredCentimos(baseAtual)) : '';
        var estado = ajuste ? 'estimado-base' : 'estimado';

        if (parte === 'cartao'){
          // O cartão nunca leva o ajuste de base.
          return comValor(mediaCartao, 'estimado', 'média do cartão em ' + quantos);
        }
        if (parte === 'conta'){
          return comValor(mediaConta + ajuste, estado, 'média da transferência em ' + quantos + notaBase);
        }
        return comPartes(mediaConta + ajuste, mediaCartao, estado,
          'média de ' + quantos + ' (conta ' + formatEuro(arredCentimos(mediaConta)) +
          ' + cartão ' + formatEuro(arredCentimos(mediaCartao)) + ')' + notaBase +
          (ajuste ? ', ajuste só na transferência' : ''));
      }
    }

    // Semente: a pessoa ainda não tem recibo nenhum e o valor do registo é a
    // melhor aproximação que há. Marcado como estimativa para não se
    // confundir com um valor vindo de um recibo — e a partir do primeiro
    // recibo dessa pessoa esta linha deixa de ser alcançável.
    var semente = c.pessoaId ? 'estimado-semente' : null;

    // Comportamento antigo, intacto: com 'valorDiario' preenchido o valor é
    // calculado (dias úteis × valor diário) e o campo 'valor' é ignorado;
    // sem ele, usa 'valor'.
    var diario = parseMontante(c.valorDiario);
    if (c.valorDiario !== undefined && c.valorDiario !== null && c.valorDiario !== '' && diario > 0){
      return {
        valor: diasUteis(ano, mes) * diario, conta: null, cartao: null, estado: semente,
        nota: semente ? diasUteis(ano, mes) + ' dias úteis × ' + formatEuro(diario) + ' (semente)' : ''
      };
    }
    return {
      valor: parseMontante(c.valor), conta: null, cartao: null, estado: semente,
      nota: semente ? 'valor semente, ainda sem recibos' : ''
    };
  }

  function valorCompromisso(c, ano, mes){
    return detalheCompromisso(c, ano, mes).valor;
  }

  // As saídas de um compromisso num mês: uma só (o caso normal, e o de todos
  // os compromissos com parteRecibo), ou duas nos do modelo antigo, em que a
  // transferência e o cartão vinham do mesmo registo.
  function saidasCompromisso(c, ano, mes){
    var det = detalheCompromisso(c, ano, mes);
    if (det.conta === null){
      return [{ sufixo: '', destino: c.parteRecibo || null, valor: det.valor, estado: det.estado, nota: det.nota }];
    }
    var saidas = [{
      sufixo: '', destino: 'conta', valor: det.conta, estado: det.estado,
      nota: 'transferência bancária · ' + det.nota
    }];
    // Sem cartão de refeição não se cria uma segunda saída de zero euros.
    if (det.cartao > 0){
      saidas.push({
        sufixo: SUFIXO_CARTAO, destino: 'cartao', valor: det.cartao, estado: det.estado,
        nota: 'carregamento do cartão refeição · ' + det.nota
      });
    }
    return saidas;
  }

  function nomeOcorrencia(id, nome){
    return nome + (ehOcorrenciaCartao(id) ? ' · cartão refeição' : '');
  }

  // Montante de UMA ocorrência: a chave de pagamentosConcluidos já traz o
  // destino no id, por isso não se pode usar o total do compromisso.
  function valorOcorrencia(id, ano, mes){
    var c = compromissoPorId(id);
    if (!c) return 0;
    var querCartao = ehOcorrenciaCartao(id);
    var saidas = saidasCompromisso(c, ano, mes);
    for (var i = 0; i < saidas.length; i++){
      if (saidas.length === 1) return saidas[i].valor;
      if ((saidas[i].destino === 'cartao') === querCartao) return saidas[i].valor;
    }
    return 0;
  }

  // Firebase devolve arrays contíguos como array, mas com buracos devolve
  // um objeto indexado — daí normalizar sempre antes de usar.
  function mesesArray(m){
    if (!m) return [];
    var vals = Array.isArray(m) ? m : Object.keys(m).map(function(k){ return m[k]; });
    return vals.map(Number).filter(function(n){ return !isNaN(n); });
  }

  // Etiqueta curta para mostrar ao lado do número.
  function rotuloEstado(estado){
    if (estado === 'confirmado') return 'confirmado';
    if (estado === 'estimado') return 'estimado';
    if (estado === 'estimado-base') return 'estimado · base atualizada';
    if (estado === 'estimado-semente') return 'estimado · sem recibos';
    return '';
  }

  // 'ultimo' → último dia do mês; número → limitado ao mês; vazio ou
  // inválido → null, que significa «dia por confirmar» e não gera ocorrência.
  function resolveDia(valor, ano, mes){
    if (valor === undefined || valor === null || valor === '') return null;
    var nd = diasNoMes(ano, mes);
    if (valor === 'ultimo') return nd;
    var dia = parseInt(valor, 10);
    if (isNaN(dia)) return null;
    return Math.max(1, Math.min(dia, nd));
  }

  // Nos compromissos do modelo antigo o carregamento do cartão podia ter
  // vencimento próprio; sem 'diaCartao' sai no mesmo dia da transferência.
  // Nos novos o dia é o do próprio compromisso do cartão.
  function diaDaSaida(c, sufixo){
    if (sufixo === SUFIXO_CARTAO && c.diaCartao !== undefined && c.diaCartao !== null && c.diaCartao !== ''){
      return c.diaCartao;
    }
    return c.dia;
  }

  // Gera as ocorrências dos compromissos fixos ativos que caem no mês
  // pedido. 'meses' vazio = todos os meses; 'dia' em falta = por confirmar,
  // não gera ocorrência.
  function ocorrenciasCompromissos(ano, mes){
    var out = [];
    idsCompromissos().forEach(function(id){
      var c = compromissoPorId(id);
      if (!c || !c.ativo) return;

      var meses = mesesArray(c.meses);
      if (meses.length && meses.indexOf(mes) === -1) return;

      saidasCompromisso(c, ano, mes).forEach(function(s){
        var dia = resolveDia(diaDaSaida(c, s.sufixo), ano, mes);
        if (dia === null) return;
        // A TSU sem base nenhuma não é um pagamento: não gera ocorrência.
        if (derivaTSU(c) && s.valor <= 0) return;

        out.push({
          tipo: 'fixo',
          // 'tipo' aqui é a origem (pedido vs compromisso); 'tipoCusto' é a
          // natureza do custo (fixo vs variável), que vem do registo.
          tipoCusto: tipoDe(c),
          id: id + s.sufixo,
          nome: nomeOcorrencia(id + s.sufixo, c.nome || id),
          categoria: c.categoria || 'Outros',
          montante: s.valor,
          estado: s.estado,
          nota: s.nota,
          destino: s.destino,
          derivaDe: c.derivaDe || null,
          dia: dia
        });
      });
    });
    return out;
  }
  return {
    diasNoMes: diasNoMes, diasUteis: diasUteis,
    TSU_TAXA_TOTAL: TSU_TAXA_TOTAL, TSU_TAXA_PATRONAL: TSU_TAXA_PATRONAL,
    TSU_TAXA_TRABALHADOR: TSU_TAXA_TRABALHADOR, SUFIXO_CARTAO: SUFIXO_CARTAO,
    arredCentimos: arredCentimos, numOuNull: numOuNull,
    periodoRecibo: periodoRecibo, mesAnterior: mesAnterior,
    labelPeriodoRecibo: labelPeriodoRecibo, reciboDoMes: reciboDoMes,
    normalizaRecibo: normalizaRecibo, recibosParaEstimar: recibosParaEstimar,
    pessoaTemRecibos: pessoaTemRecibos, liquidoDoRecibo: liquidoDoRecibo,
    partesDoRecibo: partesDoRecibo, baseDoRecibo: baseDoRecibo,
    baseAtualDaPessoa: baseAtualDaPessoa, nomeDaPessoa: nomeDaPessoa,
    temRecibos: temRecibos, contribuicaoPessoa: contribuicaoPessoa,
    baseSSDoMes: baseSSDoMes, ultimaBaseSS: ultimaBaseSS,
    agregadoTSU: agregadoTSU, detalheTSU: detalheTSU,
    discriminacaoTSU: discriminacaoTSU, derivaTSU: derivaTSU,
    ehOcorrenciaCartao: ehOcorrenciaCartao, idBase: idBase,
    compromissoPorId: compromissoPorId, idsCompromissos: idsCompromissos,
    detalheCompromisso: detalheCompromisso, valorCompromisso: valorCompromisso,
    saidasCompromisso: saidasCompromisso, nomeOcorrencia: nomeOcorrencia,
    valorOcorrencia: valorOcorrencia, mesesArray: mesesArray,
    rotuloEstado: rotuloEstado, resolveDia: resolveDia,
    diaDaSaida: diaDaSaida, tipoDe: tipoDe,
    ocorrenciasCompromissos: ocorrenciasCompromissos
  };
}
