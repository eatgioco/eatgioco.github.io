#!/usr/bin/env node
/* Testes do DIA DE OPERAÇÃO da vendas.html (Set/2026).
 *
 *   node scripts/testa-vendas-operacao.js
 *
 * A vendas.html é uma página só (HTML + JS inline) e não há build step, por
 * isso não há módulo para importar: este script EXTRAI do ficheiro as funções
 * puras que quer testar (pelo nome, até à chaveta de fecho ao nível da IIFE) e
 * corre-as num sandbox. Se alguma mudar de nome, o teste falha a dizer qual —
 * é de propósito: um teste que silenciosamente deixa de testar é pior do que
 * nenhum.
 *
 * Nada aqui toca no Firebase: as leituras e escritas são um objecto em memória.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');
let falhas = 0, passou = 0;

function ok(cond, msg){
  if (cond){ passou++; return; }
  falhas++;
  console.error('  ✗ ' + msg);
}
function igual(a, b, msg){
  ok(a === b, msg + ' — esperado ' + JSON.stringify(b) + ', deu ' + JSON.stringify(a));
}
function perto(a, b, msg, tol){
  tol = tol === undefined ? 0.005 : tol;
  ok(Math.abs(a - b) <= tol, msg + ' — esperado ' + b + ', deu ' + a);
}
function bloco(titulo){ console.log('\n' + titulo); }

/* ---------- extracção das funções da página ---------- */
function extrair(fonte, nomes, indent){
  indent = indent || '  ';
  const fechoFn = '\n' + indent + '}\n';
  let out = '';
  nomes.forEach(function(nome){
    const alvoFn = '\n' + indent + 'function ' + nome + '(';
    const alvoVar = '\n' + indent + 'var ' + nome + ' = ';
    let i = fonte.indexOf(alvoFn);
    if (i >= 0){
      const fim = fonte.indexOf(fechoFn, i);
      if (fim < 0) throw new Error('não encontrei o fim de function ' + nome);
      out += fonte.slice(i + 1, fim + fechoFn.length) + '\n';
      return;
    }
    i = fonte.indexOf(alvoVar);
    if (i < 0) throw new Error('não encontrei ' + nome + ' na página');
    const fimLinha = fonte.indexOf('\n', i + 1);
    let fim;
    if (fonte.slice(i + 1, fimLinha).trimEnd().endsWith(';')) fim = fimLinha;
    else {
      const f1 = fonte.indexOf('\n' + indent + '};', i);
      const f2 = fonte.indexOf('\n' + indent + '];', i);
      fim = (f1 < 0) ? f2 : (f2 < 0 ? f1 : Math.min(f1, f2));
      if (fim < 0) throw new Error('não encontrei o fim de var ' + nome);
      fim = fonte.indexOf('\n', fim + 1);
    }
    out += fonte.slice(i + 1, fim) + '\n\n';
  });
  return out;
}

/* ---------- mini-DOM de XML (o parseSaft usa 6 coisas) ---------- */
function montarXml(texto){
  let i = 0;
  function no(nome){
    return { localName: nome, filhos: [], texto: '', firstElementChild: null, nextElementSibling: null };
  }
  function fechar(n){
    for (let k = 0; k < n.filhos.length; k++){
      n.filhos[k].nextElementSibling = n.filhos[k + 1] || null;
    }
    n.firstElementChild = n.filhos[0] || null;
    Object.defineProperty(n, 'textContent', {
      get: function(){ return n.filhos.length ? n.filhos.map(function(f){ return f.textContent; }).join('') : n.texto; }
    });
    return n;
  }
  function parse(){
    while (texto[i] !== '<') i++;
    if (texto.slice(i, i + 2) === '<?'){ i = texto.indexOf('?>', i) + 2; return parse(); }
    const fimTag = texto.indexOf('>', i);
    const nome = texto.slice(i + 1, fimTag).split(/[\s/]/)[0];
    const auto = texto[fimTag - 1] === '/';
    i = fimTag + 1;
    const n = no(nome);
    if (auto) return fechar(n);
    for (;;){
      const prox = texto.indexOf('<', i);
      const bruto = texto.slice(i, prox);
      if (bruto.trim()) n.texto += bruto.trim();
      if (texto.slice(prox, prox + 2) === '</'){ i = texto.indexOf('>', prox) + 1; return fechar(n); }
      n.filhos.push(parse());
      i = i;
    }
  }
  const raiz = parse();
  return {
    documentElement: raiz,
    getElementsByTagName: function(){ return []; }
  };
}
function DOMParserShim(){}
DOMParserShim.prototype.parseFromString = function(txt){ return montarXml(txt); };

