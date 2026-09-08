/* gioco-correspondencia.js — motor de correspondência entre UM valor
   esperado (um pagamento, um depósito, um débito directo) e os movimentos
   bancários que o podem explicar (Set/2026).

   Função PURA: sem Firebase, sem DOM, sem dependências. Recebe os
   movimentos já filtrados pelo chamador (livres, da família certa, sem
   INTERNA, sem os excluídos) e devolve só a decisão. Quem chama continua
   responsável por disputas entre itens, escritas e UI.

   Usado por: gioco-reconciliacao.js (pagamentos DBIT em modo único,
   débitos directos de valor fixo e variável) e mrn-dashboard.html
   (depósitos de caixa/cofre ↔ créditos da ABANCA). Nunca reimplementar
   por página.

     giocoCorrespondencia({
       cents,                       // inteiro em cêntimos, ou null (só descritivo)
       dia,                         // âncora 'AAAA-MM-DD'
       janela: { antes, depois },   // dias à volta da âncora (inclusive)
       movimentos,                  // [{ id, dia:'AAAA-MM-DD', cents, desc?, conta? }]
       toleranciaCents = 0,         // só na estratégia 'exacto'
       descritivosConhecidos = [],  // descritivos já confirmados (crus ou normalizados)
       regexFallback = null,        // regex de arranque para o descritivo
       aprendido = false,           // padrão de descritivo consistente → confirma sozinho
       estrategias = ['exacto', 'soma2', 'descritivo']
     })
     → { estado:     'confirmado' | 'sugestao' | 'ambiguo' | 'semCandidato',
         movimentos: [...],         // os do resultado (1, ou 2 no soma2); [] se não há
         estrategia: 'exacto' | 'soma2' | 'descritivo' | null,
         confianca:  'alta' | 'media' | 'baixa' | null,
         candidatos: [[...], ...] } // grupos candidatos (1 ou 2 movs cada), por ordem de data

   PIPELINE — pára na primeira estratégia com resultado não vazio:
   1. exacto: movimentos na janela com os mesmos cêntimos (± toleranciaCents).
      1 → confirmado/alta · 2+ → ambiguo (candidatos = um grupo por movimento).
   2. soma2: PARES de movimentos do MESMO dia de banco (e da mesma conta,
      quando a têm) cuja soma bate exactamente. 1 par → confirmado/alta ·
      2+ pares → ambiguo. O tecto é fixo em 2 — nunca 3+ — porque uma soma de
      N acaba sempre por bater com alguma coisa.
   3. descritivo: só quando cents é null OU 1 e 2 devolveram zero. Raiz
      normalizada (normalizarDescritivo) de um movimento na janela bate num
      descritivo conhecido → 1: confirmado/alta se aprendido, senão
      sugestao/media · 2+: ambiguo. Sem histórico a bater, a regexFallback
      → 1: sugestao/baixa · 2+: ambiguo.
   4. Nada → semCandidato.

   Ordem: os movimentos são ordenados por dia e depois por id ANTES de tudo,
   por isso os candidatos saem sempre por data — quem quiser "o mais antigo"
   (dashboard de depósitos) pega em candidatos[0] sem lógica própria. */

