/* gioco-sugestoes.js — DECOMPOSIÇÃO AUTOMÁTICA de projetos em passos (GiocoSugestoes).
   Fase 1.1 do motor de obrigações (Set/2026).

   A ÚNICA porta para o fornecedor de IA é sugerirPassos(): a obrigacoes.html só
   conhece a Promise e a forma dos passos devolvidos. Trocar de fornecedor (outro
   modelo, outra API, um proxy próprio) é mexer SÓ neste ficheiro.

   sugerirPassos(nomeProjeto, opts?) → Promise<{ passos, pressupostos, modelo }>
       opts.contexto (string, opcional): texto corrido do Manel sobre o projeto —
       o que já fez, o que o preocupa, o que falta decidir. Com contexto o prompt
       trata-o como fonte principal, pede passos próprios para as decisões
       implícitas e proíbe passos que contradigam o que já está feito. Vazio ou
       só espaços = comportamento só com o nome. Cortado a MAX_CONTEXTO chars.
       passos = [{ titulo, duracaoPrevista (min, inteiro > 0), dependeDePasso (índice
       0-based de OUTRO passo da mesma lista, ou null), local }], 1..MAX_PASSOS itens.
       pressupostos = [string] (0..MAX_PRESSUPOSTOS): o que o modelo ASSUMIU e não
       sabe — em vez de inventar em silêncio, declara. Só informativo: a página
       mostra-os acima dos passos, nunca cria registos com eles. Resposta sem o
       campo (ou uma lista nua, o formato antigo) → [] — retrocompatível.
       opts.fetch / opts.timeoutMs / opts.modelos são injectáveis (testes).
       Rejeita com um Error cujo .motivo é uma frase curta em português para a UI
       e .codigo ∈ semChave | chave | quota | indisponivel | rede | resposta | vazio.
   normalizarResposta(texto) → { passos, pressupostos } (PURA; lança em JSON
       inválido/vazio): aceita ```json … ``` à volta, o objeto {passos, pressupostos}
       OU a lista nua de passos; corta títulos a 200, duração inválida → 30,
       dependência fora do intervalo ou a si próprio → null; pressupostos que não
       sejam strings caem, cada um cortado a 200, tecto MAX_PRESSUPOSTOS.
   normalizarPassos(texto) → só os passos (o mesmo, mantido para compatibilidade).
   promptPassos(nomeProjeto, contexto?) → o texto do pedido (PURA, exportada para os testes).

   CONTEXTO DE NEGÓCIO (Set/2026): TODOS os prompts (passos, atualização e local)
   começam pelo bloco do gioco-contexto.js (GiocoContexto.texto(): o que é a
   GIOCO, entidade legal, equipa com papéis, Manel único decisor). É a FONTE ÚNICA
   — nada da equipa está escrito aqui. Carregar gioco-contexto.js antes deste
   ficheiro (em Node é um require). Sem ele, lança ao carregar: um prompt sem
   equipa era exactamente o problema que isto resolve.
   REGRAS DE UM BOM PASSO (Set/2026, nos prompts de passos e de atualização):
   estado final verificável ("obter Y", não "tratar de X"); recolher informação
   antes de decidir com base nela; esperas por terceiros são passos próprios com o
   nome da pessoa; o 1.º passo é executável hoje sem depender de nada nem de
   ninguém; nomes reais da equipa; o número de passos segue a complexidade real
   (4 simples … 8 complexo, nunca sempre o mesmo), tecto MAX_PASSOS = 8 — listas
   maiores paralisam, que é o problema que a ferramenta existe para resolver.

   LOCAL (Set/2026): cada passo sugerido e cada passo acrescentado traz também
   local ∈ LOCAIS = 'loja' | 'computador' | 'rua' | 'telefone' | null (null = em
   qualquer sítio / não é claro). normalizarLocal(v) aceita só esses quatro; tudo
   o resto é null. O Manel nunca escolhe o local à mão por obrigação — é sempre
   pré-preenchido e ele corrige quando está errado.
   classificarLocal(titulos, opts?) → Promise<{ locais:[local|null…], modelo }>,
       UM pedido para N títulos (as linhas coladas de uma vez vão juntas), pela
       mesma cadeia. promptClassificarLocal(titulos) e
       normalizarLocais(texto, titulos) são PURAS: a resposta casa por título
       (normalizado) e, se não bater, por posição; sem entrada → null. A lista
       devolvida tem SEMPRE o tamanho de titulos. Em caso de dúvida null, nunca
       adivinhar — está no prompt e a normalização não inventa.

   ATUALIZAÇÃO INCREMENTAL (Set/2026) — para um projeto que JÁ tem passos:
   sugerirAlteracoes(nomeProjeto, { contexto, abertos, concluidos, anulados, ... })
       → Promise<{ alteracoes, modelo }>. Mesma chave, mesma cadeia de modelos e
       mesmo fallback do sugerirPassos. abertos = [{id, titulo, ordem, duracaoPrevista,
       dependeDe}], concluidos/anulados = [{titulo}] (ou strings). O modelo recebe o
       nome, o contexto completo, os abertos com id, os concluídos como factos
       consumados e os anulados para não voltarem, e devolve SÓ alterações:
       { acrescentar:[{titulo, duracaoPrevista, depoisDe, porque}],
         remover:[{id, porque}], alterar:[{id, titulo?, duracaoPrevista?, porque}] }.
   normalizarAlteracoes(texto, abertos) → o objeto acima, PURO e defensivo: só ids de
       passos ABERTOS passam em remover/alterar/depoisDe (um id concluído, anulado ou
       inventado cai — é a garantia mecânica de "nunca tocar num concluído", além da
       regra no prompt); um id não aparece duas vezes na mesma lista nem em remover E
       alterar; "alterar" só sobrevive se mudar mesmo alguma coisa; porque cortado a
       200. Três listas vazias é um resultado VÁLIDO ("nada a alterar"), não erro.
   promptAtualizacao(nome, contexto, listas) → o texto do pedido (PURA).
   A página mostra as alterações com checkbox, todas ativas por omissão, e só grava as
   marcadas ao «Aplicar»; remover é anular por flag (anuladoPorSugestao:true), nunca
   remove(). Este módulo continua sem Firebase e sem DOM.

   A RESPOSTA NUNCA É GRAVADA DIRETAMENTE: a página mostra-a numa lista editável e
   só grava em obrigacoes/ o que o Manel confirmar. Este módulo não toca no
   Firebase nem no DOM.

   Fornecedor: Google Gemini API (AI Studio, tier gratuito), REST
   generateContent com responseMimeType JSON. MODELOS é a cadeia por ordem de
   preferência — o mais recente da linha Flash disponível nesta chave em
   12/09/2026 (lista de /v1beta/models conferida) primeiro; um 503 (pico de
   procura) ou 404 (modelo retirado) passa ao seguinte, qualquer outro erro
   pára logo. Ao subir de modelo, voltar a listar os modelos da chave: os nomes
   antigos deixam de existir para chaves novas (o gemini-2.5-flash já dá 404).

   CHAVE: o repo é PÚBLICO (Restrição 1 do CLAUDE.md) e o push protection do
   GitHub recusa a chave do Gemini (é uma chave GCP ligada a uma service
   account). Por isso a chave NÃO vive no código: fica no localStorage do
   browser (CHAVE_STORAGE), colada uma vez na caixa de sugestão da
   obrigacoes.html quando falta. temChave() / guardarChave(k) / apagarChave().
   Sem chave, sugerirPassos rejeita com codigo 'semChave' e a página pede-a;
   opts.chave sobrepõe (testes). Nunca é enviada para lado nenhum além da API. */
