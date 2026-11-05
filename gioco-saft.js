/* gioco-saft.js — a ÚNICA implementação da importação do SAF-T do ZoneSoft.
 *
 * Consumidores (Nov/2026):
 *   · vendas.html            — carrega este ficheiro por <script>
 *   · Worker do Jarvis       — cópia BYTE A BYTE em secretaria/src/gioco-saft.js
 *                              (verifica-saft.sh compara o SHA-256 e trava o deploy)
 *
 * A fonte canónica é ESTE ficheiro, no repositório do GIOCO OS. Nunca se edita
 * a cópia do Worker. Antes de qualquer push que lhe toque:
 *     node testes/saft-paridade.js
 *
 * Tudo aqui é PURO: recebe dados, devolve dados. Não há rede, Firebase, DOM,
 * relógio nem bibliotecas — o mesmo código corre no browser, no Worker da
 * Cloudflare e no Node. Por isso o ZIP é descomprimido e o Windows-1252 é
 * descodificado aqui dentro, e o XML é lido por um leitor próprio (o Worker
 * não tem DOMParser, e duas formas de ler o mesmo ficheiro são duas formas de
 * errar).
 *
 * API:
 *   GiocoSaft.lerFicheiro(bytes, nome)   → { texto, xmlNome }   (.zip ou .xml)
 *   GiocoSaft.parse(xmlString)           → documentos por dia de operação
 *   GiocoSaft.diaOperacao(documento)     → 'AAAA-MM-DD'
 *   GiocoSaft.leiturasNecessarias(parsed)→ { dias, meses } a ler do Firebase
 *   GiocoSaft.produtosNovos(parsed, catalogo) → produtos fora do catálogo
 *   GiocoSaft.construirPayload(parsed, estadoAtual, meta) → { escritas, resumo }
 */