/* ---------- sandbox com a página dentro ---------- */
const fonteVendas = fs.readFileSync(path.join(RAIZ, 'vendas.html'), 'utf8');
const NOMES = [
  'TAXONOMIA', 'ERRO_FICHEIRO_INVALIDO', 'REGRAS_SUGESTAO', 'PARES_POR_DIA',
  'CORTE_DIA_OPERACAO_H', 'LIMIAR_SUSPEITA', 'HORA_CORTE_TURNO',
  'intFmt', 'keyFor', 'semAcentos', 'sugerirCategoria',
  'kids', 'kid', 'txt', 'numTxt',
  'somaDias', 'horaDoSistema', 'diaOperacao', 'diaFiscal',
  'horasOperacao', 'posOperacao',
  'novoDia', 'lerDocumento', 'agregarDocs', 'parseSaft',
  'round', 'ordemPares', 'topPares', 'construirPayload',
  'somaMapa', 'mergePayloads', 'arredondarMapa', 'arredondarPayload',
  'variacaoBruto', 'fundirDiaPayloads', 'dentroDoIntervalo', 'brutoDe',
  'planearImportOperacao', 'payloadDoMes',
  'giocoAcumuladoHoras', 'giocoTurnos'
];
const sandbox = { console: console, DOMParser: DOMParserShim, Date: Date, Math: Math, JSON: JSON };
vm.createContext(sandbox);
vm.runInContext(extrair(fonteVendas, NOMES) + '\nvar API = {' +
  NOMES.map(function(n){ return n + ':' + n; }).join(',') + '};', sandbox);
const V = sandbox.API;

/* ---------- SAF-T sintético ---------- */
/* Valores inconfundíveis e nenhuma escrita em lado nenhum: tudo em memória. */
let seq = 0;
function doc(fiscal, hora, valor, opts){
  opts = opts || {};
  seq++;
  return {
    numero: opts.numero || ('FS 1A2601/' + (3900 + seq)),
    fiscal: fiscal, hora: hora, valor: valor,
    anulado: !!opts.anulado,
    produto: opts.produto || 'FOC01'
  };
}
function saft(docs){
  const dias = docs.map(function(d){ return d.fiscal; }).sort();
  return '<?xml version="1.0" encoding="windows-1252"?>\n<AuditFile>' +
    '<Header><CompanyName>GIOCO</CompanyName><StartDate>' + dias[0] +
    '</StartDate><EndDate>' + dias[dias.length - 1] + '</EndDate></Header>' +
    '<SourceDocuments><SalesInvoices>' +
    docs.map(function(d){
      return '<Invoice>' +
        '<InvoiceNo>' + d.numero + '</InvoiceNo>' +
        '<DocumentStatus><InvoiceStatus>' + (d.anulado ? 'A' : 'N') + '</InvoiceStatus></DocumentStatus>' +
        '<InvoiceDate>' + d.fiscal + '</InvoiceDate>' +
        '<InvoiceType>FS</InvoiceType>' +
        '<SystemEntryDate>' + d.fiscal + 'T' + d.hora + ':00</SystemEntryDate>' +
        '<Line><ProductCode>' + d.produto + '</ProductCode>' +
        '<ProductDescription>Focaccia teste</ProductDescription>' +
        '<Quantity>1</Quantity><UnitPrice>' + d.valor + '</UnitPrice>' +
        '<CreditAmount>' + d.valor + '</CreditAmount>' +
        '<Tax><TaxPercentage>13</TaxPercentage></Tax></Line>' +
        '<DocumentTotals><GrossTotal>' + d.valor + '</GrossTotal><NetTotal>' + d.valor +
        '</NetTotal><Payment><PaymentMechanism>CD</PaymentMechanism>' +
        '<PaymentAmount>' + d.valor + '</PaymentAmount></Payment></DocumentTotals>' +
        '</Invoice>';
    }).join('') +
    '</SalesInvoices></SourceDocuments></AuditFile>';
}

