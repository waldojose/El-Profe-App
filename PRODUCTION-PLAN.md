# El Profe — Plan de Producción y Seguridad

> Auditoría y plan de lanzamiento del backend monolítico `backend/server.py` (FastAPI + MongoDB Atlas + Render + Stripe).
> Fecha: 2026-05-30. Este documento es solo un plan: **no se cambió ningún código.**

---

## 1. Resumen ejecutivo

**¿Está listo para producción? NO todavía.** El producto funciona y la base es sólida (JWT con expiración, bcrypt, webhook de Stripe con verificación de firma, hash SHA-256 en firmas), pero el archivo `backend/server.py` que está realmente desplegado **NO es la versión endurecida** que describe el `CLAUDE.md`. En concreto:

- **No tiene SlowAPI / rate limiting.** `/auth/login` y `/auth/register` aceptan intentos ilimitados → fuerza bruta de contraseñas y enumeración de cuentas.
- **Hay fallas de autorización (IDOR) reales:** un usuario autenticado puede leer las letras, los splits, las firmas, las versiones, las contribuciones y los PDFs de **canciones ajenas** con solo adivinar/iterar IDs. Para un producto cuyo lema es "no te lo roben", esto es el riesgo #1.
- **`JWT_SECRET` tiene un valor por defecto hardcodeado** (`'professor-app-secret-key-change-in-production'`). Si la variable no está en Render, cualquiera puede **falsificar tokens y suplantar a cualquier usuario**.
- **Atlas Network Access está abierto a `0.0.0.0/0`** (toda la internet puede intentar conectarse a la base).
- **CORS por defecto = `*` junto con `allow_credentials=True`** (configuración inválida e insegura).
- **M0 free de Atlas no tiene backups automáticos** → pérdida total de datos ante un borrado o incidente.

Riesgos top que **deben** resolverse antes de cobrar o lanzar: IDOR de canciones/splits/firmas, secreto JWT, rate limiting, Network Access de Atlas y backups.

---

## 2. Dónde se guardan los datos y las canciones

**Todo vive en MongoDB Atlas** (cluster gratis M0, base `elprofe`), un servicio gestionado en la nube. La conexión sale desde el servicio Render `el-profe` usando `MONGO_URL`.

- **Cifrado en tránsito:** las conexiones a Atlas usan TLS por defecto (el connection string `mongodb+srv://` fuerza TLS). El tráfico Render ↔ Atlas y navegador ↔ Render (HTTPS de Render) va cifrado.
- **Cifrado en reposo:** Atlas cifra el almacenamiento en reposo automáticamente (AES-256) en todos los tiers, incluido M0. Las letras y los nombres legales quedan cifrados a nivel de disco, pero **no a nivel de campo** (cualquiera con acceso a la base los ve en texto claro).
- **Backups:** **M0 NO tiene backups.** No hay snapshots ni point-in-time recovery. Hoy un borrado accidental o un ransomware = pérdida definitiva.

**Qué guarda cada colección:**

| Colección | Contenido sensible |
|---|---|
| `users` | email, **hash bcrypt** de la contraseña, `legal_name` (PII), `artist_name`, `country`, `pro_affiliation`, `stripe_customer_id`/`subscription_id` |
| `songs` | `title`, **`content` = letra completa (la propiedad intelectual)**, `created_by`, `collaborators[]`, `is_locked` |
| `split_proposals` | porcentajes de reparto por escritor, versión, estado |
| `signatures` | `signature_data`, **`signature_hash` (sha256)**, `signed_at` (evidencia legal) |
| `messages` | mensajes privados entre escritores |
| `contributions` | tracking de aportes carácter a carácter |
| `versions` | snapshots históricos de las letras |

---

## 3. Hallazgos de seguridad (priorizados)

Líneas referidas a `backend/server.py`.

