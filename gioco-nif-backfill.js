/* gioco-nif-backfill.js — preenchimento retroactivo dos NIFs das fichas de
   fornecedor a partir das faturas JÁ emparelhadas (Set/2026).

   O caso inverso da reconciliação retroactiva: a fatura tem fornecedorIdEncontrado
   correcto mas a ficha em suppliers/{id} não tem nif. As faturas antigas não
   guardaram nifTexto (o campo não existia) e o analyzeResult.content nunca foi
   persistido — o NIF só se obtém relendo o ficheiro de faturasArquivo/{id}.
   Basta UMA fatura por fornecedor: ~20 fornecedores = ~20 páginas da quota Azure
   F0 (500/mês), em vez de uma por fatura.

   Sem Firebase e sem DOM: quem chama injecta as leituras e as escritas (deps).
   Duas funções:

     planear(suppliers, faturas, temArquivo) → plano
       suppliers  : { id: { nif?, nome, ... } }        (o nó suppliers em memória)
       faturas    : { id: { fornecedorIdEncontrado, criadoEm, nifTexto?,
                            nifCandidatos?, fornecedorTexto?, ... } }
       temArquivo : function(faturaId) → bool | null    (null = desconhecido; a
                    execução verifica ao ler)
       plano = { semCusto:   [{ supplierId, nome, fatura }],   // já tem nifTexto/candidatos
                 releitura:  [{ supplierId, nome, fatura }],   // precisa do Azure
                 manuais:    [{ supplierId, nome, motivo }],   // nada a fazer aqui
                 totalSemNif }
       Um alvo por fornecedor, nunca mais. A fatura escolhida é a MAIS RECENTE
       (criadoEm) ligada a esse fornecedor: primeiro a mais recente COM NIF já
       gravado (grátis), senão a mais recente com ficheiro arquivado (paga).

     executar(plano, deps) → Promise<relatorio>
       deps = {
         getSuppliers()                         // o nó ao vivo — reavaliado a cada alvo
         lerArquivo(faturaId)   → Promise<dataUrl|null>
         dataUrlParaFile(dataUrl, nome) → File|null
         ler(file)              → Promise<{nif, nifCandidatos, ...}>  (GiocoFaturas.ler)
         gravarNif(faturaId, {nifTexto, nifCandidatos, nifOrigem}) → Promise // update() só nessas folhas
         aprender(supplierId, fatura) → Promise                   // aprenderFornecedor da página
         onProgresso({ indice, total, nome, fase, segundos?, tentativa? })
                                // fase: 'ler' | 'gravar' | 'pausa' (2 s entre alvos)
                                //       | 'espera' (retry do 429: "nova tentativa em Xs")
         deveParar()            → bool                            // opcional, botão "Parar"
         sleep(ms)              → Promise                         // opcional (testes)
       }
       Sequencial, UMA chamada ao Azure de cada vez, com PAUSA_ENTRE_ALVOS_MS (2 s)
       entre alvos com Azure. RATE LIMIT (Set/2026): o F0 aceita ~1 pedido/s; um 429
       repete-se com a política GiocoFaturas.RETRY_429 (4 tentativas, 2/5/12/30 s,
       Retry-After respeitado com tecto de 60 s) e só depois de esgotar entra em
       falhados com o motivo MOTIVO_429 e rateLimit:true. Um 429 recusado NÃO conta
       em paginasAzure (só as análises que devolveram resultado). Erros que não são
       429 falham à primeira. A fila CONTINUA sempre.
       relatorio = { gravados:[{supplierId,nome,nif}],
                     falhados:[{supplierId,nome,motivo,rateLimit,alvo}],
                     manuais:[{supplierId,nome,motivo}], saltados:[...], paginasAzure,
                     parado }
     planoRepetir(relatorio) → plano só com os falhados por 429 (botão "Repetir falhados")

   REGRA de não escrita: NIF lido inválido, o NIF_PROPRIO, sem nifTexto (2+
   candidatos sem desempate), ou nifOrigem fora de GiocoFaturas.NIF_ORIGENS_CONFIAVEIS
   ('generico' / ausente) → NÃO se escreve nada na ficha (nem NIF nem alias); o
   fornecedor vai para "manuais" com o motivo. O registo da fatura recebe na
   mesma nifTexto/nifCandidatos (é o que evita reler outra vez no futuro).

   Testes: scripts/testa-nif-backfill.js (Node, store em memória — nunca toca no RTDB).
*/
(function (global) {
  'use strict';

  function fabrica(GF) {
    if (!GF) throw new Error('gioco-nif-backfill.js: GiocoFaturas em falta (carregar gioco-faturas.js antes)');

    function temNifInfo(f) {
      return !!(f && (f.nifTexto || (Array.isArray(f.nifCandidatos) && f.nifCandidatos.length)));
    }

    // NIF que uma fatura propõe para GRAVAR: o nifTexto, válido, ≠ próprio, e com
    // nifOrigem de confiança ('vendorTaxId' | 'etiqueta' | 'pt' — Set/2026). Uma
    // origem 'generico' (única sequência de 9 dígitos solta) ou ausente (faturas
    // lidas antes de existir o campo) nunca chega à ficha por esta via.
    function nifDaFatura(f) {
      var cand = f.nifTexto ? GF.soDigitos(f.nifTexto) : '';
      if (!cand || !GF.nifValido(cand) || cand === GF.NIF_PROPRIO) return null;
      if (!GF.nifOrigemConfiavel(f.nifOrigem)) return null;
      return cand;
    }

    function motivoSemNif(f) {
      var cands = Array.isArray(f.nifCandidatos) ? f.nifCandidatos : [];
      var lido = f.nifTexto ? GF.soDigitos(f.nifTexto) : '';
      if (lido && lido === GF.NIF_PROPRIO) return 'o NIF lido é o da GIOCO';
      if (lido && !GF.nifValido(lido)) return 'NIF lido inválido (' + lido + ')';
      if (lido && f.nifOrigem === 'generico') return 'NIF ' + lido + ' sem etiqueta na fatura (origem genérica) — confirmar à mão';
      if (lido && !f.nifOrigem) return 'NIF ' + lido + ' lido antes de haver origem registada — confirmar à mão';
      if (!lido && cands.length > 1) return cands.length + ' NIFs candidatos, sem desempate';
      if (!lido && !cands.length) return 'nenhum NIF encontrado no ficheiro';
      return 'NIF não determinável';
    }

    function semNif(s) { return !s || !GF.soDigitos(s.nif); }

    function planear(suppliers, faturas, temArquivo) {
      suppliers = suppliers || {}; faturas = faturas || {};
      temArquivo = typeof temArquivo === 'function' ? temArquivo : function () { return null; };
      var porFornecedor = {};
      Object.keys(faturas).forEach(function (id) {
        var f = faturas[id];
        if (!f || !f.fornecedorIdEncontrado) return;
        (porFornecedor[f.fornecedorIdEncontrado] = porFornecedor[f.fornecedorIdEncontrado] || [])
          .push(Object.assign({ id: id }, f));
      });
      var plano = { semCusto: [], releitura: [], manuais: [], totalSemNif: 0 };
      Object.keys(suppliers).sort(function (a, b) {
        return String(suppliers[a].nome || '').localeCompare(String(suppliers[b].nome || ''));
      }).forEach(function (sid) {
        var s = suppliers[sid];
        if (!semNif(s)) return;
        plano.totalSemNif++;
        var nome = s.nome || sid;
        var lista = (porFornecedor[sid] || []).sort(function (a, b) { return (b.criadoEm || 0) - (a.criadoEm || 0); });
        if (!lista.length) { plano.manuais.push({ supplierId: sid, nome: nome, motivo: 'sem faturas ligadas' }); return; }
        var comNif = null, comArquivo = null;
        for (var i = 0; i < lista.length; i++) {
          if (!comNif && temNifInfo(lista[i])) comNif = lista[i];
          if (!comArquivo && temArquivo(lista[i].id) !== false) comArquivo = lista[i];
        }
        if (comNif && nifDaFatura(comNif)) {
          plano.semCusto.push({ supplierId: sid, nome: nome, fatura: comNif });
        } else if (comNif && !comArquivo) {
          plano.manuais.push({ supplierId: sid, nome: nome, motivo: motivoSemNif(comNif) });
        } else if (comArquivo) {
          // Com NIF gravado mas não de confiança (origem genérica ou sem origem),
          // reler dá a origem — vale a página.

          plano.releitura.push({ supplierId: sid, nome: nome, fatura: comArquivo });
        } else {
          plano.manuais.push({ supplierId: sid, nome: nome, motivo: 'sem ficheiro arquivado' });
        }
      });
      return plano;
    }

    // Pausa mínima entre o fim de um alvo com Azure e o início do seguinte com Azure:
    // o F0 aceita ~1 pedido/s e a fila sem pausa levava 429 em série (5 de 9 alvos na
    // primeira execução real). Não se aplica aos alvos sem Azure nem antes do primeiro.
    var PAUSA_ENTRE_ALVOS_MS = 2000;
    var MOTIVO_429 = 'limite de pedidos do Azure (F0)';

    function dormirPadrao(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    // Chama deps.ler com a política RETRY_429 do gioco-faturas.js. Um 429 no pedido
    // inicial repete-se (o Azure recusou, nada foi processado); um 429 que ESGOTOU o
    // polling dentro do analyzeInvoice (err.esgotado) não se repete — a análise já
    // correu e voltar a submeter gastava outra página. Qualquer outro erro sai à primeira.
    async function lerComRetry(deps, file, dormir, onEspera, alvo) {
      var tentativa = 0;
      while (true) {
        tentativa++;
        try {
          return await deps.ler(file, { sleep: dormir, onEspera: function (e) { onEspera(e.ms, e.tentativa); } });
        } catch (err) {
          var espera = (err && err.esgotado) ? null : GF.esperaRetry429(err, tentativa);
          if (espera === null) throw err;
          onEspera(espera, tentativa + 1);
          await dormir(espera);
        }
      }
    }

    async function executar(plano, deps) {
      deps = deps || {};
      var getSuppliers = deps.getSuppliers || function () { return {}; };
      var onProgresso = deps.onProgresso || function () {};
      var deveParar = deps.deveParar || function () { return false; };
      var dormir = deps.sleep || dormirPadrao;
      var rel = { gravados: [], falhados: [], manuais: (plano.manuais || []).slice(), saltados: [], paginasAzure: 0, parado: false };
      var fila = (plano.semCusto || []).map(function (a) { return Object.assign({ paga: false }, a); })
        .concat((plano.releitura || []).map(function (a) { return Object.assign({ paga: true }, a); }));
      var houveAzure = false;

      for (var i = 0; i < fila.length; i++) {
        if (deveParar()) { rel.parado = true; break; }
        var alvo = fila[i];
        var vivos = getSuppliers() || {};
        // Rule 7: a ficha pode ter aprendido o NIF entretanto — nunca gastar Azure à toa.
        if (!semNif(vivos[alvo.supplierId])) { rel.saltados.push({ supplierId: alvo.supplierId, nome: alvo.nome, motivo: 'já tem NIF' }); continue; }
        var prog = { indice: i + 1, total: fila.length, nome: alvo.nome };
        try {
          var fatura = alvo.fatura;
          if (alvo.paga) {
            var dataUrl = await deps.lerArquivo(fatura.id);
            var file = dataUrl ? deps.dataUrlParaFile(dataUrl, 'fatura-' + fatura.id) : null;
            if (!file) { rel.manuais.push({ supplierId: alvo.supplierId, nome: alvo.nome, motivo: 'sem ficheiro arquivado' }); continue; }
            if (houveAzure) {
              onProgresso(Object.assign({ fase: 'pausa', segundos: PAUSA_ENTRE_ALVOS_MS / 1000 }, prog));
              await dormir(PAUSA_ENTRE_ALVOS_MS);
            }
            houveAzure = true;
            onProgresso(Object.assign({ fase: 'ler' }, prog));
            var lida = await lerComRetry(deps, file, dormir, function (ms, tentativa) {
              onProgresso(Object.assign({ fase: 'espera', segundos: Math.round(ms / 1000), tentativa: tentativa }, prog));
            }, alvo);
            // Só conta a página quando o Azure devolveu resultado — um 429 recusou, não processou.
            rel.paginasAzure++;
            var cands = Array.isArray(lida.nifCandidatos) ? lida.nifCandidatos : [];
            // Só o NIF: os restantes campos do registo ficam como estavam.
            await deps.gravarNif(fatura.id, { nifTexto: lida.nif || null, nifCandidatos: cands.length ? cands : null, nifOrigem: lida.nifOrigem || null });
            fatura = Object.assign({}, fatura, { nifTexto: lida.nif || null, nifCandidatos: cands, nifOrigem: lida.nifOrigem || null });
          }
          if (!alvo.paga) onProgresso(Object.assign({ fase: 'gravar' }, prog));
          var nif = nifDaFatura(fatura);
          if (!nif) { rel.manuais.push({ supplierId: alvo.supplierId, nome: alvo.nome, motivo: motivoSemNif(fatura) }); continue; }
          await deps.aprender(alvo.supplierId, fatura);
          rel.gravados.push({ supplierId: alvo.supplierId, nome: alvo.nome, nif: nif });
        } catch (err) {
          var rateLimit = !!(err && err.status === 429);
          rel.falhados.push({
            supplierId: alvo.supplierId, nome: alvo.nome,
            motivo: rateLimit ? MOTIVO_429 : ((err && err.message) || String(err)),
            rateLimit: rateLimit,
            // O alvo inteiro, para "Repetir falhados" montar uma fila nova só com estes.
            alvo: { supplierId: alvo.supplierId, nome: alvo.nome, fatura: alvo.fatura }
          });
        }
      }
      return rel;
    }

    // Plano só com os falhados por 429 de um relatório (botão "Repetir falhados").
    function planoRepetir(rel) {
      return { semCusto: [], releitura: (rel && rel.falhados || []).filter(function (f) { return f.rateLimit && f.alvo; }).map(function (f) { return f.alvo; }), manuais: [], totalSemNif: 0 };
    }

    return { planear: planear, executar: executar, planoRepetir: planoRepetir, nifDaFatura: nifDaFatura, PAUSA_ENTRE_ALVOS_MS: PAUSA_ENTRE_ALVOS_MS, MOTIVO_429: MOTIVO_429 };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica;
  else global.giocoNifBackfill = fabrica;
})(typeof window !== 'undefined' ? window : this);
