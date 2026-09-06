#!/usr/bin/env python3
"""
teste_teclas.py — investigação (não é serviço): regista as teclas de
multimédia que chegam ao Windows por hook global de teclado, SEM as suprimir
e SEM tocar na Sonos. Serve para saber se um knob USB de volume funcionaria
por cima do ZoneSoft em ecrã inteiro.

Correr À MÃO, na sessão do utilizador com ecrã (nunca como SYSTEM / sessão 0:
lá os hooks de teclado não recebem nada):

  pip install keyboard
  python C:\\gioco\\sonos\\teste_teclas.py [--segundos 120]

Escreve no ecrã e em C:\\gioco\\sonos\\teste_teclas.log; no fim imprime um
resumo por tecla. Usa `keyboard`; se não estiver instalada cai para `pynput`.
"""

import argparse
import os
import sys
import time
from collections import Counter
from datetime import datetime

LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_teclas.log")

# Nomes tal como a biblioteca `keyboard` os devolve no Windows.
MULTIMEDIA = {
    "volume up": "VK_VOLUME_UP",
    "volume down": "VK_VOLUME_DOWN",
    "volume mute": "VK_VOLUME_MUTE",
    "play/pause media": "VK_MEDIA_PLAY_PAUSE",
    "next track": "VK_MEDIA_NEXT_TRACK",
    "previous track": "VK_MEDIA_PREV_TRACK",
    "stop media": "VK_MEDIA_STOP",
}
# Scan codes / VK codes para o fallback pynput (Key.media_*).
PYNPUT = {
    "media_volume_up": "VK_VOLUME_UP",
    "media_volume_down": "VK_VOLUME_DOWN",
    "media_volume_mute": "VK_VOLUME_MUTE",
    "media_play_pause": "VK_MEDIA_PLAY_PAUSE",
    "media_next": "VK_MEDIA_NEXT_TRACK",
    "media_previous": "VK_MEDIA_PREV_TRACK",
}

contagem = Counter()


def registar(nome, vk, extra=""):
    contagem[vk] += 1
    linha = f"{datetime.now().isoformat(timespec='milliseconds')} {vk} ({nome}) {extra}".rstrip()
    print(linha, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(linha + "\n")


def com_keyboard(segundos):
    import keyboard  # pip install keyboard

    def on_event(ev):
        if ev.event_type != "down":
            return
        nome = (ev.name or "").lower()
        vk = MULTIMEDIA.get(nome)
        if vk:
            registar(nome, vk, f"scan={ev.scan_code}")

    keyboard.hook(on_event, suppress=False)   # nunca suprimir: só observar
    print(f"[keyboard] hook global activo durante {segundos} s — carrega nas teclas do knob "
          f"(com o ZoneSoft em primeiro plano). Ctrl+C para parar antes.", flush=True)
    fim = time.time() + segundos
    try:
        while time.time() < fim:
            time.sleep(0.2)
    except KeyboardInterrupt:
        pass
    finally:
        keyboard.unhook_all()


def com_pynput(segundos):
    from pynput import keyboard  # pip install pynput

    def on_press(key):
        nome = getattr(key, "name", None) or ""
        vk = PYNPUT.get(nome)
        if vk:
            registar(nome, vk, f"vk={getattr(key, 'vk', '')}")

    print(f"[pynput] listener activo durante {segundos} s — carrega nas teclas do knob "
          f"(com o ZoneSoft em primeiro plano). Ctrl+C para parar antes.", flush=True)
    with keyboard.Listener(on_press=on_press, suppress=False) as lst:
        fim = time.time() + segundos
        try:
            while time.time() < fim and lst.running:
                time.sleep(0.2)
        except KeyboardInterrupt:
            pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--segundos", type=int, default=120)
    args = ap.parse_args()
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"--- início {datetime.now().isoformat(timespec='seconds')} ({args.segundos} s)\n")
    try:
        com_keyboard(args.segundos)
    except ImportError:
        try:
            com_pynput(args.segundos)
        except ImportError:
            print("Falta a biblioteca: pip install keyboard   (ou pip install pynput)", file=sys.stderr)
            sys.exit(1)
    print("\n--- resumo ---")
    if not contagem:
        print("Nenhuma tecla de multimédia recebida.")
    for vk, n in contagem.most_common():
        print(f"{vk:24s} {n}")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"--- fim: {dict(contagem) or 'nenhuma tecla'}\n")
    print(f"Log: {LOG}")


if __name__ == "__main__":
    main()
