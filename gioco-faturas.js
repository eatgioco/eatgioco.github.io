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
     GiocoFaturas.ler(file)
       → Promise<{ fornecedorTexto, montante, referencia, data, prazoPagamento, linhas,
                   nif (string|null), nifCandidatos (string[]) }>
     GiocoFaturas.analyzeInvoice(file)            → Promise<analyzeResult> (bruto do Azure)
     GiocoFaturas.fieldText / fieldDateIso / fieldAmount / extrairLinhas
     GiocoFaturas.fileToBase64 / fileToDataUrl / compressImageDataUrl
     GiocoFaturas.prepararArquivoFatura(file)     → Promise<dataUrl> (imagem comprimida ou PDF tal e qual)
     GiocoFaturas.abrirArquivoFatura(dataUrl)     → abre/descarrega o original
     GiocoFaturas.normalizeNome(s)
     GiocoFaturas.NIF_PROPRIO                     → "518717186" (Tribo Poética / GIOCO — é o
                                                    cliente em TODAS as faturas; nunca é candidato)
     GiocoFaturas.soDigitos(s)                    → só os dígitos da string
     GiocoFaturas.nifValido(n)                    → 9 dígitos, 1.º ∈ {1,2,3,5,6,8,9}, check digit mod 11
     GiocoFaturas.extrairNifs(analyzeResult, fields)
       → { nif: string|null, candidatos: string[] } — VendorTaxId primeiro; depois
         varre analyzeResult.content (rótulo NIF/NIPC/Contribuinte/VAT/PT + 9 dígitos,
         e por fim qualquer \b\d{9}\b), valida, exclui o NIF_PROPRIO, dedupe por ordem.
         Sem VendorTaxId válido e com exactamente 1 candidato → esse é o nif.
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

  // Devolve { nif, candidatos }. Ambos os inputs podem faltar (ficheiro sem texto,
  // tenant que não devolve VendorTaxId): aí é { nif:null, candidatos:[] }.
  function extrairNifs(analyzeResult, fields) {
    var principal = null;
    var vistos = {};
    var candidatos = [];

    function aceitar(bruto) {
      var d = soDigitos(bruto);
      if (!nifValido(d) || d === NIF_PROPRIO || vistos[d]) return null;
      vistos[d] = true;
      candidatos.push(d);
      return d;
    }

    var vendorTax = aceitar(fieldText(fields, 'VendorTaxId'));
    if (vendorTax) principal = vendorTax;

    var content = analyzeResult && typeof analyzeResult.content === 'string' ? analyzeResult.content : "";
    if (content) {
      // (a) com rótulo — mais fiável, por isso entra primeiro na ordem
      var reRotulo = /(?:NIF|NIPC|N\.?I\.?F|Contribuinte|VAT|PT)\s*[:.\-]?\s*((?:\d[\s.]?){9})/gi;
      var m;
      while ((m = reRotulo.exec(content)) !== null) aceitar(m[1]);
      // (b) qualquer sequência de 9 dígitos isolada
      var reSolto = /\b\d{9}\b/g;
      while ((m = reSolto.exec(content)) !== null) aceitar(m[0]);
    }

    if (!principal && candidatos.length === 1) principal = candidatos[0];
    return { nif: principal, candidatos: candidatos };
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

  async function analyzeInvoice(file) {
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
      throw new Error('Pedido inicial ao Azure falhou (HTTP ' + postResp.status + ')');
    }

    var operationLocation = postResp.headers.get('Operation-Location') || postResp.headers.get('operation-location');
    if (!operationLocation) {
      throw new Error('Resposta do Azure sem Operation-Location.');
    }

    var start = Date.now();
    while (true) {
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        throw new Error('Tempo limite excedido a ler a fatura.');
      }
      await sleep(POLL_INTERVAL_MS);

      var pollResp = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY }
      });
      if (!pollResp.ok) {
        throw new Error('Erro a consultar o resultado (HTTP ' + pollResp.status + ')');
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
        ingredienteId: null
      };
    });
  }

  // Só chama o Azure e extrai. Não escreve em lado nenhum.
  // Strings vazias ficam "" (como o Azure as devolve); montante null quando não há.
  async function ler(file) {
    var analyzeResult = await analyzeInvoice(file);
    var doc = analyzeResult && analyzeResult.documents && analyzeResult.documents[0];
    var fields = (doc && doc.fields) || (analyzeResult && analyzeResult.fields) || {};
    var nifs = extrairNifs(analyzeResult, fields);
    return {
      fornecedorTexto: fieldText(fields, 'VendorName'),
      montante: fieldAmount(fields, 'InvoiceTotal'),
      referencia: fieldText(fields, 'InvoiceId'),
      data: fieldDateIso(fields, 'InvoiceDate'),
      prazoPagamento: fieldDateIso(fields, 'DueDate'),
      linhas: extrairLinhas(fields),
      nif: nifs.nif,
      nifCandidatos: nifs.candidatos
    };
  }

  global.GiocoFaturas = {
    AZURE_ENDPOINT: AZURE_ENDPOINT,
    AZURE_KEY: AZURE_KEY,
    AZURE_API_VERSION: AZURE_API_VERSION,
    AZURE_MODEL_ID: AZURE_MODEL_ID,
    ler: ler,
    analyzeInvoice: analyzeInvoice,
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
    extrairNifs: extrairNifs,
    findMatchingSupplierDetalhe: findMatchingSupplierDetalhe,
    findMatchingSupplier: findMatchingSupplier
  };
})(window);