const META = { importadoEm: '2026-09-17T09:00:00.000Z', ficheiro: 'teste.xml' };
const CATALOGO = { FOC01: { desc:'Focaccia teste', categoria:'Comida', subcategoria:'Focaccia' } };

/* "Loja" em memória: o que estaria em vendasDiario/. */
function importar(store, docs){
  const parsed = V.parseSaft(saft(docs));
  const aLer = {};
  Object.keys(parsed.docsPorDia).forEach(function(d){ aLer[d] = true; });
  Object.keys(parsed.diasFiscais).forEach(function(d){ aLer[d] = true; });
  const estadoDias = {};
  Object.keys(aLer).forEach(function(d){ estadoDias[d] = store[d] || null; });
  const res = V.planearImportOperacao({
    docsPorDia: parsed.docsPorDia, anuladosPorDia: parsed.anuladosPorDia,
    intervalo: parsed.intervalo, diasFiscais: parsed.diasFiscais,
    estadoDias: estadoDias, catalogo: CATALOGO, meta: META
  });
  return { parsed: parsed, res: res };
}
function aplicar(store, res){
  res.plano.forEach(function(e){
    if (e.gravar && res.payloads[e.dia]) store[e.dia] = res.payloads[e.dia];
  });
}
function total(store){
  return Object.keys(store).reduce(function(a, d){ return a + V.brutoDe(store[d]); }, 0);
}
/* Um dia "antigo": gravado pela DATA FISCAL, sem registo de documentos. */
function diaLegado(store, dia, docs){
  const parsed = V.parseSaft(saft(docs));
  const todos = [];
  Object.keys(parsed.docsPorDia).forEach(function(d){
    parsed.docsPorDia[d].forEach(function(x){ todos.push(x); });
  });
  const meus = todos.filter(function(d){ return d.fiscal === dia; })
    .map(function(d){ const c = Object.assign({}, d); c.diaOp = d.fiscal; return c; });
  const p = V.construirPayload(V.agregarDocs(meus), CATALOGO, META, V.PARES_POR_DIA);
  delete p.documentos;      // os dias antigos não têm registo
  delete p.madrugada;
  store[dia] = p;
}

/* ================================================================
   1. diaOperacao
   ================================================================ */
bloco('1. diaOperacao — o corte às ' + V.CORTE_DIA_OPERACAO_H + 'h');
igual(V.CORTE_DIA_OPERACAO_H, 5, 'o corte é às 5h');
igual(V.diaOperacao({ systemEntry:'2026-09-17T00:15:00', invoiceDate:'2026-09-17' }), '2026-09-16',
  'mesa fechada às 00:15 de 17/09 pertence ao dia 16 (o caso real)');
igual(V.diaOperacao({ systemEntry:'2026-09-16T01:00:00', invoiceDate:'2026-09-16' }), '2026-09-15',
  '01:00 de 16/09 pertence ao dia 15');
igual(V.diaOperacao({ systemEntry:'2026-10-01T00:30:00', invoiceDate:'2026-10-01' }), '2026-09-30',
  '01/10 00:30 → 30/09 (muda também o mês do nó)');
igual(V.diaOperacao({ systemEntry:'2026-01-01T02:00:00', invoiceDate:'2026-01-01' }), '2025-12-31',
  '01/01 02:00 → 31/12 do ano anterior');
igual(V.diaOperacao({ systemEntry:'2026-10-25T03:00:00', invoiceDate:'2026-10-25' }), '2026-10-24',
  '25/10/2026 (mudança de hora) 03:00 → 24/10');