| # | Severidad | Endpoint / Línea | Hallazgo | Fix |
|---|---|---|---|---|
| 1 | **Crítico** | `GET /splits/{song_id}` (L589) | **IDOR.** No verifica que el solicitante sea creador/colaborador de la canción. Cualquier usuario logueado lee los porcentajes de reparto de cualquier canción. | Cargar la canción y exigir `current_user.id in collaborators or == created_by`; si no, 403. |
| 2 | **Crítico** | `GET /signatures/{proposal_id}` (L665) | **IDOR.** Devuelve `signature_data` y hashes de firmas de cualquier propuesta. | Resolver `song_id` desde la propuesta y aplicar el mismo chequeo de co-autoría. |
| 3 | **Crítico** | `GET /versions/{song_id}` (L690) | **IDOR.** Expone los snapshots completos de las letras de cualquier canción. | Chequeo de co-autoría sobre la canción antes de devolver. |
| 4 | **Crítico** | `GET /contributions/{song_id}` (L532) | **IDOR.** Estadísticas de aportes de cualquier canción. | Chequeo de co-autoría. |
| 5 | **Crítico** | `GET /export/split-sheet/{proposal_id}` (L1223) | **IDOR.** Genera el **PDF legal completo** (letras, nombres legales, firmas) de cualquier propuesta; solo exige `is_pro`, no co-autoría. | Exigir que `current_user` sea co-autor de `proposal.song_id`. |
| 6 | **Crítico** | `JWT_SECRET` (L42) | Default hardcodeado `'professor-app-secret-key-change-in-production'`. Si Render no inyecta la var, **se pueden forjar tokens**. | Eliminar el default: leer con `os.environ['JWT_SECRET']` y fallar el arranque si falta. Rotar el secreto. |
| 7 | **Alto** | `POST /auth/login` (L321), `POST /auth/register` (L285) | **Sin rate limiting.** Fuerza bruta de contraseñas y enumeración. El `CLAUDE.md` menciona SlowAPI pero este monolito **no lo tiene**. | Añadir SlowAPI (`@limiter.limit("5/minute")` en login, `"3/minute"` en register) o limitar en el reverse proxy. |
| 8 | **Alto** | `POST /versions` (L676), `POST /contributions` (L514) | Escritura sin validar que el usuario pertenezca a `song_id`. Un atacante puede inyectar versiones/contribuciones falsas en canciones ajenas (corrompe la evidencia de autoría). | Verificar co-autoría sobre el `song_id` recibido antes de insertar. |
| 9 | **Alto** | `POST /splits/{proposal_id}/approve` (L599) | Solo exige `is_pro`; no verifica que el aprobador sea co-autor de esa canción. | Chequeo de co-autoría sobre `proposal.song_id`. |
| 10 | **Alto** | CORS (L1494-1500) | `allow_origins=['*']` por defecto **con** `allow_credentials=True`. Combinación inválida/insegura; `CORS_ORIGINS=*` en Render lo activa. | Fijar `CORS_ORIGINS` al dominio real (p. ej. `https://app.elprofe.com`). Nunca `*` con credenciales. |
| 11 | **Medio** | `POST /auth/register` (L287-289) | **Enumeración de cuentas:** responde "Email already registered". (Login sí usa mensaje genérico "Invalid credentials", L325/328 — bien.) | Responder genérico o usar flujo de verificación por email que no confirme existencia. |
| 12 | **Medio** | `register` (L286) | **Sin política de contraseñas ni verificación de email.** No hay longitud mínima, ni confirmación de email, ni reset de contraseña. | Validar contraseña (min 10, etc.) en el modelo Pydantic; añadir verificación de email y flujo de reset con token de un solo uso. |
| 13 | **Medio** | `GET /users/{user_id}/profile` (L983) | Devuelve cualquier perfil público; aceptable, pero confirma que `UserPublicProfile` **no** incluya email/legal_name salvo lo deseado. | Auditar el modelo `UserPublicProfile`. |
| 14 | **Bajo** | Token (L265) | Expiración de **7 días** sin refresh tokens ni revocación. Un token robado vive una semana. | Bajar a 24-48 h + refresh token, o lista de revocación. |
| 15 | **Bajo** | `add_collaborator` (L467) | Cualquier colaborador (no solo el creador) puede añadir a terceros a la canción. | Decidir regla de negocio; si solo el creador debe poder, restringir a `created_by`. |

