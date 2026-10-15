/* gioco-pagamento-novo.js — criar um pedido de pagamento (Out/2026).

   A forma do registo em paymentRequests/ vivia escrita à mão em duas páginas:
   a pagamentos.html (pedido a fornecedor, com numeroReferencia N/MM/AA) e o
   mrn-dashboard.html (pagamento avulso, sem fornecedor). Este módulo é o
   ÚNICO sítio onde essa forma é montada; as páginas chamam-no em vez de a
   repetir. Expõe window.GiocoNovoPagamento:

     nextNumeroReferencia(allPaymentRequests, d) → 'N/MM/AA' (o contador do
         mês de d sobre os pedidos já gravados — igual ao de sempre)
     montanteCanonico(str) → { cents, montante } — montante é a string com
         ponto que o resto do OS lê com parseMontante ('120.5'); cents NaN
         quando o texto não é um valor. Aritmética em cêntimos inteiros.
     pedidoFornecedor({ supplier, montante, prazoIso, referencia, iban,
         notas, criadoPor, criadoPorId, numeroReferencia, hoje })
     pedidoAvulso({ descricao, montante, prazoIso, referencia, iban, notas,
         hoje })
         → o objecto completo a gravar (status 'pendente'; date DD/MM/AAAA de
           hoje; lines[0] = { fornecedor, montante, prazo DD/MM/AAAA,
           referencia, iban, banco [, notas] }). notas só existe quando
           preenchida — os leitores de sempre ignoram-na.
     compromissoFixo({ nome, categoria, valor, periodicidade, tipo, dia,
         meses, metodoPagamento, iban, notas, ativo, inicio })
         → a forma de um registo de compromissosFixos/ (Out/2026): a MESMA que
           o editor de compromissos da tesouraria.html grava (o editor
           acrescenta por cima valorDiario / derivaDe / pessoaId /
           parteRecibo / diaCartao). notas, iban (só com método 'iban') e
           inicio só existem quando preenchidos.
     compromissoRecorrente({ nome, categoria, valor, periodicidade, tipo,
         inicioIso, metodoPagamento, iban, notas }) → compromissoFixo com o
         dia do mês e a âncora de meses derivados da data da primeira
         ocorrência: dia = dia dessa data (29–31 nos meses mais curtos caem no
         último dia — resolveDia do gioco-compromissos.js); meses = [] na
         mensal, senão os meses a partir do da primeira ocorrência de 2 em 2
         (bimestral), 3 em 3 (trimestral) ou só esse (anual); inicio =
         inicioIso, para o gerador não criar ocorrências antes dela.
     abrir({ ref, refCompromissos, data, getSuppliers, getPaymentRequests,
         criadoPor, criadoPorId, onGravado(id, dataIso, modo) }) — formulário
         no giocoModal do shell, com data pré-preenchida (editável). Com
         refCompromissos aparece «Pontual | Recorrente» no topo (Pontual por
         omissão = o pedido de sempre em ref; Recorrente = um compromisso em
         refCompromissos). Grava com push().set() — um registo novo, nunca
         set()/update() no nó pai, nunca remove(). Sem email: o mailto da
         pagamentos.html é do fluxo da equipa; quem cria aqui é quem paga.
         modo = 'pontual' | 'recorrente'.

   Precisa do gioco-shell.js (giocoModal, parseValor, giocoValorErro) e do
   gioco-pagamento-novo.css. Não lê nem escreve mais nada no Firebase. */
