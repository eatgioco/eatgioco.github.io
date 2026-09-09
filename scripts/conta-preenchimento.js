#!/usr/bin/env node
/* ==========================================================================
   GIOCO OS — scripts/conta-preenchimento.js
   Quantos ingredientes ainda não estão prontos para a contagem física.

   Imprime os MESMOS cinco números da barra de estado da gestao.html
   (activos · sem unidade · sem contagem · sem formato de compra · sem preço)
   mais um sexto que a barra não mostra: quantos têm sugestão automática de
   fator disponível a partir do nome ou dos aliases — ou seja, quanto do
   trabalho fica feito num clique.

   NÃO reimplementa a lógica: extrai o bloco de helpers do próprio
   gestao.html e avalia-o. Se alguém mudar a regra na página, este script
   muda com ela; se o bloco for movido ou renomeado, este script FALHA em
   vez de responder um número desactualizado.

   Só leitura — nunca escreve no Firebase.

   Uso (Node 18+, sem dependências):
     node scripts/conta-preenchimento.js              # vai buscar ao RTDB
     node scripts/conta-preenchimento.js dump.json    # ou a um dump local
     node scripts/conta-preenchimento.js --lista      # + os nomes por resolver

   Se a rede não deixar chegar ao RTDB, grava o nó à mão a partir do browser
   (F12 → Network, ou o próprio URL abaixo) e passa o ficheiro como argumento.
   ========================================================================== */

'use strict';
var fs = require('fs');
var path = require('path');

var RTDB = 'https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app';
var RAIZ = path.join(__dirname, '..');

// ---------- 1. Helpers, tirados do gestao.html ----------
// Delimitados por duas âncoras estáveis: se qualquer uma desaparecer, o
// script pára com uma mensagem clara em vez de calcular com lógica velha.
function helpersDaPagina() {
  var html = fs.readFileSync(path.join(RAIZ, 'gestao.html'), 'utf8');
  function entre(de, ate, o_que) {
    var i = html.indexOf(de), f = html.indexOf(ate);
    if (i === -1 || f === -1 || f <= i) {
      throw new Error('Não encontrei ' + o_que + ' no gestao.html (âncora "' +
        (i === -1 ? de : ate).trim() + '"). O ficheiro mudou — actualiza este script.');
    }
    return html.slice(i, f);
  }
  return [
    entre('  function escapeHtml(s)', '  function igual(a, b)', 'os formatadores'),
    entre('  var UNIDADES_BASE = [', '  var TIPO_ARMAZENAMENTO = [', 'as unidades e o labelUnidade'),
    entre('  function temContagemPropria(ing)', '  function slugFoto(nome)', 'o bloco de preenchimento')
  ].join('\n');
}

// O gioco-custos.js é uma IIFE de browser que se pendura no objecto global
// (`window`, ou `this` fora dele). Um eval indirecto corre em escopo global,
// por isso o GiocoCustos aparece no globalThis do Node sem tocar no ficheiro.
(0, eval)(fs.readFileSync(path.join(RAIZ, 'gioco-custos.js'), 'utf8'));
var GiocoCustos = globalThis.GiocoCustos;
if (!GiocoCustos) throw new Error('O gioco-custos.js não expôs GiocoCustos — mudou de forma?');

// O bloco extraído usa `normalizar`, que na página é um var do escopo de cima:
// reinjecta-se aqui a MESMA função (a do gioco-custos.js), nunca uma cópia.
var api = new Function('GiocoCustos',
  'var normalizar = GiocoCustos.normalizarTexto;\n' + helpersDaPagina() + `
  ;return { temContagemPropria:temContagemPropria, temCompra:temCompra, temPreco:temPreco,
            ativo:ativo, FILTROS_ESTADO:FILTROS_ESTADO, sugerirFator:sugerirFator,
            avisosContagem:avisosContagem };
`)(GiocoCustos);

// ---------- 2. Dados ----------
function carregar(arg) {
  if (arg && arg !== '--lista') {
    return Promise.resolve(JSON.parse(fs.readFileSync(arg, 'utf8')));
  }
  return fetch(RTDB + '/ingredientes.json').then(function (r) {
    if (!r.ok) throw new Error('RTDB respondeu ' + r.status);
    return r.json();
  });
}

// ---------- 3. Contagem ----------
var args = process.argv.slice(2);
var listar = args.indexOf('--lista') !== -1;
var ficheiro = args.filter(function (a) { return a !== '--lista'; })[0];

carregar(ficheiro).then(function (ingredientes) {
  ingredientes = ingredientes || {};
  var todos = Object.keys(ingredientes);
  var activos = todos.filter(function (id) { return api.ativo(ingredientes[id]); });
  var arquivados = todos.length - activos.length;

  console.log('\nIngredientes: ' + todos.length + ' no nó · ' + activos.length +
              ' activos · ' + arquivados + ' arquivados\n');
  console.log('Barra de estado da gestao.html');
  console.log('  ' + activos.length + ' activos');
  api.FILTROS_ESTADO.forEach(function (f) {
    var n = activos.filter(function (id) { return f.teste(ingredientes[id]); }).length;
    console.log('  ' + String(n).padStart(3) + ' ' + f.label);
  });

  // Sugestão automática de fator: só conta para quem ainda não tem contagem
  // própria (quem já a tem não precisa de sugestão nenhuma).
  var semContagem = activos.filter(function (id) { return !api.temContagemPropria(ingredientes[id]); });
  var comSugestao = [], semSugestao = [];
  semContagem.forEach(function (id) {
    var s = api.sugerirFator(ingredientes[id]);
    (s ? comSugestao : semSugestao).push({ id:id, nome:ingredientes[id].nome || id, sug:s });
  });

  console.log('\nSugestão automática de fator (dos ' + semContagem.length + ' sem contagem própria)');
  console.log('  ' + String(comSugestao.length).padStart(3) + ' com sugestão — um clique em "usar"');
  console.log('  ' + String(semSugestao.length).padStart(3) + ' sem sugestão — à mão');
  var semUnidade = semSugestao.filter(function (x) { return !ingredientes[x.id].unidade; }).length;
  if (semUnidade) {
    console.log('      (' + semUnidade + ' desses nem sequer têm unidade base: com ela definida,' +
                ' alguns passam a ter sugestão)');
  }

  if (listar) {
    console.log('\nCom sugestão:');
    comSugestao.forEach(function (x) {
      console.log('  ' + x.nome.padEnd(44) + ' → ' + x.sug.fator + ' ' +
                  (ingredientes[x.id].unidade || '?') + '  (de "' + x.sug.texto + '" no ' + x.sug.origem + ')');
    });
    console.log('\nSem sugestão:');
    semSugestao.forEach(function (x) {
      console.log('  ' + x.nome.padEnd(44) + ' unidade base: ' + (ingredientes[x.id].unidade || '—'));
    });
  }

  // Avisos já presentes nos dados de hoje.
  var comAviso = activos.filter(function (id) { return api.avisosContagem(ingredientes[id]).length; });
  console.log('\nRegistos activos que já entram com ⚠: ' + comAviso.length);
  if (listar) {
    comAviso.forEach(function (id) {
      console.log('  ' + (ingredientes[id].nome || id));
      api.avisosContagem(ingredientes[id]).forEach(function (a) { console.log('      · ' + a); });
    });
  }
  console.log('');
}).catch(function (e) {
  console.error('\nFalhou: ' + e.message);
  console.error('Se foi a rede, abre ' + RTDB + '/ingredientes.json no browser,');
  console.error('grava o JSON e corre: node scripts/conta-preenchimento.js <ficheiro>\n');
  process.exit(1);
});
