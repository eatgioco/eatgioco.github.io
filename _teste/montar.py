"""Gera _teste/foodcost-harness.html a partir do foodcost.html real.

Troca o Firebase por um stub local (fake-firebase.js + fixture.js) e corrige
os caminhos relativos. Nao altera o foodcost.html. Ficheiro de trabalho: nunca
vai para o repo.
"""
import io, os, re, sys

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(raiz, 'foodcost.html')
dst = os.path.join(raiz, '_teste', 'foodcost-harness.html')

h = io.open(src, encoding='utf-8').read()

# 1. Firebase CDN -> stub local (a primeira tag leva o stub + o fixture).
tags = re.findall(r'<script src="https://www\.gstatic\.com/firebasejs/[^"]+"></script>\n', h)
assert len(tags) == 3, 'esperava 3 scripts do firebase, encontrei %d' % len(tags)
h = h.replace(tags[0], '<script src="fake-firebase.js"></script>\n<script src="fixture.js"></script>\n', 1)
for t in tags[1:]:
    h = h.replace(t, '', 1)

# 2. Caminhos relativos (o harness esta numa subpasta).
h = h.replace('href="gioco-shell.css"', 'href="../gioco-shell.css"')
h = h.replace('src="gioco-shell.js"', 'src="../gioco-shell.js"')
h = h.replace('src="gioco-consumo.js"', 'src="../gioco-consumo.js"')
h = h.replace('href="icons/', 'href="../icons/')
h = h.replace('src="Logo_Tomato_5x.png"', 'src="../Logo_Tomato_5x.png"')
h = h.replace('src="icons/', 'src="../icons/')

# 3. Sonda: percorre todos os periodos e devolve o texto renderizado.
sonda = u'''
<script>
window.ZZT_CAPTURAR = function () {
  var sel = document.getElementById('periodoSel');
  var out = { periodos: [], escritas: window.ZZT_ESCRITAS || [] };
  if (!sel) { out.erro = 'sem #periodo'; return out; }
  var opts = Array.prototype.map.call(sel.options, function (o) { return o.value; });
  out.opcoes = opts;
  opts.forEach(function (v) {
    sel.value = v;
    sel.dispatchEvent(new Event('change'));
    out.periodos.push({ valor: v, texto: document.getElementById('app').innerText });
  });
  return out;
};
</script>
'''
h = h.replace('</body>', sonda + '</body>')

io.open(dst, 'w', encoding='utf-8').write(h)
print('escrito', dst, len(h), 'chars')
