# gioco-ac-bridge

Ponte entre o A/C Giatsu (módulo WiFi Midea, LAN da loja) e o Firebase, para o
cartão "Ar condicionado" da `centro-de-controlo.html`. Corre no PC do POS
(`sb154`) como tarefa agendada `gioco-ac-bridge` (SYSTEM, ao arranque, reinício
automático) — o mesmo padrão do go2rtc.

**Sem segredos no repositório.** Token/key/device id/IP vêm de
`C:\gioco\ac\ac-sb154-midea.json` no POS (ACL só SYSTEM + Administrators).

## Nós no Firebase

- `lojas/sb154/ac/estado` — `ligado, modo (cool|heat|fan|dry|auto), tempAlvo,
  tempAmbiente, tempExterior, ventilacao, alertaFiltro, codigoErro,
  atualizadoEm (ISO 8601), fonte, erro?, ventilacaoPreset (preset ou 'custom'),
  eco, turbo, sleep`. `display` e `humidade` só aparecem se o aparelho anunciar
  a capacidade — o Giatsu da SB154 não anuncia nenhuma das duas (o toggle do
  display não tem efeito nele; a página esconde o toggle sem o campo). PATCH raso a cada 30 s se algo mudou,
  ou de 5 em 5 min como heartbeat.
- `lojas/sb154/ac/comandos/{pushId}` — `tipo, valor, pedidoEm, origem, estado
  (pendente|executado|falhou), executadoEm, erro?`. Tipos: `ligar`, `desligar`,
  `tempAlvo` (16–30), `modo` (cool|heat|fan|dry|auto), `ventilacao` (1–100),
  `ventilacaoPreset` (silencioso|baixo|medio|alto|max|auto → FanSpeed 20/40/60/80/100/102),
  `eco` / `turbo` / `sleep` (bool). Consultados a cada 3 s; nunca apagados, só marcados. Comandos com
  mais de 10 min são marcados `falhou` / `expirado`.

## Instalar / operar no POS (SSH: `ssh POS@100.97.211.74`, shell cmd.exe)

```
pip install msmart-ng requests
mkdir C:\gioco\ac
:: copiar ac_bridge.py e ac-sb154-midea.json para C:\gioco\ac\
icacls C:\gioco\ac\ac-sb154-midea.json /inheritance:r /grant:r SYSTEM:F /grant:r Administrators:F
schtasks /Create /TN gioco-ac-bridge /SC ONSTART /RU SYSTEM /RL HIGHEST /F ^
  /TR "\"C:\Program Files\Python312\python.exe\" C:\gioco\ac\ac_bridge.py"
schtasks /Run /TN gioco-ac-bridge
```

Reiniciar: `schtasks /End /TN gioco-ac-bridge` e `schtasks /Run /TN gioco-ac-bridge`.
Log: `C:\gioco\ac\ac_bridge.log` (rotativo, 5 MB). Nunca contém token/key.

## Pendente quando as Rules fecharem

- Adicionar `".indexOn": ["estado"]` em `lojas/$loja/ac/comandos` — até lá o
  serviço detecta o 400 do `orderBy="estado"` e filtra localmente os últimos 50.
- Passar um token ao serviço na variável de ambiente `FIREBASE_AUTH` (vai em
  `?auth=` em todos os pedidos REST). Hoje é opcional.