(function(){
  'use strict';

  function pad2(n){ return n < 10 ? '0' + n : String(n); }
  function ddmmyyyy(d){ return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function isoToDDMMYYYY(iso){
    var p = String(iso || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }
  function isoValida(iso){
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false;
    var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    return d.getMonth() + 1 === +iso.slice(5, 7) && d.getDate() === +iso.slice(8, 10);
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function nextNumeroReferencia(all, d){
    var mm = pad2(d.getMonth() + 1);
    var aa = String(d.getFullYear()).slice(-2);
    var count = 0;
    Object.keys(all || {}).forEach(function(id){
      var nr = all[id] && all[id].numeroReferencia;
      if (!nr) return;
      var parts = String(nr).split('/');
      if (parts.length === 3 && parts[1] === mm && parts[2] === aa) count++;
    });
    return (count + 1) + '/' + mm + '/' + aa;
  }

  function montanteCanonico(str){
    var n = String(str || '').trim() === '' ? NaN : window.parseValor(str);
    var cents = isNaN(n) ? NaN : Math.round(n * 100);
    return { cents: cents, montante: isNaN(cents) ? '' : String(cents / 100) };
  }

  function linha(fornecedor, o, banco){
    var l = {
      fornecedor: fornecedor,
      montante: o.montante,
      prazo: isoToDDMMYYYY(o.prazoIso),
      referencia: o.referencia || '',
      iban: o.iban || '',
      banco: banco || ''
    };
    if (o.notas) l.notas = o.notas;
    return l;
  }

  function pedidoFornecedor(o){
    var s = o.supplier || {};
    return {
      date: ddmmyyyy(o.hoje || new Date()),
      status: 'pendente',
      origem: 'fornecedor',
      numeroReferencia: o.numeroReferencia,
      criadoPor: o.criadoPor || 'Outro',
      criadoPorId: o.criadoPorId || null,
      lines: [linha(s.nome || '', o, s.banco)]
    };
  }

  function pedidoAvulso(o){
    return {
      date: ddmmyyyy(o.hoje || new Date()),
      status: 'pendente',
      origem: 'avulso',
      lines: [linha(o.descricao, o, '')]
    };
  }

  /* ---------- compromissos fixos (recorrentes) ---------- */
  // Só as periodicidades do editor com âncora de meses definida; a
  // «Variável» do editor não diz em que meses cai e fica só lá.
  var PERIODICIDADES = [['mensal', 'Mensal', 1], ['bimestral', 'Bimestral', 2],
    ['trimestral', 'Trimestral', 3], ['anual', 'Anual', 12]];
  var CATEGORIAS = ['Pessoal', 'Espaço', 'Utilities', 'Serviços', 'Estado', 'Outros'];
  var MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function passoDe(periodicidade){
    var p = PERIODICIDADES.filter(function(x){ return x[0] === periodicidade; })[0];
    return p ? p[2] : 1;
  }

  // Meses ativos a partir do mês da primeira ocorrência. [] = todos (mensal),
  // que é como o editor grava «nenhum selecionado».
  function mesesDaPeriodicidade(periodicidade, mes){
    var passo = passoDe(periodicidade);
    if (passo === 1) return [];
    var out = [];
    for (var m = 1; m <= 12; m++){
      if (((m - mes) % passo + passo) % passo === 0) out.push(m);
    }
    return out;
  }

  function compromissoFixo(o){
    var r = {
      nome: o.nome,
      categoria: o.categoria || 'Outros',
      valor: o.valor,
      periodicidade: o.periodicidade,
      tipo: o.tipo,
      dia: o.dia,
      meses: o.meses || [],
      metodoPagamento: o.metodoPagamento,
      ativo: o.ativo !== false
    };
    if (o.notas) r.notas = o.notas;
    if (o.metodoPagamento === 'iban' && o.iban) r.iban = o.iban;
    if (o.inicio) r.inicio = o.inicio;
    return r;
  }

  function compromissoRecorrente(o){
    return compromissoFixo({
      nome: o.nome, categoria: o.categoria, valor: o.valor,
      periodicidade: o.periodicidade, tipo: o.tipo,
      dia: +o.inicioIso.slice(8, 10),
      meses: mesesDaPeriodicidade(o.periodicidade, +o.inicioIso.slice(5, 7)),
      metodoPagamento: o.metodoPagamento, iban: o.iban, notas: o.notas,
      ativo: true, inicio: o.inicioIso
    });
  }

  /* ---------- formulário ---------- */
  var aGravar = false;

  function abrir(opts){
    var suppliers = opts.getSuppliers() || {};
    var lista = Object.keys(suppliers).map(function(id){
      return { id: id, nome: (suppliers[id] && suppliers[id].nome) || '' };
    }).filter(function(s){ return s.nome; })
      .sort(function(a, b){ return a.nome.localeCompare(b.nome, 'pt'); });

    var f = document.createElement('form');
    f.className = 'pn-form';
    f.noValidate = true;
    var comRecorrente = !!opts.refCompromissos;
    f.innerHTML =
      (comRecorrente ?
        '<div class="pn-seg" role="radiogroup" aria-label="Pontual ou recorrente">' +
          '<button type="button" role="radio" data-modo="pontual" aria-checked="true">Pontual</button>' +
          '<button type="button" role="radio" data-modo="recorrente" aria-checked="false">Recorrente</button>' +
        '</div>' : '') +
      '<div class="pn-seg" role="radiogroup" aria-label="Tipo de pagamento">' +
        '<button type="button" role="radio" data-tipo="fornecedor" aria-checked="true">Fornecedor</button>' +
        '<button type="button" role="radio" data-tipo="avulso" aria-checked="false">Sem fornecedor</button>' +
      '</div>' +
      '<label class="pn-field" data-so="fornecedor"><span class="pn-label">Fornecedor</span>' +
        '<input type="search" name="fornecedor" list="pnFornecedores" autocomplete="off" placeholder="Pesquisar fornecedor…">' +
        '<datalist id="pnFornecedores">' + lista.map(function(s){ return '<option value="' + esc(s.nome) + '">'; }).join('') + '</datalist>' +
        '<span class="pn-erro" data-erro="fornecedor"></span></label>' +
      '<label class="pn-field" data-so="avulso" hidden><span class="pn-label">Descrição</span>' +
        '<input type="text" name="descricao" maxlength="120" autocomplete="off" placeholder="Ex.: Multa, Reparação">' +
        '<span class="pn-erro" data-erro="descricao"></span></label>' +
      '<div class="pn-linha" data-modo-so="recorrente" hidden>' +
        '<label class="pn-field"><span class="pn-label">Periodicidade</span>' +
          '<select name="periodicidade">' + PERIODICIDADES.map(function(p){
            return '<option value="' + p[0] + '">' + p[1] + '</option>';
          }).join('') + '</select></label>' +
        '<label class="pn-field"><span class="pn-label">Tipo</span>' +
          '<select name="tipoCusto"><option value="fixo">Fixo</option><option value="variavel">Variável</option></select></label>' +
      '</div>' +
      '<div class="pn-linha">' +
        '<label class="pn-field"><span class="pn-label" data-rotulo="valor">Valor (€)</span>' +
          '<input type="text" name="valor" inputmode="decimal" autocomplete="off" data-valor placeholder="0,00"></label>' +
        '<label class="pn-field"><span class="pn-label" data-rotulo="data">Data</span>' +
          '<input type="date" name="data" value="' + esc(opts.data || '') + '">' +
          '<span class="pn-erro" data-erro="data"></span></label>' +
      '</div>' +
      '<p class="pn-nota" data-modo-so="recorrente" data-nota="repete" hidden></p>' +
      '<div class="pn-linha" data-modo-so="recorrente" hidden>' +
        '<label class="pn-field"><span class="pn-label">Método</span>' +
          '<select name="metodo"><option value="iban">Transferência (IBAN)</option><option value="debito">Débito direto</option></select></label>' +
        '<label class="pn-field"><span class="pn-label">Categoria</span>' +
          '<select name="categoria">' + CATEGORIAS.map(function(c){
            return '<option value="' + esc(c) + '"' + (c === 'Outros' ? ' selected' : '') + '>' + esc(c) + '</option>';
          }).join('') + '</select></label>' +
      '</div>' +
      '<label class="pn-field" data-modo-so="pontual"><span class="pn-label">Referência <i>opcional</i></span>' +
        '<input type="text" name="referencia" autocomplete="off" placeholder="Fatura, entidade/referência MB…"></label>' +
      '<label class="pn-field" data-campo="iban"><span class="pn-label">IBAN <i>opcional</i></span>' +
        '<input type="text" name="iban" autocomplete="off" placeholder="PT50…"></label>' +
      '<label class="pn-field"><span class="pn-label">Notas <i>opcional</i></span>' +
        '<textarea name="notas" rows="2" maxlength="500"></textarea></label>' +
      '<p class="pn-erro pn-erro-geral" data-erro="geral"></p>' +
      '<div class="pn-acoes">' +
        '<button type="button" class="pn-btn-outline" data-acao="cancelar">Cancelar</button>' +
        '<button type="submit" class="btn-add">Criar pagamento</button>' +
      '</div>';

    var tipo = 'fornecedor';
    var modo = 'pontual';
    var el = function(n){ return f.elements[n]; };
    function erro(chave, msg){
      var e = f.querySelector('[data-erro="' + chave + '"]');
      if (e){ e.textContent = msg || ''; e.classList.toggle('on', !!msg); }
    }
    function supplierDoTexto(){
      var t = el('fornecedor').value.trim().toLowerCase();
      var s = lista.filter(function(x){ return x.nome.toLowerCase() === t; })[0];
      return s ? { id: s.id, dados: suppliers[s.id] } : null;
    }
    var ibanDoSupplier = '';

    // Visibilidade e rótulos dependem de três escolhas: fornecedor/sem,
    // pontual/recorrente e (no recorrente) o método e o tipo de custo.
    function sincronizar(){
      var rec = modo === 'recorrente';
      f.querySelectorAll('[data-so]').forEach(function(x){ x.hidden = x.getAttribute('data-so') !== tipo; });
      f.querySelectorAll('[data-modo-so]').forEach(function(x){ x.hidden = x.getAttribute('data-modo-so') !== modo; });
      f.querySelector('[data-campo="iban"]').hidden = rec && el('metodo').value !== 'iban';
      f.querySelector('[data-rotulo="valor"]').textContent =
        rec && el('tipoCusto').value === 'variavel' ? 'Valor estimado (€)' : 'Valor (€)';
      f.querySelector('[data-rotulo="data"]').textContent = rec ? 'Primeira ocorrência' : 'Data';
      f.querySelector('[type="submit"]').textContent = rec ? 'Criar pagamento recorrente' : 'Criar pagamento';
      notaRepete();
    }
    // «Repete …» por baixo da data: o dia e os meses que vão ser gravados,
    // para a âncora derivada da data não ser uma surpresa.
    function notaRepete(){
      var n = f.querySelector('[data-nota="repete"]');
      var iso = el('data').value;
      if (modo !== 'recorrente' || !isoValida(iso)){ n.textContent = ''; return; }
      var dia = +iso.slice(8, 10);
      var meses = mesesDaPeriodicidade(el('periodicidade').value, +iso.slice(5, 7));
      n.textContent = 'Repete ao dia ' + dia +
        (meses.length ? ' em ' + meses.map(function(m){ return MESES_CURTOS[m - 1]; }).join(' · ') : ' de cada mês') +
        (dia >= 29 ? ' (no último dia nos meses mais curtos)' : '') + ', a partir de ' + isoToDDMMYYYY(iso) + '.';
    }

    f.querySelectorAll('.pn-seg').forEach(function(seg){
      seg.addEventListener('click', function(ev){
        var b = ev.target.closest('[data-tipo], [data-modo]');
        if (!b) return;
        seg.querySelectorAll('[role="radio"]').forEach(function(x){
          x.setAttribute('aria-checked', x === b ? 'true' : 'false');
        });
        if (b.hasAttribute('data-modo')){ modo = b.getAttribute('data-modo'); sincronizar(); return; }
        tipo = b.getAttribute('data-tipo');
        sincronizar();
        erro('fornecedor'); erro('descricao');
        (tipo === 'fornecedor' ? el('fornecedor') : el('descricao')).focus();
      });
    });
    ['periodicidade', 'tipoCusto', 'metodo'].forEach(function(n){ el(n).addEventListener('change', sincronizar); });
    el('data').addEventListener('input', notaRepete);
    el('data').addEventListener('change', notaRepete);

    // Fornecedor escolhido → IBAN da ficha (editável). Só substitui o IBAN se
    // o campo estiver vazio ou ainda com o da ficha anterior.
    el('fornecedor').addEventListener('input', function(){
      var s = supplierDoTexto();
      erro('fornecedor');
      var novo = s ? (s.dados.iban || '') : '';
      if (!el('iban').value || el('iban').value === ibanDoSupplier) el('iban').value = novo;
      ibanDoSupplier = novo;
    });

    f.querySelector('[data-acao="cancelar"]').addEventListener('click', function(){ window.giocoModal.close(); });

    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      if (aGravar) return;
      erro('geral');
      var ok = true;
      var s = null, descricao = '';
      if (tipo === 'fornecedor'){
        s = supplierDoTexto();
        if (!s){ erro('fornecedor', 'Escolhe um fornecedor da lista, ou muda para «Sem fornecedor».'); ok = false; }
      } else {
        descricao = el('descricao').value.trim();
        if (!descricao){ erro('descricao', 'Escreve uma descrição.'); ok = false; }
      }
      var v = montanteCanonico(el('valor').value);
      var valorMau = isNaN(v.cents) || v.cents <= 0;
      window.giocoValorErro(el('valor'), valorMau ? 'Escreve um valor maior do que zero (ex.: 120,50)' : null);
      if (valorMau) ok = false;
      var dataIso = el('data').value;
      if (!isoValida(dataIso)){ erro('data', 'Escolhe a data.'); ok = false; } else erro('data');
      if (!ok) return;

      if (modo === 'recorrente'){
        gravar(opts.refCompromissos, compromissoRecorrente({
          nome: tipo === 'fornecedor' ? s.dados.nome : descricao,
          categoria: el('categoria').value,
          valor: v.cents / 100,
          periodicidade: el('periodicidade').value,
          tipo: el('tipoCusto').value,
          inicioIso: dataIso,
          metodoPagamento: el('metodo').value,
          iban: el('iban').value.trim(),
          notas: el('notas').value.trim()
        }), dataIso);
        return;
      }

      var base = {
        montante: v.montante,
        prazoIso: dataIso,
        referencia: el('referencia').value.trim(),
        iban: el('iban').value.trim(),
        notas: el('notas').value.trim()
      };
      var pedido;
      if (tipo === 'fornecedor'){
        base.supplier = s.dados;
        base.criadoPor = opts.criadoPor;
        base.criadoPorId = opts.criadoPorId;
        base.numeroReferencia = nextNumeroReferencia(opts.getPaymentRequests(), new Date());
        pedido = pedidoFornecedor(base);
      } else {
        base.descricao = descricao;
        pedido = pedidoAvulso(base);
      }

      gravar(opts.ref, pedido, dataIso);
    });

    function gravar(ref, registo, dataIso){
      aGravar = true;
      var btn = f.querySelector('[type="submit"]');
      btn.disabled = true;
      var novo = ref.push();
      novo.set(registo).then(function(){
        aGravar = false;
        window.giocoModal.close();
        if (opts.onGravado) opts.onGravado(novo.key, dataIso, modo);
      }).catch(function(e){
        aGravar = false;
        btn.disabled = false;
        erro('geral', 'Não foi possível gravar: ' + ((e && e.message) || 'erro desconhecido') + '. Tenta de novo.');
      });
    }

    sincronizar();
    window.giocoModal.open({ titulo: 'Novo pagamento', conteudo: f });
    el('fornecedor').focus();
  }

  /* ---------- toast curto ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg){
    if (!toastEl){
      toastEl = document.createElement('div');
      toastEl.className = 'pn-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('on'); }, 2800);
  }

  window.GiocoNovoPagamento = {
    nextNumeroReferencia: nextNumeroReferencia,
    montanteCanonico: montanteCanonico,
    pedidoFornecedor: pedidoFornecedor,
    pedidoAvulso: pedidoAvulso,
    compromissoFixo: compromissoFixo,
    compromissoRecorrente: compromissoRecorrente,
    mesesDaPeriodicidade: mesesDaPeriodicidade,
    abrir: abrir,
    toast: toast
  };
})();