igual(V.diaOperacao({ systemEntry:'2026-10-25T06:00:00', invoiceDate:'2026-10-25' }), '2026-10-25',
  '25/10/2026 06:00 fica no próprio dia');
igual(V.diaOperacao({ systemEntry:'2026-10-26T01:00:00', invoiceDate:'2026-10-26' }), '2026-10-25',
  '26/10 01:00 → 25/10 (o dia da mudança de hora recebe a madrugada seguinte)');
igual(V.diaOperacao({ systemEntry:'2026-09-17T04:59:59', invoiceDate:'2026-09-17' }), '2026-09-16',
  '04:59 ainda é do dia anterior');
igual(V.diaOperacao({ systemEntry:'2026-09-17T05:00:00', invoiceDate:'2026-09-17' }), '2026-09-17',
  '05:00 em ponto já é o dia novo');
igual(V.diaOperacao({ systemEntry:'', invoiceDate:'2026-09-17' }), '2026-09-17',
  'sem SystemEntryDate vale o InvoiceDate (que não traz hora)');
igual(V.diaOperacao({ systemEntry:'lixo', invoiceDate:'2026-03-01' }), '2026-03-01',
  'SystemEntryDate inválido cai no InvoiceDate');
igual(V.diaOperacao({ systemEntry:'', invoiceDate:'' }), '', 'sem data nenhuma devolve vazio');
igual(V.diaFiscal({ systemEntry:'2026-09-17T00:15:00', invoiceDate:'2026-09-17' }), '2026-09-17',
  'a data fiscal não se altera');
igual(V.somaDias('2026-03-01', -1), '2026-02-28', 'aritmética de datas: 01/03/2026 → 28/02');
igual(V.somaDias('2024-03-01', -1), '2024-02-29', 'ano bissexto');

/* ================================================================
   2. Horas na ordem do dia de operação
   ================================================================ */
bloco('2. Horas — a madrugada vem depois das 23h');
igual(V.horasOperacao()[0], 5, 'a primeira hora do dia de operação é as 5h');
igual(V.horasOperacao()[23], 4, 'a última é as 4h');
igual(V.posOperacao(0), 19, '0h está na 20.ª posição do dia');
ok(V.posOperacao(1) > V.posOperacao(23), '1h vem depois das 23h');
const ph = { 12:{bruto:100,docs:1}, 23:{bruto:50,docs:1}, 0:{bruto:30,docs:1}, 1:{bruto:20,docs:1} };
const a = V.giocoAcumuladoHoras(ph, 1, new Date(2026, 8, 17, 1, 30));
igual(a.primeira, 12, 'a primeira hora com dados é as 12h');
igual(a.ultima, 1, 'a última é a 1h da madrugada');
perto(a.acumulado[23], 150, 'às 23h já lá estão 150');
perto(a.acumulado[0], 180, 'a meia-noite acumula por cima das 23h');
perto(a.acumulado[1], 200, 'a 1h fecha o dia com 200');
perto(a.total, 200, 'total do dia');
perto(a.ateAgora, 180 + 20 * 0.5, 'à 1h30 o acumulado é 190 (metade da hora corrente)');
ok(!a.completo, 'à 1h30 o dia ainda não está completo');
ok(V.giocoAcumuladoHoras(ph, 1, new Date(2026, 8, 17, 3, 0)).completo,
  'às 3h, depois da última hora com dados, o dia está completo');
perto(V.giocoAcumuladoHoras(ph, 1, new Date(2026, 8, 17, 10, 0)).ateAgora, 0,
  'às 10h (antes de abrir) o acumulado é zero');
const t = V.giocoTurnos(ph, 1);
perto(t.t1.bruto, 100, 'o 1.º turno só tem as 12h');
perto(t.t2.bruto, 100, 'a madrugada conta para o 2.º turno, não para o 1.º');

