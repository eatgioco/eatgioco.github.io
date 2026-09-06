/* ==========================================================================
   GIOCO OS — gioco-eventos.js
   Motor partilhado dos EVENTOS da agenda (nó eventos/): categorias,
   normalização, formulário do modal (giocoModal), validação e as ÚNICAS
   escritas no nó. Extraído da calendario.html em Set/2026 sem alterar
   comportamento; usado pela calendario.html e pelo mrn-dashboard.html
   (botão "Agendar" nos pedidos da loja). Nunca reimplementar por página.

   NÓ eventos/{pushId} = {
     titulo (trim, máx 120), data 'AAAA-MM-DD', diaInteiro (bool),
     horaInicio 'HH:MM' e horaFim 'HH:MM' (AUSENTES se diaInteiro; fim > início),
     categoria ∈ pessoal | trabalho | reuniao | loja | prazo | outro,
     notas? (máx 2000, ausente se vazio),
     origem ('manual' | 'lojaPedido'; no futuro 'outlook', 'tesouraria'…),
     ligacao? ({ tipo:'lojaPedido', id:<chave de lojaPedidos> } — só quando
       o evento nasce de outro registo; nunca é editado depois),
     criadoEm, atualizadoEm (ms), anulado (bool), anuladoEm? (ms)
   }

   REGRAS DE ESCRITA (as mesmas de sempre):
   - criar  = push().set() com o objeto completo — o ÚNICO set() no nó do
     evento, e só na criação (criar(v, extra): extra junta origem/ligacao);
   - editar = um set() por campo alterado em eventos/{id}/{campo} +
     eventos/{id}/atualizadoEm; remove() SÓ nas folhas horaInicio/horaFim/
     notas quando deixam de existir;
   - anular = dois set() (anulado:true, anuladoEm). NUNCA remove() do evento,
     NUNCA set()/update() no nó pai depois de criado. Sem restauro.
   A flag aGravar (dois cliques rápidos) vive aqui dentro.

   USO:
     var EV = giocoEventosEngine({ eventosRef: db.ref('eventos'), giocoModal: giocoModal });
     EV.abrirNovo({ data:'2026-09-10' });                       // modal "Novo evento"
     EV.abrirNovo(pre, { extra:{origem:'lojaPedido', ligacao:{…}}, onGravado:function(id){} });
     EV.abrirEditar(id, bruto, { antes:<Node>, onAnulado:function(){} });
     EV.normalizar(id, bruto) → item da lista normalizada (null se anulado/inválido)
   O CSS do formulário está em gioco-eventos.css (prefixo .ev-).
   ========================================================================== */
