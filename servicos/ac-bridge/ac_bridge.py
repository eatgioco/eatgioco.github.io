#!/usr/bin/env python3
"""
gioco-ac-bridge — ponte entre o A/C Giatsu (módulo Midea, LAN) e o Firebase.

Corre no PC do POS da loja (sb154) como tarefa agendada (SYSTEM). Não há
segredos neste ficheiro: token/key/device id/IP do aparelho vêm de um JSON
local (por omissão C:\\gioco\\ac\\ac-sb154-midea.json).

Ciclo:
  - a cada 30 s lê o A/C por LAN (msmart-ng) e faz PATCH em
    lojas/{loja}/ac/estado (só se algo mudou ou se passaram 5 min — heartbeat);
  - a cada 3 s consulta lojas/{loja}/ac/comandos com estado 'pendente',
    executa por ordem de pedidoEm e marca 'executado' / 'falhou'.

Variáveis de ambiente (todas opcionais):
  AC_BRIDGE_KEYFILE   caminho do JSON com {device_id, ip, token, key}
  AC_BRIDGE_LOJA      id da loja no Firebase (default sb154)
  AC_BRIDGE_LOG       caminho do log (default C:\\gioco\\ac\\ac_bridge.log)
  FIREBASE_AUTH       token para ?auth= no REST (quando as Rules fecharem)
  FIREBASE_URL        base do RTDB (default o do GIOCO)
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler

import requests
from msmart.device import AirConditioner as AC

# ---------------------------------------------------------------- config

KEYFILE = os.environ.get("AC_BRIDGE_KEYFILE", r"C:\gioco\ac\ac-sb154-midea.json")
LOJA = os.environ.get("AC_BRIDGE_LOJA", "sb154")
LOG_PATH = os.environ.get("AC_BRIDGE_LOG", r"C:\gioco\ac\ac_bridge.log")
FIREBASE_URL = os.environ.get(
    "FIREBASE_URL",
    "https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app",
).rstrip("/")
FIREBASE_AUTH = os.environ.get("FIREBASE_AUTH", "").strip()

INTERVALO_ESTADO = 30        # s entre leituras do A/C
INTERVALO_COMANDOS = 3       # s entre consultas de comandos pendentes
HEARTBEAT = 5 * 60           # s: escreve o estado mesmo sem alterações
COMANDO_VALIDADE = 10 * 60   # s: comandos mais velhos que isto expiram
FALHAS_PARA_ALERTA = 3       # leituras falhadas seguidas até marcar erro
TEMP_MIN, TEMP_MAX = 16, 30

MODOS = {
    "cool": AC.OperationalMode.COOL,
    "heat": AC.OperationalMode.HEAT,
    "fan": AC.OperationalMode.FAN_ONLY,
    "dry": AC.OperationalMode.DRY,
    "auto": AC.OperationalMode.AUTO,
}
MODOS_INV = {v: k for k, v in MODOS.items()}
MODOS_INV[AC.OperationalMode.SMART_DRY] = "dry"

ESTADO_PATH = f"lojas/{LOJA}/ac/estado"
COMANDOS_PATH = f"lojas/{LOJA}/ac/comandos"

# ---------------------------------------------------------------- log

log = logging.getLogger("ac-bridge")
log.setLevel(logging.INFO)
_fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
_fh = RotatingFileHandler(LOG_PATH, maxBytes=5 * 1024 * 1024, backupCount=2, encoding="utf-8")
_fh.setFormatter(_fmt)
log.addHandler(_fh)
_sh = logging.StreamHandler(sys.stdout)
_sh.setFormatter(_fmt)
log.addHandler(_sh)
# O msmart faz log do payload em DEBUG; mantê-lo em WARNING evita fugas.
logging.getLogger("msmart").setLevel(logging.WARNING)


def agora_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def parse_iso(s):
    try:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d
    except Exception:
        return None


# ---------------------------------------------------------------- firebase REST

def _url(path: str, **params) -> str:
    if FIREBASE_AUTH:
        params["auth"] = FIREBASE_AUTH
    q = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{FIREBASE_URL}/{path}.json" + (f"?{q}" if q else "")


def fb_get(path: str, **params):
    r = requests.get(_url(path, **params), timeout=10)
    r.raise_for_status()
    return r.json()


def fb_put(path: str, valor):
    """Escreve UMA folha (set). Nunca usar num nó pai."""
    r = requests.put(_url(path), data=json.dumps(valor).encode("utf-8"),
                     headers={"Content-Type": "application/json; charset=utf-8"}, timeout=10)
    r.raise_for_status()


def fb_patch_folhas(path: str, dados: dict):
    """PATCH raso (só chaves de primeiro nível, sem '/' nas chaves) num nó folha
    nosso. É o único PATCH multi-chave permitido: as chaves são todas folhas
    directas de `path`, não caminhos profundos."""
    assert all("/" not in k for k in dados), "PATCH só com folhas directas"
    r = requests.patch(_url(path), data=json.dumps(dados).encode("utf-8"),
                       headers={"Content-Type": "application/json; charset=utf-8"}, timeout=10)
    r.raise_for_status()


# ---------------------------------------------------------------- A/C

def carregar_chave():
    with open(KEYFILE, encoding="utf-8") as f:
        d = json.load(f)
    for k in ("device_id", "ip", "token", "key"):
        if k not in d:
            raise SystemExit(f"ficheiro de chave sem campo '{k}'")
    return d


async def ligar_ac(chave) -> AC:
    dev = AC(ip=chave["ip"], device_id=int(chave["device_id"]), port=int(chave.get("port", 6444)))
    # Ligações longas ao módulo Midea morrem em silêncio; renovar a cada 4 min.
    try:
        dev.set_max_connection_lifetime(240)
    except Exception:
        pass
    await dev.authenticate(chave["token"], chave["key"])
    try:
        await dev.get_capabilities()
    except Exception as e:
        log.warning("capabilities falharam (%s) — a continuar sem elas", e)
    return dev


def estado_do_ac(dev: AC) -> dict:
    modo = MODOS_INV.get(dev.operational_mode, str(dev.operational_mode).lower())
    fan = dev.fan_speed
    try:
        fan = int(fan)
    except Exception:
        fan = None
    return {
        "ligado": bool(dev.power_state),
        "modo": modo,
        "tempAlvo": dev.target_temperature,
        "tempAmbiente": dev.indoor_temperature,
        "tempExterior": dev.outdoor_temperature,
        "ventilacao": fan,
        "alertaFiltro": bool(dev.filter_alert) if dev.filter_alert is not None else False,
        "codigoErro": dev.error_code if dev.error_code else 0,
        "fonte": LOJA,
    }


class Bridge:
    def __init__(self, chave):
        self.chave = chave
        self.dev = None
        self.ultimo_estado = None
        self.ultima_escrita = None   # datetime
        self.falhas = 0
        self.erro_publicado = False
        self.ler_ja = asyncio.Event()
        self.indice_ok = True

    # ---- estado ---------------------------------------------------------

    async def garantir_dev(self):
        if self.dev is None or not self.dev.online:
            if self.dev is not None:
                log.info("A/C offline — a reautenticar")
            self.dev = await ligar_ac(self.chave)

    async def ler_estado(self, forcar_escrita=False):
        try:
            await self.garantir_dev()
            await self.dev.refresh()
            if not self.dev.online:
                raise ConnectionError("dispositivo não respondeu ao refresh")
            estado = estado_do_ac(self.dev)
        except Exception as e:
            self.falhas += 1
            log.warning("leitura do A/C falhou (%d seguidas): %s", self.falhas, e)
            self.dev = None
            if self.falhas >= FALHAS_PARA_ALERTA and not self.erro_publicado:
                try:
                    fb_patch_folhas(ESTADO_PATH, {"erro": "sem ligação ao A/C", "atualizadoEm": agora_iso()})
                    self.erro_publicado = True
                    self.ultima_escrita = datetime.now(timezone.utc)
                except Exception as e2:
                    log.error("não consegui publicar o erro no Firebase: %s", e2)
            return

        self.falhas = 0
        agora = datetime.now(timezone.utc)
        mudou = estado != self.ultimo_estado
        heartbeat = (self.ultima_escrita is None or
                     (agora - self.ultima_escrita).total_seconds() > HEARTBEAT)
        if mudou or heartbeat or forcar_escrita or self.erro_publicado:
            dados = dict(estado)
            dados["atualizadoEm"] = agora_iso()
            dados["erro"] = None            # limpa um erro anterior
            try:
                fb_patch_folhas(ESTADO_PATH, dados)
                self.ultimo_estado = estado
                self.ultima_escrita = agora
                self.erro_publicado = False
                if mudou:
                    log.info("estado: %s", json.dumps(estado, ensure_ascii=False))
            except Exception as e:
                log.error("PATCH do estado falhou: %s", e)

    # ---- comandos -------------------------------------------------------

    def comandos_pendentes(self) -> list:
        """[(id, comando)] ordenados por pedidoEm. Usa o índice se existir;
        senão lê os últimos 50 e filtra aqui (ver README → .indexOn)."""
        dados = None
        if self.indice_ok:
            try:
                dados = fb_get(COMANDOS_PATH, orderBy='"estado"', equalTo='"pendente"')
            except requests.HTTPError as e:
                if e.response is not None and e.response.status_code == 400:
                    log.warning("sem índice .indexOn em %s — a filtrar localmente", COMANDOS_PATH)
                    self.indice_ok = False
                else:
                    raise
        if dados is None:
            dados = fb_get(COMANDOS_PATH, orderBy='"$key"', limitToLast=50) or {}
            dados = {k: v for k, v in dados.items() if isinstance(v, dict) and v.get("estado") == "pendente"}
        itens = [(k, v) for k, v in (dados or {}).items() if isinstance(v, dict)]
        itens.sort(key=lambda kv: str(kv[1].get("pedidoEm", "")))
        return itens

    def marcar(self, cid: str, estado: str, erro: str = None):
        # Folha a folha; 'estado' por último para a página só reagir quando
        # o resto já lá está.
        fb_put(f"{COMANDOS_PATH}/{cid}/executadoEm", agora_iso())
        if erro:
            fb_put(f"{COMANDOS_PATH}/{cid}/erro", erro)
        fb_put(f"{COMANDOS_PATH}/{cid}/estado", estado)

    async def executar(self, cid: str, cmd: dict):
        tipo = cmd.get("tipo")
        valor = cmd.get("valor")
        pedido = parse_iso(cmd.get("pedidoEm"))
        if pedido is None or datetime.now(timezone.utc) - pedido > timedelta(seconds=COMANDO_VALIDADE):
            log.info("comando %s expirado (%s)", cid, cmd.get("pedidoEm"))
            self.marcar(cid, "falhou", "expirado")
            return

        try:
            await self.garantir_dev()
            await self.dev.refresh()          # apply() envia o estado completo
            if tipo == "ligar":
                self.dev.power_state = True
            elif tipo == "desligar":
                self.dev.power_state = False
            elif tipo == "tempAlvo":
                t = float(valor)
                if not (TEMP_MIN <= t <= TEMP_MAX):
                    raise ValueError(f"tempAlvo fora de {TEMP_MIN}–{TEMP_MAX}")
                self.dev.target_temperature = t
            elif tipo == "modo":
                if valor not in MODOS:
                    raise ValueError(f"modo inválido: {valor}")
                self.dev.operational_mode = MODOS[valor]
                self.dev.power_state = True
            else:
                raise ValueError(f"tipo desconhecido: {tipo}")
            await self.dev.apply()
            log.info("comando %s executado: %s=%s", cid, tipo, valor)
            self.marcar(cid, "executado")
        except Exception as e:
            log.warning("comando %s falhou: %s", cid, e)
            if isinstance(e, (ValueError, TypeError)):
                msg = str(e)
            else:
                msg = "sem ligação ao A/C"
                self.dev = None
            try:
                self.marcar(cid, "falhou", msg)
            except Exception as e2:
                log.error("não consegui marcar o comando %s: %s", cid, e2)
        finally:
            self.ler_ja.set()

    # ---- loops ----------------------------------------------------------

    async def loop_estado(self):
        while True:
            forcar = self.ler_ja.is_set()
            self.ler_ja.clear()
            await self.ler_estado(forcar_escrita=forcar)
            try:
                await asyncio.wait_for(self.ler_ja.wait(), timeout=INTERVALO_ESTADO)
            except asyncio.TimeoutError:
                pass

    async def loop_comandos(self):
        while True:
            try:
                for cid, cmd in self.comandos_pendentes():
                    await self.executar(cid, cmd)
            except Exception as e:
                log.error("consulta de comandos falhou: %s", e)
            await asyncio.sleep(INTERVALO_COMANDOS)

    async def run(self):
        log.info("gioco-ac-bridge a arrancar — loja %s, A/C %s (id %s), auth REST %s",
                 LOJA, self.chave["ip"], self.chave["device_id"], "sim" if FIREBASE_AUTH else "não")
        await asyncio.gather(self.loop_estado(), self.loop_comandos())


def main():
    chave = carregar_chave()
    while True:
        try:
            asyncio.run(Bridge(chave).run())
        except KeyboardInterrupt:
            return
        except Exception as e:
            log.error("loop principal caiu (%s) — a reiniciar em 10 s", e)
            import time
            time.sleep(10)


if __name__ == "__main__":
    main()
