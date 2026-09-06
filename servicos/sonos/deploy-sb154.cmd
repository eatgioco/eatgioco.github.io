@echo off
:: deploy-sb154.cmd — correr no portátil (tailnet) a partir da raiz do repo.
:: Copia o serviço e o script de teste para o POS, faz um teste em foreground
:: de 30 s, regista a tarefa agendada e apaga os ficheiros temporários da
:: sessão anterior (sonos_extra.py, sonos_vol.py).
set POS=POS@100.97.211.74
set PY="C:\Program Files\Python312\python.exe"
set FB=https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app/lojas/sb154/sonos

ssh %POS% "if not exist C:\gioco\sonos mkdir C:\gioco\sonos"
scp servicos\sonos\sonos_bridge.py servicos\sonos\teste_teclas.py %POS%:C:/gioco/sonos/
ssh %POS% "pip install -q soco==0.31.2 requests"

echo == teste em foreground (30 s) ==
ssh %POS% "%PY% C:\gioco\sonos\sonos_bridge.py --segundos 30"
curl -s "%FB%/estado.json" & echo.
curl -s "%FB%/favoritos.json" & echo.
curl -s "%FB%/unidades.json" & echo.

echo == tarefa agendada ==
ssh %POS% "schtasks /Create /TN gioco-sonos-bridge /SC ONSTART /RU SYSTEM /RL HIGHEST /F /TR \"\\\"C:\Program Files\Python312\python.exe\\\" C:\gioco\sonos\sonos_bridge.py\" && schtasks /Run /TN gioco-sonos-bridge"
ssh %POS% "del /Q C:\gioco\sonos\sonos_extra.py C:\gioco\sonos\sonos_vol.py 2>NUL"
timeout /T 20 /NOBREAK > NUL
curl -s "%FB%/estado.json" & echo.
ssh %POS% "powershell -Command Get-Content C:\gioco\sonos\sonos_bridge.log -Tail 10"