**Notas positivas (ya bien resueltas):** algoritmo JWT fijado a HS256 (no acepta `none`), `get_current_user` valida expiración/firma, `get_song`/`update_song`/`delete_song` **sí** validan co-autoría (L419/435/460), `get_messages`/`mark_message_read` están correctamente scopeados al usuario (L1065/1089), `create_signature` valida co-autoría (L623), webhook de Stripe verifica firma (L896), contraseñas con bcrypt, hash SHA-256 tamper-evident en firmas y PDF.

---

## 4. Plan a producción paso a paso

### (a) Endurecer autenticación y autorización — **MUST-HAVE**
1. **Cerrar los IDOR (hallazgos 1-5, 8-9).** Crear un helper `assert_song_access(song_id, current_user)` que cargue la canción y lance 403 si el usuario no es `created_by` ni está en `collaborators`. Aplicarlo en: `get_splits`, `get_signatures`, `get_versions`, `get_contributions`, `export_split_sheet`, `create_version`, `create_contribution`, `approve_split`. Es el cambio de mayor impacto y bajo esfuerzo.
2. **Rate limiting (hallazgo 7).** Integrar SlowAPI: `5/minute` en login, `3/minute` en register, límite global razonable. Render tiene IP estable detrás de proxy → usar `X-Forwarded-For`.
3. **Expiración de token (hallazgo 14).** Reducir a 24-48 h + refresh token.
4. **Reset y verificación de email (hallazgo 12).** Flujo con token de un solo uso por email (ver sección email en costos).
5. **Política de contraseñas (hallazgo 12)** en el modelo Pydantic `UserRegister`.

### (b) MongoDB Atlas — **MUST-HAVE (Network + secreto), backups antes de datos reales**
1. **Quitar `0.0.0.0/0` de Network Access.** Opciones, de mejor a aceptable:
   - **VPC Peering / PrivateLink** entre Render y Atlas (requiere tier pago, M10+).
   - O al menos **allowlist de las IPs salientes de Render** (Render publica sus IPs estáticas para servicios pagos).
2. **Backups automáticos.** M0 no los tiene. Subir a **M10** (o M2/M5 si solo quieres backups) habilita snapshots continuos + point-in-time recovery. **Imprescindible antes de almacenar IP real de clientes.**
3. **Usuario de DB con permisos mínimos.** El usuario `elprofe` debe tener `readWrite` solo sobre la base `elprofe`, nunca `atlasAdmin` ni acceso a otras bases.
4. **Rotar la contraseña del usuario de DB** y guardarla solo en Render.

### (c) Secrets — **MUST-HAVE**
1. **Rotar `JWT_SECRET`** (genera uno nuevo de 32+ bytes aleatorios en Render). Rotarlo invalida todos los tokens actuales (aceptable).
2. **Eliminar el default hardcodeado** del código (hallazgo 6) para que el arranque falle si falta la var, en lugar de usar un secreto público.
3. Todas las claves (`MONGO_URL`, `JWT_SECRET`, `STRIPE_*`) **solo en variables de entorno de Render**, nunca en git. Verificar que `backend/.env` siga en `.gitignore`.

### (d) Red / transporte — **MUST-HAVE**
1. **CORS** al dominio real (hallazgo 10).
2. Render ya termina **HTTPS**. Añadir cabecera **HSTS** (`Strict-Transport-Security`) y cabeceras de seguridad básicas (`X-Content-Type-Options`, `X-Frame-Options`/CSP) vía middleware.

### (e) Dominio + Stripe live — **MUST-HAVE antes de cobrar**
1. Comprar **dominio propio** y apuntarlo a Render (sale del free tier con cold starts).
2. Pasar **Stripe a modo live**: claves live, precio (`STRIPE_PRICE_ID`) live, **registrar el webhook live** y poner `STRIPE_WEBHOOK_SECRET` live en Render. Probar el flujo completo (checkout → webhook → `is_pro`).

