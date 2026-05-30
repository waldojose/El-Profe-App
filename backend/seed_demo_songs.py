"""Seed demo authors + example songs (co-authors, structured lyrics, contributions,
splits) and dummy messages between creators, so a tester can explore everything.
Hits the running API (which points at Atlas)."""
import json, urllib.request, urllib.error, urllib.parse

BASE = "http://127.0.0.1:8000"
PW = "ElProfe2026!"


def api(method, path, token=None, body=None, params=None):
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t else {})
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try:
            t = json.loads(t)
        except Exception:
            pass
        return e.code, t


def ensure_user(email, artist, profile):
    s, b = api("POST", "/api/auth/register", body={"email": email, "password": PW, "artist_name": artist})
    if s == 200:
        token, uid = b["token"], b["user"]["id"]
    else:
        s2, b2 = api("POST", "/api/auth/login", body={"email": email, "password": PW})
        if s2 != 200:
            raise RuntimeError(f"login failed for {email}: {s2} {b2}")
        token, uid = b2["token"], b2["user"]["id"]
    api("POST", "/api/profile/complete", token=token, body=profile)
    print(f"  user {email} -> id={uid[:8]}...")
    return {"email": email, "id": uid, "token": token}


def prof(legal, artist, country, pro_aff, roles, styles, bio):
    return {"legal_name": legal, "artist_name": artist, "country": country,
            "pro_affiliation": pro_aff, "role": roles[0], "roles": roles,
            "music_styles": styles, "bio": bio}


print("== Authors ==")
pro = ensure_user("pro@elprofe.app", "El Profe",
                  prof("Jose Gomez", "El Profe", "Estados Unidos", "ASCAP",
                       ["Escritor", "Productor"], ["Latina", "Pop"],
                       "Productor y compositor. Creador de El Profe."))
maya = ensure_user("maya@elprofe.app", "Maya Rios",
                   prof("Maya Rios", "Maya Rios", "Mexico", "BMI",
                        ["Escritor", "Compositor"], ["Pop", "Latina"],
                        "Compositora de pop latino. Letras y melodias."))
adrian = ensure_user("adrian@elprofe.app", "Adri",
                     prof("Adrian Soto", "Adri", "Colombia", "ASCAP",
                          ["Productor", "Compositor"], ["Hip-Hop", "R&B"],
                          "Productor urbano. Beats y arreglos."))
lucia = ensure_user("lucia@elprofe.app", "Lu Fernandez",
                    prof("Lucia Fernandez", "Lu Fernandez", "Espana", "SGAE",
                         ["Escritor"], ["Folk", "Pop"],
                         "Cantautora folk. Historias en espanol."))
carlos = ensure_user("carlos@elprofe.app", "Charly",
                     prof("Carlos Mendez", "Charly", "Estados Unidos", "SESAC",
                          ["Compositor", "Manager"], ["Rock", "Indie"],
                          "Compositor de rock indie y manager."))

# Structured lyrics (parts as a guide: Intro / Verse / Pre-Chorus / Chorus / Bridge / Outro / Vocal)
SUNSET = """[Intro]
(pads suaves - vocal: "ooh-ooh")

[Verse 1]
Chasing the light as the day slips away
We wrote our names in the gold of the bay

[Pre-Chorus]
And every word we keep, every line we sign

[Chorus]
Sunset dreams, hold on tight
We'll co-write the end of the night

[Verse 2]
Two voices, one melody on the shore
A contract in color, worth singing for

[Bridge]
(half-time - vocal ad-libs: "hold... on...")

[Outro]
Sunset dreams... (fade out)"""

CAMINO = """[Intro]
(guitarra suave)

[Verso 1]
Voy por el camino de plata
buscando la voz que me ata

[Pre-Coro]
y cada verso que firmamos

[Coro]
Canta conmigo, no estas solo
juntos firmamos este coro

[Verso 2]
La luna escribe en el rio
lo que callaba el silencio mio

[Puente]
(coros: "ohh" - subida de tono)

[Outro]
juntos firmamos este coro... (fade)"""