(function(raiz){
  'use strict';

  /* =========================================================
     ZIP — só o que um SAF-T exportado precisa: um ficheiro, guardado (0) ou
     deflate (8). Sem ZIP64, sem cifra.
     ========================================================= */
  function paraBytes(dados){
    if (dados instanceof Uint8Array) return dados;
    if (dados && dados.buffer instanceof ArrayBuffer){
      return new Uint8Array(dados.buffer, dados.byteOffset || 0, dados.byteLength);
    }
    return new Uint8Array(dados);
  }

  function u16(b, i){ return b[i] | (b[i + 1] << 8); }
  function u32(b, i){ return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }

  var ERRO_ZIP = 'O ZIP está corrompido ou incompleto — volta a exportar o SAF-T do ZoneSoft.';

  var TABELA_CRC = null;
  function crc32(b){
    var t = TABELA_CRC;
    if (!t){
      t = TABELA_CRC = new Int32Array(256);
      for (var n = 0; n < 256; n++){
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c;
      }
    }
    var crc = -1;
    for (var i = 0; i < b.length; i++) crc = t[(crc ^ b[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  }

  var ORDEM_CL = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  var COMP_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var COMP_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  var DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

  /* Tabela de Huffman canónica (contagens por comprimento + símbolos por ordem). */
  function huffman(comprimentos, n){
    var conta = new Uint16Array(16), simbolos = new Uint16Array(n), desloc = new Uint16Array(16);
    var i;
    for (i = 0; i < n; i++) conta[comprimentos[i]]++;
    conta[0] = 0;
    for (i = 1; i < 15; i++) desloc[i + 1] = desloc[i] + conta[i];
    for (i = 0; i < n; i++){
      if (comprimentos[i]) simbolos[desloc[comprimentos[i]]++] = i;
    }
    return { conta: conta, simbolos: simbolos };
  }

  var FIXO_LIT = null, FIXO_DIST = null;

  /* Inflate (RFC 1951). `tamanho` é o tamanho descomprimido que o ZIP declara. */
  function inflar(src, tamanho){
    var out = new Uint8Array(tamanho);
    var op = 0, ip = 0, acum = 0, nbits = 0;

    function bits(n){
      while (nbits < n){
        if (ip >= src.length) throw new Error(ERRO_ZIP);
        acum |= src[ip++] << nbits;
        nbits += 8;
      }
      var v = acum & ((1 << n) - 1);
      acum >>>= n;
      nbits -= n;
      return v;
    }

    function simbolo(h){
      var codigo = 0, primeiro = 0, indice = 0;
      for (var len = 1; len <= 15; len++){
        codigo |= bits(1);
        var conta = h.conta[len];
        if (codigo - conta < primeiro) return h.simbolos[indice + (codigo - primeiro)];
        indice += conta;
        primeiro += conta;
        primeiro <<= 1;
        codigo <<= 1;
      }
      throw new Error(ERRO_ZIP);
    }

    function bloco(lit, dist){
      for (;;){
        var s = simbolo(lit);
        if (s < 256){
          if (op >= tamanho) throw new Error(ERRO_ZIP);
          out[op++] = s;
        } else if (s === 256){
          return;
        } else {
          s -= 257;
          if (s >= 29) throw new Error(ERRO_ZIP);
          var comp = COMP_BASE[s] + bits(COMP_EXTRA[s]);
          var ds = simbolo(dist);
          if (ds >= 30) throw new Error(ERRO_ZIP);
          var d = DIST_BASE[ds] + bits(DIST_EXTRA[ds]);
          if (d > op || op + comp > tamanho) throw new Error(ERRO_ZIP);
          for (var k = 0; k < comp; k++){ out[op] = out[op - d]; op++; }
        }
      }
    }

    var ultimo;
    do {
      ultimo = bits(1);
      var tipo = bits(2);
      if (tipo === 0){
        acum = 0; nbits = 0;
        if (ip + 4 > src.length) throw new Error(ERRO_ZIP);
        var len = u16(src, ip), nlen = u16(src, ip + 2);
        ip += 4;
        if ((len ^ 0xFFFF) !== nlen || ip + len > src.length || op + len > tamanho) throw new Error(ERRO_ZIP);
        out.set(src.subarray(ip, ip + len), op);
        ip += len; op += len;
      } else if (tipo === 1){
        if (!FIXO_LIT){
          var cl = new Uint8Array(288), j;
          for (j = 0; j < 144; j++) cl[j] = 8;
          for (; j < 256; j++) cl[j] = 9;
          for (; j < 280; j++) cl[j] = 7;
          for (; j < 288; j++) cl[j] = 8;
          FIXO_LIT = huffman(cl, 288);
          var cd = new Uint8Array(30);
          for (j = 0; j < 30; j++) cd[j] = 5;
          FIXO_DIST = huffman(cd, 30);
        }
        bloco(FIXO_LIT, FIXO_DIST);
      } else if (tipo === 2){
        var nlit = bits(5) + 257, ndist = bits(5) + 1, ncod = bits(4) + 4;
        if (nlit > 286 || ndist > 30) throw new Error(ERRO_ZIP);
        var comps = new Uint8Array(320), i;
        for (i = 0; i < ncod; i++) comps[ORDEM_CL[i]] = bits(3);
        var hcl = huffman(comps.subarray(0, 19), 19);
        var todos = new Uint8Array(nlit + ndist);
        i = 0;
        while (i < nlit + ndist){
          var s2 = simbolo(hcl);
          if (s2 < 16){ todos[i++] = s2; continue; }
          var rep, val = 0;
          if (s2 === 16){
            if (!i) throw new Error(ERRO_ZIP);
            val = todos[i - 1];
            rep = 3 + bits(2);
          } else if (s2 === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          if (i + rep > nlit + ndist) throw new Error(ERRO_ZIP);
          while (rep--) todos[i++] = val;
        }
        bloco(huffman(todos.subarray(0, nlit), nlit), huffman(todos.subarray(nlit), ndist));
      } else {
        throw new Error(ERRO_ZIP);
      }
    } while (!ultimo);

    if (op !== tamanho) throw new Error(ERRO_ZIP);
    return out;
  }

  /* Devolve o PRIMEIRO .xml do ZIP (pela ordem do directório central). */
  function primeiroXmlDoZip(b){
    var fim = -1;
    for (var i = b.length - 22; i >= 0 && i >= b.length - 22 - 65535; i--){
      if (b[i] === 0x50 && b[i + 1] === 0x4B && b[i + 2] === 0x05 && b[i + 3] === 0x06){ fim = i; break; }
    }
    if (fim < 0) throw new Error(ERRO_ZIP);
    var total = u16(b, fim + 10);
    var p = u32(b, fim + 16);

    for (var n = 0; n < total; n++){
      if (p + 46 > b.length || u32(b, p) !== 0x02014B50) throw new Error(ERRO_ZIP);
      var flags = u16(b, p + 8), metodo = u16(b, p + 10);
      var crc = u32(b, p + 16), tamComp = u32(b, p + 20), tamReal = u32(b, p + 24);
      var nNome = u16(b, p + 28), nExtra = u16(b, p + 30), nComent = u16(b, p + 32);
      var local = u32(b, p + 42);
      var nome = '';
      for (var c = 0; c < nNome; c++) nome += String.fromCharCode(b[p + 46 + c]);
      p += 46 + nNome + nExtra + nComent;

      if (/\/$/.test(nome) || !/\.xml$/i.test(nome)) continue;

      if (flags & 1) throw new Error('O ZIP está protegido por palavra-passe.');
      if (tamComp === 0xFFFFFFFF || tamReal === 0xFFFFFFFF || local === 0xFFFFFFFF) throw new Error(ERRO_ZIP);
      if (local + 30 > b.length || u32(b, local) !== 0x04034B50) throw new Error(ERRO_ZIP);
      var inicio = local + 30 + u16(b, local + 26) + u16(b, local + 28);
      if (inicio + tamComp > b.length) throw new Error(ERRO_ZIP);
      var dados = b.subarray(inicio, inicio + tamComp);

      var saida;
      if (metodo === 0) saida = dados;
      else if (metodo === 8) saida = inflar(dados, tamReal);
      else throw new Error('O ZIP usa um método de compressão que não é suportado (' + metodo + ').');
      if (saida.length !== tamReal || crc32(saida) !== crc) throw new Error(ERRO_ZIP);
      return { buffer: saida, xmlNome: nome };
    }
    throw new Error('O ZIP não contém nenhum ficheiro .xml.');
  }

  /* O que a página fazia em lerFicheiro(): é ZIP se o nome acabar em .zip ou
     se os dois primeiros bytes forem 'PK'; senão o ficheiro É o XML. */
  function extrairXml(dados, nome){
    var b = paraBytes(dados);
    nome = nome || '';
    var ehZip = /\.zip$/i.test(nome) || (b[0] === 0x50 && b[1] === 0x4B);
    if (!ehZip) return { buffer: b, xmlNome: nome };
    return primeiroXmlDoZip(b);
  }

  /* =========================================================
     Descodificação — o SAF-T do ZoneSoft vem em Windows-1252 (ler como UTF-8
     corrompe os acentos). Tabela do WHATWG, igual à do TextDecoder do browser.
     Se o XML se declarar UTF-8, respeita-se a declaração.
     ========================================================= */
  var CP1252_ALTO = [
    0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
    0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178
  ];

  function deWindows1252(b, ate){
    var fim = (ate === undefined || ate > b.length) ? b.length : ate;
    var partes = [], bloco = new Uint16Array(8192);
    for (var i = 0; i < fim; i += 8192){
      var n = Math.min(8192, fim - i);
      for (var j = 0; j < n; j++){
        var c = b[i + j];
        bloco[j] = (c >= 0x80 && c <= 0x9F) ? CP1252_ALTO[c - 0x80] : c;
      }
      partes.push(String.fromCharCode.apply(null, n === 8192 ? bloco : bloco.subarray(0, n)));
    }
    return partes.join('');
  }

  function descodificar(dados){
    var b = paraBytes(dados);
    var m = deWindows1252(b, 200).match(/encoding=["']([^"']+)["']/i);
    if (m && /utf-?8/i.test(m[1])){
      try { return new TextDecoder('utf-8').decode(b); } catch (e2){}
    }
    return deWindows1252(b);
  }

  function lerFicheiro(dados, nome){
    var res = extrairXml(dados, nome);
    return { texto: descodificar(res.buffer), xmlNome: res.xmlNome };
  }

  /* =========================================================
     XML — leitor mínimo, com a mesma face que o código da importação usava
     do DOM: localName (sem prefixo), firstElementChild, nextElementSibling e
     textContent. Rejeita XML mal formado, como o DOMParser.
     ========================================================= */
  function NoXml(nome){
    var dp = nome.indexOf(':');
    this.localName = dp >= 0 ? nome.slice(dp + 1) : nome;
    this.nomeCompleto = nome;
    this.firstElementChild = null;
    this.nextElementSibling = null;
    this.ultimoFilho = null;
    this.partes = null;     // texto e elementos filhos, pela ordem do documento
  }
  Object.defineProperty(NoXml.prototype, 'textContent', {
    get: function(){
      if (!this.partes) return '';
      var s = '';
      for (var i = 0; i < this.partes.length; i++){
        var p = this.partes[i];
        s += (typeof p === 'string') ? p : p.textContent;
      }
      return s;
    }
  });

  var ENTIDADES = { lt:'<', gt:'>', amp:'&', quot:'"', apos:"'" };

  function semEntidades(s){
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&([^;&<]*);?/g, function(tudo, corpo){
      if (tudo.charAt(tudo.length - 1) !== ';') throw new Error(ERRO_FICHEIRO_INVALIDO);
      if (Object.prototype.hasOwnProperty.call(ENTIDADES, corpo)) return ENTIDADES[corpo];
      var m = /^#(?:x([0-9a-fA-F]+)|([0-9]+))$/.exec(corpo);
      if (!m) throw new Error(ERRO_FICHEIRO_INVALIDO);
      var cp = m[1] ? parseInt(m[1], 16) : parseInt(m[2], 10);
      if (!(cp > 0 && cp <= 0x10FFFF)) throw new Error(ERRO_FICHEIRO_INVALIDO);
      return String.fromCodePoint(cp);
    });
  }

  var RE_NOME_XML = /^[A-Za-z_:À-￿][-A-Za-z0-9_:.·À-￿]*$/;
  var RE_ATRIBUTOS = /^(?:\s+[A-Za-z_:À-￿][-A-Za-z0-9_:.·À-￿]*\s*=\s*(?:"[^<"]*"|'[^<']*'))*\s*$/;

  function lerXml(texto){
    function falha(){ throw new Error(ERRO_FICHEIRO_INVALIDO); }
    if (typeof texto !== 'string') falha();
    if (texto.indexOf('\r') >= 0) texto = texto.replace(/\r\n?/g, '\n');

    var i = 0, n = texto.length;
    var raiz = null, pilha = [], actual = null, fechado = false;

    function juntarTexto(s){
      if (!actual){
        if (/\S/.test(s)) falha();      // texto fora do elemento raiz
        return;
      }
      (actual.partes || (actual.partes = [])).push(s);
    }

    if (texto.charCodeAt(0) === 0xFEFF) i = 1;

    while (i < n){
      var lt = texto.indexOf('<', i);
      if (lt < 0){
        juntarTexto(semEntidades(texto.slice(i)));
        i = n;
        break;
      }
      if (lt > i) juntarTexto(semEntidades(texto.slice(i, lt)));

      var c = texto.charAt(lt + 1), fim;
      if (c === '?'){
        fim = texto.indexOf('?>', lt + 2);
        if (fim < 0) falha();
        // A declaração <?xml …?> só pode estar no início absoluto do documento.
        if (/^<\?xml[\s?]/i.test(texto.substr(lt, 6)) && lt !== (texto.charCodeAt(0) === 0xFEFF ? 1 : 0)) falha();
        i = fim + 2;
      } else if (c === '!'){
        if (texto.substr(lt, 4) === '<!--'){
          fim = texto.indexOf('-->', lt + 4);
          if (fim < 0) falha();
          i = fim + 3;
        } else if (texto.substr(lt, 9) === '<![CDATA['){
          if (!actual) falha();
          fim = texto.indexOf(']]>', lt + 9);
          if (fim < 0) falha();
          juntarTexto(texto.slice(lt + 9, fim));
          i = fim + 3;
        } else if (texto.substr(lt, 9) === '<!DOCTYPE'){
          if (raiz) falha();
          // DOCTYPE sem subconjunto interno; com ele, não é um SAF-T — rejeita-se.
          fim = texto.indexOf('>', lt);
          if (fim < 0 || texto.slice(lt, fim).indexOf('[') >= 0) falha();
          i = fim + 1;
        } else falha();
      } else if (c === '/'){
        fim = texto.indexOf('>', lt + 2);
        if (fim < 0 || !actual) falha();
        var nomeFecho = texto.slice(lt + 2, fim).replace(/\s+$/, '');
        if (nomeFecho !== actual.nomeCompleto) falha();
        pilha.pop();
        actual = pilha.length ? pilha[pilha.length - 1] : null;
        if (!actual) fechado = true;
        i = fim + 1;
      } else {
        // Tag de abertura: o '>' que a fecha é o primeiro fora de aspas.
        fim = lt + 1;
        var aspa = '';
        for (; fim < n; fim++){
          var ch = texto.charAt(fim);
          if (aspa){ if (ch === aspa) aspa = ''; }
          else if (ch === '"' || ch === "'") aspa = ch;
          else if (ch === '>') break;
          else if (ch === '<') falha();
        }
        if (fim >= n) falha();
        var dentro = texto.slice(lt + 1, fim);
        var auto = dentro.charAt(dentro.length - 1) === '/';
        if (auto) dentro = dentro.slice(0, -1);
        var mNome = /^[^\s]+/.exec(dentro);
        if (!mNome || !RE_NOME_XML.test(mNome[0])) falha();
        var resto = dentro.slice(mNome[0].length);
        if (resto && !RE_ATRIBUTOS.test(resto)) falha();
        if (resto.indexOf('&') >= 0) semEntidades(resto);   // entidades inválidas em atributos também rejeitam

        if (fechado) falha();             // segundo elemento raiz
        var no = new NoXml(mNome[0]);
        if (actual){
          if (actual.ultimoFilho) actual.ultimoFilho.nextElementSibling = no;
          else actual.firstElementChild = no;
          actual.ultimoFilho = no;
          (actual.partes || (actual.partes = [])).push(no);
        } else {
          raiz = no;
        }
        if (!auto){ pilha.push(no); actual = no; }
        else if (!actual) fechado = true;
        i = fim + 1;
      }
    }

    if (!raiz || pilha.length) falha();
    return { documentElement: raiz };
  }

  /* =========================================================
     Lógica da importação — transplantada, tal e qual, da vendas.html
     (Nov/2026). Qualquer alteração aqui muda o que a página E o Jarvis
     gravam: corre node testes/saft-paridade.js antes de qualquer push.
     ========================================================= */
  // Único texto de erro para "este ficheiro não é um SAF-T" — usado tanto pelo parser
  // (XML ilegível) como pela validação de extensão à entrada.
  var ERRO_FICHEIRO_INVALIDO = 'O XML não é válido (erro de parse). Confirma que o ficheiro é o SAF-T exportado do ZoneSoft.';

  /* Cada dia guarda mais pares do que o mês mostra: o mês soma os tops de cada
     dia, por isso um top curto por dia deitaria fora pares que só somados
     chegariam ao top 30 do mês. O nó do mês continua a ter 30. */
  var PARES_POR_DIA = 200;

  // As chaves do Firebase não aceitam . # $ / [ ] — a conversão é feita uma só vez,
  // no parse, e é essa chave que serve para gravar e para consultar o catálogo.
  function keyFor(code){
    var k = String(code == null ? '' : code).trim().replace(/[.#$/\[\]]/g, '_');
    return k === '' ? 'SEM_CODIGO' : k;
  }

  function semAcentos(txt){
    return String(txt || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  /* Regras de sugestão, por ordem: a primeira que bate ganha. São nomes de
     produto concretos, não palavras genéricas — regras genéricas já nos
     enganaram nos Maritozzi (o "maritozzo" é o formato do pão, não o tipo de
     prato: há dois salgados e dois doces).

     Cada regra tem `cat`/`sub` e uma de:
       prefixo — o nome tem de COMEÇAR por este texto
       termos  — o nome contém qualquer um destes textos
       regex   — testado contra o nome já sem acentos

     Tudo é comparado sem acentos e em minúsculas ("AL RAGÚ" -> "al ragu"),
     porque o ZoneSoft escreve "Caffe", "Caffé", "Agua" e "Água". */
  var REGRAS_SUGESTAO = [
    /* Variantes de happy-hour primeiro, com correspondência exacta. Têm de vir
       ANTES das genéricas: "happy somersby" bateria em 'somersby' (Cerveja e
       Cidra por acaso certo, mas por acidente), e "happy imperial"/"happy wine"
       não bateriam em regra nenhuma. "imperial" é o termo PT para copo de
       cerveja de pressão. */
    { termos:['happy imperial', 'happy somersby'], cat:'Bebida', sub:'Cerveja e Cidra' },
    { termos:['happy wine'],                       cat:'Bebida', sub:'Vinho' },

    /* Comida */
    { prefixo:'focaccia',                          cat:'Comida', sub:'Focaccia' },
    { termos:['maritozzo mortadella',
              'maritozzo al ragu'],                cat:'Comida', sub:'Maritozzo Salgado' },
    { termos:['maritozzo nutella', 'maritozzo panna',
              'panna e albicocca'],                cat:'Comida', sub:'Maritozzo Doce' },
    { termos:['polenta fritta', 'olive verdi'],    cat:'Comida', sub:'Side' },
    { termos:['extra'],                            cat:'Comida', sub:'Extra' },

    /* Bebida. "Chá da Casa" está no menu na secção SOFTS, ao lado da Coca-Cola:
       é bebida fria, não bebida quente. Fronteira de palavra para não apanhar
       "chinotto" nem "macchiato". */
    { termos:['agua', 'coca cola', 'coca-cola', 'aranciata',
              'limonata', 'limonada', 'chinotto'], cat:'Bebida', sub:'Soft' },
    { regex:/\bcha\b/,                             cat:'Bebida', sub:'Soft' },
    { termos:['cerveja', 'sidra', 'somersby'],     cat:'Bebida', sub:'Cerveja e Cidra' },
    { termos:['vinho', 'prosecco', 'lambrusco'],   cat:'Bebida', sub:'Vinho' },
    { termos:['bellini', 'aperol', 'amaro',
              'limoncello', 'spritz'],             cat:'Bebida', sub:'Aperitif' },
    { termos:['caffe', 'cafe', 'cappuccino',
              'americano', 'macchiato'],           cat:'Bebida', sub:'Hot' }
  ];

  /* Devolve sempre { categoria, subcategoria }. Sem correspondência -> Outro,
     de propósito: mais vale forçar revisão manual do que arriscar errado. */
  function sugerirCategoria(desc){
    var d = semAcentos(desc);
    for (var i = 0; i < REGRAS_SUGESTAO.length; i++){
      var r = REGRAS_SUGESTAO[i];
      var bate = false;
      if (r.prefixo){
        bate = d.indexOf(r.prefixo) === 0;
      } else if (r.regex){
        bate = r.regex.test(d);
      } else {
        for (var t = 0; t < r.termos.length; t++){
          if (d.indexOf(r.termos[t]) !== -1){ bate = true; break; }
        }
      }
      if (bate) return { categoria: r.cat, subcategoria: r.sub };
    }
    return { categoria: 'Outro', subcategoria: null };
  }

  function kids(node, name){
    var out = [], c = node ? node.firstElementChild : null;
    while (c){
      if (c.localName === name) out.push(c);
      c = c.nextElementSibling;
    }
    return out;
  }

  function kid(node, name){
    var c = node ? node.firstElementChild : null;
    while (c){
      if (c.localName === name) return c;
      c = c.nextElementSibling;
    }
    return null;
  }

  function txt(node, name){
    var k = kid(node, name);
    return k ? String(k.textContent || '').trim() : '';
  }

  function numTxt(node, name){
    var v = txt(node, name).replace(',', '.');
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  var CORTE_DIA_OPERACAO_H = 5;

  /* Aritmética de datas pelos componentes, via Date.UTC — nunca por fuso
     local nem por milissegundos: 01/10 00:30 → 30/09 (muda também o mês do
     nó), 01/01 → 31/12 do ano anterior, e 25/10/2026 (mudança de hora) não é
     caso especial nenhum, porque não há hora nenhuma nesta conta. */
  function somaDias(dia, n){
    var y = parseInt(dia.slice(0, 4), 10);
    var m = parseInt(dia.slice(5, 7), 10);
    var d = parseInt(dia.slice(8, 10), 10);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  }

  /* Hora do fecho (SystemEntryDate). -1 = o documento não traz hora. */
  function horaDoSistema(systemEntry){
    var hm = String(systemEntry || '').match(/^\d{4}-\d{2}-\d{2}T(\d{2}):/);
    return hm ? parseInt(hm[1], 10) : -1;
  }

  /* doc = { systemEntry, invoiceDate }. O SystemEntryDate manda (é o fecho);
     sem ele vale o InvoiceDate, que não traz hora e por isso nunca recua. */
  function diaOperacao(doc){
    var se = doc && doc.systemEntry ? String(doc.systemEntry) : '';
    var temSe = /^\d{4}-\d{2}-\d{2}/.test(se);
    var base = temSe ? se : String((doc && doc.invoiceDate) || '');
    var dia = base.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return '';
    var h = temSe ? horaDoSistema(se) : -1;
    return (h >= 0 && h < CORTE_DIA_OPERACAO_H) ? somaDias(dia, -1) : dia;
  }

  /* A data fiscal do documento, que é o que o SAF-T diz e não muda nunca. */
  function diaFiscal(doc){
    var inv = String((doc && doc.invoiceDate) || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(inv)) return inv;
    var se = String((doc && doc.systemEntry) || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(se) ? se : '';
  }

  function novoDia(){
    return {
      bruto:0, liquido:0, docs:0, qtdTotal:0,
      produtos:{},                 // key → { codigo, desc, qtd, valor, iva }
      porDia:{}, porHora:{}, porDiaSemana:{},
      porTipo:{}, porPagamento:{},
      taloes:[],                   // arrays de keys de produto, por talão
      documentos:{},               // docKey → { bruto, fiscal }
      madrugada:{ bruto:0, docs:0, dataFiscal:null }
    };
  }

  /* Um documento do ficheiro, já descascado do XML. Guardar o documento (e
     não só o agregado) é o que permite reimportar sem duplicar: um dia pode
     ser recomposto a partir de um SUBCONJUNTO dos documentos. */
  function lerDocumento(inv, indice){
    var invoiceType = txt(inv, 'InvoiceType') || 'OU';
    var invoiceNo   = txt(inv, 'InvoiceNo');
    var invoiceDate = txt(inv, 'InvoiceDate');
    var systemEntry = txt(inv, 'SystemEntryDate');

    var status = kid(inv, 'DocumentStatus');
    var anulado = (status ? txt(status, 'InvoiceStatus') : '') === 'A';

    var totais = kid(inv, 'DocumentTotals');
    var d = {
      key: keyFor(invoiceNo || (invoiceType + '_' + systemEntry + '_' + indice)),
      numero: invoiceNo,
      tipo: invoiceType,
      anulado: anulado,
      fiscal: diaFiscal({ invoiceDate: invoiceDate, systemEntry: systemEntry }),
      diaOp: diaOperacao({ invoiceDate: invoiceDate, systemEntry: systemEntry }),
      hora: horaDoSistema(systemEntry),
      bruto: totais ? numTxt(totais, 'GrossTotal') : 0,
      liquido: totais ? numTxt(totais, 'NetTotal') : 0,
      pagamentos: [],
      linhas: []
    };
    if (anulado) return d;   // anulada não conta para nada: nem linhas nem pagamentos

    var pagamentos = totais ? kids(totais, 'Payment') : [];
    for (var p = 0; p < pagamentos.length; p++){
      d.pagamentos.push({
        mec: txt(pagamentos[p], 'PaymentMechanism') || 'OU',
        valor: numTxt(pagamentos[p], 'PaymentAmount')
      });
    }

    var linhas = kids(inv, 'Line');
    for (var l = 0; l < linhas.length; l++){
      var linha = linhas[l];
      var codigo = txt(linha, 'ProductCode');
      var descr  = txt(linha, 'ProductDescription');
      var qtd    = numTxt(linha, 'Quantity');
      var pvp    = numTxt(linha, 'UnitPrice');

      var credito = kid(linha, 'CreditAmount');
      var valorLinha, sinal;
      if (credito){ valorLinha = numTxt(linha, 'CreditAmount'); sinal = 1; }
      else { valorLinha = -numTxt(linha, 'DebitAmount'); sinal = -1; }

      var taxEl = kid(linha, 'Tax');
      var k = keyFor(codigo || descr);
      d.linhas.push({
        k: k, codigo: codigo || descr, desc: descr || codigo || k, descRaw: descr,
        qtd: qtd * sinal, valor: valorLinha,
        iva: taxEl ? numTxt(taxEl, 'TaxPercentage') : 0, pvp: pvp
      });
    }
    return d;
  }

  /* Agrega uma LISTA de documentos (já do mesmo dia de operação) na mesma
     forma intermédia de sempre, a que o construirPayload consome. É pura e é
     o que permite construir o agregado de um subconjunto de documentos. */
  function agregarDocs(docs){
    var m = novoDia();
    for (var i = 0; i < docs.length; i++){
      var d = docs[i];
      m.bruto += d.bruto;
      m.liquido += d.liquido;
      m.docs += 1;
      m.documentos[d.key] = { bruto: d.bruto, fiscal: d.fiscal };

      var pd = m.porDia[d.diaOp] || (m.porDia[d.diaOp] = { bruto:0, docs:0 });
      pd.bruto += d.bruto; pd.docs += 1;

      // --- por hora (hora de FECHO; a madrugada fica com a hora real, 0..4)
      if (d.hora >= 0 && d.hora <= 23){
        var h = m.porHora[d.hora] || (m.porHora[d.hora] = { bruto:0, docs:0 });
        h.bruto += d.bruto; h.docs += 1;
      }

      var dow = new Date(d.diaOp + 'T12:00:00').getDay();
      var ds = m.porDiaSemana[dow] || (m.porDiaSemana[dow] = { bruto:0, docs:0, datas:{} });
      ds.bruto += d.bruto; ds.docs += 1; ds.datas[d.diaOp] = true;

      var t = m.porTipo[d.tipo] || (m.porTipo[d.tipo] = { bruto:0, docs:0 });
      t.bruto += d.bruto; t.docs += 1;

      var mecanismosVistos = {};
      for (var p = 0; p < d.pagamentos.length; p++){
        var mec = d.pagamentos[p].mec;
        var pg = m.porPagamento[mec] || (m.porPagamento[mec] = { bruto:0, docs:0 });
        pg.bruto += d.pagamentos[p].valor;
        if (!mecanismosVistos[mec]){ pg.docs += 1; mecanismosVistos[mec] = true; }
      }

      var keysTalao = {};
      for (var l = 0; l < d.linhas.length; l++){
        var linha = d.linhas[l];
        var prod = m.produtos[linha.k];
        if (!prod){
          prod = m.produtos[linha.k] = { codigo: linha.codigo, desc: linha.desc, qtd:0, valor:0, iva: linha.iva };
        }
        if (linha.descRaw && !prod.desc) prod.desc = linha.descRaw;
        prod.qtd += linha.qtd;
        prod.valor += linha.valor;
        if (linha.iva) prod.iva = linha.iva;
        if (linha.pvp && !prod.pvpTabela) prod.pvpTabela = linha.pvp;
        m.qtdTotal += linha.qtd;
        keysTalao[linha.k] = true;
      }
      m.taloes.push(Object.keys(keysTalao));

      // Fechado depois da meia-noite: a data fiscal é o dia seguinte ao de operação.
      if (d.fiscal && d.fiscal !== d.diaOp){
        m.madrugada.bruto += d.bruto;
        m.madrugada.docs += 1;
        m.madrugada.dataFiscal = d.fiscal;
      }
    }
    return m;
  }

  function parseSaft(xmlText, onProgress, fmtInt){
    onProgress = onProgress || function(){};
    var intFmt = fmtInt || String;

    var doc = lerXml(xmlText);   // lança ERRO_FICHEIRO_INVALIDO se o XML não for bem formado

    var root = doc.documentElement;
    if (!root || root.localName !== 'AuditFile'){
      throw new Error('Isto não é um SAF-T: o elemento raiz é <' + (root ? root.localName : '?') + '> e não <AuditFile>.');
    }

    var header = kid(root, 'Header');
    var headerInfo = {
      empresa: header ? txt(header, 'CompanyName') : '',
      inicio:  header ? txt(header, 'StartDate') : '',
      fim:     header ? txt(header, 'EndDate') : ''
    };

    var srcDocs = kid(root, 'SourceDocuments');
    var salesInv = srcDocs ? kid(srcDocs, 'SalesInvoices') : null;
    if (!salesInv){
      throw new Error('O SAF-T não tem SourceDocuments > SalesInvoices — provavelmente é um ficheiro só de contabilidade ou de tabelas mestre.');
    }

    var invoices = kids(salesInv, 'Invoice');
    if (!invoices.length){
      throw new Error('O SAF-T não contém nenhuma fatura no período.');
    }

    var docsPorDia = {};          // dia de operação → [documento]
    var anuladosPorDia = {};      // dia de operação → { docKey: true }
    var anuladas = 0;
    var anuladasPorMes = {};
    var fiscaisNoFicheiro = {};   // dia fiscal → true (inclui os anulados)
    var total = invoices.length;

    for (var i = 0; i < total; i++){
      var d = lerDocumento(invoices[i], i);

      if (d.fiscal) fiscaisNoFicheiro[d.fiscal] = true;

      if (d.anulado){
        anuladas++;
        var mesAnulada = (d.fiscal || '').slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(mesAnulada)){
          anuladasPorMes[mesAnulada] = (anuladasPorMes[mesAnulada] || 0) + 1;
        }
        if (d.diaOp){
          (anuladosPorDia[d.diaOp] || (anuladosPorDia[d.diaOp] = {}))[d.key] = true;
        }
      } else if (d.diaOp){
        (docsPorDia[d.diaOp] || (docsPorDia[d.diaOp] = [])).push(d);
      }

      if (i % 250 === 0){
        onProgress(0.15 + 0.7 * (i / total), 'A ler faturas… ' + intFmt(i) + ' / ' + intFmt(total));
      }
    }

    if (!Object.keys(docsPorDia).length){
      throw new Error('Não foi possível agregar nenhuma fatura (todas anuladas ou sem data válida).');
    }

    /* Intervalo FISCAL coberto pelo ficheiro — é o que diz se um dia de
       operação está coberto por inteiro (precisa do dia fiscal X e do X+1).
       Sai dos documentos, não do cabeçalho: é o que se sabe mesmo. */
    var fiscais = Object.keys(fiscaisNoFicheiro).sort();
    var intervalo = { inicio: fiscais[0], fim: fiscais[fiscais.length - 1] };

    var dias = {};
    Object.keys(docsPorDia).forEach(function(dia){ dias[dia] = agregarDocs(docsPorDia[dia]); });

    return { dias: dias, docsPorDia: docsPorDia, anuladosPorDia: anuladosPorDia,
             intervalo: intervalo, diasFiscais: fiscaisNoFicheiro,
             anuladas: anuladas, anuladasPorMes: anuladasPorMes,
             totalFaturas: total, header: headerInfo };
  }

  function round(n, casas){
    var f = Math.pow(10, casas === undefined ? 2 : casas);
    return Math.round((Number(n) || 0) * f) / f;
  }

  /* Empates desempatados pela chave do par, não pela ordem de inserção: o mês
     é somado a partir dos dias e a ordem em que os pares aparecem depende de
     que dia os viu primeiro. Sem isto, o mesmo mês dava listas diferentes
     consoante o caminho, com as mesmas contagens. */
  function ordemPares(x, y){
    if (y.n !== x.n) return y.n - x.n;
    if (x.a !== y.a) return x.a < y.a ? -1 : 1;
    return x.b < y.b ? -1 : (x.b > y.b ? 1 : 0);
  }

  function topPares(taloes, limite){
    var mapa = {};
    for (var i = 0; i < taloes.length; i++){
      var codes = taloes[i];
      if (codes.length < 2) continue;
      var ordenados = codes.slice().sort();
      for (var a = 0; a < ordenados.length; a++){
        for (var b = a + 1; b < ordenados.length; b++){
          var chave = ordenados[a] + '\u00a6' + ordenados[b];
          var reg = mapa[chave] || (mapa[chave] = { a: ordenados[a], b: ordenados[b], n: 0 });
          reg.n += 1;
        }
      }
    }
    return Object.keys(mapa).map(function(chave){ return mapa[chave]; })
      .sort(ordemPares).slice(0, limite || 30);
  }

  function construirPayload(m, catalogo, meta, paresLimite){
    var payload = {};

    // --- produtos + categorias
    // O catálogo manda; a sugestão só entra para produtos que ainda não foram
    // classificados à mão.
    function classificarDe(k, desc){
      var c = catalogo[k];
      if (c && c.categoria) return { categoria: c.categoria, subcategoria: c.subcategoria || null };
      return sugerirCategoria(desc);
    }

    var produtos = {};
    var porCategoria = {};
    var porSubcategoria = {};
    var keys = Object.keys(m.produtos);
    for (var i = 0; i < keys.length; i++){
      var k = keys[i];
      var p = m.produtos[k];
      var cls = classificarDe(k, p.desc);
      var cat = cls.categoria;
      var sub = cls.subcategoria || null;
      produtos[k] = {
        desc: p.desc,
        categoria: cat,
        subcategoria: sub,
        qtd: round(p.qtd, 3),
        valor: round(p.valor, 2),
        pvpMedio: round(p.qtd ? (p.valor / p.qtd) : (p.pvpTabela || 0), 4)
      };
      if (p.iva) produtos[k].iva = round(p.iva, 2);
      var c = porCategoria[cat] || (porCategoria[cat] = { valor:0, qtd:0 });
      c.valor += p.valor;
      c.qtd += p.qtd;
      if (sub){
        var mapaSub = porSubcategoria[cat] || (porSubcategoria[cat] = {});
        var s = mapaSub[sub] || (mapaSub[sub] = { valor:0, qtd:0 });
        s.valor += p.valor;
        s.qtd += p.qtd;
      }
    }
    Object.keys(porCategoria).forEach(function(cat){
      porCategoria[cat].valor = round(porCategoria[cat].valor, 2);
      porCategoria[cat].qtd = round(porCategoria[cat].qtd, 3);
      var mapaSub = porSubcategoria[cat] || {};
      Object.keys(mapaSub).forEach(function(sub){
        mapaSub[sub].valor = round(mapaSub[sub].valor, 2);
        mapaSub[sub].qtd = round(mapaSub[sub].qtd, 3);
      });
    });

    // --- attach rate de bebida
    // Lado da focaccia: categoria Comida E subcategoria Focaccia (os maritozzi
    // salgados são Comida mas não contam como focaccia). Lado da bebida:
    // categoria Bebida, que já inclui os cafés (subcategoria Hot).
    var comFocaccia = 0, comFocacciaEBebida = 0;
    for (var t = 0; t < m.taloes.length; t++){
      var codes = m.taloes[t];
      var temF = false, temB = false;
      for (var c2 = 0; c2 < codes.length; c2++){
        var prod = m.produtos[codes[c2]];
        var cls2 = prod ? classificarDe(codes[c2], prod.desc) : { categoria:'Outro', subcategoria:null };
        if (cls2.categoria === 'Comida' && cls2.subcategoria === 'Focaccia') temF = true;
        else if (cls2.categoria === 'Bebida') temB = true;
      }
      if (temF){
        comFocaccia++;
        if (temB) comFocacciaEBebida++;
      }
    }

    // --- por dia da semana (dias abertos distintos)
    var porDiaSemana = {};
    Object.keys(m.porDiaSemana).forEach(function(dow){
      var v = m.porDiaSemana[dow];
      porDiaSemana[dow] = { bruto: round(v.bruto, 2), docs: v.docs, dias: Object.keys(v.datas).length };
    });

    // --- por tipo (com ticket medio)
    var porTipo = {};
    Object.keys(m.porTipo).forEach(function(tp){
      var v = m.porTipo[tp];
      porTipo[tp] = { bruto: round(v.bruto, 2), docs: v.docs, ticket: round(v.docs ? v.bruto / v.docs : 0, 4) };
    });

    var porDia = {};
    Object.keys(m.porDia).forEach(function(dia){
      porDia[dia] = { bruto: round(m.porDia[dia].bruto, 2), docs: m.porDia[dia].docs };
    });

    var porHora = {};
    Object.keys(m.porHora).forEach(function(h){
      porHora[h] = { bruto: round(m.porHora[h].bruto, 2), docs: m.porHora[h].docs };
    });

    var porPagamento = {};
    Object.keys(m.porPagamento).forEach(function(mec){
      porPagamento[mec] = { bruto: round(m.porPagamento[mec].bruto, 2), docs: m.porPagamento[mec].docs };
    });

    var diasAbertos = Object.keys(m.porDia).length;

    payload.resumo = {
      bruto: round(m.bruto, 2),
      liquido: round(m.liquido, 2),
      docs: m.docs,
      ticket: round(m.docs ? m.bruto / m.docs : 0, 4),
      dias: diasAbertos,
      artigosPorTalao: round(m.docs ? m.qtdTotal / m.docs : 0, 4),
      valorPorArtigo: round(m.qtdTotal ? m.bruto / m.qtdTotal : 0, 4),
      qtdTotal: round(m.qtdTotal, 3),
      importadoEm: meta.importadoEm,
      ficheiro: meta.ficheiro
    };
    payload.produtos = produtos;
    payload.porDia = porDia;
    payload.porHora = porHora;
    payload.porDiaSemana = porDiaSemana;
    payload.porTipo = porTipo;
    payload.porPagamento = porPagamento;
    payload.porCategoria = porCategoria;
    payload.porSubcategoria = porSubcategoria;
    payload.attach = {
      taloesComFocaccia: comFocaccia,
      taloesComFocacciaEBebida: comFocacciaEBebida,
      taxa: round(comFocaccia ? comFocacciaEBebida / comFocaccia : 0, 4)
    };
    payload.pares = topPares(m.taloes, paresLimite || 30);

    /* Registo dos documentos que este dia inclui (chave = número do documento
       saneado). É isto que torna a reimportação idempotente: sabendo o que já
       lá está, um ficheiro que só cobre parte do dia junta o que falta em vez
       de substituir o dia inteiro. Só o valor `true` — o detalhe do documento
       vive no ficheiro, não no Firebase. O valor é o bruto do documento — é o
       que permite saber quanto sai do dia quando um documento é anulado numa
       reimportação, sem ter de reler o ficheiro antigo. */
    var documentos = {};
    Object.keys(m.documentos || {}).forEach(function(k){
      documentos[k] = round(m.documentos[k].bruto, 2);
    });
    payload.documentos = documentos;

    /* Vendas fechadas depois da meia-noite, já atribuídas a este dia de
       operação. Só existe quando há alguma — um dia sem madrugada não ganha
       o campo. */
    if (m.madrugada && m.madrugada.docs){
      payload.madrugada = {
        bruto: round(m.madrugada.bruto, 2),
        docs: m.madrugada.docs,
        dataFiscal: m.madrugada.dataFiscal
      };
    }

    return payload;
  }

  function somaMapa(destino, origem, campos){
    Object.keys(origem || {}).forEach(function(k){
      var d = destino[k] || (destino[k] = {});
      campos.forEach(function(c){
        d[c] = (d[c] || 0) + (Number(origem[k][c]) || 0);
      });
    });
  }

  /* `limitePares` só existe para o merge de DIAS (que guardam mais pares do
     que o mês); sem ele o comportamento é o de sempre, 30. */
  function mergePayloads(lista, limitePares){
    var out = {
      resumo:{ bruto:0, liquido:0, docs:0, dias:0, ticket:0, artigosPorTalao:0, valorPorArtigo:0, qtdTotal:0 },
      produtos:{}, porDia:{}, porHora:{}, porDiaSemana:{}, porTipo:{},
      porPagamento:{}, porCategoria:{}, porSubcategoria:{},
      attach:{ taloesComFocaccia:0, taloesComFocacciaEBebida:0, taxa:0 },
      pares:[]
    };
    var qtdTotal = 0;
    var paresMapa = {};

    lista.forEach(function(p){
      if (!p) return;
      var r = p.resumo || {};
      out.resumo.bruto += Number(r.bruto) || 0;
      out.resumo.liquido += Number(r.liquido) || 0;
      out.resumo.docs += Number(r.docs) || 0;
      out.resumo.dias += Number(r.dias) || 0;
      // qtdTotal explícito quando existe; a reconstrução por artigosPorTalao
      // arrasta o erro do arredondamento a 4 casas e é só o que resta para
      // meses gravados antes de este campo existir.
      qtdTotal += (r.qtdTotal !== undefined && r.qtdTotal !== null)
        ? (Number(r.qtdTotal) || 0)
        : (Number(r.artigosPorTalao) || 0) * (Number(r.docs) || 0);

      Object.keys(p.produtos || {}).forEach(function(k){
        var src = p.produtos[k];
        var d = out.produtos[k] || (out.produtos[k] = { desc: src.desc, categoria: src.categoria,
                                                       subcategoria: src.subcategoria || null, qtd:0, valor:0 });
        d.qtd += Number(src.qtd) || 0;
        d.valor += Number(src.valor) || 0;
        if (src.desc) d.desc = src.desc;
        if (src.categoria) d.categoria = src.categoria;
        if (src.subcategoria) d.subcategoria = src.subcategoria;
        if (src.iva) d.iva = Number(src.iva) || 0;
      });

      somaMapa(out.porDia, p.porDia, ['bruto','docs']);
      somaMapa(out.porHora, p.porHora, ['bruto','docs']);
      somaMapa(out.porDiaSemana, p.porDiaSemana, ['bruto','docs','dias']);
      somaMapa(out.porTipo, p.porTipo, ['bruto','docs']);
      somaMapa(out.porPagamento, p.porPagamento, ['bruto','docs']);
      somaMapa(out.porCategoria, p.porCategoria, ['valor','qtd']);

      // porSubcategoria tem dois níveis, o somaMapa só soma um.
      Object.keys(p.porSubcategoria || {}).forEach(function(cat){
        var destino = out.porSubcategoria[cat] || (out.porSubcategoria[cat] = {});
        somaMapa(destino, p.porSubcategoria[cat], ['valor','qtd']);
      });

      var a = p.attach || {};
      out.attach.taloesComFocaccia += Number(a.taloesComFocaccia) || 0;
      out.attach.taloesComFocacciaEBebida += Number(a.taloesComFocacciaEBebida) || 0;

      (p.pares || []).forEach(function(par){
        if (!par) return;
        var chave = par.a + '\u00a6' + par.b;
        var reg = paresMapa[chave] || (paresMapa[chave] = { a: par.a, b: par.b, n: 0 });
        reg.n += (Number(par.n) || 0);
      });
    });

    Object.keys(out.produtos).forEach(function(k){
      var d = out.produtos[k];
      d.pvpMedio = d.qtd ? d.valor / d.qtd : 0;
    });
    Object.keys(out.porTipo).forEach(function(tp){
      var d = out.porTipo[tp];
      d.ticket = d.docs ? d.bruto / d.docs : 0;
    });

    out.resumo.ticket = out.resumo.docs ? out.resumo.bruto / out.resumo.docs : 0;
    out.resumo.artigosPorTalao = out.resumo.docs ? qtdTotal / out.resumo.docs : 0;
    out.resumo.qtdTotal = qtdTotal;
    out.resumo.valorPorArtigo = qtdTotal ? out.resumo.bruto / qtdTotal : 0;
    out.attach.taxa = out.attach.taloesComFocaccia
      ? out.attach.taloesComFocacciaEBebida / out.attach.taloesComFocaccia : 0;
    out.pares = Object.keys(paresMapa).map(function(chave){ return paresMapa[chave]; })
      .sort(ordemPares).slice(0, limitePares || 30);

    return out;
  }

  /* mergePayloads soma sem arredondar — chega para desenhar a vista "todos os
     meses", mas o que vai para vendas/{mes} tem de sair com as mesmas casas
     decimais que construirPayload sempre gravou, senão o nó muda de formato.
     As casas aqui são exactamente as de construirPayload. */
  function arredondarMapa(mapa, campos){
    Object.keys(mapa || {}).forEach(function(k){
      Object.keys(campos).forEach(function(c){
        if (mapa[k][c] !== undefined) mapa[k][c] = round(mapa[k][c], campos[c]);
      });
    });
  }

  function arredondarPayload(p){
    var r = p.resumo;
    r.bruto = round(r.bruto, 2);
    r.liquido = round(r.liquido, 2);
    r.ticket = round(r.ticket, 4);
    r.artigosPorTalao = round(r.artigosPorTalao, 4);
    r.valorPorArtigo = round(r.valorPorArtigo, 4);
    r.qtdTotal = round(r.qtdTotal, 3);
    Object.keys(p.produtos).forEach(function(k){
      var d = p.produtos[k];
      d.qtd = round(d.qtd, 3);
      d.valor = round(d.valor, 2);
      d.pvpMedio = round(d.pvpMedio, 4);
      if (d.iva !== undefined) d.iva = round(d.iva, 2);
    });

    arredondarMapa(p.porDia, { bruto:2 });
    arredondarMapa(p.porHora, { bruto:2 });
    arredondarMapa(p.porDiaSemana, { bruto:2 });
    arredondarMapa(p.porTipo, { bruto:2, ticket:4 });
    arredondarMapa(p.porPagamento, { bruto:2 });
    arredondarMapa(p.porCategoria, { valor:2, qtd:3 });
    Object.keys(p.porSubcategoria || {}).forEach(function(cat){
      arredondarMapa(p.porSubcategoria[cat], { valor:2, qtd:3 });
    });

    p.attach.taxa = round(p.attach.taxa, 4);
    return p;
  }

  /* Compara o bruto anterior com o novo e devolve a variação relativa.
     Sem anterior (dia novo) devolve 0 — dia novo nunca é suspeito. */
  function variacaoBruto(anterior, novo){
    var a = Number(anterior) || 0;
    var n = Number(novo) || 0;
    if (!a) return n ? 1 : 0;
    return Math.abs(n - a) / a;
  }

  /* Acima deste desvio, um dia que já existia e é substituído aparece
     marcado no resumo do import — não bloqueia, chama a atenção. */
  var LIMIAR_SUSPEITA = 0.05;

  /* --------- Funde dois payloads de dia (PURA) ---------
     Só se usa quando um dia GANHA documentos sem perder os que já tinha. O
     mergePayloads soma tudo, incluindo os contadores de dias — mas um dia é
     um dia, por isso repõem-se a 1. O registo de documentos e a madrugada não
     passam pelo merge (não são agregados somáveis por chave): juntam-se aqui. */
  function fundirDiaPayloads(existente, novo, meta){
    var out = mergePayloads([existente, novo], PARES_POR_DIA);
    out.resumo.dias = 1;
    Object.keys(out.porDiaSemana || {}).forEach(function(dow){ out.porDiaSemana[dow].dias = 1; });

    var documentos = {};
    [existente, novo].forEach(function(p){
      var reg = (p && p.documentos) || {};
      Object.keys(reg).forEach(function(k){ documentos[k] = reg[k]; });
    });
    out.documentos = documentos;

    var mb = 0, md = 0, df = null;
    [existente, novo].forEach(function(p){
      var mg = p && p.madrugada;
      if (!mg || !mg.docs) return;
      mb += Number(mg.bruto) || 0;
      md += Number(mg.docs) || 0;
      df = mg.dataFiscal || df;
    });

    out = arredondarPayload(out);
    if (md) out.madrugada = { bruto: round(mb, 2), docs: md, dataFiscal: df };
    out.resumo.importadoEm = meta.importadoEm;
    out.resumo.ficheiro = meta.ficheiro;
    return out;
  }

  function dentroDoIntervalo(intervalo, dia){
    return !!intervalo && dia >= intervalo.inicio && dia <= intervalo.fim;
  }

  function brutoDe(payload){
    return (payload && payload.resumo) ? (Number(payload.resumo.bruto) || 0) : 0;
  }

  /* --------- Plano de importação (PURO, sem Firebase e sem DOM) ---------

     entrada = { docsPorDia, anuladosPorDia, intervalo, estadoDias, catalogo, meta }
       docsPorDia   dia de operação → [documento] (do parseSaft)
       intervalo    { inicio, fim } — dias FISCAIS cobertos pelo ficheiro
       estadoDias   dia → payload que está hoje em vendasDiario/ (null se não
                    existe). Tem de trazer os dias de operação do ficheiro E os
                    dias fiscais do ficheiro (os segundos só para saber se já
                    existiam — é isso que diz se um documento já estava na OS).

     Regras por dia de operação X:
       · X COM registo de documentos
           - ficheiro cobre X por inteiro (tem o dia fiscal X e o X+1) → substituir
           - senão → juntar só os documentos novos, sem nunca apagar nada
       · X SEM registo (dados antigos, gravados pela data fiscal)
           - dia fiscal X dentro do ficheiro → substituir por inteiro
           - senão (X é o dia anterior ao início do ficheiro e só recebe
             madrugada) → juntar, que nos dados antigos essa madrugada estava
             no dia seguinte e não duplica
       · dias fora do ficheiro não são tocados.

     Verificação: Σ das variações dos dias afectados tem de ser igual ao valor
     dos documentos NOVOS para a OS menos o dos que deixam de contar (anulados
     retirados num dia substituído). Numa reimportação de dias já gravados pela
     data fiscal os dois lados são zero. */
  function planearImportOperacao(entrada){
    var docsPorDia = entrada.docsPorDia || {};
    var anuladosPorDia = entrada.anuladosPorDia || {};
    var intervalo = entrada.intervalo;
    var estadoDias = entrada.estadoDias || {};
    var catalogo = entrada.catalogo || {};
    var meta = entrada.meta || {};

    function existiaAntes(dia){ return !!estadoDias[dia]; }
    function registoDe(p){ return (p && p.documentos) ? p.documentos : null; }
    function tem(reg, k){ return !!reg && Object.prototype.hasOwnProperty.call(reg, k); }

    var plano = [], payloads = {}, avisos = [];
    var deltaTotal = 0, novosTotal = 0, retiradosTotal = 0, novosDocs = 0;

    Object.keys(docsPorDia).sort().forEach(function(dia){
      var docs = docsPorDia[dia];
      var existente = estadoDias[dia] || null;
      var reg = registoDe(existente);
      var cobertoInteiro = dentroDoIntervalo(intervalo, dia) && dentroDoIntervalo(intervalo, somaDias(dia, 1));

      var acao;
      if (!existente) acao = 'substituir';
      else if (reg) acao = cobertoInteiro ? 'substituir' : 'juntar';
      else acao = dentroDoIntervalo(intervalo, dia) ? 'substituir' : 'juntar';

      var usados = (acao === 'substituir')
        ? docs
        : docs.filter(function(d){ return !tem(reg, d.key); });

      // Documentos novos PARA A OS: num dia com registo, os que não estão no
      // registo; num dia sem registo, os cujo dia fiscal ainda não existia
      // (nos dados antigos o documento estava gravado no dia fiscal dele).
      var novosValor = 0, novosN = 0;
      usados.forEach(function(d){
        var ja = reg ? tem(reg, d.key) : existiaAntes(d.fiscal);
        if (ja) return;
        novosValor += d.bruto; novosN += 1;
      });

      var reatribuidos = usados.filter(function(d){ return d.fiscal && d.fiscal !== dia; }).length;

      // Documentos que deixam de contar: só num dia substituído com registo
      // (o que lá estava e o ficheiro já não traz — tipicamente uma anulação).
      var retiradosValor = 0, retiradosN = 0;
      if (acao === 'substituir' && reg){
        var vivos = {};
        usados.forEach(function(d){ vivos[d.key] = true; });
        Object.keys(reg).forEach(function(k){
          if (vivos[k]) return;
          retiradosValor += Number(reg[k]) || 0;
          retiradosN += 1;
        });
      }

      var payload = null;
      if (acao === 'substituir'){
        payload = construirPayload(agregarDocs(usados), catalogo, meta, PARES_POR_DIA);
      } else if (usados.length){
        payload = fundirDiaPayloads(existente, construirPayload(agregarDocs(usados), catalogo, meta, PARES_POR_DIA), meta);
      } else {
        acao = 'semAlteracao';
      }

      // Num dia que se junta, uma anulação de documento já gravado não pode
      // ser retirada sem recompor o dia — dizer-se, nunca apagar às cegas.
      var anuladosPresos = 0;
      if (acao !== 'substituir' && reg){
        Object.keys(anuladosPorDia[dia] || {}).forEach(function(k){ if (tem(reg, k)) anuladosPresos++; });
        if (anuladosPresos){
          avisos.push(anuladosPresos + ' documento' + (anuladosPresos === 1 ? '' : 's') +
            ' anulado' + (anuladosPresos === 1 ? '' : 's') + ' de ' + dia +
            ' continua' + (anuladosPresos === 1 ? '' : 'm') + ' a contar: o ficheiro não cobre esse dia' +
            ' por inteiro. Importa o período completo de ' + dia + ' para os retirar.');
        }
      }

      var brutoAntes = brutoDe(existente);
      var brutoDepois = payload ? brutoDe(payload) : brutoAntes;
      var entradaPlano = {
        dia: dia, mes: dia.slice(0, 7), acao: acao,
        existia: !!existente, tinhaRegisto: !!reg,
        brutoAntes: existente ? brutoAntes : null,
        brutoDepois: brutoDepois,
        delta: round(brutoDepois - brutoAntes, 2),
        docsFicheiro: docs.length, docsUsados: usados.length,
        docsNovos: novosN, novosValor: round(novosValor, 2),
        retiradosN: retiradosN, retiradosValor: round(retiradosValor, 2),
        reatribuidos: reatribuidos, anuladosPresos: anuladosPresos,
        variacao: existente ? variacaoBruto(brutoAntes, brutoDepois) : 0,
        suspeito: false,
        gravar: acao !== 'semAlteracao'
      };
      entradaPlano.suspeito = !!existente && entradaPlano.variacao > LIMIAR_SUSPEITA;

      if (payload) payloads[dia] = payload;
      deltaTotal += entradaPlano.delta;
      novosTotal += novosValor;
      retiradosTotal += retiradosValor;
      novosDocs += novosN;
      plano.push(entradaPlano);
    });

    /* Caso de canto: um dia FISCAL dentro do ficheiro que já existia na OS e
       que, pela regra nova, deixou de ter documentos nenhuns (todas as vendas
       desse dia foram fechadas antes do corte). Não se apaga nada às cegas —
       avisa-se, que a alternativa era duplicar. */
    Object.keys(entrada.diasFiscais || {}).forEach(function(f){
      if (docsPorDia[f] || !estadoDias[f]) return;
      if (registoDe(estadoDias[f])) return;
      avisos.push('O dia ' + f + ' já estava gravado e, pela regra do dia de operação, ' +
        'este ficheiro não lhe atribui documento nenhum — ficou como estava. Confirma-o à mão.');
    });

    var esperado = round(novosTotal - retiradosTotal, 2);
    deltaTotal = round(deltaTotal, 2);
    // Tolerância = o arredondamento a 2 casas de cada dia envolvido.
    var tolerancia = round(0.01 * (plano.length + 1), 2);
    return {
      plano: plano, payloads: payloads, avisos: avisos,
      verificacao: {
        deltaTotal: deltaTotal, novosTotal: round(novosTotal, 2),
        retiradosTotal: round(retiradosTotal, 2), esperado: esperado,
        diferenca: round(deltaTotal - esperado, 2), tolerancia: tolerancia,
        novosDocs: novosDocs,
        ok: Math.abs(deltaTotal - esperado) <= tolerancia
      }
    };
  }

  /* Recompõe o payload do mês a partir de TODOS os dias que estão em
     vendasDiario/{mes} — os deste import e os que já lá estavam. É esta a
     única origem de vendas/{mes}: nunca sai directamente do ficheiro. */
  function payloadDoMes(diasDoMes, meta){
    var chaves = Object.keys(diasDoMes || {}).sort();
    var payload = arredondarPayload(mergePayloads(chaves.map(function(d){ return diasDoMes[d]; })));
    payload.resumo.importadoEm = meta.importadoEm;
    payload.resumo.ficheiro = meta.ficheiro;
    payload.resumo.diasImportados = chaves.length;
    payload.resumo.ultimoImportEm = meta.importadoEm;
    return payload;
  }

  /* =========================================================
     API de importação
     ========================================================= */

  /* Produtos do ficheiro que ainda não estão no catálogo, com a sugestão
     automática de categoria, ordenados por valor. Na página alimentam o
     formulário "Confirmar categorias"; no Jarvis travam a importação (a
     escolha da categoria é do Manel e faz-se na página). */
  function produtosNovos(parsed, catalogo){
    catalogo = catalogo || {};
    var vistos = {};
    var novos = [];
    Object.keys(parsed.dias).forEach(function(dia){
      var prods = parsed.dias[dia].produtos;
      Object.keys(prods).forEach(function(k){
        var p = prods[k];
        if (vistos[k]){
          vistos[k].qtd += p.qtd;
          vistos[k].valor += p.valor;
          return;
        }
        if (catalogo[k]) return;
        vistos[k] = { key:k, codigo:p.codigo, desc:p.desc, qtd:p.qtd, valor:p.valor,
                      sugestao: sugerirCategoria(p.desc) };
        novos.push(vistos[k]);
      });
    });
    novos.sort(function(a, b){ return b.valor - a.valor; });
    return novos;
  }

  /* O que é preciso ler do Firebase antes de construirPayload():
       dias  — os dias de OPERAÇÃO do ficheiro e os dias FISCAIS dele
               (vendasDiario/{mês}/{dia}); os segundos só para saber se já
               existiam;
       meses — os meses dos dias de operação (vendasDiario/{mês} inteiro e
               vendas/{mês}/resumo), para recompor o mês. */
  function leiturasNecessarias(parsed){
    var dias = {}, meses = {};
    Object.keys(parsed.docsPorDia).forEach(function(d){ dias[d] = true; meses[d.slice(0, 7)] = true; });
    Object.keys(parsed.diasFiscais || {}).forEach(function(d){ dias[d] = true; });
    return { dias: Object.keys(dias).sort(), meses: Object.keys(meses).sort() };
  }

  /* Um valor tal como o Firebase o devolve depois de gravado e lido pelo SDK:
     sem null/undefined, sem objectos nem listas vazios. Serve para recompor o
     mês com os dias deste import exactamente como a página os lia de volta. */
  function comoFirebase(v){
    if (v === null || v === undefined) return undefined;
    if (typeof v !== 'object') return v;
    var out, k, f, tem = false;
    if (Array.isArray(v)){
      out = [];
      for (k = 0; k < v.length; k++){
        f = comoFirebase(v[k]);
        if (f !== undefined){ out[k] = f; tem = true; }
      }
    } else {
      out = {};
      for (k in v){
        if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
        f = comoFirebase(v[k]);
        if (f !== undefined){ out[k] = f; tem = true; }
      }
    }
    return tem ? out : undefined;
  }

  /* O que vem da API REST do Firebase, posto na forma em que o SDK do browser
     o entrega. A diferença: um mapa de chaves numéricas (porHora, porDiaSemana,
     produtos com código numérico) chega por REST como LISTA com null nos
     buracos; o SDK entrega a mesma lista sem esses índices. Com os null lá, a
     soma dos dias rebentava. Quem lê por REST passa SEMPRE por aqui. */
  function normalizarLido(v){
    var r = comoFirebase(v);
    return r === undefined ? null : r;
  }

  /* estadoAtual = {
       catalogo: vendas/catalogo (na página: já com as categorias escolhidas),
       dias:     { 'AAAA-MM-DD': payload de vendasDiario/ | null },
       meses:    { 'AAAA-MM': { dias: vendasDiario/{mês} | null,
                                resumo: vendas/{mês}/resumo | null } }
     }
     meta = { importadoEm: ISO, ficheiro: nome }

     Devolve { escritas, resumo }. Cada escrita é um set() (PUT por REST) do
     valor INTEIRO num caminho-folha — vendasDiario/{mês}/{dia} ou
     vendas/{mês} — pela ordem em que têm de ser feitas: primeiro os dias,
     depois os meses. É a excepção deliberada à regra "nunca set()" do OS: o
     dia e o mês são sempre recompostos por inteiro, e um update() deixaria
     lixo (p.ex. `madrugada` de um dia que deixou de a ter).

     Um mês com `encolhe: true` é o caso em que a página pergunta "Recalcular
     à mesma?" — quem aplica as escritas decide (a página pergunta; o Jarvis
     não grava e manda para a página). */
  function construirEscritas(parsed, estadoAtual, meta){
    estadoAtual = estadoAtual || {};
    meta = meta || {};
    var catalogo = estadoAtual.catalogo || {};
    var estadoMeses = estadoAtual.meses || {};

    var res = planearImportOperacao({
      docsPorDia: parsed.docsPorDia,
      anuladosPorDia: parsed.anuladosPorDia,
      intervalo: parsed.intervalo,
      diasFiscais: parsed.diasFiscais,
      estadoDias: estadoAtual.dias || {},
      catalogo: catalogo,
      meta: meta
    });

    var escritas = [];
    var aceites = res.plano.filter(function(e){ return e.gravar && res.payloads[e.dia]; });
    aceites.forEach(function(e){
      escritas.push({ tipo: 'dia', dia: e.dia, mes: e.mes,
                      path: 'vendasDiario/' + e.mes + '/' + e.dia,
                      valor: res.payloads[e.dia] });
    });

    // Meses tocados por este import — só esses precisam de recálculo. A
    // madrugada do dia 1 traz o mês anterior para esta lista sozinha.
    var mesesLista = [];
    aceites.forEach(function(e){ if (mesesLista.indexOf(e.mes) === -1) mesesLista.push(e.mes); });
    mesesLista.sort();

    var meses = mesesLista.map(function(mes){
      var em = estadoMeses[mes] || {};
      var diasDoMes = {};
      Object.keys(em.dias || {}).forEach(function(d){ if (em.dias[d]) diasDoMes[d] = em.dias[d]; });
      aceites.forEach(function(e){
        if (e.mes === mes) diasDoMes[e.dia] = comoFirebase(res.payloads[e.dia]);
      });
      var nDias = Object.keys(diasDoMes).length;
      var antes = em.resumo || null;
      var diasAntes = antes ? (Number(antes.dias) || 0) : 0;
      var encolhe = !!antes && nDias < diasAntes;
      escritas.push({ tipo: 'mes', mes: mes, path: 'vendas/' + mes,
                      valor: payloadDoMes(diasDoMes, meta),
                      dias: nDias, diasAntes: diasAntes, encolhe: encolhe });
      return { mes: mes, dias: nDias, diasAntes: diasAntes, encolhe: encolhe };
    });

    var diasLista = Object.keys(parsed.dias).sort();
    var mesesFicheiro = [];
    diasLista.forEach(function(dia){
      var mes = dia.slice(0, 7);
      if (mesesFicheiro.indexOf(mes) === -1) mesesFicheiro.push(mes);
    });
    mesesFicheiro.sort();

    var novos = produtosNovos(parsed, catalogo);
    var encolheAlgum = meses.some(function(m){ return m.encolhe; });

    return {
      escritas: escritas,
      resumo: {
        plano: res.plano,
        avisos: res.avisos,
        verificacao: res.verificacao,
        meses: meses,
        produtosNovos: novos,
        ficheiro: {
          faturasValidas: diasLista.reduce(function(acc, dia){ return acc + parsed.dias[dia].docs; }, 0),
          diasOperacao: diasLista,
          meses: mesesFicheiro,
          anuladas: parsed.anuladas,
          anuladasPorMes: parsed.anuladasPorMes,
          totalFaturas: parsed.totalFaturas
        },
        diasAGravar: aceites.length,
        /* Só é seguro gravar sem ninguém a olhar para a página quando a
           verificação bate certo, nenhum mês encolhe e não há produtos por
           classificar. */
        podeGravar: !!res.verificacao.ok && !encolheAlgum && !novos.length
      }
    };
  }

  var GiocoSaft = {
    // ficheiro → texto
    extrairXml: extrairXml,
    descodificar: descodificar,
    lerFicheiro: lerFicheiro,
    lerXml: lerXml,
    // texto → documentos
    parse: parseSaft,
    diaOperacao: diaOperacao,
    diaFiscal: diaFiscal,
    somaDias: somaDias,
    horaDoSistema: horaDoSistema,
    keyFor: keyFor,
    lerDocumento: lerDocumento,
    agregarDocs: agregarDocs,
    // documentos + estado → escritas
    leiturasNecessarias: leiturasNecessarias,
    produtosNovos: produtosNovos,
    construirPayload: construirEscritas,
    normalizarLido: normalizarLido,
    comoFirebase: comoFirebase,
    // peças (a página usa-as também nas vistas; os testes exercitam-nas)
    construirPayloadDia: construirPayload,
    planearImportOperacao: planearImportOperacao,
    fundirDiaPayloads: fundirDiaPayloads,
    payloadDoMes: payloadDoMes,
    mergePayloads: mergePayloads,
    arredondarPayload: arredondarPayload,
    arredondarMapa: arredondarMapa,
    somaMapa: somaMapa,
    topPares: topPares,
    ordemPares: ordemPares,
    round: round,
    variacaoBruto: variacaoBruto,
    dentroDoIntervalo: dentroDoIntervalo,
    brutoDe: brutoDe,
    novoDia: novoDia,
    semAcentos: semAcentos,
    sugerirCategoria: sugerirCategoria,
    kids: kids, kid: kid, txt: txt, numTxt: numTxt,
    REGRAS_SUGESTAO: REGRAS_SUGESTAO,
    ERRO_FICHEIRO_INVALIDO: ERRO_FICHEIRO_INVALIDO,
    PARES_POR_DIA: PARES_POR_DIA,
    CORTE_DIA_OPERACAO_H: CORTE_DIA_OPERACAO_H,
    LIMIAR_SUSPEITA: LIMIAR_SUSPEITA
  };

  raiz.GiocoSaft = GiocoSaft;
  if (typeof module !== 'undefined' && module.exports) module.exports = GiocoSaft;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
