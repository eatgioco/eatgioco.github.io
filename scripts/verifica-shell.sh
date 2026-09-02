#!/usr/bin/env bash
# verifica-shell.sh — verificação mecânica da "Definição de página shell completa"
# (CLAUDE.md). Corre na raiz do clone. Exit ≠ 0 se houver violações.
# Obrigatório antes de qualquer push que toque em páginas.
set -u
cd "$(dirname "$0")/.."

# Exceções: páginas de suporte com design próprio, arquivo e montra.
EXCECOES='abanca-callback.html privacidade.html termos.html _referencia-fase0.html estilo.html'

excecao(){ for e in $EXCECOES; do [ "$1" = "$e" ] && return 0; done; return 1; }

ERROS=0
AVISOS=0
erro(){ echo "ERRO  $1"; ERROS=$((ERROS+1)); }
aviso(){ echo "aviso $1"; AVISOS=$((AVISOS+1)); }

for f in *.html; do
  excecao "$f" && continue

  # 1. Fontes: zero Space Mono (declaração ou import).
  if grep -q "Space+Mono\|Space Mono', *monospace\|font-family: *'Space Mono'" "$f"; then
    erro "$f: Space Mono ainda presente (font-family ou import)"
  fi

  # 2. Tokens antigos (inclui fallbacks em JS).
  if grep -qiE '#F5F2EC|#E2DDD1|#E8E2D4' "$f"; then
    erro "$f: token de cor da família antiga (#F5F2EC/#E2DDD1/#E8E2D4)"
  fi

  # 3. Header antigo. Exceção: export PNG de turnos (equipa.html, export-header-title).
  if grep -v 'export-header-title' "$f" | grep -q '● GIOCO'; then
    erro "$f: header antigo '● GIOCO®'"
  fi
  if grep -q '🏠 Home' "$f"; then
    erro "$f: botão antigo '🏠 Home'"
  fi

  # 4. Shell: css + sprite + nav partilhada.
  if ! grep -q 'gioco-shell.css' "$f"; then
    erro "$f: sem <link> para gioco-shell.css"
  fi
  if ! grep -q 'gioco-shell.js' "$f"; then
    erro "$f: sem gioco-shell.js"
  fi
  if ! grep -q 'giocoNav(' "$f"; then
    erro "$f: sem giocoNav() — sidebar fora da nav partilhada"
  fi

  # 5. Zero CDN de ícones / frameworks de UI.
  if grep -qiE 'cdn.jsdelivr[^"]*(feather|lucide|fontawesome)|unpkg[^"]*(feather|lucide)|font-awesome|fontawesome' "$f"; then
    erro "$f: ícones por CDN"
  fi

  # 6. Fontes externas que não sejam o par Antonio+Inter do Google Fonts.
  if grep -oE 'fonts\.googleapis\.com/css2\?[^"]*' "$f" | grep -qvE 'family=(Antonio|Inter)[^"]*' ; then
    erro "$f: import de fontes fora de Antonio+Inter"
  fi

  # 7. Emoji pictográfico como ícone de UI (aviso; ver checklist ponto 8).
  n=$(perl -CSD -ne 'while(/[\x{1F300}-\x{1FAFF}]/g){$c++} END{print $c+0}' "$f" 2>/dev/null || echo 0)
  if [ "${n:-0}" -gt 0 ]; then
    aviso "$f: $n emoji pictográfico(s) em markup — substituir por sprite quando houver ícone"
  fi

  # 8. Mobile: shell-mobile exige device-width e vice-topo (só coerência básica).
  if grep -q 'shell-mobile' "$f" && ! grep -q 'width=device-width' "$f"; then
    erro "$f: shell-mobile sem viewport device-width"
  fi
done

# 9. Fuga do link privado (regra da navegação).
fuga=$(grep -rln 'href=[^>]*mrn-dashboard' --include='*.html' . | grep -vE 'tesouraria.html|conta-bancaria.html' || true)
if [ -n "$fuga" ]; then
  erro "link privado mrn-dashboard fora de tesouraria/conta-bancaria: $fuga"
fi

# 10. index.html tem de linkar todas as páginas públicas da nav partilhada.
for p in receitas.html compras.html pagamentos.html vendas.html contagens.html gestao.html foodcost.html equipa.html; do
  grep -q "href=\"$p\"" index.html || erro "index.html: falta cartão/link para $p"
done

echo "----"
echo "verifica-shell: $ERROS erro(s), $AVISOS aviso(s)"
[ "$ERROS" -eq 0 ] || exit 1
exit 0
