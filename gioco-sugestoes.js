/* gioco-sugestoes.js — DECOMPOSIÇÃO AUTOMÁTICA de projetos em passos (GiocoSugestoes).
   Fase 1.1 do motor de obrigações (Set/2026).

   A ÚNICA porta para o fornecedor de IA é sugerirPassos(): a obrigacoes.html só
   conhece a Promise e a forma dos passos devolvidos. Trocar de fornecedor (outro
   modelo, outra API, um proxy próprio) é mexer SÓ neste ficheiro.

   sugerirPassos(nomeProjeto, opts?) → Promise<{ passos, modelo }>
       passos = [{ titulo, duracaoPrevista (min, inteiro > 0), dependeDePasso (índice
       0-based de OUTRO passo da mesma lista, ou null) }], 1..MAX_PASSOS itens.
       opts.fetch / opts.timeoutMs / opts.modelos são injectáveis (testes).
       Rejeita com um Error cujo .motivo é uma frase curta em português para a UI
       e .codigo ∈ semChave | chave | quota | indisponivel | rede | resposta | vazio.
   normalizarPassos(texto) → passos válidos (PURA; lança em JSON inválido/vazio):
       aceita ```json … ``` à volta, corta títulos a 200, duração inválida → 30,
       dependência fora do intervalo ou a si próprio → null.
   promptPassos(nomeProjeto) → o texto do pedido (PURA, exportada para os testes).

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
  var MAX_PASSOS = 12;
  var DURACAO_DEFAULT = 30;

  function promptPassos(nome) {
    return 'Contexto: a GIOCO é uma focacciaria italiana de balcão em Lisboa (Rua de São Bento 154), ' +
      'gerida pelo fundador. Projeto a decompor: «' + String(nome || '').trim() + '».\n' +
      'Dá entre 4 e 8 passos concretos e acionáveis para este projeto, na ordem certa. ' +
      'Cada passo é UMA ação única que cabe numa sessão de trabalho, com a duração estimada em minutos. ' +
      'Inclui explicitamente passos de decisão e de verificação legal/administrativa quando aplicável. ' +
      'Escreve em português de Portugal, títulos curtos e diretos (começam por um verbo).\n' +
      'Responde APENAS com JSON, sem preâmbulo nem backticks, exatamente neste formato:\n' +
      '[{"titulo":"...","duracaoPrevista":30,"dependeDePasso":null}]\n' +
      'dependeDePasso = índice 0-based do passo de que depende, ou null.';
  }

  function erroDe(codigo, motivo, detalhe) {
    var e = new Error(motivo + (detalhe ? ' (' + detalhe + ')' : ''));
    e.codigo = codigo;
    e.motivo = motivo;
    return e;
  }

  function normalizarPassos(texto) {
    var t = String(texto === null || texto === undefined ? '' : texto).trim();
    // Rede de segurança: o modelo às vezes embrulha em ```json … ``` apesar do pedido.
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    var dados;
    try { dados = JSON.parse(t); }
    catch (e) {
      // Segunda tentativa: o primeiro [...] que apareça no texto.
      var m = /\[[\s\S]*\]/.exec(t);
      if (!m) throw erroDe('resposta', 'A resposta do modelo não é JSON');
      try { dados = JSON.parse(m[0]); }
      catch (e2) { throw erroDe('resposta', 'A resposta do modelo não é JSON'); }
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
      passos.push({ titulo: titulo, duracaoPrevista: d > 0 ? d : DURACAO_DEFAULT, _dep: p.dependeDePasso });
    });
    passos.forEach(function (p, i) {
      var d = p._dep;
      delete p._dep;
      var n = (typeof d === 'number' && isFinite(d)) ? Math.floor(d) : (typeof d === 'string' && /^\d+$/.test(d) ? parseInt(d, 10) : null);
      var alvo = (n !== null && n >= 0 && n < mapa.length) ? mapa[n] : null;
      p.dependeDePasso = (alvo !== null && alvo !== undefined && alvo !== i) ? alvo : null;
    });
    if (!passos.length) throw erroDe('vazio', 'O modelo não devolveu nenhum passo');
    return passos;
  }

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

  function sugerirPassos(nomeProjeto, opts) {
    opts = opts || {};
    var nome = String(nomeProjeto || '').trim();
    if (!nome) return Promise.reject(erroDe('vazio', 'O projeto não tem nome'));
    if (!(opts.chave || lerStorage())) return Promise.reject(erroDe('semChave', 'Sem chave da API do Gemini neste browser'));
    var modelos = (opts.modelos || MODELOS).slice();
    var corpo = {
      contents: [{ parts: [{ text: promptPassos(nome) }] }],
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
        return { passos: normalizarPassos(texto), modelo: modelo };
      });
    }
    return tentar(0, null);
  }

  var S = {
    sugerirPassos: sugerirPassos,
    temChave: temChave,
    guardarChave: guardarChave,
    apagarChave: apagarChave,
    CHAVE_STORAGE: CHAVE_STORAGE,
    normalizarPassos: normalizarPassos,
    promptPassos: promptPassos,
    MODELOS: MODELOS,
    MAX_PASSOS: MAX_PASSOS,
    DURACAO_DEFAULT: DURACAO_DEFAULT
  };
  if (typeof window !== 'undefined') window.GiocoSugestoes = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})();