### (f) Logging / monitoring / alertas — *nice-to-have* (recomendado)
1. Quitar `level=logging.INFO` de cualquier traza que pueda imprimir secretos o stack traces al cliente; FastAPI ya oculta el detalle en 500 por defecto, mantenerlo así (sin `debug=True`).
2. Integrar **Sentry** (errores) y las **alertas de Atlas** (CPU, conexiones, intentos de auth fallidos).
3. Activar **monitor de uptime** (Render lo ofrece) para mitigar cold starts en el tier pago.

### (g) Cumplimiento: PII y firmas — *parte MUST, parte nice-to-have*
- `users.legal_name` y los datos de firma son **PII**. Definir **política de retención** (cuánto se guardan firmas/PDFs) — **must-have** legal mínimo.
- **Cifrado a nivel de campo** (Atlas Client-Side Field Level Encryption) para `legal_name` y `signature_data` — *nice-to-have* fuerte para datos legales.
- **GDPR/CCPA básico:** mecanismo de **exportación** y **borrado** de datos a pedido del usuario, y un aviso de privacidad. Must-have si tienes usuarios en UE/California.

### (h) "Que no se lo roben" — protección de la propiedad intelectual (las letras)
La letra (`songs.content`) es el activo. Defensa en capas:
1. **Control de acceso estricto** (sección a, hallazgos 1-9): nadie lee/exporta canciones ajenas. **Lo más urgente.**
2. **Auditoría / trazabilidad:** las colecciones `contributions`, `versions` y `signatures` ya dejan rastro de quién escribió qué y cuándo; el `signature_hash` SHA-256 y el `doc_hash` del PDF (L1260) hacen el documento tamper-evident. Proteger esas colecciones de escritura no autorizada (hallazgo 8).
3. **Backups** (sección b): sin backups, un borrado = robo/pérdida irrecuperable.
4. **Watermarking del PDF:** ya existe (marca DRAFT hasta que firman todos). Mantener.

---

## 5. Costos estimados (USD/mes aprox.)

| Concepto | Tier | Costo |
|---|---|---|
| Render Web Service | Starter (sin cold starts) | ~$7 |
| MongoDB Atlas | **M10** (backups + PrivateLink) | ~$57+ (o ~$9 M2/M5 con backups, sin PrivateLink) |
| Dominio | .com anual | ~$1-2/mes |
| Email transaccional | Resend / Postmark (verificación, reset, invitaciones) | $0-15 (free tier suele alcanzar al inicio) |
| Sentry (errores) | Free tier | $0 |
| **Total inicial realista** | | **~$15-25/mes** (M2/M5) → **~$70+/mes** (M10 + PrivateLink) |

---

## 6. Checklist final de lanzamiento

**MUST-HAVE antes de cobrar / lanzar:**
- [ ] Cerrar los 5 IDOR críticos (splits, signatures, versions, contributions, export PDF) + escrituras (versions/contributions/approve).
- [ ] Eliminar el default de `JWT_SECRET` y **rotarlo** en Render.
- [ ] Rate limiting en `/auth/login` y `/auth/register`.
- [ ] Atlas: quitar `0.0.0.0/0` → allowlist de Render IPs o PrivateLink.
- [ ] Atlas: backups automáticos activos (subir de M0).
- [ ] Usuario de DB con permisos mínimos + contraseña rotada.
- [ ] `CORS_ORIGINS` = dominio real (nunca `*` con credenciales).
- [ ] Dominio propio + Render en tier pago (sin cold starts).
- [ ] Stripe en **live** con webhook live verificado, flujo de pago probado de punta a punta.
- [ ] HSTS + cabeceras de seguridad.
- [ ] Política de retención de PII/firmas + aviso de privacidad.
- [ ] Flujo de reset de contraseña + verificación de email.

**NICE-TO-HAVE (post-lanzamiento):**
- [ ] Refresh tokens + expiración más corta.
- [ ] Sentry + alertas de Atlas + monitor de uptime.
- [ ] Cifrado a nivel de campo (CSFLE) para `legal_name` y `signature_data`.
- [ ] Exportación/borrado de datos GDPR/CCPA self-service.
- [ ] Política de contraseñas robusta + MFA.
- [ ] Revisar regla de negocio de `add_collaborator` (solo creador).
