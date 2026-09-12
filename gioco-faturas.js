/* gioco-faturas.js — leitura e arquivo de faturas (módulo partilhado, SÓ LEITURA)
   ------------------------------------------------------------------------
   Extraído da leitura-faturas.html em Set/2026 sem alterar comportamento.
   Não escreve em lado nenhum: chama o Azure Document Intelligence, extrai os
   campos e devolve-os; quem grava (e onde) é cada página.
     - leitura-faturas.html → faturasProcessadas / faturasArquivo (+ paymentRequests)
     - caixa.html           → dentro do movimento em caixaMovimentos/{id}/fatura
                              e caixaFaturasArquivo/{id} — NUNCA em faturasProcessadas
   Vanilla, sem build, sem CDN. Namespace: window.GiocoFaturas.

   API:
     GiocoFaturas.ler(file, opts?)   opts = { sleep, onEspera } (rate limit, ver RETRY_429)
       → Promise<{ fornecedorTexto, montante, referencia, data, prazoPagamento, linhas
                   (cada uma com unidade, unidadeBruta, embalagem), nif (string|null),
                   nifCandidatos (string[]), nifOrigem, paginas (número|null), multiPagina (bool) }>
     GiocoFaturas.analyzeInvoice(file, opts?)     → Promise<analyzeResult> (bruto do Azure)
     GiocoFaturas.RETRY_429 / esperaRetry429(err, tentativa) / erroHttp(msg, status, retryAfter)
       → política de retry do 429 do tier F0 (~1 pedido/s): 4 tentativas, 2/5/12/30 s,
         Retry-After respeitado com tecto de 60 s. Os erros HTTP levam .status,
         .retryAfterMs, .fase ('post'|'poll') e .esgotado (polling que esgotou)
     GiocoFaturas.fieldText / fieldDateIso / fieldAmount / extrairLinhas
     GiocoFaturas.fileToBase64 / fileToDataUrl / compressImageDataUrl
     GiocoFaturas.prepararArquivoFatura(file)     → Promise<dataUrl> (imagem comprimida ou PDF tal e qual)
     GiocoFaturas.abrirArquivoFatura(dataUrl)     → abre/descarrega o original
     GiocoFaturas.normalizeNome(s)
     GiocoFaturas.NIF_PROPRIO                     → "518717186" (Tribo Poética / GIOCO — é o
                                                    cliente em TODAS as faturas; nunca é candidato)
     GiocoFaturas.soDigitos(s)                    → só os dígitos da string
     GiocoFaturas.nifValido(n)                    → 9 dígitos, 1.º ∈ {1,2,3,5,6,8,9}, check digit mod 11
     GiocoFaturas.limparContentParaNifs(content) → texto sem IBANs, ATCUD, EANs (10+ dígitos)
     GiocoFaturas.extrairNifs(analyzeResult, fields)
       → { nif, candidatos, origem } — origem ∈ 'vendorTaxId' | 'etiqueta' | 'pt' |
         'generico' | null, pela ordem de prioridade documentada na função. Só as três
         primeiras são de confiança para gravar numa ficha (nifOrigemConfiavel()).
     GiocoFaturas.normalizarUnidade(u)            → { unidade, unidadeBruta } (bx/box/cx→cx;
                                                    pc/pç/pcs/uni/un/und→un; mo→mo; em→emb; …)
     GiocoFaturas.inferirUnidadeDaDescricao(desc) → { unidade, tamanhoEmbalagem, unidadesPorCaixa } | null
                                                    (multiplicador "x" ou "*", nas duas ordens)
     GiocoFaturas.detetarMultiPagina(paginas, content)
     GiocoFaturas.findMatchingSupplierDetalhe(vendorName, allSuppliers, {nif, nifCandidatos})
       → { id, via: 'nif' | 'nome' | null }. Ordem: (1) NIF — soDigitos(supplier.nif)
         contra nif e cada candidato, primeiro acerto ganha; (2) nome — substring do
         nome normalizado, alargada a supplier.aliases (array de strings), o nome/alias
         mais longo é o mais específico; (3) null.
     GiocoFaturas.findMatchingSupplier(vendorName, allSuppliers, opcoes?) → id | null
       (wrapper do anterior; o 3.º argumento é opcional e retrocompatível)
*/
(function (global) {
  'use strict';

  // ===== Azure Document Intelligence =====
  // A chave fica no código de propósito: o recurso é F0 (gratuito, limitado) e o
  // risco foi aceite enquanto assim for. Repo público — não copiar este padrão
  // para chaves com custo.
  var AZURE_ENDPOINT = "https://gioco-faturas.cognitiveservices.azure.com/";
  var AZURE_KEY = "1n7yHYxafKNvjqTWi7nya9frEjoaB6SlVgwFTUbrAY3g6dC2dhrAJQQJ99CHACgEuAYXJ3w3AAALACOGXRF1";
  var AZURE_API_VERSION = "2024-11-30";
  var AZURE_MODEL_ID = "prebuilt-invoice";
  var POLL_INTERVAL_MS = 1500;
  var POLL_TIMEOUT_MS = 30000;

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  var ACCENT_MAP = {
    "a":"a","à":"a","á":"a","â":"a","ã":"a","ä":"a",
    "e":"e","è":"e","é":"e","ê":"e","ë":"e",
    "i":"i","ì":"i","í":"i","î":"i","ï":"i",
    "o":"o","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o",
    "u":"u","ù":"u","ú":"u","û":"u","ü":"u",
    "ç":"c","ñ":"n"
  };

  function normalizeNome(s) {
    var lower = String(s || "").toLowerCase();
    var out = "";
    for (var i = 0; i < lower.length; i++) {
      var ch = lower.charAt(i);
      out += ACCENT_MAP[ch] || ch;
    }
    return out.trim();
  }

  // ===== NIF =====
  // NIF da GIOCO / Tribo Poética Unipessoal Lda: é o CLIENTE em todas as faturas,
  // por isso aparece sempre no texto e nunca pode ser tomado por fornecedor.
  var NIF_PROPRIO = "518717186";

  function soDigitos(s) {
    return String(s === null || s === undefined ? "" : s).replace(/\D+/g, "");
  }

  // Regra portuguesa: 9 dígitos, primeiro dígito ∈ {1,2,3,5,6,8,9}, check digit =
  // 11 − (Σ d[i] × (9−i), i=0..7) mod 11, com 0 quando o resto é 0 ou 1.
  function nifValido(n) {
    var d = soDigitos(n);
    if (d.length !== 9) return false;
    if ("1235689".indexOf(d.charAt(0)) === -1) return false;
    var soma = 0;
    for (var i = 0; i < 8; i++) soma += parseInt(d.charAt(i), 10) * (9 - i);
    var resto = soma % 11;
    var check = (resto === 0 || resto === 1) ? 0 : 11 - resto;
    return check === parseInt(d.charAt(8), 10);
  }

  // Limpeza do texto ANTES de qualquer procura de NIF (Set/2026, contra faturas
  // reais): sem isto, "PT50 0035 0325 0001 3261 130 97" (IBAN CGD) dava 500035032,
  // que PASSA no dígito de controlo. Tira IBANs (PT50 e forma genérica), as linhas
  // de ATCUD / programa certificado / Nº Interno e os números de 10+ dígitos
  // seguidos (EANs de artigo). Exportada para teste.
  function limparContentParaNifs(content) {
    var t = String(content || "");
    t = t.replace(/\bPT\s?50[\s\d]{19,30}/gi, " ");
    t = t.replace(/\b[A-Z]{2}\d{2}(?:\s?\d){10,30}\b/g, " ");
    t = t.replace(/^.*(?:ATCUD|Processado por programa certificado|N[ºo°.]?\s*Interno).*$/gim, " ");
    t = t.replace(/\d{10,}/g, " ");
    return t;
  }

  // Origens em que o NIF principal é de confiança suficiente para ser GRAVADO numa
  // ficha sem mais confirmação. 'generico' (única sequência de 9 dígitos solta) e
  // null só sugerem. 'manual' nunca sai de extrairNifs(): é a leitura-faturas.html
  // que o põe quando o NIF foi escrito à mão no modal de edição.
  var NIF_ORIGENS_CONFIAVEIS = ['vendorTaxId', 'etiqueta', 'pt', 'manual'];
  function nifOrigemConfiavel(origem) { return NIF_ORIGENS_CONFIAVEIS.indexOf(origem) !== -1; }

  // Devolve { nif, candidatos, origem }. Ambos os inputs podem faltar (ficheiro sem
  // texto, tenant que não devolve VendorTaxId): aí é { nif:null, candidatos:[], origem:null }.
  // PRIORIDADE do principal (pára no primeiro nível com um NIF válido ≠ NIF_PROPRIO):
  //   1. VendorTaxId do Azure                                 → 'vendorTaxId'
  //   2. etiqueta forte (N/Contribuinte, Contribuinte, NIPC, NIF, N.I.F., VAT) NÃO
  //      precedida de "V/" (V/Contribuinte é o cliente = nós)  → 'etiqueta'
  //   3. "PT" COLADO a 9 dígitos (PT516179934; nunca "PT " + espaço, que apanhava IBANs) → 'pt'
  //   4. passagem genérica \b\d{9}\b com EXACTAMENTE 1 candidato → 'generico'
  //   5. null, com todos os válidos em candidatos.
  // Dentro de um nível ganha o que aparece MAIS CEDO no content (o bloco do emissor
  // vem sempre antes do rodapé, onde vive o NIF do licenciado do software).
  function extrairNifs(analyzeResult, fields) {
    var vistos = {};
    var candidatos = [];

    function aceitar(bruto) {
      var d = soDigitos(bruto);
      if (!nifValido(d) || d === NIF_PROPRIO) return null;
      if (!vistos[d]) { vistos[d] = true; candidatos.push(d); }
      return d;
    }

    var principal = aceitar(fieldText(fields, 'VendorTaxId'));
    var origem = principal ? 'vendorTaxId' : null;

    var content = limparContentParaNifs(analyzeResult && typeof analyzeResult.content === 'string' ? analyzeResult.content : "");
    if (content) {
      var m, d;
      // (2) etiquetas fortes, por ordem de posição; "V/" à frente é o NIF do cliente.
      var reEtiqueta = /(V\s*[\/º°.]?\s*)?(?:N\s*[\/º°.]?\s*Contribuinte|Contribuinte|NIPC|N\.?I\.?F\.?|VAT\s*(?:No|Number)?)(?:\s*do\s+Cliente)?\s*[:.\-]?\s*(?:PT)?\s*((?:\d[\s.]?){9})/gi;
      while ((m = reEtiqueta.exec(content)) !== null) {
        d = aceitar(m[2]);
        if (d && !principal && !m[1] && !/do\s+Cliente/i.test(m[0])) { principal = d; origem = 'etiqueta'; }
      }
      // (3) PT colado a 9 dígitos.
      var rePt = /\bPT(\d{9})\b/g;
      while ((m = rePt.exec(content)) !== null) {
        d = aceitar(m[1]);
        if (d && !principal) { principal = d; origem = 'pt'; }
      }
      // (4) genérica: só entra como principal se for a única.
      var reSolto = /\b\d{9}\b/g;
      var genericos = [];
      while ((m = reSolto.exec(content)) !== null) {
        d = aceitar(m[0]);
        if (d && genericos.indexOf(d) === -1) genericos.push(d);
      }
      if (!principal && candidatos.length === 1) { principal = candidatos[0]; origem = 'generico'; }
    }

    return { nif: principal, candidatos: candidatos, origem: origem };
  }

  // ===== Unidades das linhas =====
  // normalizarUnidade('BX') → { unidade:'cx', unidadeBruta:'bx' }. Uma unidade que
  // não se reconhece NÃO se perde: fica unidadeBruta em minúsculas e unidade null.
  var UNIDADES = {
    kg:'kg', kgs:'kg', quilo:'kg', quilos:'kg', g:'g', gr:'g', grs:'g', grama:'g', gramas:'g',
    l:'l', lt:'l', ltr:'l', litro:'l', litros:'l', ml:'ml', cl:'cl',
    un:'un', uni:'un', und:'un', unid:'un', unidade:'un', unidades:'un', pc:'un', 'pç':'un', pcs:'un', 'pçs':'un',
    bx:'cx', box:'cx', cx:'cx', caixa:'cx', caixas:'cx',
    mo:'mo', em:'emb', emb:'emb',
    sc:'saco', saco:'saco', gf:'garrafa', garrafa:'garrafa', pct:'pacote', pacote:'pacote'
  };
  function normalizarUnidade(u) {
    var bruta = String(u === null || u === undefined ? "" : u).trim().toLowerCase().replace(/\.$/, "");
    if (!bruta) return { unidade: null, unidadeBruta: null };
    return { unidade: UNIDADES[bruta] || null, unidadeBruta: bruta };
  }

  // Lê da descrição o tamanho da embalagem e o nº de unidades por caixa.
  //   "FARINHA 0 NUVOLA 5KG CAPUTO"          → { unidade:'kg', tamanhoEmbalagem:5,   unidadesPorCaixa:null }
  //   "AGUA CALDAS PENACOVA 24X50CL"         → { unidade:'cl', tamanhoEmbalagem:50,  unidadesPorCaixa:24 }
  //   "LT UHT MG 1LT*6 ESTR ATLANTICO"       → { unidade:'l',  tamanhoEmbalagem:1,   unidadesPorCaixa:6 }  (formato invertido)
  //   "Stracciatella by Artigiana 500g *10"  → { unidade:'g',  tamanhoEmbalagem:500, unidadesPorCaixa:10 }
  //   "PORCHETTA 1/2"                        → null (não se adivinha)
  // O multiplicador é "x" OU "*" — as faturas reais usam "*".
  var RE_MEDIDA = 'kg|gr|g|lt|l|ml|cl';
  function inferirUnidadeDaDescricao(desc) {
    var t = String(desc || "");
    if (!t.trim()) return null;
    function num(s) { return parseFloat(String(s).replace(',', '.')); }
    var m;
    // N x TAMANHO UNIDADE  (24X50CL, 10 x 1,5 kg)
    m = new RegExp('(\\d+)\\s*[x*×]\\s*(\\d+[.,]?\\d*)\\s*(' + RE_MEDIDA + ')\\b', 'i').exec(t);
    if (m) return { unidade: normalizarUnidade(m[3]).unidade, tamanhoEmbalagem: num(m[2]), unidadesPorCaixa: parseInt(m[1], 10) };
    // TAMANHO UNIDADE x N  (1LT*6, 500g *10, 125GR*8)
    m = new RegExp('(\\d+[.,]?\\d*)\\s*(' + RE_MEDIDA + ')\\s*[x*×]\\s*(\\d+)\\b', 'i').exec(t);
    if (m) return { unidade: normalizarUnidade(m[2]).unidade, tamanhoEmbalagem: num(m[1]), unidadesPorCaixa: parseInt(m[3], 10) };
    // TAMANHO UNIDADE sozinho  (5KG, 250 g, 0,75L)
    m = new RegExp('(\\d+[.,]?\\d*)\\s*(' + RE_MEDIDA + ')\\b', 'i').exec(t);
    if (m) return { unidade: normalizarUnidade(m[2]).unidade, tamanhoEmbalagem: num(m[1]), unidadesPorCaixa: null };
    return null;
  }

  // allSuppliers = objeto {id: {nome, nif?, aliases?, ...}} tal como vem de suppliers/
  // opcoes (opcional) = { nif, nifCandidatos } vindos de ler().
  function findMatchingSupplierDetalhe(vendorName, allSuppliers, opcoes) {
    allSuppliers = allSuppliers || {};
    opcoes = opcoes || {};
    var ids = Object.keys(allSuppliers);

    // 1) NIF: o principal primeiro, depois os candidatos pela ordem em que apareceram.
    var nifs = [];
    if (opcoes.nif) nifs.push(soDigitos(opcoes.nif));
    (Array.isArray(opcoes.nifCandidatos) ? opcoes.nifCandidatos : []).forEach(function (c) {
      var d = soDigitos(c);
      if (d && nifs.indexOf(d) === -1) nifs.push(d);
    });
    for (var i = 0; i < nifs.length; i++) {
      if (!nifs[i] || nifs[i] === NIF_PROPRIO) continue;
      for (var j = 0; j < ids.length; j++) {
        var sNif = soDigitos(allSuppliers[ids[j]] && allSuppliers[ids[j]].nif);
        if (sNif && sNif === nifs[i]) return { id: ids[j], via: 'nif' };
      }
    }

    // 2) Nome: substring do nome normalizado, também contra os aliases.
    var norm = normalizeNome(vendorName);
    if (!norm) return { id: null, via: null };
    var candidates = [];
    ids.forEach(function (id) {
      var s = allSuppliers[id] || {};
      var nomes = [s.nome].concat(Array.isArray(s.aliases) ? s.aliases : []);
      var melhor = 0;
      nomes.forEach(function (nome) {
        var sNorm = normalizeNome(nome);
        if (!sNorm) return;
        if (norm.indexOf(sNorm) !== -1 || sNorm.indexOf(norm) !== -1) {
          if (sNorm.length > melhor) melhor = sNorm.length;
        }
      });
      if (melhor > 0) candidates.push({ id: id, tamanho: melhor });
    });
    if (candidates.length === 0) return { id: null, via: null };
    // O candidato com o nome (ou alias) mais longo é o match mais específico.
    candidates.sort(function (a, b) { return b.tamanho - a.tamanho; });
    return { id: candidates[0].id, via: 'nome' };
  }

  function findMatchingSupplier(vendorName, allSuppliers, opcoes) {
    return findMatchingSupplierDetalhe(vendorName, allSuppliers, opcoes).id;
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result || "";
        var comma = result.indexOf(',');
        resolve(comma === -1 ? result : result.substring(comma + 1));
      };
      reader.onerror = function () { reject(new Error('Não foi possível ler o ficheiro.')); };
      reader.readAsDataURL(file);
    });
  }

  // ===== Arquivo do ficheiro original (dataUrl comprimido) =====
  var ARQUIVO_MAX_WIDTH = 1600;
  var ARQUIVO_JPEG_QUALITY = 0.8;

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Não foi possível ler o ficheiro.')); };
      reader.readAsDataURL(file);
    });
  }

  function compressImageDataUrl(file, maxWidth, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          if (w > maxWidth) {
            h = Math.round(h * maxWidth / w);
            w = maxWidth;
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = function () { reject(new Error('Não foi possível processar a imagem.')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('Não foi possível ler o ficheiro.')); };
      reader.readAsDataURL(file);
    });
  }

  function prepararArquivoFatura(file) {
    if (file.type && file.type.indexOf('image/') === 0) {
      return compressImageDataUrl(file, ARQUIVO_MAX_WIDTH, ARQUIVO_JPEG_QUALITY);
    }
    return fileToDataUrl(file);
  }

  function abrirArquivoFatura(dataUrl) {
    var match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl || "");
    if (!match) {
      alert('Ficheiro original em formato inesperado.');
      return;
    }
    var mime = match[1];
    var byteChars = atob(match[2]);
    var byteNumbers = new Array(byteChars.length);
    for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    var blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
    var blobUrl = URL.createObjectURL(blob);

    if (mime === 'application/pdf') {
      window.open(blobUrl, '_blank');
    } else {
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'fatura-original.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 60000);
  }

  // ===== Rate limit do Azure F0 (Set/2026) =====
  // O tier F0 aceita ~1 pedido por segundo; acima disso responde HTTP 429. Política
  // ÚNICA de retry, partilhada por analyzeInvoice (polling) e pelo gioco-nif-backfill.js
  // (pedido inicial): até 4 tentativas com esperas 2 s, 5 s, 12 s, 30 s; se a resposta
  // trouxer Retry-After, usa-se esse valor em vez do backoff, com tecto de 60 s. Só o
  // 429 é recuperável — 400/403/ficheiro corrompido falham à primeira.
  var RETRY_429 = { tentativas: 4, esperasMs: [2000, 5000, 12000, 30000], tetoRetryAfterMs: 60000 };

  function erroHttp(mensagem, status, retryAfter) {
    var e = new Error(mensagem);
    e.status = status;
    var ra = parseFloat(retryAfter);
    e.retryAfterMs = (retryAfter !== null && retryAfter !== undefined && !isNaN(ra)) ? Math.max(0, ra * 1000) : null;
    return e;
  }

  // Quanto esperar antes da tentativa seguinte (1-based: tentativa = a que acabou de
  // falhar). null = não repetir (não é 429, ou esgotou).
  function esperaRetry429(err, tentativa) {
    if (!err || err.status !== 429) return null;
    if (tentativa >= RETRY_429.tentativas) return null;
    if (typeof err.retryAfterMs === 'number') return Math.min(err.retryAfterMs, RETRY_429.tetoRetryAfterMs);
    return RETRY_429.esperasMs[Math.min(tentativa - 1, RETRY_429.esperasMs.length - 1)];
  }

  // opts (opcional): { sleep(ms), onEspera({ms, tentativa, fase}) } — o sleep injectável
  // é para os testes; onEspera alimenta o indicador de progresso da página.
  async function analyzeInvoice(file, opts) {
    opts = opts || {};
    var dormir = opts.sleep || sleep;
    var onEspera = opts.onEspera || function () {};
    var base64 = await fileToBase64(file);
    var analyzeUrl = AZURE_ENDPOINT + "documentintelligence/documentModels/" + AZURE_MODEL_ID +
      ":analyze?api-version=" + AZURE_API_VERSION;

    var postResp = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': AZURE_KEY
      },
      body: JSON.stringify({ base64Source: base64 })
    });

    if (postResp.status !== 202) {
      // O 429 no POST não é repetido AQUI: quem chama decide (o backfill repete com a
      // mesma política; o upload manual mostra o erro). Vai com status e Retry-After.
      var ePost = erroHttp('Pedido inicial ao Azure falhou (HTTP ' + postResp.status + ')', postResp.status, postResp.headers.get('Retry-After'));
      ePost.fase = 'post';
      throw ePost;
    }

    var operationLocation = postResp.headers.get('Operation-Location') || postResp.headers.get('operation-location');
    if (!operationLocation) {
      throw new Error('Resposta do Azure sem Operation-Location.');
    }

    var start = Date.now();
    var tentativas429 = 0;
    while (true) {
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        throw new Error('Tempo limite excedido a ler a fatura.');
      }
      await dormir(POLL_INTERVAL_MS);

      var pollResp = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY }
      });
      if (pollResp.status === 429) {
        // A análise JÁ está a correr no Azure (a página já contou): repetir o GET com
        // backoff é o que evita reiniciar e gastar outra página.
        tentativas429++;
        var e429 = erroHttp('Erro a consultar o resultado (HTTP 429)', 429, pollResp.headers.get('Retry-After'));
        var espera = esperaRetry429(e429, tentativas429);
        if (espera === null) { e429.fase = 'poll'; e429.esgotado = true; throw e429; }
        onEspera({ ms: espera, tentativa: tentativas429 + 1, fase: 'poll' });
        await dormir(espera);
        start = Date.now(); // a espera do rate limit não conta para o timeout da análise
        continue;
      }
      if (!pollResp.ok) {
        throw erroHttp('Erro a consultar o resultado (HTTP ' + pollResp.status + ')', pollResp.status, null);
      }
      var pollJson = await pollResp.json();
      if (pollJson.status === 'succeeded') return pollJson.analyzeResult;
      if (pollJson.status === 'failed') throw new Error('A análise da fatura falhou no Azure.');
      // running / notStarted -> continua a fazer polling
    }
  }

  function fieldText(fields, name) {
    var f = fields && fields[name];
    if (!f) return "";
    return f.valueString || f.content || "";
  }

  function fieldDateIso(fields, name) {
    var f = fields && fields[name];
    if (!f) return "";
    return f.valueDate || "";
  }

  function fieldAmount(fields, name) {
    var f = fields && fields[name];
    if (!f) return null;
    if (f.valueCurrency && typeof f.valueCurrency.amount === 'number') return f.valueCurrency.amount;
    if (typeof f.valueNumber === 'number') return f.valueNumber;
    return null;
  }

  function extrairLinhas(fields) {
    var itemsField = fields && fields.Items;
    if (!itemsField || !itemsField.valueArray) return [];
    return itemsField.valueArray.map(function (item) {
      var obj = item.valueObject || {};
      return {
        descricao: fieldText(obj, 'Description'),
        quantidade: (obj.Quantity && typeof obj.Quantity.valueNumber === 'number') ? obj.Quantity.valueNumber : null,
        precoUnitario: fieldAmount(obj, 'UnitPrice'),
        montante: fieldAmount(obj, 'Amount'),
        unidade: normalizarUnidade(fieldText(obj, 'Unit')).unidade,
        unidadeBruta: normalizarUnidade(fieldText(obj, 'Unit')).unidadeBruta,
        embalagem: inferirUnidadeDaDescricao(fieldText(obj, 'Description')),
        ingredienteId: null
      };
    });
  }

  // Só chama o Azure e extrai. Não escreve em lado nenhum.
  // Strings vazias ficam "" (como o Azure as devolve); montante null quando não há.
  async function ler(file, opts) {
    var analyzeResult = await analyzeInvoice(file, opts);
    var doc = analyzeResult && analyzeResult.documents && analyzeResult.documents[0];
    var fields = (doc && doc.fields) || (analyzeResult && analyzeResult.fields) || {};
    var nifs = extrairNifs(analyzeResult, fields);
    var conteudo = (analyzeResult && typeof analyzeResult.content === 'string') ? analyzeResult.content : "";
    var paginas = (analyzeResult && Array.isArray(analyzeResult.pages)) ? analyzeResult.pages.length : null;
    return {
      fornecedorTexto: fieldText(fields, 'VendorName'),
      montante: fieldAmount(fields, 'InvoiceTotal'),
      referencia: fieldText(fields, 'InvoiceId'),
      data: fieldDateIso(fields, 'InvoiceDate'),
      prazoPagamento: fieldDateIso(fields, 'DueDate'),
      linhas: extrairLinhas(fields),
      nif: nifs.nif,
      nifCandidatos: nifs.candidatos,
      nifOrigem: nifs.origem,
      paginas: paginas,
      multiPagina: detetarMultiPagina(paginas, conteudo)
    };
  }

  // Fatura com mais de uma página, ou com marcas de continuação ("A transportar",
  // "Folha Nº 1 de 2") — o InvoiceTotal pode ser o transporte da 1.ª folha, não o total.
  function detetarMultiPagina(paginas, content) {
    if (typeof paginas === 'number' && paginas > 1) return true;
    return /A\s+transportar|Folha\s*N[ºo°.]?\s*\d+\s*de\s*\d+|P[áa]gina\s*\d+\s*de\s*[2-9]\d*/i.test(String(content || ""));
  }

  global.GiocoFaturas = {
    AZURE_ENDPOINT: AZURE_ENDPOINT,
    AZURE_KEY: AZURE_KEY,
    AZURE_API_VERSION: AZURE_API_VERSION,
    AZURE_MODEL_ID: AZURE_MODEL_ID,
    ler: ler,
    analyzeInvoice: analyzeInvoice,
    RETRY_429: RETRY_429,
    esperaRetry429: esperaRetry429,
    erroHttp: erroHttp,
    fieldText: fieldText,
    fieldDateIso: fieldDateIso,
    fieldAmount: fieldAmount,
    extrairLinhas: extrairLinhas,
    fileToBase64: fileToBase64,
    fileToDataUrl: fileToDataUrl,
    compressImageDataUrl: compressImageDataUrl,
    prepararArquivoFatura: prepararArquivoFatura,
    abrirArquivoFatura: abrirArquivoFatura,
    normalizeNome: normalizeNome,
    NIF_PROPRIO: NIF_PROPRIO,
    soDigitos: soDigitos,
    nifValido: nifValido,
    limparContentParaNifs: limparContentParaNifs,
    NIF_ORIGENS_CONFIAVEIS: NIF_ORIGENS_CONFIAVEIS,
    nifOrigemConfiavel: nifOrigemConfiavel,
    extrairNifs: extrairNifs,
    normalizarUnidade: normalizarUnidade,
    inferirUnidadeDaDescricao: inferirUnidadeDaDescricao,
    detetarMultiPagina: detetarMultiPagina,
    findMatchingSupplierDetalhe: findMatchingSupplierDetalhe,
    findMatchingSupplier: findMatchingSupplier
  };
})(window);
