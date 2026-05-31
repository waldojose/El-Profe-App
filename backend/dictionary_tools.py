"""
Bilingual songwriter dictionary tools.

Data sources:
  - English: Datamuse API (https://api.datamuse.com), no API key required.
  - Spanish: Datamuse with &v=es where it helps, PLUS curated word lists and a
    suffix-based rhyme engine so results are useful even where Datamuse ES is weak.

Implementation notes:
  - HTTP uses the Python standard library (urllib.request) so we add NO new pip
    dependencies. Callers wrap _datamuse() in run_in_executor() to keep the async
    endpoints non-blocking.
  - A small in-memory TTL cache keyed by (kind, lang, word) avoids repeat calls.
  - All network failures are swallowed and return [] (never raise / never 500).
"""

import json
import time
import urllib.parse
import urllib.request

# ---------------------------------------------------------------------------
# In-memory TTL cache: { (kind, lang, word): (expires_at_epoch, value) }
# ---------------------------------------------------------------------------
_CACHE: dict = {}
_TTL_SECONDS = 6 * 60 * 60  # 6 hours


def cache_get(kind: str, lang: str, word: str):
    key = (kind, lang, word)
    hit = _CACHE.get(key)
    if not hit:
        return None
    expires_at, value = hit
    if time.time() > expires_at:
        _CACHE.pop(key, None)
        return None
    return value


def cache_set(kind: str, lang: str, word: str, value) -> None:
    _CACHE[(kind, lang, word)] = (time.time() + _TTL_SECONDS, value)