/* A cópia do centro-de-controlo.html tem de dar exactamente o mesmo. */
const fonteCC = fs.readFileSync(path.join(RAIZ, 'centro-de-controlo.html'), 'utf8');
const sandboxCC = { console: console, Date: Date, Math: Math };
vm.createContext(sandboxCC);
vm.runInContext(extrair(fonteCC, ['CORTE_DIA_OPERACAO_H', 'horasOperacao', 'posOperacao', 'giocoAcumuladoHoras'], '    ') +
  '\nvar API = { CORTE_DIA_OPERACAO_H:CORTE_DIA_OPERACAO_H, giocoAcumuladoHoras:giocoAcumuladoHoras };', sandboxCC);
igual(sandboxCC.API.CORTE_DIA_OPERACAO_H, V.CORTE_DIA_OPERACAO_H, 'o corte é o mesmo nas duas páginas');
igual(JSON.stringify(sandboxCC.API.giocoAcumuladoHoras(ph, 1, new Date(2026, 8, 17, 1, 30))),
  JSON.stringify(a), 'a cópia do centro-de-controlo.html dá o mesmo resultado');

/* ================================================================
   3. Importar o mesmo ficheiro duas vezes não duplica nada
   ================================================================ */
bloco('3. Reimportação idempotente');
const docsA = [
  doc('2026-09-20', '12', 0.01), doc('2026-09-20', '20', 0.01),
  doc('2026-09-21', '02', 0.01), doc('2026-09-21', '13', 0.01)
];
const lojaA = {};
const i1 = importar(lojaA, docsA);
aplicar(lojaA, i1.res);
const totalDepois1 = total(lojaA);
perto(totalDepois1, 0.04, 'o primeiro import grava os 4 documentos');
perto(V.brutoDe(lojaA['2026-09-20']), 0.03, 'o doc das 02h do dia 21 foi para o dia 20');
ok(i1.res.verificacao.ok, 'verificação OK no primeiro import');
perto(i1.res.verificacao.novosTotal, 0.04, 'no primeiro import são todos novos para a OS');

const i2 = importar(lojaA, docsA);
aplicar(lojaA, i2.res);
perto(total(lojaA), totalDepois1, 'reimportar o mesmo ficheiro não muda os totais');
perto(i2.res.verificacao.deltaTotal, 0, 'a variação total da reimportação é zero');
perto(i2.res.verificacao.novosTotal, 0, 'nenhum documento é novo na reimportação');
ok(i2.res.verificacao.ok, 'verificação OK na reimportação');
const diaCoberto = i2.res.plano.filter(function(e){ return e.dia === '2026-09-20'; })[0];
igual(diaCoberto.acao, 'substituir', 'o dia 20 é coberto por inteiro (fiscais 20 e 21) → substituir');
const diaBorda = i2.res.plano.filter(function(e){ return e.dia === '2026-09-21'; })[0];
igual(diaBorda.acao, 'semAlteracao', 'o dia 21 só é tocado em parte e não ganha nada novo');

/* ================================================================
   4. O caso real: 15, 16 e 17 antigos + ficheiro de 16–17
   ================================================================ */
bloco('4. Caso real — dias antigos sem registo, ficheiro de 16 a 17');
const d15a = doc('2026-09-15', '12', 100), d15b = doc('2026-09-15', '20', 50);
const d16a = doc('2026-09-16', '01', 30), d16b = doc('2026-09-16', '13', 200), d16c = doc('2026-09-16', '21', 80);
const d17a = doc('2026-09-17', '00', 220), d17b = doc('2026-09-17', '14', 150);
const todos = [d15a, d15b, d16a, d16b, d16c, d17a, d17b];

const loja = {};
diaLegado(loja, '2026-09-15', todos);
diaLegado(loja, '2026-09-16', todos);
diaLegado(loja, '2026-09-17', todos);
perto(V.brutoDe(loja['2026-09-15']), 150, 'antes: dia 15 = 150 (pela data fiscal)');
perto(V.brutoDe(loja['2026-09-16']), 310, 'antes: dia 16 = 310');
perto(V.brutoDe(loja['2026-09-17']), 370, 'antes: dia 17 = 370 (com os 220 da madrugada)');
const antes = total(loja);
perto(antes, 830, 'antes: os três dias somam 830');