(function () {
  'use strict';

  var CHAVE_STORAGE = 'gioco.gemini.chave';
  function lerStorage() { try { return (localStorage.getItem(CHAVE_STORAGE) || '').trim(); } catch (e) { return ''; } }
  function temChave() { return !!lerStorage(); }
  function guardarChave(k) { k = String(k || '').trim(); try { if (k) localStorage.setItem(CHAVE_STORAGE, k); else localStorage.removeItem(CHAVE_STORAGE); } catch (e) {} return !!k; }
  function apagarChave() { guardarChave(''); }
  var BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var MODELOS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
  var TIMEOUT_MS = 45000;
  var MAX_PASSOS = 8;
  var MAX_PRESSUPOSTOS = 4;
  var MAX_CONTEXTO = 4000;
  var DURACAO_DEFAULT = 30;
  var LOCAIS = ['loja', 'computador', 'rua', 'telefone'];
  function normalizarLocal(v) { v = String(v === null || v === undefined ? '' : v).trim().toLowerCase(); return LOCAIS.indexOf(v) >= 0 ? v : null; }
  var DEF_LOCAIS = "'loja' = presencial na loja (Rua de São Bento 154); 'computador' = trabalho ao ecrã; " +
    "'telefone' = ligar ou falar com alguém à distância; 'rua' = fora, deslocação a terceiros; null quando não for claro.";

  // Fonte única do contexto de negócio (equipa, papéis, entidade legal): gioco-contexto.js.
  var Contexto = (typeof window !== 'undefined' && window.GiocoContexto) ? window.GiocoContexto
    : (typeof require === 'function' ? require('./gioco-contexto.js') : null);
  if (!Contexto || typeof Contexto.texto !== 'function') throw new Error('gioco-sugestoes.js: carregar gioco-contexto.js antes');
  function blocoNegocio() { return Contexto.texto() + '\n'; }

  var REGRAS_PASSO =
    'REGRAS DE UM BOM PASSO (obrigatórias):\n' +
    '1. Cada passo tem um estado final VERIFICÁVEL — não "tratar de X" mas "obter Y", "ter Z aprovado", "enviar W a alguém".\n' +
    '2. Recolher informação vem SEMPRE antes de decidir com base nela (primeiro "obter orçamentos", só depois "decidir fornecedor").\n' +
    '3. Uma espera por terceiros (resposta, entrega, aprovação) é um passo PRÓPRIO, com o nome da pessoa ou entidade quando se souber quem é.\n' +
    '4. O PRIMEIRO passo tem de ser executável HOJE, pelo Manel, sem depender de nada nem de ninguém.\n' +
    '5. Quando um passo envolve alguém da equipa, usa o nome real da pessoa certa para essa área (ver CONTEXTO DO NEGÓCIO); o Manel decide, os outros executam ou informam.\n' +
    '6. O número de passos segue a complexidade REAL do projeto: um simples pode ter 4, um complexo até ' + MAX_PASSOS + '. Nunca devolvas sempre o mesmo número e nunca mais de ' + MAX_PASSOS + '.\n' +
    '7. Cada passo é UMA ação única que cabe numa sessão de trabalho, com a duração estimada em minutos; título curto e direto, em português de Portugal, a começar por um verbo.\n';

  function limparContexto(c) { return String(c === null || c === undefined ? '' : c).trim().slice(0, MAX_CONTEXTO); }

  function promptPassos(nome, contexto) {
    var ctx = limparContexto(contexto);
    var bloco = ctx
      ? 'O Manel escreveu o seguinte sobre o projeto (é a FONTE PRINCIPAL — tem prioridade sobre o que ' +
        'assumirias por defeito):\n---\n' + ctx + '\n---\n' +
        'Regras sobre este texto: (1) o que ele diz já estar feito NÃO volta a ser um passo e nenhum passo ' +
        'pode contradizê-lo; (2) identifica explicitamente as decisões por tomar que estão implícitas no ' +
        'texto (dúvidas, "não sei se", alternativas em aberto) e transforma cada uma num passo próprio de ' +
        'decisão, com título a começar por "Decidir"; (3) as pessoas e preocupações mencionadas entram nos ' +
        'passos a que dizem respeito.\n'
      : 'O Manel não escreveu contexto sobre o projeto.\n';
    return blocoNegocio() +
      'Projeto a decompor em passos: «' + String(nome || '').trim() + '».\n' + bloco +
      REGRAS_PASSO +
      'Inclui explicitamente passos de decisão (título a começar por "Decidir") e de verificação legal/administrativa quando aplicável.\n' +
      'Para cada passo indica onde se faz, em "local": ' + DEF_LOCAIS + ' Em caso de dúvida null, nunca adivinhar.\n' +
      'PRESSUPOSTOS: em vez de inventares em silêncio, declara em "pressupostos" o que assumiste e não sabes ' +
      '(frases curtas, no máximo ' + MAX_PRESSUPOSTOS + '; lista vazia se não assumiste nada). Servem para o Manel perceber o que falta dizer no contexto.\n' +
      'Responde APENAS com JSON, sem preâmbulo nem backticks, exatamente neste formato:\n' +
      '{"passos":[{"titulo":"...","duracaoPrevista":30,"dependeDePasso":null,"local":"loja"}],"pressupostos":["..."]}\n' +
      'dependeDePasso = índice 0-based do passo de que depende, ou null.';
  }

  function promptClassificarLocal(titulos) {
    var lista = (titulos || []).map(function (t, i) { return (i + 1) + '. ' + tituloDe(t); });
    return blocoNegocio() +
      'Para cada obrigação abaixo, diz ONDE se faz: ' + DEF_LOCAIS + '\n' +
      'Obrigações:\n' + lista.join('\n') + '\n' +
      'Responde APENAS com JSON, sem preâmbulo nem backticks, um item por obrigação pela mesma ordem, exatamente neste formato:\n' +
      '[{"titulo":"...","local":"loja"}]\n' +
      'Em caso de dúvida devolve null em "local", nunca adivinhes.';
  }

  function chaveTitulo(t) { return tituloDe(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }

  function normalizarLocais(texto, titulos) {
    titulos = titulos || [];
    var dados;
    try { dados = extrairJson(texto, '[', ']'); } catch (e) { dados = null; }
    if (!Array.isArray(dados)) throw erroDe('resposta', 'A resposta do modelo não é uma lista');
    var itens = dados.filter(function (x) { return x && typeof x === 'object'; });
    var porTitulo = {};
    itens.forEach(function (x) { var k = chaveTitulo(x.titulo); if (k && !(k in porTitulo)) porTitulo[k] = normalizarLocal(x.local); });
    return titulos.map(function (t, i) {
      var k = chaveTitulo(t);
      if (k in porTitulo) return porTitulo[k];
      return itens[i] ? normalizarLocal(itens[i].local) : null;
    });
  }

  function tituloDe(x) { return String(x && typeof x === 'object' ? (x.titulo || '') : (x || '')).replace(/\s+/g, ' ').trim(); }

  function promptAtualizacao(nome, contexto, listas) {
    listas = listas || {};
    var ctx = limparContexto(contexto);
    var abertos = (listas.abertos || []).map(function (o) {
      return JSON.stringify({ id: o.id, titulo: tituloDe(o), ordem: o.ordem === undefined ? null : o.ordem, duracaoPrevista: o.duracaoPrevista || DURACAO_DEFAULT,
        dependeDe: Array.isArray(o.dependeDe) ? o.dependeDe : (o.dependeDe && typeof o.dependeDe === 'object' ? Object.keys(o.dependeDe).map(function (k) { return o.dependeDe[k]; }) : []) });
    });
    var concluidos = (listas.concluidos || []).map(tituloDe).filter(Boolean);
    var anulados = (listas.anulados || []).map(tituloDe).filter(Boolean);
    return blocoNegocio() +
      'Projeto em curso: «' + String(nome || '').trim() + '».\n' +
      (ctx ? 'O Manel escreveu o seguinte sobre o projeto (FONTE PRINCIPAL — inclui o que descobriu, decidiu ou mudou entretanto):\n---\n' + ctx + '\n---\n' : 'O Manel não escreveu contexto.\n') +
      'PASSOS ABERTOS (por fazer), um por linha em JSON:\n' + (abertos.length ? abertos.join('\n') : '(nenhum)') + '\n' +
      'PASSOS CONCLUÍDOS (factos consumados — já aconteceram, nunca voltam a ser passos):\n' + (concluidos.length ? concluidos.map(function (t) { return '- ' + t; }).join('\n') : '(nenhum)') + '\n' +
      'PASSOS ANULADOS (foram descartados de propósito — não voltar a propor):\n' + (anulados.length ? anulados.map(function (t) { return '- ' + t; }).join('\n') : '(nenhum)') + '\n' +
      'Tarefa: compara o contexto com os passos abertos e propõe APENAS as alterações necessárias aos passos que faltam — ' +
      'passos novos que o contexto torna necessários (incluindo decisões por tomar, título a começar por "Decidir"), passos abertos que ' +
      'deixaram de fazer sentido, e passos abertos cujo título ou duração deva mudar. Regras: (1) nunca propor remover ou alterar passos ' +
      'concluídos — só os ids da lista de ABERTOS são válidos em "remover", "alterar" e "depoisDe"; (2) nunca propor um passo que repita ' +
      'algo já concluído nem um anulado; (3) "porque" é UMA frase curta, em português de Portugal, que justifica a alteração com base no ' +
      'contexto; (4) se nada mudar, devolve as três listas vazias; (5) "depoisDe" é o id do passo aberto a seguir ao qual entra, ou null para o fim; ' +
      '(6) o total de passos abertos depois das alterações nunca passa de ' + MAX_PASSOS + '.\n' +
      'Cada passo novo ou alterado cumpre as ' + REGRAS_PASSO +
      'Responde APENAS com JSON, sem preâmbulo nem backticks, exatamente neste formato:\n' +
      'Cada passo em "acrescentar" traz também "local": ' + DEF_LOCAIS + '\n' +
      '{"acrescentar":[{"titulo":"...","duracaoPrevista":30,"depoisDe":"<id de passo aberto ou null>","local":"loja","porque":"..."}],' +
      '"remover":[{"id":"...","porque":"..."}],"alterar":[{"id":"...","titulo":"...","duracaoPrevista":30,"porque":"..."}]}';
  }

  function extrairJson(texto, abre, fecha) {
    var t = String(texto === null || texto === undefined ? '' : texto).trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {}
    var i = t.indexOf(abre), j = t.lastIndexOf(fecha);
    if (i < 0 || j <= i) throw erroDe('resposta', 'A resposta do modelo não é JSON');
    try { return JSON.parse(t.slice(i, j + 1)); } catch (e2) { throw erroDe('resposta', 'A resposta do modelo não é JSON'); }
  }

  function normalizarAlteracoes(texto, abertos) {
    var dados = extrairJson(texto, '{', '}');
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw erroDe('resposta', 'A resposta do modelo não é um objeto de alterações');
    var porId = {};
    (abertos || []).forEach(function (o) { var id = typeof o === 'string' ? o : (o && o.id); if (id) porId[id] = (typeof o === 'object') ? o : { id: id }; });
    var lista = function (k) { return Array.isArray(dados[k]) ? dados[k].filter(function (x) { return x && typeof x === 'object'; }) : []; };
    var porque = function (x) { return String(x.porque === null || x.porque === undefined ? '' : x.porque).replace(/\s+/g, ' ').trim().slice(0, 200); };
    var dur = function (v) { var n = parseInt(v, 10); return n > 0 ? n : null; };
    var vistos = {};
    var remover = [];
    lista('remover').forEach(function (x) {
      var id = String(x.id || '');
      if (!porId[id] || vistos[id]) return;
      vistos[id] = 'remover';
      remover.push({ id: id, porque: porque(x) });
    });
    var alterar = [];
    lista('alterar').forEach(function (x) {
      var id = String(x.id || '');
      if (!porId[id] || vistos[id]) return;
      var atual = porId[id];
      var t = tituloDe(x).slice(0, 200);
      var d = dur(x.duracaoPrevista);
      var reg = { id: id, porque: porque(x) };
      if (t && t !== tituloDe(atual)) reg.titulo = t;
      if (d && d !== (atual.duracaoPrevista || null)) reg.duracaoPrevista = d;
      if (!('titulo' in reg) && !('duracaoPrevista' in reg)) return; // nada muda de facto
      vistos[id] = 'alterar';
      alterar.push(reg);
    });
    var acrescentar = [];
    lista('acrescentar').slice(0, MAX_PASSOS).forEach(function (x) {
      var t = tituloDe(x).slice(0, 200);
      if (!t) return;
      var dep = (x.depoisDe !== null && x.depoisDe !== undefined && porId[String(x.depoisDe)] && vistos[String(x.depoisDe)] !== 'remover') ? String(x.depoisDe) : null;
      acrescentar.push({ titulo: t, duracaoPrevista: dur(x.duracaoPrevista) || DURACAO_DEFAULT, depoisDe: dep, local: normalizarLocal(x.local), porque: porque(x) });
    });
    return { acrescentar: acrescentar, remover: remover, alterar: alterar };
  }

  function erroDe(codigo, motivo, detalhe) {
    var e = new Error(motivo + (detalhe ? ' (' + detalhe + ')' : ''));
    e.codigo = codigo;
    e.motivo = motivo;
    return e;
  }

  function normalizarPressupostos(v) {
    if (!Array.isArray(v)) return [];
    return v.map(function (x) { return typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, 200) : ''; })
      .filter(Boolean).slice(0, MAX_PRESSUPOSTOS);
  }

  function normalizarResposta(texto) {
    var t = String(texto === null || texto === undefined ? '' : texto).trim();
    // Rede de segurança: o modelo às vezes embrulha em ```json … ``` apesar do pedido.
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    var dados;
    try { dados = JSON.parse(t); }
    catch (e) {
      // Segunda tentativa: o primeiro {...} ou [...] que apareça no texto (o que abrir primeiro).
      var io = t.indexOf('{'), ia = t.indexOf('[');
      var objeto = io >= 0 && (ia < 0 || io < ia);
      var m = objeto ? /\{[\s\S]*\}/.exec(t) : /\[[\s\S]*\]/.exec(t);
      if (!m) throw erroDe('resposta', 'A resposta do modelo não é JSON');
      try { dados = JSON.parse(m[0]); }
      catch (e2) { throw erroDe('resposta', 'A resposta do modelo não é JSON'); }
    }
    // Formato atual {passos, pressupostos}; a lista nua é o formato antigo e continua aceite.
    var pressupostos = [];
    if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
      pressupostos = normalizarPressupostos(dados.pressupostos);
      dados = dados.passos;
    }
    if (!Array.isArray(dados)) throw erroDe('resposta', 'A resposta do modelo não é uma lista de passos');
    var brutos = dados.filter(function (p) { return p && typeof p === 'object'; }).slice(0, MAX_PASSOS);
    var passos = [];
    var mapa = []; // índice bruto → índice final (null se o passo caiu)
    brutos.forEach(function (p) {
      var titulo = String(p.titulo === null || p.titulo === undefined ? '' : p.titulo).replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!titulo) { mapa.push(null); return; }
      var d = parseInt(p.duracaoPrevista, 10);
      mapa.push(passos.length);
      passos.push({ titulo: titulo, duracaoPrevista: d > 0 ? d : DURACAO_DEFAULT, local: normalizarLocal(p.local), _dep: p.dependeDePasso });
    });
    passos.forEach(function (p, i) {
      var d = p._dep;
      delete p._dep;
      var n = (typeof d === 'number' && isFinite(d)) ? Math.floor(d) : (typeof d === 'string' && /^\d+$/.test(d) ? parseInt(d, 10) : null);
      var alvo = (n !== null && n >= 0 && n < mapa.length) ? mapa[n] : null;
      p.dependeDePasso = (alvo !== null && alvo !== undefined && alvo !== i) ? alvo : null;
    });
    if (!passos.length) throw erroDe('vazio', 'O modelo não devolveu nenhum passo');
    return { passos: passos, pressupostos: pressupostos };
  }

  function normalizarPassos(texto) { return normalizarResposta(texto).passos; }

  function textoDaResposta(json) {
    try {
      var partes = json.candidates[0].content.parts;
      return partes.map(function (p) { return p.text || ''; }).join('');
    } catch (e) { return ''; }
  }

  function chamarModelo(modelo, corpo, opts) {
    var f = opts.fetch || (typeof fetch === 'function' ? fetch : null);
    if (!f) return Promise.reject(erroDe('rede', 'Este browser não suporta pedidos à API'));
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeoutMs || TIMEOUT_MS) : null;
    var url = BASE + modelo + ':generateContent';
    return f(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.chave || lerStorage() },
      body: JSON.stringify(corpo),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (resp) {
      return resp.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) {}
        return { status: resp.status, json: json, texto: txt };
      });
    }, function (e) {
      if (e && e.name === 'AbortError') throw erroDe('rede', 'O modelo não respondeu a tempo');
      throw erroDe('rede', 'Sem ligação à API do Gemini');
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r;
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }

  function erroHttp(r, modelo) {
    var msg = (r.json && r.json.error && r.json.error.message) || (r.texto || '').slice(0, 200);
    if (r.status === 400 && /API key/i.test(msg)) return erroDe('chave', 'Chave da API inválida', modelo);
    if (r.status === 401 || r.status === 403) return erroDe('chave', 'A chave da API não tem permissão', modelo);
    if (r.status === 429) return erroDe('quota', 'Quota do Gemini esgotada — tenta mais tarde', modelo);
    if (r.status === 503 || r.status === 404) return erroDe('indisponivel', 'Modelo indisponível de momento', modelo);
    return erroDe('resposta', 'Erro HTTP ' + r.status + ' do Gemini', msg);
  }

  // Cadeia comum aos dois pedidos: chave, modelos por ordem, fallback só em 503/404,
  // e o texto da resposta entregue a quem chama para normalizar.
  function pedirAoModelo(prompt, opts) {
    opts = opts || {};
    if (!(opts.chave || lerStorage())) return Promise.reject(erroDe('semChave', 'Sem chave da API do Gemini neste browser'));
    var modelos = (opts.modelos || MODELOS).slice();
    var corpo = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
    };
    function tentar(i, ultimoErro) {
      if (i >= modelos.length) return Promise.reject(ultimoErro || erroDe('indisponivel', 'Nenhum modelo disponível'));
      var modelo = modelos[i];
      return chamarModelo(modelo, corpo, opts).then(function (r) {
        if (r.status !== 200) {
          var e = erroHttp(r, modelo);
          // Só o pico de procura / modelo retirado justifica passar ao seguinte.
          if (e.codigo === 'indisponivel') return tentar(i + 1, e);
          throw e;
        }
        var texto = textoDaResposta(r.json);
        if (!texto) throw erroDe('vazio', 'O modelo devolveu uma resposta vazia', modelo);
        return { texto: texto, modelo: modelo };
      });
    }
    return tentar(0, null);
  }

  function sugerirPassos(nomeProjeto, opts) {
    opts = opts || {};
    var nome = String(nomeProjeto || '').trim();
    if (!nome) return Promise.reject(erroDe('vazio', 'O projeto não tem nome'));
    return pedirAoModelo(promptPassos(nome, opts.contexto), opts).then(function (r) {
      var n = normalizarResposta(r.texto);
      return { passos: n.passos, pressupostos: n.pressupostos, modelo: r.modelo };
    });
  }

  function classificarLocal(titulos, opts) {
    opts = opts || {};
    var lista = (titulos || []).map(tituloDe);
    if (!lista.length || !lista.some(Boolean)) return Promise.resolve({ locais: lista.map(function () { return null; }), modelo: null });
    return pedirAoModelo(promptClassificarLocal(lista), opts).then(function (r) {
      return { locais: normalizarLocais(r.texto, lista), modelo: r.modelo };
    });
  }

  function sugerirAlteracoes(nomeProjeto, opts) {
    opts = opts || {};
    var nome = String(nomeProjeto || '').trim();
    if (!nome) return Promise.reject(erroDe('vazio', 'O projeto não tem nome'));
    var abertos = opts.abertos || [];
    return pedirAoModelo(promptAtualizacao(nome, opts.contexto, opts), opts).then(function (r) {
      return { alteracoes: normalizarAlteracoes(r.texto, abertos), modelo: r.modelo };
    });
  }

  var S = {
    sugerirPassos: sugerirPassos,
    temChave: temChave,
    guardarChave: guardarChave,
    apagarChave: apagarChave,
    CHAVE_STORAGE: CHAVE_STORAGE,
    sugerirAlteracoes: sugerirAlteracoes,
    classificarLocal: classificarLocal,
    normalizarLocais: normalizarLocais,
    promptClassificarLocal: promptClassificarLocal,
    normalizarLocal: normalizarLocal,
    LOCAIS: LOCAIS,
    normalizarPassos: normalizarPassos,
    normalizarResposta: normalizarResposta,
    normalizarAlteracoes: normalizarAlteracoes,
    REGRAS_PASSO: REGRAS_PASSO,
    MAX_PRESSUPOSTOS: MAX_PRESSUPOSTOS,
    promptPassos: promptPassos,
    promptAtualizacao: promptAtualizacao,
    MODELOS: MODELOS,
    MAX_PASSOS: MAX_PASSOS,
    MAX_CONTEXTO: MAX_CONTEXTO,
    DURACAO_DEFAULT: DURACAO_DEFAULT
  };
  if (typeof window !== 'undefined') window.GiocoSugestoes = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})();