function giocoEventosEngine(deps){
  'use strict';
  deps = deps || {};
  var eventosRef = deps.eventosRef;
  var modal = deps.giocoModal || window.giocoModal;

  var CATEGORIAS = [
    { id: 'pessoal',  label: 'Pessoal',  cor: 'var(--lime)',    texto: '#141414' },
    { id: 'trabalho', label: 'Trabalho', cor: 'var(--navy)',    texto: '#FFFFFF' },
    { id: 'reuniao',  label: 'Reunião',  cor: 'var(--mustard)', texto: '#141414' },
    { id: 'loja',     label: 'Loja',     cor: 'var(--red)',     texto: 'var(--on-red)' },
    { id: 'prazo',    label: 'Prazo',    cor: 'var(--blush)',   texto: '#141414' },
    { id: 'outro',    label: 'Outro',    cor: 'var(--sky)',     texto: '#141414' }
  ];
  function categoria(id) {
    for (var i = 0; i < CATEGORIAS.length; i++) if (CATEGORIAS[i].id === id) return CATEGORIAS[i];
    return CATEGORIAS[CATEGORIAS.length - 1];
  }

  /* ---------- Helpers de data/hora (puros) ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function toISODate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseISO(iso) {
    var p = String(iso).split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  function isoValida(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false;
    var d = parseISO(iso);
    return toISODate(d) === iso;
  }
  function horaValida(h) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(h || ''); }
  function minutos(h) { var p = h.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function deMinutos(m) { m = Math.max(0, Math.min(23 * 60 + 59, m)); return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); }

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) n.appendChild(f); });
    return n;
  }

  /* ---------- Normalização (o antigo normalizarManual da calendario.html) ---------- */
  function normalizar(id, v) {
    if (!v || v.anulado === true) return null;
    if (!isoValida(v.data) || !v.titulo) return null;
    var diaInteiro = !!v.diaInteiro;
    return {
      id: id,
      titulo: String(v.titulo),
      data: v.data,
      diaInteiro: diaInteiro,
      horaInicio: !diaInteiro && horaValida(v.horaInicio) ? v.horaInicio : null,
      horaFim: !diaInteiro && horaValida(v.horaFim) ? v.horaFim : null,
      categoria: categoria(v.categoria).id,
      notas: v.notas ? String(v.notas) : '',
      origem: v.origem || 'manual',
      ligacao: v.ligacao && v.ligacao.tipo ? { tipo: String(v.ligacao.tipo), id: v.ligacao.id != null ? String(v.ligacao.id) : null } : null,
      editavel: true
    };
  }

  /* ---------- Formulário ---------- */
  function construirFormulario(inicial, modoEdicao) {
    inicial = inicial || {};
    var form = el('form', { 'class': 'ev-form', novalidate: 'novalidate' });

    var inTitulo = el('input', { type: 'text', id: 'evTitulo', maxlength: '120', placeholder: 'Título do evento', autocomplete: 'off' });
    inTitulo.value = inicial.titulo || '';
    var erroTitulo = el('div', { 'class': 'ev-erro' });
    form.appendChild(el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evTitulo', text: 'Título' }), inTitulo, erroTitulo]));

    var inData = el('input', { type: 'date', id: 'evData' });
    inData.value = inicial.data || '';
    var erroData = el('div', { 'class': 'ev-erro' });
    form.appendChild(el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evData', text: 'Data' }), inData, erroData]));

    var inDiaInteiro = el('input', { type: 'checkbox', id: 'evDiaInteiro' });
    inDiaInteiro.checked = !!inicial.diaInteiro;
    form.appendChild(el('label', { 'class': 'ev-check-linha', 'for': 'evDiaInteiro' }, [inDiaInteiro, el('span', { text: 'Dia inteiro' })]));

    var inInicio = el('input', { type: 'time', id: 'evInicio', step: '900' });
    var inFim = el('input', { type: 'time', id: 'evFim', step: '900' });
    inInicio.value = inicial.horaInicio || '';
    inFim.value = inicial.horaFim || '';
    var erroHoras = el('div', { 'class': 'ev-erro' });
    var linhaHoras = el('div', {}, [
      el('div', { 'class': 'ev-campo-linha' }, [
        el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evInicio', text: 'Início' }), inInicio]),
        el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evFim', text: 'Fim' }), inFim])
      ]),
      erroHoras
    ]);
    form.appendChild(linhaHoras);
    function sincronizarHoras() { linhaHoras.style.display = inDiaInteiro.checked ? 'none' : ''; }
    inDiaInteiro.addEventListener('change', sincronizarHoras);
    sincronizarHoras();
    inInicio.addEventListener('change', function () {
      if (horaValida(inInicio.value) && (!horaValida(inFim.value) || minutos(inFim.value) <= minutos(inInicio.value))) {
        inFim.value = deMinutos(minutos(inInicio.value) + 60);
      }
    });

    var catAtual = categoria(inicial.categoria).id;
    var grupo = el('div', { 'class': 'ev-swatches', role: 'radiogroup', 'aria-label': 'Categoria' });
    CATEGORIAS.forEach(function (c) {
      var b = el('button', { type: 'button', 'class': 'ev-swatch', role: 'radio', 'data-cat': c.id, 'aria-checked': c.id === catAtual ? 'true' : 'false', tabindex: c.id === catAtual ? '0' : '-1' },
        [el('i', { style: 'background:' + c.cor }), el('span', { text: c.label })]);
      grupo.appendChild(b);
    });
    function escolherCat(id, focar) {
      catAtual = id;
      var bs = grupo.querySelectorAll('.ev-swatch');
      for (var i = 0; i < bs.length; i++) {
        var on = bs[i].getAttribute('data-cat') === id;
        bs[i].setAttribute('aria-checked', on ? 'true' : 'false');
        bs[i].setAttribute('tabindex', on ? '0' : '-1');
        if (on && focar) bs[i].focus();
      }
    }
    grupo.addEventListener('click', function (e) {
      var b = e.target.closest('.ev-swatch');
      if (b) escolherCat(b.getAttribute('data-cat'), false);
    });
    grupo.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var i = CATEGORIAS.map(function (c) { return c.id; }).indexOf(catAtual);
      var n = (i + (e.key === 'ArrowRight' ? 1 : CATEGORIAS.length - 1)) % CATEGORIAS.length;
      escolherCat(CATEGORIAS[n].id, true);
    });
    form.appendChild(el('div', { 'class': 'ev-field' }, [el('div', { 'class': 'ev-field-label', text: 'Categoria' }), grupo]));

    var inNotas = el('textarea', { id: 'evNotas', rows: '3', maxlength: '2000', placeholder: 'Notas (opcional)' });
    inNotas.value = inicial.notas || '';
    function crescer() {
      inNotas.style.height = 'auto';
      var linha = 19.5, max = linha * 10 + 22;
      inNotas.style.height = Math.min(max, inNotas.scrollHeight) + 'px';
    }
    inNotas.addEventListener('input', crescer);
    form.appendChild(el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evNotas', text: 'Notas' }), inNotas]));

    var btnGuardar = el('button', { type: 'submit', 'class': 'btn-add', text: 'Guardar' });
    var btnCancelar = el('button', { type: 'button', 'class': 'ev-btn-outline', text: 'Cancelar' });
    var direita = el('div', { 'class': 'ev-actions-right' }, [btnCancelar, btnGuardar]);
    var acoes = el('div', { 'class': 'ev-actions' });
    var btnAnular = null;
    if (modoEdicao) {
      btnAnular = el('button', { type: 'button', 'class': 'ev-btn-outline ev-btn-perigo', text: 'Anular evento' });
      acoes.appendChild(btnAnular);
    }
    acoes.appendChild(direita);
    form.appendChild(acoes);

    btnCancelar.addEventListener('click', function () { modal.close(); });

    function mostrarErro(elErro, input, msg) {
      elErro.textContent = msg; elErro.classList.add('on');
      if (input) input.classList.add('ev-invalido');
    }
    function limparErros() {
      [erroTitulo, erroData, erroHoras].forEach(function (x) { x.textContent = ''; x.classList.remove('on'); });
      [inTitulo, inData, inInicio, inFim].forEach(function (x) { x.classList.remove('ev-invalido'); });
    }

    function lerFormulario() {
      limparErros();
      var ok = true;
      var titulo = inTitulo.value.trim().slice(0, 120);
      if (!titulo) { mostrarErro(erroTitulo, inTitulo, 'O título é obrigatório.'); ok = false; }
      var data = inData.value;
      if (!isoValida(data)) { mostrarErro(erroData, inData, 'Indica uma data válida.'); ok = false; }
      var diaInteiro = inDiaInteiro.checked;
      var horaInicio = null, horaFim = null;
      if (!diaInteiro) {
        if (horaValida(inInicio.value)) horaInicio = inInicio.value;
        if (horaValida(inFim.value)) horaFim = inFim.value;
        if (horaFim && !horaInicio) { mostrarErro(erroHoras, inInicio, 'Indica a hora de início.'); ok = false; }
        else if (horaInicio && horaFim && minutos(horaFim) <= minutos(horaInicio)) { mostrarErro(erroHoras, inFim, 'O fim tem de ser depois do início.'); ok = false; }
      }
      if (!ok) return null;
      return { titulo: titulo, data: data, diaInteiro: diaInteiro, horaInicio: horaInicio, horaFim: horaFim, categoria: catAtual, notas: inNotas.value.trim().slice(0, 2000) };
    }

    return { form: form, inTitulo: inTitulo, inNotas: inNotas, crescer: crescer, btnGuardar: btnGuardar, btnAnular: btnAnular, acoes: acoes, lerFormulario: lerFormulario };
  }

  function ligarAtalhosForm(f) {
    f.form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); f.form.requestSubmit(); return; }
      if (e.key === 'Enter' && e.target === f.inTitulo) { e.preventDefault(); f.form.requestSubmit(); }
    });
  }

  /* ---------- Escritas em eventos/ ---------- */
  var aGravar = false;

  // criar(v, extra) → Promise<id>. Único set() no nó do evento (nó novo).
  // extra: campos adicionais gravados no mesmo objeto (origem, ligacao…).
  function criar(v, extra) {
    var agora = Date.now();
    var obj = {
      titulo: v.titulo, data: v.data, diaInteiro: v.diaInteiro,
      categoria: v.categoria, origem: 'manual',
      criadoEm: agora, atualizadoEm: agora, anulado: false
    };
    if (!v.diaInteiro && v.horaInicio) obj.horaInicio = v.horaInicio;
    if (!v.diaInteiro && v.horaFim) obj.horaFim = v.horaFim;
    if (v.notas) obj.notas = v.notas;
    if (extra) Object.keys(extra).forEach(function (k) { if (extra[k] != null) obj[k] = extra[k]; });
    var novo = eventosRef.push();
    return novo.set(obj).then(function () { return novo.key; });
  }

  // editar(id, bruto, v): um set() por campo alterado; remove() só nos campos-folha que deixam de existir.
  function editar(id, bruto, v) {
    var ref = eventosRef.child(id);
    var escritas = [];
    function campo(nome, novo) {
      var antigo = bruto[nome] == null ? null : bruto[nome];
      if (novo == null || novo === '') {
        if (antigo != null) escritas.push(ref.child(nome).remove());
      } else if (antigo !== novo) {
        escritas.push(ref.child(nome).set(novo));
      }
    }
    campo('titulo', v.titulo);
    campo('data', v.data);
    if (!!bruto.diaInteiro !== v.diaInteiro) escritas.push(ref.child('diaInteiro').set(v.diaInteiro));
    campo('categoria', v.categoria);
    campo('notas', v.notas);
    campo('horaInicio', v.diaInteiro ? null : v.horaInicio);
    campo('horaFim', v.diaInteiro ? null : v.horaFim);
    if (escritas.length) escritas.push(ref.child('atualizadoEm').set(Date.now()));
    return Promise.all(escritas);
  }

  // anular(id): flag. NUNCA remove() do evento.
  function anular(id) {
    var agora = Date.now();
    return Promise.all([
      eventosRef.child(id).child('anulado').set(true),
      eventosRef.child(id).child('anuladoEm').set(agora)
    ]);
  }

  /* ---------- Modais ---------- */
  function conteudoModal(f, antes) {
    if (!antes) return f.form;
    return el('div', {}, [antes, f.form]);
  }

  // abrirNovo(pre, opts): pre = {titulo, data, horaInicio, horaFim, diaInteiro, categoria, notas};
  // opts.extra → campos extra do push().set(); opts.onGravado(id) depois do set com sucesso;
  // opts.onFechado() quando o modal fecha (gravado ou não).
  function abrirNovo(pre, opts) {
    pre = pre || {}; opts = opts || {};
    var inicial = { titulo: pre.titulo || '', data: pre.data || '', diaInteiro: !!pre.diaInteiro, categoria: pre.categoria || 'pessoal', notas: pre.notas || '' };
    if (pre.horaInicio) { inicial.horaInicio = pre.horaInicio; inicial.horaFim = pre.horaFim || deMinutos(minutos(pre.horaInicio) + 60); }
    var f = construirFormulario(inicial, false);
    f.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = f.lerFormulario();
      if (!v) return;
      if (aGravar) return;
      aGravar = true; f.btnGuardar.disabled = true;
      criar(v, opts.extra)
        .then(function (id) {
          aGravar = false; modal.close();
          if (typeof opts.onGravado === 'function') opts.onGravado(id);
        })
        .catch(function (err) { aGravar = false; f.btnGuardar.disabled = false; console.error(err); });
    });
    ligarAtalhosForm(f);
    modal.open({ titulo: opts.titulo || 'Novo evento', conteudo: conteudoModal(f, opts.antes), onClose: opts.onFechado });
    f.crescer();
    f.inTitulo.focus();
    return f;
  }

  // abrirEditar(id, bruto, opts): bruto = o nó tal como está no RTDB.
  // opts.antes → Node só de leitura por cima do formulário; opts.onAnulado(id); opts.onFechado().
  function abrirEditar(id, bruto, opts) {
    opts = opts || {};
    var ev = normalizar(id, bruto);
    if (!ev || !ev.editavel) return null;
    var f = construirFormulario(ev, true);
    f.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = f.lerFormulario();
      if (!v) return;
      if (aGravar) return;
      aGravar = true; f.btnGuardar.disabled = true;
      editar(id, bruto, v)
        .then(function () { aGravar = false; modal.close(); })
        .catch(function (err) { aGravar = false; f.btnGuardar.disabled = false; console.error(err); });
    });
    if (f.btnAnular) f.btnAnular.addEventListener('click', function () { pedirAnulacao(id, f, opts.onAnulado); });
    ligarAtalhosForm(f);
    modal.open({ titulo: opts.titulo || 'Editar evento', conteudo: conteudoModal(f, opts.antes), onClose: opts.onFechado });
    f.crescer();
    f.inTitulo.focus();
    return f;
  }

  function pedirAnulacao(id, f, onAnulado) {
    var acoes = f.acoes;
    acoes.innerHTML = '';
    var sim = el('button', { type: 'button', 'class': 'btn-add', text: 'Sim, anular' });
    var nao = el('button', { type: 'button', 'class': 'ev-btn-outline', text: 'Não' });
    acoes.appendChild(el('span', { 'class': 'ev-pergunta', text: 'Anular este evento?' }));
    acoes.appendChild(el('div', { 'class': 'ev-actions-right' }, [nao, sim]));
    nao.addEventListener('click', function () {
      // Repor o rodapé original: reconstruir é mais simples do que guardar nós.
      acoes.innerHTML = '';
      var btnAnular = el('button', { type: 'button', 'class': 'ev-btn-outline ev-btn-perigo', text: 'Anular evento' });
      btnAnular.addEventListener('click', function () { pedirAnulacao(id, f, onAnulado); });
      var btnCancelar = el('button', { type: 'button', 'class': 'ev-btn-outline', text: 'Cancelar' });
      btnCancelar.addEventListener('click', function () { modal.close(); });
      acoes.appendChild(btnAnular);
      acoes.appendChild(el('div', { 'class': 'ev-actions-right' }, [btnCancelar, f.btnGuardar]));
    });
    sim.addEventListener('click', function () {
      if (aGravar) return;
      aGravar = true; sim.disabled = true;
      anular(id)
        .then(function () { aGravar = false; modal.close(); if (typeof onAnulado === 'function') onAnulado(id); })
        .catch(function (err) { aGravar = false; sim.disabled = false; console.error(err); });
    });
    sim.focus();
  }

  return {
    CATEGORIAS: CATEGORIAS, categoria: categoria,
    normalizar: normalizar,
    construirFormulario: construirFormulario,
    abrirNovo: abrirNovo, abrirEditar: abrirEditar,
    criar: criar, editar: editar, anular: anular,
    isoValida: isoValida, horaValida: horaValida, minutos: minutos, deMinutos: deMinutos, pad2: pad2, el: el
  };
}