const imp = importar(loja, [d16a, d16b, d16c, d17a, d17b]);
const porDia = {};
imp.res.plano.forEach(function(e){ porDia[e.dia] = e; });
igual(porDia['2026-09-15'].acao, 'juntar', 'o dia 15 não está no ficheiro: junta-se a madrugada, não se substitui');
igual(porDia['2026-09-16'].acao, 'substituir', 'o dia 16 é substituído por inteiro');
igual(porDia['2026-09-17'].acao, 'substituir', 'o dia 17 é substituído por inteiro');
igual(porDia['2026-09-16'].reatribuidos, 1, 'o dia 16 recebe 1 documento da madrugada do 17');
igual(porDia['2026-09-15'].reatribuidos, 1, 'o dia 15 recebe 1 documento da madrugada do 16');
perto(imp.res.verificacao.deltaTotal, 0, 'a verificação dá variação total zero');
perto(imp.res.verificacao.novosTotal, 0, 'nenhum documento é novo para a OS');
ok(imp.res.verificacao.ok, 'verificação OK');
igual(imp.res.avisos.length, 0, 'sem avisos');

aplicar(loja, imp.res);
perto(V.brutoDe(loja['2026-09-15']), 180, 'depois: o dia 15 mantém os 150 e ganha os 30 da 01:00 do dia 16');
perto(V.brutoDe(loja['2026-09-16']), 500, 'depois: o dia 16 fica com 200+80+220 (o talão das 00:15 do 17)');
perto(V.brutoDe(loja['2026-09-17']), 150, 'depois: o dia 17 fica só com as vendas depois das 5h');
perto(total(loja), antes, 'a soma global dos três dias é igual antes e depois');
igual(!!loja['2026-09-16'].documentos[V.keyFor(d17a.numero)], true,
  'o documento das 00:15 do dia 17 está no registo do dia 16');
igual(!!(loja['2026-09-17'].documentos || {})[V.keyFor(d17a.numero)], false,
  'e já não está no dia 17');
igual(!!loja['2026-09-15'].documentos[V.keyFor(d16a.numero)], true,
  'o documento da 01:00 do dia 16 está no registo do dia 15');
perto(loja['2026-09-16'].madrugada.bruto, 220, 'a nota da madrugada do dia 16 vale 220');
igual(loja['2026-09-16'].madrugada.dataFiscal, '2026-09-17', 'e aponta para a data fiscal 17/09');
igual(loja['2026-09-16'].porHora[0].docs, 1, 'a hora 0 do dia 16 tem o documento da madrugada');
igual(loja['2026-09-16'].resumo.dias, 1, 'um dia continua a contar como um dia');

/* Reimportar o MESMO ficheiro por cima do resultado não mexe em nada. */
const imp2 = importar(loja, [d16a, d16b, d16c, d17a, d17b]);
perto(imp2.res.verificacao.deltaTotal, 0, 'reimportar o ficheiro do caso real não muda nada');
aplicar(loja, imp2.res);
perto(total(loja), antes, 'e os totais mantêm-se');

/* ================================================================
   5. Dia com registo, importação parcial
   ================================================================ */
bloco('5. Dia com registo, ficheiro que só o cobre em parte');
const lojaB = {};
const base = [doc('2026-09-20', '12', 0.01), doc('2026-09-21', '03', 0.01)];
aplicar(lojaB, importar(lojaB, base).res);
perto(V.brutoDe(lojaB['2026-09-20']), 0.02, 'o dia 20 arranca com 2 documentos');
const extra = doc('2026-09-20', '19', 0.01);
const parcial = importar(lojaB, [base[0], extra]);   // ficheiro só do dia fiscal 20
const e20 = parcial.res.plano.filter(function(x){ return x.dia === '2026-09-20'; })[0];
igual(e20.acao, 'juntar', 'sem o dia fiscal 21 no ficheiro, o dia 20 junta em vez de substituir');
igual(e20.docsNovos, 1, 'só 1 documento é novo');
aplicar(lojaB, parcial.res);
perto(V.brutoDe(lojaB['2026-09-20']), 0.03, 'o dia mantém o que tinha e ganha o novo');
igual(Object.keys(lojaB['2026-09-20'].documentos).length, 3, 'o registo passa a ter 3 documentos');
perto(lojaB['2026-09-20'].madrugada.bruto, 0.01, 'a madrugada não se perdeu na junção');
igual(lojaB['2026-09-20'].resumo.dias, 1, 'a junção não transformou o dia em dois dias');
igual(lojaB['2026-09-20'].porDiaSemana[new Date('2026-09-20T12:00:00').getDay()].dias, 1,
  'nem o contador de dias por dia da semana');

