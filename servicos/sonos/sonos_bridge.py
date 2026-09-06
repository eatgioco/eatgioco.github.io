#!/usr/bin/env python3
"""
gioco-sonos-bridge — ponte entre as colunas Sonos da loja (LAN) e o Firebase.

Corre no PC do POS da loja (sb154) como tarefa agendada (SYSTEM), no mesmo
molde do ac_bridge.py. Não há segredos neste ficheiro nem ficheiro de chave:
as Sonos falam por UPnP na LAN sem autenticação (biblioteca soco).

Topologia (apurada em Set/2026): duas Era 100 SL em par estéreo, uma única
zona "SB154". Volume, mute, transporte e faixa são propriedades da ZONA e
lêem-se/escrevem-se sempre na coordenadora (`group.coordinator`), nunca no
canal — que nem sequer aparece na descoberta sem include_invisible=True.
As escritas propagam em assíncrono: dorme-se 0,5 s antes de reler.

Ciclo:
  - a cada 3 s lê o estado da zona e faz PATCH raso em
    lojas/{loja}/sonos/estado (só se algo mudou ou se passaram 5 min —
    heartbeat);
  - a cada 3 s consulta lojas/{loja}/sonos/comandos com estado 'pendente',
    executa por ordem de pedidoEm e marca 'executado' / 'falhou';
  - no arranque e a cada 10 min espelha os favoritos Sonos em
    lojas/{loja}/sonos/favoritos e o inventário das unidades em
    lojas/{loja}/sonos/unidades (PUT em cada um destes nós, nunca acima);
  - a cada 30 s (e logo a seguir a uma mudança de faixa) espelha a fila em
    lojas/{loja}/sonos/fila — até FILA_MAX itens a partir da posição actual
    (PUT no nó fila). Em AirPlay a fila pode vir vazia ou ser a do telemóvel:
    escreve-se o que o soco devolver, sem inventar nada;
  - a cada 60 s faz PATCH raso do acumulador do dia em
    lojas/{loja}/sonos/diario/{AAAA-MM-DD} (totais absolutos, ver Diario);
  - no arranque lê lojas/{loja}/sonos/config/predefinicoes (níveis de volume
    da página) e, SÓ se o nó não existir, cria-o uma vez com os defaults —
    nunca mais escreve lá.

Tipos de comando: volume (0–SONOS_BRIDGE_VOLUME_MAX), mute (bool), play,
pause, proximo, anterior, tocarFavorito (índice da lista favoritos ou uri),
bloquearBotoes (bool), luzEstado (bool), sleepTimer (segundos, 0 = cancelar),
eqGraves (-10..10), eqAgudos (-10..10), eqLoudness (bool), aleatorio (bool),
repetir (bool), crossfade (bool), saltarPara (posição 1-based na fila).

Variáveis de ambiente (todas opcionais):
  SONOS_BRIDGE_UID         UID da coordenadora (default o da SB154)
  SONOS_BRIDGE_IP          IP de recurso se a descoberta falhar
  SONOS_BRIDGE_VOLUME_MAX  teto de volume aceite nos comandos (default 60)
  SONOS_BRIDGE_LOJA        id da loja no Firebase (default sb154)
  SONOS_BRIDGE_LOG         caminho do log (default C:\\gioco\\sonos\\sonos_bridge.log)
  FIREBASE_AUTH            token para ?auth= no REST (quando as Rules fecharem)
  FIREBASE_URL             base do RTDB (default o do GIOCO)
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler

import requests
import soco
from soco import SoCo

# ---------------------------------------------------------------- config

UID_COORD = os.environ.get("SONOS_BRIDGE_UID", "RINCON_74CA60A613FE01400").strip()
IP_FALLBACK = os.environ.get("SONOS_BRIDGE_IP", "").strip()
VOLUME_MAX = int(os.environ.get("SONOS_BRIDGE_VOLUME_MAX", "60"))
LOJA = os.environ.get("SONOS_BRIDGE_LOJA", "sb154")
LOG_PATH = os.environ.get("SONOS_BRIDGE_LOG", r"C:\gioco\sonos\sonos_bridge.log")
FIREBASE_URL = os.environ.get(
    "FIREBASE_URL",
    "https://gioco-fornecedores-default-rtdb.europe-west1.firebasedatabase.app",
).rstrip("/")
FIREBASE_AUTH = os.environ.get("FIREBASE_AUTH", "").strip()

INTERVALO_ESTADO = 3         # s entre leituras da zona
INTERVALO_COMANDOS = 3       # s entre consultas de comandos pendentes
INTERVALO_INVENTARIO = 600   # s entre espelhos de favoritos/unidades
INTERVALO_FILA = 30          # s entre espelhos da fila (ou logo após mudar de faixa)
INTERVALO_DIARIO = 60        # s entre PATCH do acumulador do dia
FILA_MAX = 30                # itens da fila espelhados a partir da posição actual
HEARTBEAT = 5 * 60           # s: escreve o estado mesmo sem alterações
COMANDO_VALIDADE = 10 * 60   # s: comandos mais velhos que isto expiram
FALHAS_PARA_ALERTA = 3       # leituras falhadas seguidas até marcar erro
PROPAGACAO = 0.5             # s: as escritas na zona propagam em assíncrono
TRANSPORTES = ("PLAYING", "PAUSED_PLAYBACK", "STOPPED", "TRANSITIONING")
DT_MAX = 30                  # s: salto maior que isto não conta no diário (PC suspenso)
HORA_LOJA = (12, 23)         # [12h, 23h[ hora local do POS — igual ao cartão
EQ_MIN, EQ_MAX = -10, 10     # graves/agudos aceites pela Sonos
# Níveis de volume que a página oferece. Semeados UMA vez em config/predefinicoes:
# a partir daí mandam os valores do Firebase e o serviço nunca mais escreve lá.
PREDEFINICOES = {"abertura": 25, "normal": 38, "cheio": 50}

BASE_PATH = f"lojas/{LOJA}/sonos"
ESTADO_PATH = f"{BASE_PATH}/estado"
COMANDOS_PATH = f"{BASE_PATH}/comandos"
FAVORITOS_PATH = f"{BASE_PATH}/favoritos"
UNIDADES_PATH = f"{BASE_PATH}/unidades"
FILA_PATH = f"{BASE_PATH}/fila"
DIARIO_PATH = f"{BASE_PATH}/diario"
PREDEFINICOES_PATH = f"{BASE_PATH}/config/predefinicoes"

# ---------------------------------------------------------------- log

log = logging.getLogger("sonos-bridge")
log.setLevel(logging.INFO)
_fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
_fh = RotatingFileHandler(LOG_PATH, maxBytes=5 * 1024 * 1024, backupCount=2, encoding="utf-8")
_fh.setFormatter(_fmt)
log.addHandler(_fh)
_sh = logging.StreamHandler(sys.stdout)
_sh.setFormatter(_fmt)
log.addHandler(_sh)
logging.getLogger("soco").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)


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


def como_bool(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)) and v in (0, 1):
        return bool(v)
    if isinstance(v, str) and v.lower() in ("true", "false"):
        return v.lower() == "true"
    raise ValueError(f"valor booleano inválido: {v!r}")


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
    """Escreve UM nó nosso (set). Nunca usar acima do nó que é nosso."""
    r = requests.put(_url(path), data=json.dumps(valor, ensure_ascii=False).encode("utf-8"),
                     headers={"Content-Type": "application/json; charset=utf-8"}, timeout=10)
    r.raise_for_status()


def fb_patch_folhas(path: str, dados: dict):
    """PATCH raso (só chaves de primeiro nível, sem '/' nas chaves) num nó
    nosso. As chaves são todas folhas directas de `path`, não caminhos
    profundos."""
    assert all("/" not in k for k in dados), "PATCH só com folhas directas"
    r = requests.patch(_url(path), data=json.dumps(dados, ensure_ascii=False).encode("utf-8"),
                       headers={"Content-Type": "application/json; charset=utf-8"}, timeout=10)
    r.raise_for_status()


# ---------------------------------------------------------------- Sonos (bloqueante; corre em to_thread)

def descobrir() -> SoCo:
    """Devolve a coordenadora da zona. Primeiro por UID na descoberta
    (com as invisíveis, porque o canal do par não aparece sem isso), depois
    por IP de recurso. Se o UID pedido for hoje um canal, sobe à coordenadora
    do grupo."""
    dev = None
    try:
        for d in (soco.discover(include_invisible=True, timeout=5) or set()):
            try:
                if d.uid == UID_COORD:
                    dev = d
                    break
            except Exception:
                continue
    except Exception as e:
        log.warning("descoberta falhou: %s", e)
    if dev is None and IP_FALLBACK:
        log.info("UID %s não encontrado na descoberta — a usar SONOS_BRIDGE_IP %s", UID_COORD, IP_FALLBACK)
        dev = SoCo(IP_FALLBACK)
    if dev is None:
        raise ConnectionError("nenhuma Sonos encontrada na LAN")
    coord = dev.group.coordinator if dev.group is not None else dev
    if coord.uid != dev.uid:
        log.info("a coordenação passou para %s (%s)", coord.uid, coord.ip_address)
    log.info("zona '%s' — coordenadora %s @ %s", coord.player_name, coord.uid, coord.ip_address)
    return coord


def fonte_do_uri(uri: str, transporte: str) -> str:
    u = (uri or "").lower()
    if not u:
        return "nada"
    if "airplay" in u or u.startswith("x-sonos-vli:"):
        return "airplay"
    if "spotify" in u:
        return "spotify"
    if u.startswith(("x-sonosapi-stream:", "x-sonosapi-radio:", "x-rincon-mp3radio:",
                     "aac:", "hls-radio:", "x-sonosapi-hls:")):
        return "radio"
    if u.startswith(("x-rincon-queue:", "x-file-cifs:", "x-sonos-http:", "x-sonosprog-http:",
                     "x-sonos-spotify:", "x-rincon-playlist:")):
        return "fila"
    if u.startswith(("http:", "https:")):
        return "radio"
    return "fila"


def _limpo(v):
    if v is None:
        return None
    s = str(v).strip()
    return None if s in ("", "NOT_IMPLEMENTED") else s


def _talvez(fn, default=None):
    """Lê uma propriedade OPCIONAL da zona. Se o firmware não a expuser (ou a
    chamada UPnP falhar), vale `default` em vez de deitar abaixo a leitura
    toda — o essencial (transporte, faixa, volume, mute) fica sem rede de
    segurança de propósito: aí a falha É falha de ligação."""
    try:
        return fn()
    except Exception:
        return default


def _inteiro(valor, minimo, maximo, nome):
    try:
        v = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f"{nome} inválido: {valor!r}")
    if v < minimo or v > maximo:
        raise ValueError(f"{nome} fora de {minimo}–{maximo}")
    return v


def ler_zona(coord: SoCo) -> dict:
    """Lê o estado completo da zona pela coordenadora. Levanta em falha de
    ligação."""
    transporte = coord.get_current_transport_info().get("current_transport_state", "STOPPED")
    if transporte == "PAUSED_PLAYBACK":
        transporte = "PAUSED"
    faixa = coord.get_current_track_info() or {}
    uri = faixa.get("uri") or ""
    fonte = fonte_do_uri(uri, transporte)
    if transporte == "STOPPED" and not (faixa.get("title") or faixa.get("artist")):
        fonte = "nada"
    estado = {
        "ligado": True,
        "transporte": transporte,
        "volume": int(coord.volume),
        "mute": bool(coord.mute),
        "fonte": fonte,
        "faixa": {
            "titulo": _limpo(faixa.get("title")),
            "artista": _limpo(faixa.get("artist")),
            "album": _limpo(faixa.get("album")),
            "posicao": _limpo(faixa.get("position")),
            "duracao": _limpo(faixa.get("duration")),
        },
        "fonteDados": LOJA,
    }
    if fonte == "nada":
        estado["faixa"] = None

    # Extras (Set/2026). Todos opcionais: um firmware que não exponha um deles
    # deixa-o a null em vez de fazer falhar a leitura da zona.
    botoes = _talvez(lambda: bool(coord.buttons_enabled))
    estado["botoesBloqueados"] = None if botoes is None else (not botoes)
    estado["luzEstado"] = _talvez(lambda: bool(coord.status_light))
    st = _talvez(lambda: coord.get_sleep_timer())
    estado["sleepTimerRestante"] = None if st in (None, "") else int(st)
    estado["eq"] = {
        "graves": _talvez(lambda: int(coord.bass)),
        "agudos": _talvez(lambda: int(coord.treble)),
        "loudness": _talvez(lambda: bool(coord.loudness)),
    }
    estado["modo"] = ler_modo(coord)
    pos = _limpo(faixa.get("playlist_position"))
    try:
        estado["filaPosicao"] = int(pos) if pos else None
    except (TypeError, ValueError):
        estado["filaPosicao"] = None
    estado["filaTamanho"] = _talvez(lambda: int(coord.queue_size))
    return estado


def ler_modo(coord: SoCo) -> dict:
    """{aleatorio, repetir, crossfade}. O aleatório e a repetição são as duas
    dimensões do play_mode; usa-se as propriedades do soco quando existem e
    lê-se o play_mode em bruto quando não. REPEAT_ONE conta como repetir."""
    modo = str(_talvez(lambda: coord.play_mode, "NORMAL") or "NORMAL").upper()
    aleatorio = _talvez(lambda: bool(coord.shuffle))
    if aleatorio is None:
        aleatorio = "SHUFFLE" in modo
    rep = _talvez(lambda: coord.repeat, "__sem__")
    repetir = ("REPEAT" in modo) if rep == "__sem__" else bool(rep)
    return {"aleatorio": bool(aleatorio), "repetir": bool(repetir),
            "crossfade": _talvez(lambda: bool(coord.cross_fade))}


def definir_modo(coord: SoCo, aleatorio=None, repetir=None):
    """Muda SÓ a dimensão pedida do play_mode, preservando a outra. Mexer no
    'repetir' colapsa um REPEAT_ONE em REPEAT_ALL — repetir uma só faixa não
    tem interruptor no cartão e não se inventa um estado intermédio."""
    atual = ler_modo(coord)
    a = atual["aleatorio"] if aleatorio is None else bool(aleatorio)
    r = atual["repetir"] if repetir is None else bool(repetir)
    coord.play_mode = ("SHUFFLE" if (a and r) else
                       "SHUFFLE_NOREPEAT" if a else
                       "REPEAT_ALL" if r else "NORMAL")


def _fav_uri(fav):
    for attr in ("resources",):
        rs = getattr(fav, attr, None)
        if rs:
            try:
                return rs[0].uri
            except Exception:
                pass
    ref = getattr(fav, "reference", None)
    if ref is not None and getattr(ref, "resources", None):
        try:
            return ref.resources[0].uri
        except Exception:
            pass
    return None


URIS_RADIO = ("x-sonosapi-stream:", "x-sonosapi-radio:", "x-rincon-mp3radio:",
              "aac:", "hls-radio:", "x-sonosapi-hls:")


def tipo_do_favorito(uri, classe) -> str:
    """radio | playlist | album | outro — a taxonomia dos FAVORITOS, que não é
    a das fontes a tocar: um favorito nunca é 'nada'/'sem música'. Decide pela
    classe DIDL do item apontado (fiável) e só depois pelo URI."""
    c = str(classe or "").lower()
    u = str(uri or "").lower()
    if "audiobroadcast" in c or u.startswith(URIS_RADIO):
        return "radio"
    if "playlistcontainer" in c or "#playlist" in u:
        return "playlist"
    if "musicalbum" in c or ".album" in c or "#album" in u:
        return "album"
    if not c and u.startswith(("http:", "https:")):
        return "radio"
    return "outro"


def _classe_favorito(fav, ref):
    for obj in (ref, fav):
        c = getattr(obj, "item_class", None) if obj is not None else None
        if c:
            return str(c)
    return ""


def ler_favoritos(coord: SoCo) -> list:
    """[{titulo, tipo, uri, meta}] pela ordem da app Sonos. Guarda-se o
    objecto DIDL em memória (não no Firebase) para tocar depois."""
    itens = []
    try:
        favs = list(coord.music_library.get_sonos_favorites())
    except Exception:
        favs = coord.get_sonos_favorites().get("favorites", [])  # API antiga: dicts
    for f in favs:
        if isinstance(f, dict):
            uri = f.get("uri")
            itens.append({"titulo": f.get("title"), "uri": uri, "meta": f.get("meta"),
                          "tipo": tipo_do_favorito(uri, ""), "tocavel": bool(uri), "_obj": None})
            continue
        uri = _fav_uri(f)
        ref = getattr(f, "reference", None)
        meta = getattr(f, "resource_meta_data", None)
        # Os "Sonos Radio" de fábrica aparecem nos favoritos sem recurso nem
        # referência utilizáveis: ficam tipo 'radio' e tocavel=false — a página
        # mostra-os desactivados em vez de oferecer um botão que ia falhar.
        itens.append({"titulo": getattr(f, "title", None), "uri": uri, "meta": meta,
                      "tipo": tipo_do_favorito(uri, _classe_favorito(f, ref)),
                      "tocavel": bool(uri) or ref is not None, "_obj": f})
    return itens


def ler_fila(coord: SoCo, posicao_atual, maximo: int = FILA_MAX) -> dict:
    """{'0': {titulo, artista, posicao}} — até `maximo` itens da fila a partir
    da faixa a tocar. `posicao` é a posição REAL na fila (1-based, como a
    Sonos a conta) e é o valor que o comando saltarPara aceita.

    Em AirPlay a fila costuma vir vazia (a fila vive no telemóvel): devolve-se
    {} e o nó fica a null. Nunca se inventa conteúdo."""
    try:
        inicio = max(0, int(posicao_atual) - 1)
    except (TypeError, ValueError):
        inicio = 0
    itens = coord.get_queue(start=inicio, max_items=maximo)
    out = {}
    for n, it in enumerate(itens or []):
        out[str(n)] = {
            "titulo": _limpo(getattr(it, "title", None)),
            "artista": _limpo(getattr(it, "creator", None) or getattr(it, "artist", None)),
            "posicao": inicio + n + 1,
        }
    return out


def ler_unidades(coord: SoCo) -> dict:
    """{uid: {ip, mac, modelo, firmware, papel, visivel, nome}} de todas as
    unidades do grupo da coordenadora (o canal invisível incluído)."""
    out = {}
    membros = list(coord.group.members) if coord.group is not None else [coord]
    for m in membros:
        try:
            info = m.get_speaker_info() or {}
        except Exception:
            info = {}
        out[m.uid] = {
            "ip": m.ip_address,
            "mac": info.get("mac_address"),
            "modelo": info.get("model_name"),
            "firmware": info.get("software_version"),
            "papel": "coordenadora" if m.uid == coord.uid else "canal",
            "visivel": bool(getattr(m, "is_visible", True)),
            "nome": info.get("zone_name") or m.player_name,
        }
    return out


def tocar_favorito(coord: SoCo, fav: dict):
    """Toca um favorito. Rádios/streams vão por play_uri com os metadados;
    para Spotify (e para o que o play_uri recusar) limpa-se a fila, junta-se o
    item com metadados e toca-se da fila."""
    obj = fav.get("_obj")
    uri = fav.get("uri")
    meta = fav.get("meta") or ""
    if not fav.get("tocavel", True):
        raise ValueError("favorito sem URI utilizável (rádio Sonos de fábrica)")
    if not uri:
        raise ValueError("favorito sem uri")
    erro_uri = None
    if "spotify" not in str(uri).lower():
        try:
            coord.play_uri(uri, meta=meta, title=fav.get("titulo") or "")
            return
        except Exception as e:
            erro_uri = e
            log.info("play_uri falhou (%s) — a tentar pela fila", e)
    item = getattr(obj, "reference", None) or obj
    if item is None:
        raise ConnectionError(f"não consegui tocar o favorito: {erro_uri or 'sem metadados'}")
    coord.clear_queue()
    coord.add_to_queue(item)
    coord.play_from_queue(0)


# ---------------------------------------------------------------- diário

class Diario:
    """Acumulador do dia em lojas/{loja}/sonos/diario/{AAAA-MM-DD}.

    Soma segundos a cada leitura do estado (3 em 3 s) e faz PATCH raso uma vez
    por minuto com os totais ABSOLUTOS do dia — nunca incrementos, para um
    PATCH repetido ou perdido não estragar a conta. Ao arrancar (e à
    meia-noite) lê o nó do dia e continua de onde ele estava, para um
    reinício do serviço não pôr o dia a zero.

    Um salto maior que DT_MAX (serviço parado, PC suspenso, rede em baixo) não
    é contado: o tempo em que não sabemos o que se passou não é tempo a tocar
    nem tempo parado.

    O horário de loja é HORA_LOJA em hora LOCAL do POS (que está em Lisboa),
    a mesma janela que o cartão usa para o alerta "sem música".
    """

    FONTES = ("airplay", "spotify", "radio", "fila")

    def __init__(self):
        self.dia = None
        self.z = None
        self.fechados = []      # [(dia, dados)] de dias já fechados por escrever

    @staticmethod
    def _zero():
        return {"tocar": 0.0, "parado": 0.0, "paradoLoja": 0.0,
                "pausas": 0, "maiorPausa": 0.0, "pausaAtual": 0.0,
                "volSoma": 0.0, "volMax": None,
                "fontes": {k: 0.0 for k in Diario.FONTES}, "tocava": None}

    def _abrir(self, dia: str):
        z = self._zero()
        try:
            antigo = fb_get(f"{DIARIO_PATH}/{dia}") or {}
        except Exception as e:
            log.warning("não li o diário de %s (recomeça a zero): %s", dia, e)
            antigo = {}
        if isinstance(antigo, dict) and antigo:
            def m(k):
                try:
                    return max(0.0, float(antigo.get(k) or 0)) * 60.0
                except (TypeError, ValueError):
                    return 0.0
            z["tocar"] = m("minutosATocar")
            z["parado"] = m("minutosParado")
            z["paradoLoja"] = m("minutosParadoHorarioLoja")
            z["maiorPausa"] = m("maiorPausa")
            try:
                z["pausas"] = int(antigo.get("nrPausas") or 0)
            except (TypeError, ValueError):
                z["pausas"] = 0
            vmed = antigo.get("volumeMedio")
            if isinstance(vmed, (int, float)):
                z["volSoma"] = float(vmed) * z["tocar"]
            vmax = antigo.get("volumeMax")
            if isinstance(vmax, (int, float)):
                z["volMax"] = int(vmax)
            fontes = antigo.get("fontes")
            if isinstance(fontes, dict):
                for k in Diario.FONTES:
                    try:
                        z["fontes"][k] = max(0.0, float(fontes.get(k) or 0)) * 60.0
                    except (TypeError, ValueError):
                        pass
            log.info("diário de %s recuperado (%.1f min a tocar)", dia, z["tocar"] / 60)
        self.z = z
        self.dia = dia

    def tick(self, dt: float, estado: dict):
        """Conta `dt` segundos com o estado lido agora."""
        hoje = datetime.now().astimezone().strftime("%Y-%m-%d")
        if hoje != self.dia:
            if self.dia is not None and self.z is not None:
                self.fechados.append((self.dia, self.dados(self.z)))
            self._abrir(hoje)
        if dt <= 0 or dt > DT_MAX:
            return
        z = self.z
        toca = bool(estado) and estado.get("transporte") == "PLAYING"
        if z["tocava"] is True and not toca:
            z["pausas"] += 1
        elif z["tocava"] is False and toca:
            z["maiorPausa"] = max(z["maiorPausa"], z["pausaAtual"])
            z["pausaAtual"] = 0.0
        z["tocava"] = toca

        if toca:
            z["tocar"] += dt
            v = estado.get("volume")
            if isinstance(v, (int, float)):
                z["volSoma"] += float(v) * dt
                z["volMax"] = int(v) if z["volMax"] is None else max(z["volMax"], int(v))
            # A fonte só conta enquanto toca: parada, o URI da última faixa
            # continua lá e inflaria a fonte anterior.
            f = estado.get("fonte")
            if f in z["fontes"]:
                z["fontes"][f] += dt
        else:
            z["parado"] += dt
            z["pausaAtual"] += dt
            if HORA_LOJA[0] <= datetime.now().astimezone().hour < HORA_LOJA[1]:
                z["paradoLoja"] += dt

    def dados(self, z=None) -> dict:
        z = z or self.z
        tocar = z["tocar"]
        return {
            "minutosATocar": round(tocar / 60, 1),
            "minutosParado": round(z["parado"] / 60, 1),
            "minutosParadoHorarioLoja": round(z["paradoLoja"] / 60, 1),
            # A pausa em curso conta: senão o número só saltava quando a música
            # voltasse, que é precisamente quando deixa de interessar.
            "maiorPausa": round(max(z["maiorPausa"], z["pausaAtual"]) / 60, 1),
            "nrPausas": int(z["pausas"]),
            "volumeMedio": round(z["volSoma"] / tocar) if tocar >= 1 else None,
            "volumeMax": z["volMax"],
            "fontes": {k: round(v / 60, 1) for k, v in z["fontes"].items()},
            "atualizadoEm": agora_iso(),
        }

    def gravar(self):
        """PATCH raso do dia corrente (e de qualquer dia fechado à espera)."""
        while self.fechados:
            dia, dados = self.fechados[0]
            fb_patch_folhas(f"{DIARIO_PATH}/{dia}", dados)
            log.info("diário de %s fechado: %.1f min a tocar", dia, dados["minutosATocar"])
            self.fechados.pop(0)
        if self.dia and self.z:
            fb_patch_folhas(f"{DIARIO_PATH}/{self.dia}", self.dados())


# ---------------------------------------------------------------- Bridge

class Bridge:
    def __init__(self):
        self.coord = None
        self.ultimo_estado = None
        self.ultima_escrita = None   # datetime
        self.falhas = 0
        self.erro_publicado = False
        self.ler_ja = asyncio.Event()
        self.indice_ok = True
        self.favoritos = []          # lista em memória (com _obj)
        self.toca_desde = None       # ISO: última passagem para PLAYING
        self.parado_desde = None     # ISO: última saída de PLAYING
        self.transporte_anterior = None
        self.fila_ja = asyncio.Event()   # pedir espelho da fila fora do ciclo
        self.faixa_anterior = None       # (uri, titulo) para detectar mudança
        self.diario = Diario()
        self.ultimo_tick = None          # datetime da última contagem do diário

    # ---- ligação ---------------------------------------------------------

    async def garantir_coord(self):
        if self.coord is None:
            self.coord = await asyncio.to_thread(descobrir)

    def _atualizar_coord(self):
        """Se a coordenação trocou (grupo desfeito/refeito), segue-a."""
        try:
            g = self.coord.group
            if g is not None and g.coordinator.uid != self.coord.uid:
                log.info("coordenação trocou para %s", g.coordinator.uid)
                self.coord = g.coordinator
        except Exception:
            pass

    # ---- estado ---------------------------------------------------------

    def _marcas_de_tempo(self, transporte: str):
        if transporte != self.transporte_anterior:
            if transporte == "PLAYING":
                self.toca_desde = agora_iso()
            elif self.transporte_anterior == "PLAYING" or self.transporte_anterior is None:
                self.parado_desde = agora_iso()
            self.transporte_anterior = transporte

    async def ler_estado(self, forcar_escrita=False):
        try:
            await self.garantir_coord()
            await asyncio.to_thread(self._atualizar_coord)
            estado = await asyncio.to_thread(ler_zona, self.coord)
        except Exception as e:
            self.falhas += 1
            log.warning("leitura da Sonos falhou (%d seguidas): %s", self.falhas, e)
            self.coord = None
            if self.falhas >= FALHAS_PARA_ALERTA and not self.erro_publicado:
                try:
                    fb_patch_folhas(ESTADO_PATH, {"erro": "sem ligação à Sonos", "ligado": False,
                                                  "atualizadoEm": agora_iso()})
                    self.erro_publicado = True
                    self.ultima_escrita = datetime.now(timezone.utc)
                except Exception as e2:
                    log.error("não consegui publicar o erro no Firebase: %s", e2)
            return

        self.falhas = 0
        agora_tick = datetime.now(timezone.utc)
        if self.ultimo_tick is not None:
            self.diario.tick((agora_tick - self.ultimo_tick).total_seconds(), estado)
        else:
            self.diario.tick(0, estado)   # abre o dia sem contar tempo nenhum
        self.ultimo_tick = agora_tick

        # Mudou a faixa? A fila a seguir também mudou — espelha-se já, sem
        # esperar pelos 30 s do ciclo.
        faixa_agora = ((estado.get("faixa") or {}).get("titulo"), estado.get("filaPosicao"))
        if self.faixa_anterior is not None and faixa_agora != self.faixa_anterior:
            self.fila_ja.set()
        self.faixa_anterior = faixa_agora

        self._marcas_de_tempo(estado["transporte"])
        estado["tocaDesde"] = self.toca_desde
        estado["paradoDesde"] = self.parado_desde
        estado["favoritoAtual"] = self._favorito_atual(estado)

        agora = datetime.now(timezone.utc)
        # A posição muda a cada segundo; não conta como "mudança" para não
        # escrever de 3 em 3 s enquanto toca. Vai na mesma quando algo mais muda
        # ou no heartbeat.
        def sem_posicao(e):
            if not e:
                return e
            c = dict(e)
            if isinstance(c.get("faixa"), dict):
                c["faixa"] = {k: v for k, v in c["faixa"].items() if k != "posicao"}
            return c
        mudou = sem_posicao(estado) != sem_posicao(self.ultimo_estado)
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
                    log.info("estado: %s", json.dumps(sem_posicao(estado), ensure_ascii=False))
            except Exception as e:
                log.error("PATCH do estado falhou: %s", e)

    def _favorito_atual(self, estado):
        faixa = estado.get("faixa") or {}
        titulo = faixa.get("titulo")
        for i, f in enumerate(self.favoritos):
            if titulo and f.get("titulo") == titulo:
                return i
        return None

    # ---- inventário -----------------------------------------------------

    async def espelhar_inventario(self):
        try:
            await self.garantir_coord()
            favs = await asyncio.to_thread(ler_favoritos, self.coord)
            unidades = await asyncio.to_thread(ler_unidades, self.coord)
        except Exception as e:
            log.warning("inventário falhou: %s", e)
            self.coord = None
            return
        self.favoritos = favs
        publico = {str(i): {k: v for k, v in f.items() if not k.startswith("_")}
                   for i, f in enumerate(favs)}
        try:
            fb_put(FAVORITOS_PATH, publico if publico else None)
            fb_put(UNIDADES_PATH, unidades)
            log.info("inventário: %d favorito(s), %d unidade(s)", len(favs), len(unidades))
        except Exception as e:
            log.error("PUT do inventário falhou: %s", e)

    async def espelhar_fila(self):
        """PUT do nó fila com o que a Sonos devolver a partir da faixa actual.
        Fila vazia (o caso normal em AirPlay) escreve null, não um nó vazio."""
        try:
            await self.garantir_coord()
            pos = (self.ultimo_estado or {}).get("filaPosicao") or 1
            fila = await asyncio.to_thread(ler_fila, self.coord, pos)
        except Exception as e:
            log.warning("leitura da fila falhou: %s", e)
            return
        try:
            fb_put(FILA_PATH, fila if fila else None)
        except Exception as e:
            log.error("PUT da fila falhou: %s", e)

    def semear_predefinicoes(self):
        """Lê config/predefinicoes. Se o nó não existir cria-o UMA vez com os
        defaults; a partir daí mandam os valores do Firebase e o serviço nunca
        mais escreve lá (as predefinições são do utilizador, não do serviço)."""
        try:
            atual = fb_get(PREDEFINICOES_PATH)
        except Exception as e:
            log.warning("não li as predefinições de volume: %s", e)
            return
        if isinstance(atual, dict) and atual:
            log.info("predefinições de volume: %s", json.dumps(atual, ensure_ascii=False))
            return
        try:
            fb_put(PREDEFINICOES_PATH, dict(PREDEFINICOES))
            log.info("predefinições de volume criadas (%s) — nunca mais escritas pelo serviço",
                     json.dumps(PREDEFINICOES))
        except Exception as e:
            log.error("PUT das predefinições falhou: %s", e)

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

    def aplicar(self, tipo: str, valor):
        """Bloqueante (corre em to_thread). ValueError = valor inválido;
        qualquer outra excepção conta como falha de ligação."""
        c = self.coord
        if tipo == "volume":
            try:
                v = int(valor)
            except (TypeError, ValueError):
                raise ValueError(f"volume inválido: {valor!r}")
            if v < 0 or v > VOLUME_MAX:
                raise ValueError(f"volume fora de 0–{VOLUME_MAX} (teto do serviço)")
            c.volume = v
        elif tipo == "mute":
            c.mute = como_bool(valor)
        elif tipo == "play":
            c.play()
        elif tipo == "pause":
            c.pause()
        elif tipo == "proximo":
            c.next()
        elif tipo == "anterior":
            c.previous()
        elif tipo == "tocarFavorito":
            fav = None
            if isinstance(valor, (int, float)) or (isinstance(valor, str) and valor.isdigit()):
                i = int(valor)
                if 0 <= i < len(self.favoritos):
                    fav = self.favoritos[i]
            elif isinstance(valor, str):
                for f in self.favoritos:
                    if f.get("uri") == valor:
                        fav = f
                        break
            if fav is None:
                raise ValueError(f"favorito desconhecido: {valor!r}")
            tocar_favorito(c, fav)
        elif tipo == "bloquearBotoes":
            c.buttons_enabled = not como_bool(valor)   # o nó guarda o inverso
        elif tipo == "luzEstado":
            c.status_light = como_bool(valor)
        elif tipo == "sleepTimer":
            seg = _inteiro(valor, 0, 24 * 3600, "sleepTimer")
            c.set_sleep_timer(seg if seg > 0 else None)   # 0 = cancelar
        elif tipo == "eqGraves":
            c.bass = _inteiro(valor, EQ_MIN, EQ_MAX, "graves")
        elif tipo == "eqAgudos":
            c.treble = _inteiro(valor, EQ_MIN, EQ_MAX, "agudos")
        elif tipo == "eqLoudness":
            c.loudness = como_bool(valor)
        elif tipo == "aleatorio":
            definir_modo(c, aleatorio=como_bool(valor))
        elif tipo == "repetir":
            definir_modo(c, repetir=como_bool(valor))
        elif tipo == "crossfade":
            c.cross_fade = como_bool(valor)
        elif tipo == "saltarPara":
            # Posição 1-based, como a Sonos a conta e como o nó fila a escreve.
            c.play_from_queue(_inteiro(valor, 1, 10000, "posição na fila") - 1)
        else:
            raise ValueError(f"tipo desconhecido: {tipo}")
        time.sleep(PROPAGACAO)   # as escritas na zona propagam em assíncrono

    async def executar(self, cid: str, cmd: dict):
        tipo = cmd.get("tipo")
        valor = cmd.get("valor")
        pedido = parse_iso(cmd.get("pedidoEm"))
        if pedido is None or datetime.now(timezone.utc) - pedido > timedelta(seconds=COMANDO_VALIDADE):
            log.info("comando %s expirado (%s)", cid, cmd.get("pedidoEm"))
            self.marcar(cid, "falhou", "expirado")
            return

        try:
            await self.garantir_coord()
            await asyncio.to_thread(self._atualizar_coord)
            await asyncio.to_thread(self.aplicar, tipo, valor)
            log.info("comando %s executado: %s=%s", cid, tipo, valor)
            self.marcar(cid, "executado")
        except Exception as e:
            log.warning("comando %s falhou: %s", cid, e)
            if isinstance(e, (ValueError, TypeError)):
                msg = str(e)
            else:
                msg = "sem ligação à Sonos"
                self.coord = None
            try:
                self.marcar(cid, "falhou", msg)
            except Exception as e2:
                log.error("não consegui marcar o comando %s: %s", cid, e2)
        finally:
            self.ler_ja.set()
            if tipo in ("saltarPara", "tocarFavorito", "proximo", "anterior"):
                self.fila_ja.set()

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

    async def loop_inventario(self):
        while True:
            await asyncio.sleep(INTERVALO_INVENTARIO)   # o primeiro espelho é feito no run()
            await self.espelhar_inventario()

    async def loop_fila(self):
        while True:
            self.fila_ja.clear()
            await self.espelhar_fila()
            try:
                await asyncio.wait_for(self.fila_ja.wait(), timeout=INTERVALO_FILA)
            except asyncio.TimeoutError:
                pass

    async def loop_diario(self):
        while True:
            await asyncio.sleep(INTERVALO_DIARIO)
            # Directo (como o PATCH do estado), não em to_thread: gravar() lê
            # os mesmos contadores que o tick escreve, e no loop não há corrida.
            try:
                self.diario.gravar()
            except Exception as e:
                log.error("PATCH do diário falhou: %s", e)

    async def run(self):
        log.info("gioco-sonos-bridge a arrancar — loja %s, coordenadora %s, teto de volume %d, auth REST %s",
                 LOJA, UID_COORD, VOLUME_MAX, "sim" if FIREBASE_AUTH else "não")
        # Recupera as marcas de tempo de uma execução anterior para o "há X min"
        # da página não voltar a zero a cada reinício do serviço.
        try:
            antigo = fb_get(ESTADO_PATH) or {}
            self.toca_desde = antigo.get("tocaDesde")
            self.parado_desde = antigo.get("paradoDesde")
            self.transporte_anterior = antigo.get("transporte")
        except Exception as e:
            log.warning("não li o estado anterior: %s", e)
        self.semear_predefinicoes()
        await self.espelhar_inventario()   # favoritos em memória antes de aceitar comandos
        await asyncio.gather(self.loop_estado(), self.loop_comandos(), self.loop_inventario(),
                             self.loop_fila(), self.loop_diario())


async def _run_limitado(segundos: float):
    """Teste em foreground: corre o serviço e sai ao fim de N segundos."""
    try:
        await asyncio.wait_for(Bridge().run(), timeout=segundos)
    except asyncio.TimeoutError:
        log.info("fim do teste de %s s", segundos)


def main():
    # `--segundos N` (só para o teste de instalação em foreground): sai ao
    # fim de N s em vez de reiniciar para sempre.
    if len(sys.argv) >= 3 and sys.argv[1] == "--segundos":
        asyncio.run(_run_limitado(float(sys.argv[2])))
        return
    while True:
        try:
            asyncio.run(Bridge().run())
        except KeyboardInterrupt:
            return
        except Exception as e:
            log.error("loop principal caiu (%s) — a reiniciar em 10 s", e)
            time.sleep(10)


if __name__ == "__main__":
    main()
