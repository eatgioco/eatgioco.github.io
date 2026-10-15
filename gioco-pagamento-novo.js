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
     abrir({ ref, data, getSuppliers, getPaymentRequests, criadoPor,
         criadoPorId, onGravado(id, dataIso) }) — formulário no giocoModal do
         shell, com data pré-preenchida (editável). Grava com
         ref.push().set(pedido) — um registo novo, nunca set()/update() no nó
         pai, nunca remove(). Sem email: o mailto da pagamentos.html é do
         fluxo da equipa; quem cria aqui é quem paga.

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
    f.innerHTML =
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
      '<div class="pn-linha">' +
        '<label class="pn-field"><span class="pn-label">Valor (€)</span>' +
          '<input type="text" name="valor" inputmode="decimal" autocomplete="off" data-valor placeholder="0,00"></label>' +
        '<label class="pn-field"><span class="pn-label">Data</span>' +
          '<input type="date" name="data" value="' + esc(opts.data || '') + '">' +
          '<span class="pn-erro" data-erro="data"></span></label>' +
      '</div>' +
      '<label class="pn-field"><span class="pn-label">Referência <i>opcional</i></span>' +
        '<input type="text" name="referencia" autocomplete="off" placeholder="Fatura, entidade/referência MB…"></label>' +
      '<label class="pn-field"><span class="pn-label">IBAN <i>opcional</i></span>' +
        '<input type="text" name="iban" autocomplete="off" placeholder="PT50…"></label>' +
      '<label class="pn-field"><span class="pn-label">Notas <i>opcional</i></span>' +
        '<textarea name="notas" rows="2" maxlength="500"></textarea></label>' +
      '<p class="pn-erro pn-erro-geral" data-erro="geral"></p>' +
      '<div class="pn-acoes">' +
        '<button type="button" class="pn-btn-outline" data-acao="cancelar">Cancelar</button>' +
        '<button type="submit" class="btn-add">Criar pagamento</button>' +
      '</div>';

    var tipo = 'fornecedor';
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

    f.querySelector('.pn-seg').addEventListener('click', function(ev){
      var b = ev.target.closest('[data-tipo]');
      if (!b) return;
      tipo = b.getAttribute('data-tipo');
      f.querySelectorAll('.pn-seg [data-tipo]').forEach(function(x){
        x.setAttribute('aria-checked', x === b ? 'true' : 'false');
      });
      f.querySelectorAll('[data-so]').forEach(function(x){ x.hidden = x.getAttribute('data-so') !== tipo; });
      erro('fornecedor'); erro('descricao');
      (tipo === 'fornecedor' ? el('fornecedor') : el('descricao')).focus();
    });

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

      aGravar = true;
      var btn = f.querySelector('[type="submit"]');
      btn.disabled = true;
      var novo = opts.ref.push();
      novo.set(pedido).then(function(){
        aGravar = false;
        window.giocoModal.close();
        if (opts.onGravado) opts.onGravado(novo.key, dataIso);
      }).catch(function(e){
        aGravar = false;
        btn.disabled = false;
        erro('geral', 'Não foi possível gravar: ' + ((e && e.message) || 'erro desconhecido') + '. Tenta de novo.');
      });
    });

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
    abrir: abrir,
    toast: toast
  };
})();