/* ================================================================
   6. Documento anulado numa segunda importação
   ================================================================ */
bloco('6. Anulação numa segunda importação');
const lojaC = {};
const dOk = doc('2026-09-20', '12', 0.01);
const dMau = doc('2026-09-20', '13', 0.01);
const dNoite = doc('2026-09-21', '02', 0.01);
aplicar(lojaC, importar(lojaC, [dOk, dMau, dNoite]).res);
perto(V.brutoDe(lojaC['2026-09-20']), 0.03, 'o dia 20 arranca com 3 documentos');
const dMauAnulado = Object.assign({}, dMau, { anulado: true });
const impAnul = importar(lojaC, [dOk, dMauAnulado, dNoite]);
const eAnul = impAnul.res.plano.filter(function(x){ return x.dia === '2026-09-20'; })[0];
igual(eAnul.acao, 'substituir', 'o dia está coberto por inteiro → substituir');
igual(eAnul.retiradosN, 1, 'um documento deixa de contar');
perto(impAnul.res.verificacao.deltaTotal, -0.01, 'a variação total é o valor do anulado');
ok(impAnul.res.verificacao.ok, 'a verificação conta com o documento retirado');
aplicar(lojaC, impAnul.res);
perto(V.brutoDe(lojaC['2026-09-20']), 0.02, 'o documento anulado deixou de contar');
igual(!!lojaC['2026-09-20'].documentos[V.keyFor(dMau.numero)], false, 'e saiu do registo');

/* Anulação num dia que o ficheiro só toca em parte: nunca se apaga às cegas. */
const lojaD = {};
aplicar(lojaD, importar(lojaD, [dOk, dMau, dNoite]).res);
const impParcial = importar(lojaD, [dOk, dMauAnulado]);   // sem o dia fiscal 21
ok(impParcial.res.avisos.length > 0, 'um anulado num dia só parcialmente coberto gera aviso');
ok(/anulado/.test(impParcial.res.avisos[0]), 'e o aviso diz o que se passa');

/* ================================================================
   7. Madrugada do dia 1: o mês anterior também é afectado
   ================================================================ */
bloco('7. Madrugada do dia 1 do mês');
const lojaE = {};
const impMes = importar(lojaE, [doc('2026-10-01', '01', 0.01), doc('2026-10-01', '13', 0.01)]);
const meses = {};
impMes.res.plano.forEach(function(e){ if (e.gravar) meses[e.mes] = true; });
ok(meses['2026-09'] && meses['2026-10'], 'a madrugada de 01/10 põe 2026-09 e 2026-10 na lista de meses a recalcular');
const e30 = impMes.res.plano.filter(function(x){ return x.dia === '2026-09-30'; })[0];
igual(e30.mes, '2026-09', 'o dia de operação 30/09 é do mês de Setembro');

/* ================================================================
   8. O mês continua a ser somado a partir dos dias
   ================================================================ */
bloco('8. Recomposição do mês');
const diasSet = {};
Object.keys(loja).forEach(function(d){ if (d.slice(0, 7) === '2026-09') diasSet[d] = loja[d]; });
const mes = V.payloadDoMes(diasSet, META);
perto(mes.resumo.bruto, 830, 'o mês soma os três dias de operação');
igual(mes.resumo.dias, 3, 'e conta 3 dias');
igual(mes.documentos === undefined, true, 'o nó do mês não ganha o registo de documentos');

/* ---------------------------------------------------------------- */
console.log('\n' + (falhas ? '✗ ' + falhas + ' falha(s), ' : '✓ ') + passou + ' verificações passaram.');
process.exit(falhas ? 1 : 0);