DEMO = """[Intro]
...

[Verso]
idea suelta - un riff y dos versos

[Pre-Coro]
(por escribir)

[Coro]
(por escribir - gancho aqui)

[Puente]
(por escribir)

[Outro]
..."""


def make_song(owner, title, content, collaborators, contribs, splits=None, sign=False):
    s, b = api("POST", "/api/songs", token=owner["token"], body={"title": title})
    if s != 200:
        print(f"  ! create '{title}' failed: {s} {b}")
        return None
    sid = b["id"]
    api("PATCH", f"/api/songs/{sid}", token=owner["token"], body={"content": content})
    for c in collaborators:
        api("POST", f"/api/songs/{sid}/collaborators", token=owner["token"], body={"email": c["email"]})
    for who, chars in contribs:
        api("POST", "/api/contributions", token=who["token"],
            body={"song_id": sid, "action": "add", "content": "", "chars_added": chars})
    note = ""
    if splits:
        ss, sb = api("POST", "/api/splits", token=owner["token"],
                     body={"song_id": sid, "splits": [{"user_id": u["id"], "percentage": p} for u, p in splits]})
        if ss == 200 and sign:
            api("POST", "/api/signatures", token=owner["token"],
                body={"split_proposal_id": sb["id"], "signature_data": owner["email"]})
            note = " (+split firmado por El Profe)"
        elif ss == 200:
            note = " (+split propuesto)"
    print(f"  song '{title}' [{len(collaborators)+1} autores]{note}")
    return sid


print("== Songs ==")
make_song(pro, "Sunset Dreams", SUNSET, [maya, adrian],
          [(pro, 180), (maya, 420), (adrian, 240)],
          splits=[(pro, 30), (maya, 45), (adrian, 25)], sign=True)
make_song(pro, "Camino de Plata", CAMINO, [lucia],
          [(pro, 260), (lucia, 300)],
          splits=[(pro, 50), (lucia, 50)], sign=True)
make_song(pro, "Untitled Demo", DEMO, [carlos],
          [(pro, 90), (carlos, 60)], splits=None, sign=False)


def msg(sender, receiver, text):
    s, b = api("POST", "/api/messages/send", token=sender["token"],
               body={"receiver_id": receiver["id"], "content": text})
    if s != 200:
        print(f"  ! msg {sender['email']}->{receiver['email']} failed: {s} {b}")


print("== Messages ==")
CONVO = [
    (pro, maya, "Maya, quedo increible el coro de Sunset Dreams! Te propuse 45% por letra y melodia."),
    (maya, pro, "Gracias Profe! De acuerdo con el split, firmo hoy mismo."),
    (pro, maya, "Perfecto. Ya quedo firmado de mi lado."),
    (pro, adrian, "Adri, el beat esta brutal. Te deje 25% por la produccion."),
    (adrian, pro, "Listo, lo reviso y firmo. Subo una version con mas graves?"),
    (pro, adrian, "Dale, subila y la comparamos."),
    (maya, lucia, "Lu, te sumas a una colab folk-pop? Tengo una idea para Camino de Plata."),
    (lucia, maya, "Me encanta! Pasame el editor y la escribimos juntas."),
    (pro, carlos, "Charly, deje 'Untitled Demo' empezada. Le metes un puente de rock?"),
    (carlos, pro, "Obvio, esta semana te paso una idea para el bridge."),
]
for a, b, txt in CONVO:
    msg(a, b, txt)
print(f"  {len(CONVO)} mensajes entre creadores")

print("\nDONE. Entra como pro@elprofe.app: 3 canciones con co-autores, letras estructuradas,")
print("contribuciones, splits y mensajes con Maya, Adri, Lu y Charly.")
