# gioco-sonos-bridge

Ponte entre as colunas Sonos da loja (LAN, UPnP via `soco`) e o Firebase, para
o cartão "Música" da `centro-de-controlo.html`. Corre no PC do POS (`sb154`)
como tarefa agendada `gioco-sonos-bridge` (SYSTEM, ao arranque, reinício
automático) — o mesmo padrão do `gioco-ac-bridge`.

**Sem segredos e sem ficheiro de chave.** As Sonos não têm autenticação na LAN;
a coordenadora é encontrada por UID (`SONOS_BRIDGE_UID`, default o da SB154,
`RINCON_74CA60A613FE01400`) com `soco.discover(include_invisible=True)`, ou por
`SONOS_BRIDGE_IP` se a descoberta falhar. Se a coordenação do par trocar, o
serviço segue `group.coordinator` em runtime.

## Topologia (Set/2026)

Duas Era 100 SL em par estéreo = uma zona "SB154". Volume, mute, transporte e
faixa são propriedades da zona, lidas e escritas na coordenadora
(192.168.1.70); o canal (192.168.1.69, `RINCON_74CA60A0886A01400`) é invisível
e nunca é comandado. As escritas propagam em assíncrono: o serviço dorme 0,5 s
depois de cada comando antes de reler o estado.

A fonte de música é (e vai continuar a ser) AirPlay do telemóvel da loja; o
painel serve para monitorizar e para ajustes à distância. Os favoritos ficam
espelhados para uma futura passagem a Spotify Connect.

## Nós no Firebase

- `lojas/sb154/sonos/estado` — `ligado, transporte (PLAYING|PAUSED|STOPPED|
  TRANSITIONING), volume, mute, fonte (airplay|spotify|radio|fila|nada — derivada
  do URI da faixa), faixa {titulo, artista, album, posicao, duracao} (null sem
  música), favoritoAtual? (índice), tocaDesde / paradoDesde (ISO: última passagem
  para / saída de PLAYING, recuperadas do nó ao reiniciar), atualizadoEm (ISO),
  fonteDados 'sb154', erro?`. PATCH raso a cada 3 s se algo mudou (a posição da
  faixa não conta como mudança), ou de 5 em 5 min como heartbeat. Sem URL de
  capa de propósito: é um IP da LAN que o browser fora da loja não carrega.
- `lojas/sb154/sonos/favoritos/{n}` — `titulo, tipo (radio|spotify|fila), uri,
  meta`, pela ordem da app Sonos. PUT no nó `favoritos` no arranque e a cada
  10 min (node apagado se não houver favoritos — a página mostra "Sem favoritos").
- `lojas/sb154/sonos/unidades/{uid}` — `ip, mac, modelo, firmware, papel
  (coordenadora|canal), visivel, nome`. PUT no nó `unidades`, mesmo ritmo.
- `lojas/sb154/sonos/comandos/{pushId}` — `tipo, valor, pedidoEm, origem, estado
  (pendente|executado|falhou), executadoEm, erro?`. Tipos: `volume` (0–teto,
  `SONOS_BRIDGE_VOLUME_MAX`, default 60 — acima é `falhou` com erro explícito),
  `mute` (bool), `play`, `pause`, `proximo`, `anterior`, `tocarFavorito` (índice
  da lista ou uri; Spotify vai por `add_to_queue` + `play_from_queue` quando o
  `play_uri` recusa). Consultados a cada 3 s; nunca apagados, só marcados folha a
  folha (executadoEm, erro?, estado por último). Comandos com mais de 10 min são
  `falhou` / `expirado`. Depois de cada comando o estado é relido de imediato.

## Instalar / operar no POS (SSH: `ssh POS@100.97.211.74`, shell cmd.exe)

```
pip install soco==0.31.2 requests
mkdir C:\gioco\sonos
:: copiar sonos_bridge.py para C:\gioco\sonos\  (scp servicos/sonos/sonos_bridge.py POS@100.97.211.74:C:/gioco/sonos/)
:: teste em foreground (sai sozinho ao fim de 30 s):
"C:\Program Files\Python312\python.exe" C:\gioco\sonos\sonos_bridge.py --segundos 30
schtasks /Create /TN gioco-sonos-bridge /SC ONSTART /RU SYSTEM /RL HIGHEST /F ^
  /TR "\"C:\Program Files\Python312\python.exe\" C:\gioco\sonos\sonos_bridge.py"
schtasks /Run /TN gioco-sonos-bridge
```

O `deploy-sb154.cmd` desta pasta faz os passos acima a partir do portátil (scp +
ssh). Reiniciar: `schtasks /End /TN gioco-sonos-bridge` e `schtasks /Run /TN
gioco-sonos-bridge`. Log: `C:\gioco\sonos\sonos_bridge.log` (rotativo, 5 MB).

Confirmar por REST (sem auth enquanto as Rules estiverem abertas):

```
curl https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app/lojas/sb154/sonos/estado.json
```

## `teste_teclas.py` — investigação do knob USB (não é serviço)

Script de 2 minutos para saber se um knob USB de volume (teclas de multimédia
VK_VOLUME_UP/DOWN/MUTE, VK_MEDIA_PLAY_PAUSE) chega por cima do ZoneSoft em ecrã
inteiro. Faz log de qualquer tecla de multimédia recebida por hook global de
teclado, sem a suprimir e sem tocar na Sonos. **Corre-se à mão na sessão do
utilizador com sessão gráfica** (nunca como SYSTEM / sessão 0 — aí os hooks não
recebem nada): no POS, com o ZoneSoft aberto, num cmd.exe da sessão do
utilizador:

```
pip install keyboard
"C:\Program Files\Python312\python.exe" C:\gioco\sonos\teste_teclas.py
```

Roda 120 s (ou `--segundos N`), escreve no ecrã e em
`C:\gioco\sonos\teste_teclas.log`; no fim imprime o resumo por tecla. Se com o
ZoneSoft em primeiro plano as linhas `volume up/down/mute/play-pause` aparecem,
o knob funciona; se só aparecem com o cmd em primeiro plano, o ZoneSoft está a
capturar o teclado em exclusivo e o knob não serve.

## Pendente quando as Rules fecharem

- Adicionar `".indexOn": ["estado"]` em `lojas/$loja/sonos/comandos` — até lá o
  serviço detecta o 400 do `orderBy="estado"` e filtra localmente os últimos 50.
- Passar um token ao serviço na variável de ambiente `FIREBASE_AUTH` (vai em
  `?auth=` em todos os pedidos REST). Hoje é opcional.
