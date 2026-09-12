/* gioco-obrigacoes.js — motor partilhado das OBRIGAÇÕES (GiocoObrigacoes), SÓ leitura.
   Funções puras sobre os nós obrigacoes/ e projetos/ tal como estão em memória
   (o objeto devolvido por snapshot.val()); nunca tocam no Firebase nem no DOM.
   Usado pela obrigacoes.html (vista "Próxima ação", vista de projeto) e pelo
   mrn-dashboard.html (cartão Obrigações). Nunca reimplementar por página.

   Fase 1 (Set/2026): sem agendamento, sem janela de tempo, sem recorrência.

   REGRA INVIOLÁVEL (vale para quem consome este motor): nada sai do estado
   'aberta' sem ação explícita — concluir ou anular (flag). Nenhuma função aqui
   filtra obrigações abertas por data, período ou limite de contagem: quem quer
   mostrar menos linhas mostra um CONTADOR do resto, nunca esconde.

   hojeISO(d?)                          → 'AAAA-MM-DD' LOCAL (nunca a fatia UTC do ISO).
   diasEntre(iso, hoje)                 → dias inteiros de calendário entre uma data/hora ISO
                                          (ou 'AAAA-MM-DD') e hoje; null se inválida.
   estaAberta(obr)                      → estado 'aberta' e anulado !== true.
   listaAbertas(obrs)                   → [{id, ...obr}] só as abertas.
   dependenciasSatisfeitas(obr, obrs)   → true se TODAS as de dependeDe estão 'concluida'.
                                          Uma dependência anulada ou inexistente não
                                          bloqueia (deixou de ser um passo a fazer).
   passosDoProjeto(projetoId, obrs)     → todos os passos (qualquer estado) por ordem
                                          (ordem asc, depois criadoEm), para a vista de projeto.
   proximaAcao(projetoId, obrs)         → a obrigação aberta de MENOR ordem cujas dependências
                                          estão concluídas, ou null. Nunca a lista toda.
   diasParado(projeto, hoje)            → dias desde ultimoAvancoEm (fallback criadoEm); null sem data.
   grupoPrazo(obr, hoje)                → 0 vencida/hoje · 1 com prazo futuro · 2 sem prazo.
   ordenar(itens, hoje)                 → ordena itens {obr, projeto?} pela regra da Fase 1:
                                          (i) prazo vencido ou hoje; (ii) restantes com prazo,
                                          mais próximo primeiro; (iii) sem prazo, projeto parado
                                          há mais tempo primeiro (soltas: pela antiguidade da
                                          própria obrigação). Estável: desempate por criadoEm e id.
   vistaProximaAcao(obrs, projs, hoje)  → { projetos:[{obr, projeto, diasParado}] (uma linha por
                                          projeto ativo com próxima ação), soltas:[{obr}],
                                          bloqueados:[{projeto, abertas:n}] (projetos ativos com
                                          passos abertos mas nenhum desbloqueado — nunca escondidos),
                                          semPassos:[{projeto}] (ativos sem nenhum passo aberto),
                                          totalAbertas, parados:[{projeto, diasParado}] (> LIMITE_PARADO) }
   LIMITE_PARADO_DIAS = 14
*/
(function(){
  var LIMITE_PARADO_DIAS = 14;
  var DURACAO_DEFAULT = 30;

  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  function hojeISO(d){
    d = d || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // 'AAAA-MM-DD' → Date local à meia-noite; ISO com hora → Date normal; senão null.
  function paraData(v){
    if (typeof v !== 'string' || !v) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function diasEntre(iso, hoje){
    var d = paraData(iso);
    var h = paraData(hoje || hojeISO());
    if (!d || !h) return null;
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var b = new Date(h.getFullYear(), h.getMonth(), h.getDate());
    return Math.round((b - a) / 86400000);
  }

  function estaAberta(obr){
    return !!obr && obr.estado === 'aberta' && obr.anulado !== true;
  }

  function comId(obrs){
    var all = obrs || {};
    return Object.keys(all).filter(function(id){ return !!all[id]; }).map(function(id){
      var o = {}; var src = all[id];
      Object.keys(src).forEach(function(k){ o[k] = src[k]; });
      o.id = id;
      return o;
    });
  }

  function listaAbertas(obrs){
    return comId(obrs).filter(estaAberta);
  }

  function dependenciasSatisfeitas(obr, obrs){
    var deps = (obr && obr.dependeDe) || [];
    if (!Array.isArray(deps)) deps = Object.keys(deps).map(function(k){ return deps[k]; });
    var all = obrs || {};
    for (var i = 0; i < deps.length; i++){
      var dep = all[deps[i]];
      if (!dep) continue;                 // inexistente: não bloqueia
      if (dep.anulado === true || dep.estado === 'anulada') continue; // anulada: não bloqueia
      if (dep.estado !== 'concluida') return false;
    }
    return true;
  }

  function cmpOrdem(a, b){
    var oa = typeof a.ordem === 'number' ? a.ordem : Infinity;
    var ob = typeof b.ordem === 'number' ? b.ordem : Infinity;
    if (oa !== ob) return oa - ob;
    var ca = a.criadoEm || '', cb = b.criadoEm || '';
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  function passosDoProjeto(projetoId, obrs){
    return comId(obrs).filter(function(o){ return o.projetoId === projetoId; }).sort(cmpOrdem);
  }

  function proximaAcao(projetoId, obrs){
    var abertas = listaAbertas(obrs).filter(function(o){ return o.projetoId === projetoId; }).sort(cmpOrdem);
    for (var i = 0; i < abertas.length; i++){
      if (dependenciasSatisfeitas(abertas[i], obrs)) return abertas[i];
    }
    return null;
  }

  function diasParado(projeto, hoje){
    if (!projeto) return null;
    var ref = projeto.ultimoAvancoEm || projeto.criadoEm;
    return diasEntre(ref, hoje);
  }

  function grupoPrazo(obr, hoje){
    if (!obr || typeof obr.prazo !== 'string' || !obr.prazo) return 2;
    var n = diasEntre(obr.prazo, hoje);
    if (n === null) return 2;
    return n >= 0 ? 0 : 1;   // prazo ≤ hoje → vencida/hoje
  }

  // Antiguidade para o grupo (iii): o projeto parado há mais tempo primeiro;
  // uma obrigação solta usa a sua própria criação como referência.
  function diasReferencia(item, hoje){
    var n = item.projeto ? diasParado(item.projeto, hoje) : diasEntre(item.obr && item.obr.criadoEm, hoje);
    return n === null ? -1 : n;
  }

  function ordenar(itens, hoje){
    hoje = hoje || hojeISO();
    return (itens || []).slice().sort(function(A, B){
      var ga = grupoPrazo(A.obr, hoje), gb = grupoPrazo(B.obr, hoje);
      if (ga !== gb) return ga - gb;
      if (ga < 2){
        if (A.obr.prazo !== B.obr.prazo) return A.obr.prazo < B.obr.prazo ? -1 : 1;
      } else {
        var da = diasReferencia(A, hoje), db = diasReferencia(B, hoje);
        if (da !== db) return db - da;
      }
      return cmpOrdem(A.obr, B.obr);
    });
  }

  function projetoAtivo(p){
    return !!p && p.estado === 'ativo' && p.anulado !== true;
  }

  function vistaProximaAcao(obrs, projs, hoje){
    hoje = hoje || hojeISO();
    var all = obrs || {};
    var projetos = projs || {};
    var abertas = listaAbertas(all);
    var linhas = [], soltas = [], bloqueados = [], semPassos = [], parados = [];

    Object.keys(projetos).forEach(function(pid){
      var p = projetos[pid];
      if (!projetoAtivo(p)) return;
      var projeto = {}; Object.keys(p).forEach(function(k){ projeto[k] = p[k]; }); projeto.id = pid;
      var dp = diasParado(projeto, hoje);
      if (dp !== null && dp > LIMITE_PARADO_DIAS) parados.push({ projeto: projeto, diasParado: dp });
      var prox = proximaAcao(pid, all);
      var nAbertas = abertas.filter(function(o){ return o.projetoId === pid; }).length;
      if (prox) linhas.push({ obr: prox, projeto: projeto, diasParado: dp, abertasNoProjeto: nAbertas });
      else if (nAbertas > 0) bloqueados.push({ projeto: projeto, abertas: nAbertas, diasParado: dp });
      else semPassos.push({ projeto: projeto, diasParado: dp });
    });

    abertas.forEach(function(o){
      if (!o.projetoId || !projetoAtivo(projetos[o.projetoId])) soltas.push({ obr: o });
    });

    parados.sort(function(a, b){ return b.diasParado - a.diasParado; });

    return {
      projetos: ordenar(linhas, hoje),
      soltas: ordenar(soltas, hoje),
      bloqueados: bloqueados,
      semPassos: semPassos,
      totalAbertas: abertas.length,
      parados: parados
    };
  }

  var G = {
    LIMITE_PARADO_DIAS: LIMITE_PARADO_DIAS,
    DURACAO_DEFAULT: DURACAO_DEFAULT,
    hojeISO: hojeISO,
    diasEntre: diasEntre,
    estaAberta: estaAberta,
    listaAbertas: listaAbertas,
    dependenciasSatisfeitas: dependenciasSatisfeitas,
    passosDoProjeto: passosDoProjeto,
    proximaAcao: proximaAcao,
    diasParado: diasParado,
    grupoPrazo: grupoPrazo,
    ordenar: ordenar,
    vistaProximaAcao: vistaProximaAcao
  };
  if (typeof window !== 'undefined') window.GiocoObrigacoes = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})();