# ---------------------------------------------------------------------------
# Datamuse (stdlib urllib). Run inside run_in_executor() from async callers.
# ---------------------------------------------------------------------------
def _datamuse(params: dict, max_results: int = 20) -> list:
    """Return a list of word strings from Datamuse. [] on any error."""
    try:
        query = {k: v for k, v in params.items() if v not in (None, "")}
        query.setdefault("max", max_results)
        url = "https://api.datamuse.com/words?" + urllib.parse.urlencode(query)
        req = urllib.request.Request(url, headers={"User-Agent": "ElProfe/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status != 200:
                return []
            data = json.loads(resp.read().decode("utf-8"))
        return [item["word"] for item in data if "word" in item]
    except Exception:
        return []


def _dedupe(seq, limit=20):
    seen = set()
    out = []
    for w in seq:
        wl = w.lower()
        if wl in seen:
            continue
        seen.add(wl)
        out.append(w)
        if len(out) >= limit:
            break
    return out


# ---------------------------------------------------------------------------
# Language heuristic
# ---------------------------------------------------------------------------
_ES_CHARS = set("áéíóúüñ¿¡")


def detect_lang(word: str) -> str:
    """Cheap ES/EN guess used only when the caller does not send lang."""
    wl = word.lower()
    if any(c in _ES_CHARS for c in wl):
        return "es"
    return "en"


# ---------------------------------------------------------------------------
# Datamuse-backed lookups (synchronous; call via run_in_executor)
# ---------------------------------------------------------------------------
def synonyms_remote(word: str, lang: str) -> list:
    w = word.lower()
    v = "es" if lang == "es" else "en"
    out = _datamuse({"rel_syn": w, "v": v})
    if len(out) < 5:  # fall back to "means like" for sparse results
        out = out + _datamuse({"ml": w, "v": v})
    return _dedupe(out)


def antonyms_remote(word: str, lang: str) -> list:
    w = word.lower()
    v = "es" if lang == "es" else "en"
    return _dedupe(_datamuse({"rel_ant": w, "v": v}))


def rhymes_remote(word: str, lang: str) -> list:
    w = word.lower()
    v = "es" if lang == "es" else "en"
    out = _datamuse({"rel_rhy": w, "v": v})
    if len(out) < 8:  # pad with near-rhymes
        out = out + _datamuse({"rel_nry": w, "v": v})
    return _dedupe(out)


# ---------------------------------------------------------------------------
# Curated Spanish synonyms (carried over + kept as a fallback for ES)
# ---------------------------------------------------------------------------
SPANISH_SYNONYMS = {
    "amor": ["cariño", "afecto", "pasión", "ternura", "adoración", "devoción"],
    "corazón": ["alma", "espíritu", "sentimiento", "pecho", "centro"],
    "noche": ["oscuridad", "anochecer", "medianoche", "madrugada", "ocaso"],
    "sueño": ["ensueño", "ilusión", "fantasía", "deseo", "anhelo", "aspiración"],
    "música": ["melodía", "armonía", "sonido", "canción", "ritmo", "compás"],
    "luz": ["brillo", "resplandor", "claridad", "luminosidad", "fulgor"],
    "dolor": ["sufrimiento", "pena", "angustia", "tormento", "aflicción"],
    "feliz": ["alegre", "contento", "dichoso", "radiante", "jubiloso"],
    "triste": ["melancólico", "apenado", "afligido", "sombrío", "abatido"],
    "tiempo": ["momento", "época", "periodo", "instante", "era"],
    "vida": ["existencia", "vivencia", "experiencia", "aliento", "espíritu"],
    "muerte": ["fin", "fallecimiento", "deceso", "término", "pérdida"],
    "cielo": ["firmamento", "paraíso", "inmensidad", "bóveda celeste"],
    "tierra": ["suelo", "mundo", "planeta", "patria", "terreno"],
    "fuego": ["llama", "ardor", "pasión", "calor", "incendio"],
    "agua": ["líquido", "fluido", "corriente", "caudal", "río"],
    "viento": ["aire", "brisa", "soplo", "corriente", "ráfaga"],
    "sol": ["astro", "estrella", "luz solar", "claridad", "brillo"],
    "luna": ["satélite", "astro nocturno", "plenilunio", "menguante"],
    "estrella": ["astro", "lucero", "estrellita", "luminaria"],
    "palabra": ["término", "vocablo", "expresión", "voz", "promesa"],
    "silencio": ["quietud", "calma", "paz", "mutismo", "sosiego"],
    "voz": ["sonido", "tono", "timbre", "palabra", "grito"],
    "canción": ["melodía", "tema", "balada", "canto", "tonada"],
    "bailar": ["danzar", "moverse", "girar", "valsar", "menear"],
    "besar": ["dar un beso", "acariciar", "rozar", "tocar"],
    "abrazar": ["estrechar", "rodear", "envolver", "apretar"],
    "llorar": ["lagrimear", "sollozar", "gemir", "lamentarse"],
    "reír": ["carcajear", "sonreír", "desternillarse", "alegrar"],
    "caminar": ["andar", "pasear", "marchar", "transitar", "deambular"],
    "correr": ["trotar", "galopar", "apresurarse", "acelerar"],
    "dormir": ["descansar", "reposar", "yacer", "adormecerse"],
    "comer": ["alimentarse", "ingerir", "degustar", "devorar"],
    "beber": ["tomar", "ingerir", "libar", "sorber", "tragar"],
    "escribir": ["redactar", "componer", "anotar", "plasmar"],
    "leer": ["ojear", "repasar", "estudiar", "descifrar"],
    "pensar": ["reflexionar", "meditar", "considerar", "razonar"],
    "sentir": ["percibir", "experimentar", "notar", "vivir"],
    "mirar": ["observar", "contemplar", "ver", "ojear", "divisar"],
    "escuchar": ["oír", "atender", "percibir", "captar"],
    "hablar": ["conversar", "charlar", "dialogar", "platicar"],
    "gritar": ["vociferar", "chillar", "bramar", "aullar"],
    "cantar": ["entonar", "interpretar", "tararear", "vocalizar"],
    "buscar": ["indagar", "investigar", "rastrear", "explorar"],
    "encontrar": ["hallar", "localizar", "descubrir", "topar"],
    "perder": ["extraviar", "olvidar", "desaprovechar"],
    "ganar": ["obtener", "conseguir", "lograr", "alcanzar"],
    "dar": ["entregar", "otorgar", "conceder", "ofrecer", "regalar"],
    "querer": ["amar", "desear", "anhelar", "adorar", "apreciar"],
    "bello": ["hermoso", "bonito", "lindo", "precioso", "divino"],
    "grande": ["enorme", "vasto", "inmenso", "gigantesco", "colosal"],
    "pequeño": ["diminuto", "chico", "reducido", "minúsculo"],
    "bueno": ["óptimo", "excelente", "magnífico", "extraordinario"],
    "malo": ["pésimo", "negativo", "perjudicial", "nocivo"],
    "nuevo": ["reciente", "moderno", "actual", "fresco"],
    "viejo": ["antiguo", "anciano", "añejo", "veterano"],
    "rápido": ["veloz", "presto", "ligero", "acelerado", "raudo"],
    "lento": ["pausado", "tranquilo", "moroso", "perezoso"],
    "fuerte": ["robusto", "potente", "vigoroso", "poderoso"],
    "débil": ["frágil", "endeble", "flojo", "delicado"],
}

# Curated Spanish antonym pairs (bidirectional).
_ES_ANTONYM_PAIRS = [
    ("amor", "odio"), ("luz", "oscuridad"), ("día", "noche"),
    ("vida", "muerte"), ("feliz", "triste"), ("alegría", "tristeza"),
    ("cielo", "tierra"), ("calor", "frío"), ("grande", "pequeño"),
    ("bueno", "malo"), ("nuevo", "viejo"), ("rápido", "lento"),
    ("fuerte", "débil"), ("bello", "feo"), ("amar", "odiar"),
    ("reír", "llorar"), ("subir", "bajar"), ("ganar", "perder"),
    ("dar", "recibir"), ("recordar", "olvidar"), ("encontrar", "perder"),
    ("comenzar", "terminar"), ("abrir", "cerrar"), ("entrar", "salir"),
    ("dulce", "amargo"), ("rico", "pobre"), ("claro", "oscuro"),
    ("alto", "bajo"), ("lleno", "vacío"), ("limpio", "sucio"),
    ("paz", "guerra"), ("verdad", "mentira"), ("esperanza", "desesperanza"),
    ("libertad", "esclavitud"), ("juntos", "separados"), ("cerca", "lejos"),
]

SPANISH_ANTONYMS: dict = {}
for _a, _b in _ES_ANTONYM_PAIRS:
    SPANISH_ANTONYMS.setdefault(_a, []).append(_b)
    SPANISH_ANTONYMS.setdefault(_b, []).append(_a)

# Common songwriter-vocabulary translation map (bidirectional EN<->ES).
_TRANSLATION_PAIRS = [
    ("love", "amor"), ("heart", "corazón"), ("night", "noche"),
    ("day", "día"), ("dream", "sueño"), ("music", "música"),
    ("light", "luz"), ("dark", "oscuridad"), ("pain", "dolor"),
    ("joy", "alegría"), ("happy", "feliz"), ("sad", "triste"),
    ("time", "tiempo"), ("life", "vida"), ("death", "muerte"),
    ("sky", "cielo"), ("earth", "tierra"), ("fire", "fuego"),
    ("water", "agua"), ("wind", "viento"), ("sun", "sol"),
    ("moon", "luna"), ("star", "estrella"), ("word", "palabra"),
    ("silence", "silencio"), ("voice", "voz"), ("song", "canción"),
    ("dance", "bailar"), ("kiss", "beso"), ("cry", "llorar"),
    ("smile", "sonrisa"), ("soul", "alma"), ("hope", "esperanza"),
    ("fear", "miedo"), ("freedom", "libertad"), ("home", "hogar"),
    ("road", "camino"), ("rain", "lluvia"), ("fall", "caer"),
    ("rise", "subir"), ("forever", "siempre"), ("never", "nunca"),
    ("tear", "lágrima"), ("fly", "volar"), ("burn", "arder"),
    ("hold", "sostener"), ("lose", "perder"), ("find", "encontrar"),
    ("remember", "recordar"), ("forget", "olvidar"), ("goodbye", "adiós"),
]

EN_TO_ES = {en: es for en, es in _TRANSLATION_PAIRS}
ES_TO_EN = {es: en for en, es in _TRANSLATION_PAIRS}


# ---------------------------------------------------------------------------
# Spanish suffix-based rhyme engine (fallback when Datamuse ES is weak)
# ---------------------------------------------------------------------------
# A broad pool of common Spanish songwriting words grouped by their final
# 2-3 letters. Words sharing the same tail are treated as rhymes.
_ES_RHYME_POOL = [
    "amor", "dolor", "calor", "temblor", "color", "sabor", "rumor", "clamor",
    "flor", "honor", "valor", "sudor", "fervor", "candor",
    "corazón", "razón", "pasión", "canción", "ilusión", "emoción", "traición",
    "razón", "prisión", "visión", "rincón", "perdón", "adiós",
    "querer", "perder", "tener", "saber", "volver", "caer", "ayer", "mujer",
    "placer", "amanecer", "atardecer", "renacer", "ser", "comprender",
    "mirar", "amar", "soñar", "llorar", "cantar", "bailar", "volar", "besar",
    "andar", "buscar", "esperar", "olvidar", "abrazar", "regresar", "lugar",
    "vida", "herida", "partida", "salida", "caída", "medida", "comida",
    "noche", "broche", "coche", "reproche", "derroche",
    "luna", "fortuna", "cuna", "laguna", "ninguna", "alguna",
    "sol", "español", "farol", "girasol", "arrebol", "control",
    "cielo", "vuelo", "consuelo", "anhelo", "duelo", "suelo", "hielo", "pelo",
    "estrella", "huella", "centella", "querella", "doncella", "botella",
    "fuego", "juego", "ruego", "luego", "ciego", "sosiego",
    "viento", "momento", "sentimiento", "lamento", "tormento", "aliento",
    "pensamiento", "sufrimiento", "acento", "cuento",
    "mar", "cantar", "soñar",
    "alma", "calma", "palma",
    "luz", "cruz", "capuz", "andaluz",
    "tristeza", "belleza", "certeza", "pereza", "nobleza", "firmeza",
    "camino", "destino", "divino", "vino", "trino",
    "olvido", "latido", "gemido", "sonido", "vestido", "querido",
    "esperanza", "danza", "alianza", "bonanza", "templanza", "mudanza",
]


def _es_rhyme_key(w: str) -> str:
    w = w.lower()
    # Use last 3 letters when the word is long, else last 2.
    return w[-3:] if len(w) >= 5 else w[-2:]


def spanish_rhymes(word: str, limit: int = 20) -> list:
    w = word.lower()
    key3 = w[-3:]
    key2 = w[-2:]
    matches = []
    for cand in _ES_RHYME_POOL:
        if cand == w:
            continue
        cl = cand.lower()
        if cl.endswith(key3) or (len(key2) == 2 and cl.endswith(key2)):
            matches.append(cand)
    # Prefer stronger (3-letter) matches first.
    matches.sort(key=lambda c: (not c.lower().endswith(key3), c))
    return _dedupe(matches, limit)


def translate_word(word: str, lang: str) -> list:
    """Return translation(s). lang = language of the INPUT word."""
    w = word.lower()
    if lang == "es":
        hit = ES_TO_EN.get(w)
        return [hit] if hit else []
    hit = EN_TO_ES.get(w)
    return [hit] if hit else []
