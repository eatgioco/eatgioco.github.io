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
     criadoEm, atualizadoEm (ms), anulado (bool), anuladoEm? (ms),
     comunicado? (Set/2026 — "Comunicar à loja": sub-objeto OPCIONAL cuja
       PRESENÇA é o único critério para o evento aparecer no cartão "Esta
       semana na loja" da loja-sao-bento.html; a categoria — incluindo
       'loja' — NUNCA é critério. { tipo ∈ visita | entrega | manutencao |
       obra | formacao | outro, titulo (obrigatório, máx 120), detalhe?,
       quem?, pessoas? (inteiro), acao?; só com tipo 'visita': subtipo ∈
       influencer | jornalista | marca | outro, handle?, combinado?,
       contrapartida?, anfitriao? }. Campos vazios ficam AUSENTES.)
   }

   REGRAS DE ESCRITA (as mesmas de sempre):
   - criar  = push().set() com o objeto completo — o ÚNICO set() no nó do
     evento, e só na criação (criar(v, extra): extra junta origem/ligacao);
   - editar = um set() por campo alterado em eventos/{id}/{campo} +
     eventos/{id}/atualizadoEm; remove() SÓ nas folhas horaInicio/horaFim/
     notas quando deixam de existir;
   - anular = dois set() (anulado:true, anuladoEm). NUNCA remove() do evento,
     NUNCA set()/update() no nó pai depois de criado. Sem restauro.
   - comunicado: na criação vai dentro do objeto do push().set(); ao editar,
     se o evento ainda não tinha, um set() em eventos/{id}/comunicado (nó
     novo); se já tinha, um set() por folha alterada em
     eventos/{id}/comunicado/{campo} e remove() nas folhas que deixam de
     existir; desligar o bloco = remove() de eventos/{id}/comunicado (a
     mesma regra das folhas horaInicio/horaFim/notas). Sempre com
     eventos/{id}/atualizadoEm.
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

  /* ---------- Comunicar à loja (sub-objeto opcional `comunicado`) ---------- */
  var COMUNICADO_TIPOS = [
    { id: 'visita',     label: 'Visita' },
    { id: 'entrega',    label: 'Entrega' },
    { id: 'manutencao', label: 'Manutenção' },
    { id: 'obra',       label: 'Obra' },
    { id: 'formacao',   label: 'Formação' },
    { id: 'outro',      label: 'Outro' }
  ];
  var COMUNICADO_SUBTIPOS = [
    { id: 'influencer', label: 'Influencer' },
    { id: 'jornalista', label: 'Jornalista' },
    { id: 'marca',      label: 'Marca' },
    { id: 'outro',      label: 'Outro' }
  ];
  function comunicadoTipo(id) {
    for (var i = 0; i < COMUNICADO_TIPOS.length; i++) if (COMUNICADO_TIPOS[i].id === id) return COMUNICADO_TIPOS[i];
    return COMUNICADO_TIPOS[COMUNICADO_TIPOS.length - 1];
  }
  function comunicadoSubtipo(id) {
    for (var i = 0; i < COMUNICADO_SUBTIPOS.length; i++) if (COMUNICADO_SUBTIPOS[i].id === id) return COMUNICADO_SUBTIPOS[i];
    return COMUNICADO_SUBTIPOS[COMUNICADO_SUBTIPOS.length - 1];
  }
  // Campos do sub-objeto, por ordem. Os de visita só existem com tipo 'visita'.
  var COMUNICADO_CAMPOS = ['tipo', 'titulo', 'detalhe', 'quem', 'pessoas', 'acao'];
  var COMUNICADO_CAMPOS_VISITA = ['subtipo', 'handle', 'combinado', 'contrapartida', 'anfitriao'];
  // normalizarComunicado(bruto) → objeto limpo (só folhas preenchidas) ou null.
  // É a leitura defensiva partilhada: a loja-sao-bento.html e a calendario.html
  // passam por aqui, nunca leem o sub-objeto à mão.
  function normalizarComunicado(c) {
    if (!c || typeof c !== 'object') return null;
    var titulo = c.titulo != null ? String(c.titulo).trim().slice(0, 120) : '';
    if (!titulo) return null;
    var out = { tipo: comunicadoTipo(c.tipo).id, titulo: titulo };
    ['detalhe', 'quem', 'acao'].forEach(function (k) { var v = c[k] != null ? String(c[k]).trim() : ''; if (v) out[k] = v.slice(0, 2000); });
    var p = parseInt(c.pessoas, 10);
    if (!isNaN(p) && p > 0) out.pessoas = p;
    if (out.tipo === 'visita') {
      out.subtipo = comunicadoSubtipo(c.subtipo).id;
      ['handle', 'combinado', 'contrapartida', 'anfitriao'].forEach(function (k) { var v = c[k] != null ? String(c[k]).trim() : ''; if (v) out[k] = v.slice(0, 500); });
    }
    return out;
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
      comunicado: normalizarComunicado(v.comunicado),
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

    /* ---- Comunicar à loja (recolhido por omissão; o controlo é o checkbox
       .ev-check-linha que o formulário já usa em "Dia inteiro") ---- */
    var comIni = inicial.comunicado || null;
    var inComunicar = el('input', { type: 'checkbox', id: 'evComunicar' });
    inComunicar.checked = !!comIni;
    var bloco = el('div', { 'class': 'ev-comunicado' });
    var com = {};
    function campoTexto(nome, label, placeholder) {
      var i = el('input', { type: 'text', id: 'evCom_' + nome, maxlength: '500', placeholder: placeholder || '', autocomplete: 'off' });
      i.value = comIni && comIni[nome] != null ? String(comIni[nome]) : '';
      com[nome] = i;
      return el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evCom_' + nome, text: label }), i]);
    }
    function campoSelect(nome, label, opcoes, atual) {
      var s = el('select', { id: 'evCom_' + nome });
      opcoes.forEach(function (o) { var op = el('option', { value: o.id, text: o.label }); if (o.id === atual) op.selected = true; s.appendChild(op); });
      com[nome] = s;
      return el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evCom_' + nome, text: label }), s]);
    }
    var erroComTitulo = el('div', { 'class': 'ev-erro' });
    var linhaTipoTitulo = el('div', { 'class': 'ev-campo-linha' }, [
      campoSelect('tipo', 'Tipo', COMUNICADO_TIPOS, comIni ? comIni.tipo : 'visita'),
      campoTexto('titulo', 'Título para a loja', 'O que a equipa lê primeiro')
    ]);
    bloco.appendChild(linhaTipoTitulo);
    bloco.appendChild(erroComTitulo);
    var inDetalhe = el('textarea', { id: 'evCom_detalhe', rows: '2', maxlength: '2000', placeholder: 'O que é preciso saber (opcional)' });
    inDetalhe.value = comIni && comIni.detalhe ? String(comIni.detalhe) : '';
    com.detalhe = inDetalhe;
    bloco.appendChild(el('div', { 'class': 'ev-field' }, [el('label', { 'class': 'ev-field-label', 'for': 'evCom_detalhe', text: 'Detalhe' }), inDetalhe]));
    var inPessoas = el('input', { type: 'number', id: 'evCom_pessoas', min: '1', step: '1', placeholder: '—' });
    inPessoas.value = comIni && comIni.pessoas ? String(comIni.pessoas) : '';
    com.pessoas = inPessoas;
    bloco.appendChild(el('div', { 'class': 'ev-campo-linha' }, [
      campoTexto('quem', 'Quem', 'Pessoa ou empresa'),
      el('div', { 'class': 'ev-field ev-field-curto' }, [el('label', { 'class': 'ev-field-label', 'for': 'evCom_pessoas', text: 'Pessoas' }), inPessoas])
    ]));
    bloco.appendChild(campoTexto('acao', 'O que a loja tem de fazer', 'ex.: libertar o corredor antes das 9h'));
    var blocoVisita = el('div', { 'class': 'ev-comunicado-visita' }, [
      el('div', { 'class': 'ev-campo-linha' }, [
        campoSelect('subtipo', 'Quem visita', COMUNICADO_SUBTIPOS, comIni ? comIni.subtipo : 'influencer'),
        campoTexto('handle', 'Handle / publicação', '@instagram ou nome do meio')
      ]),
      campoTexto('combinado', 'Oferta (o que se oferece)', 'ex.: 2 focaccias + bebidas'),
      campoTexto('contrapartida', 'Pede-se (em troca)', 'ex.: 1 reel + 1 story'),
      campoTexto('anfitriao', 'Recebe', 'Quem recebe a visita')
    ]);
    bloco.appendChild(blocoVisita);
    function sincronizarComunicado() {
      bloco.style.display = inComunicar.checked ? '' : 'none';
      blocoVisita.style.display = com.tipo.value === 'visita' ? '' : 'none';
    }
    inComunicar.addEventListener('change', function () { sincronizarComunicado(); if (inComunicar.checked) com.titulo.focus(); });
    com.tipo.addEventListener('change', sincronizarComunicado);
    sincronizarComunicado();
    form.appendChild(el('div', { 'class': 'ev-comunicado-wrap' }, [
      el('label', { 'class': 'ev-check-linha', 'for': 'evComunicar' }, [inComunicar, el('span', { text: 'Comunicar à loja' })]),
      el('div', { 'class': 'ev-comunicado-ajuda', text: 'Aparece no cartão "Esta semana na loja" do computador da loja.' }),
      bloco
    ]));

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
      [erroTitulo, erroData, erroHoras, erroComTitulo].forEach(function (x) { x.textContent = ''; x.classList.remove('on'); });
      [inTitulo, inData, inInicio, inFim, com.titulo].forEach(function (x) { x.classList.remove('ev-invalido'); });
    }
    // lerComunicado() → sub-objeto limpo, null (bloco desligado) ou false (inválido).
    function lerComunicado() {
      if (!inComunicar.checked) return null;
      var bruto = {};
      COMUNICADO_CAMPOS.concat(COMUNICADO_CAMPOS_VISITA).forEach(function (k) { bruto[k] = com[k].value; });
      if (!String(com.titulo.value).trim()) { mostrarErro(erroComTitulo, com.titulo, 'O título para a loja é obrigatório.'); return false; }
      return normalizarComunicado(bruto);
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
      var comunicado = lerComunicado();
      if (comunicado === false) ok = false;
      if (!ok) return null;
      return { titulo: titulo, data: data, diaInteiro: diaInteiro, horaInicio: horaInicio, horaFim: horaFim, categoria: catAtual, notas: inNotas.value.trim().slice(0, 2000), comunicado: comunicado };
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
    if (v.comunicado) obj.comunicado = v.comunicado;
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
    escritas = escritas.concat(escritasComunicado(ref, bruto.comunicado, v.comunicado));
    if (escritas.length) escritas.push(ref.child('atualizadoEm').set(Date.now()));
    return Promise.all(escritas);
  }

  // escritasComunicado(ref, antigoBruto, novo): as escritas do sub-objeto.
  // - desligado e existia → remove() de eventos/{id}/comunicado (regra das folhas);
  // - ligado e não existia → set() do sub-objeto em eventos/{id}/comunicado (nó novo);
  // - ligado e existia → set() por folha alterada / remove() por folha que saiu.
  // Nunca toca no nó pai do evento.
  function escritasComunicado(ref, antigoBruto, novo) {
    var temAntigo = antigoBruto != null && typeof antigoBruto === 'object';
    var sub = ref.child('comunicado');
    if (!novo) return temAntigo ? [sub.remove()] : [];
    if (!temAntigo) return [sub.set(novo)];
    var escritas = [];
    var chaves = {};
    Object.keys(antigoBruto).forEach(function (k) { chaves[k] = true; });
    Object.keys(novo).forEach(function (k) { chaves[k] = true; });
    Object.keys(chaves).forEach(function (k) {
      var a = antigoBruto[k] == null ? null : antigoBruto[k];
      var n = novo[k] == null ? null : novo[k];
      if (n == null) { if (a != null) escritas.push(sub.child(k).remove()); }
      else if (a !== n) escritas.push(sub.child(k).set(n));
    });
    return escritas;
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
    COMUNICADO_TIPOS: COMUNICADO_TIPOS, COMUNICADO_SUBTIPOS: COMUNICADO_SUBTIPOS,
    comunicadoTipo: comunicadoTipo, comunicadoSubtipo: comunicadoSubtipo, normalizarComunicado: normalizarComunicado,
    normalizar: normalizar,
    construirFormulario: construirFormulario,
    abrirNovo: abrirNovo, abrirEditar: abrirEditar,
    criar: criar, editar: editar, anular: anular,
    isoValida: isoValida, horaValida: horaValida, minutos: minutos, deMinutos: deMinutos, pad2: pad2, el: el
  };
}