(function(root){
  'use strict';

  // Raiz comparável de um descritivo bancário — maiúsculas, sem dígitos
  // (datas e referências são feitas de dígitos) nem pontuação, espaços
  // colapsados. "IBELECTRA FT202609123" e "IBELECTRA FT202608091" dão a
  // mesma raiz "IBELECTRA FT". A ÚNICA versão desta função no OS: o
  // gioco-reconciliacao.js delega aqui.
  function normalizarDescritivo(desc){
    var s = String(desc || '').toUpperCase();
    s = s.replace(/[0-9]/g, ' ');
    s = s.replace(/[^A-Z ]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  function diasEntre(diaA, diaB){
    var a = Date.parse(diaA + 'T00:00:00Z');
    var b = Date.parse(diaB + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function ordenar(movs){
    return movs.slice().sort(function(a, b){
      if (a.dia !== b.dia) return a.dia < b.dia ? -1 : 1;
      var ia = String(a.id == null ? '' : a.id), ib = String(b.id == null ? '' : b.id);
      return ia < ib ? -1 : (ia > ib ? 1 : 0);
    });
  }

  function resultado(estado, movimentos, estrategia, confianca, candidatos){
    return { estado: estado, movimentos: movimentos || [], estrategia: estrategia || null,
             confianca: confianca || null, candidatos: candidatos || [] };
  }

  function exacto(cents, movs, tol){
    if (cents === null || cents === undefined) return [];
    return movs.filter(function(m){
      return tol ? Math.abs(m.cents - cents) <= tol : m.cents === cents;
    }).map(function(m){ return [m]; });
  }

  function soma2(cents, movs){
    if (cents === null || cents === undefined) return [];
    var pares = [];
    for (var i = 0; i < movs.length; i++){
      for (var j = i + 1; j < movs.length; j++){
        var a = movs[i], b = movs[j];
        if (a.dia !== b.dia) continue;
        if (a.conta !== undefined && b.conta !== undefined && a.conta !== b.conta) continue;
        if (a.cents + b.cents !== cents) continue;
        pares.push([a, b]);
      }
    }
    return pares;
  }

  function descritivo(movs, conhecidos, regex, aprendido){
    var raizes = (conhecidos || []).map(normalizarDescritivo).filter(Boolean);
    if (raizes.length){
      var porHistorico = movs.filter(function(m){ return raizes.indexOf(normalizarDescritivo(m.desc)) !== -1; });
      if (porHistorico.length) return { grupos: porHistorico.map(function(m){ return [m]; }), confianca: aprendido ? 'alta' : 'media', confirma: !!aprendido };
    }
    if (regex){
      var porRegex = movs.filter(function(m){ return regex.test(String(m.desc || '')); });
      if (porRegex.length) return { grupos: porRegex.map(function(m){ return [m]; }), confianca: 'baixa', confirma: false };
    }
    return { grupos: [], confianca: null, confirma: false };
  }

  function giocoCorrespondencia(opts){
    opts = opts || {};
    var cents = (opts.cents === undefined) ? null : opts.cents;
    var janela = opts.janela || { antes: 0, depois: 0 };
    var estrategias = opts.estrategias || ['exacto', 'soma2', 'descritivo'];
    var tol = opts.toleranciaCents || 0;

    var naJanela = ordenar((opts.movimentos || []).filter(function(m){
      if (!m || !m.dia || !opts.dia) return false;
      if (typeof m.cents !== 'number') return false;
      var d = diasEntre(opts.dia, m.dia);
      return d !== null && d >= -janela.antes && d <= janela.depois;
    }));

    var grupos;
    if (cents !== null && estrategias.indexOf('exacto') !== -1){
      grupos = exacto(cents, naJanela, tol);
      if (grupos.length === 1) return resultado('confirmado', grupos[0], 'exacto', 'alta', grupos);
      if (grupos.length >= 2) return resultado('ambiguo', [], 'exacto', null, grupos);
    }
    if (cents !== null && estrategias.indexOf('soma2') !== -1){
      grupos = soma2(cents, naJanela);
      if (grupos.length === 1) return resultado('confirmado', grupos[0], 'soma2', 'alta', grupos);
      if (grupos.length >= 2) return resultado('ambiguo', [], 'soma2', null, grupos);
    }
    if (estrategias.indexOf('descritivo') !== -1){
      var r = descritivo(naJanela, opts.descritivosConhecidos, opts.regexFallback, opts.aprendido);
      if (r.grupos.length === 1) return resultado(r.confirma ? 'confirmado' : 'sugestao', r.grupos[0], 'descritivo', r.confianca, r.grupos);
      if (r.grupos.length >= 2) return resultado('ambiguo', [], 'descritivo', null, r.grupos);
    }
    return resultado('semCandidato', [], null, null, []);
  }

  giocoCorrespondencia.normalizarDescritivo = normalizarDescritivo;
  giocoCorrespondencia.diasEntre = diasEntre;

  root.giocoCorrespondencia = giocoCorrespondencia;
  if (typeof module !== 'undefined' && module.exports) module.exports = giocoCorrespondencia;
})(typeof window !== 'undefined' ? window : this);
