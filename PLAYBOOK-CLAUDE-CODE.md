# Playbook &mdash; Trabajar con Claude Code en El Profe

Gu&iacute;a paso a paso para cuando ya ten&eacute;s Claude Code instalado y est&aacute;s parado en el directorio del proyecto.

---

## &iexcl;Antes de hacer nada!

Antes del primer `claude`, verific&aacute; estas 4 cosas:

```bash
# 1. Est&aacute;s en el directorio correcto
cd /ruta/a/El-Profe-App
pwd

# 2. CLAUDE.md y HANDOFF.md est&aacute;n en el root
ls CLAUDE.md HANDOFF.md prototype.html

# 3. Git est&aacute; limpio (sin cambios sin commitear)
git status

# 4. Est&aacute;s en una rama de trabajo, no en main
git checkout -b mejoras-ui-frontpage
```

El paso 4 es **cr&iacute;tico**. Trabaj&aacute; siempre en una rama separada. Si Claude Code rompe algo, volv&eacute;s a main con un `git checkout main` y listo.

---

## Sesi&oacute;n 1 &mdash; Verificaci&oacute;n del c&oacute;digo actual

### Iniciar

```bash
claude
```

Vas a ver el prompt `>`. Si es la primera vez, te va a pedir `/login`.

### Primer comando: validar contexto

Pegale esto:

```
Le&iacute;ste el CLAUDE.md y el HANDOFF.md autom&aacute;ticamente?
Resum&iacute;me en 3 bullets:
1. Qu&eacute; es El Profe y cu&aacute;l es su mandato
2. Cu&aacute;les son las 3 reglas del logo
3. D&oacute;nde est&aacute; la fuente de verdad de UX
```

**Qu&eacute; esperar:** Una respuesta concisa que mencione "creative on surface, legal system underneath", "solo blanco o negro, sin gradiente ni shadow encima, 6% padding", y "prototype.html".

**Si falla:** Si no menciona alguna de esas cosas, hay un problema con la lectura del CLAUDE.md. Ejecut&aacute; `/init` y dec&iacute;le que vuelva a leer.

### Segundo comando: verificaci&oacute;n t&eacute;cnica

```
Hac&eacute; una auditor&iacute;a r&aacute;pida del estado actual del repo:

1. /subscription/upgrade fake: confirm&aacute; que NO existe m&aacute;s, que fue
   reemplazado por Stripe real con webhook signature validation
2. JWT_SECRET: confirm&aacute; que el config.py valida que no sea valor default
3. i18n: list&aacute; las claves que faltan en frontend/src/i18n/translations.js,
   comparando keys EN vs ES
4. Modularizaci&oacute;n: list&aacute; qu&eacute; routers todav&iacute;a est&aacute;n
   en server.py y no fueron extra&iacute;dos

Por cada &iacute;tem, mostrame el archivo y la l&iacute;nea donde lo verificaste.
No modifiques nada todav&iacute;a, solo report&aacute;.
```

**Qu&eacute; esperar:** Un reporte con file:line references. Si todo est&aacute; OK, sabe que arranc&aacute;s desde una base s&oacute;lida.

**Si encuentra problemas:** Anot&aacute;los. Despu&eacute;s decid&iacute;s si los arregla ahora o en otra sesi&oacute;n.

### Tercer comando: commit del CLAUDE.md

```
Si CLAUDE.md, HANDOFF.md, y prototype.html no est&aacute;n commiteados todav&iacute;a,
hac&eacute; un commit:

git add CLAUDE.md HANDOFF.md prototype.html
git commit -m "docs: add Claude Code memory + handoff + UX reference"

No empuje al remoto. Solo el commit local.
```

---

## Sesi&oacute;n 2 &mdash; Mejorar la front page

Esta es la pieza grande. Hac&eacute;la en una sesi&oacute;n nueva (`/clear` o salir y volver a entrar) para empezar con contexto limpio.

### Plan antes de cambiar

```
Vamos a mejorar la landing page. Antes de tocar nada:

1. Abr&iacute; el prototype.html y mir&aacute; la landing actual
2. Abr&iacute; el frontend/src/pages/Landing.js (o el equivalente en el repo)
3. Anot&aacute; las diferencias entre los dos
4. Propon&eacute; un plan en 4-5 bullets de qu&eacute; vas a cambiar y por qu&eacute;

NO MODIFIQUES nada todav&iacute;a. Mostrame el plan primero.
```

**Por qu&eacute;:** Forzar el plan adelante evita que Claude Code se vaya por la tangente. Lo le&eacute;s, decid&iacute;s qu&eacute; te gusta y qu&eacute; no, y reci&eacute;n ah&iacute; le das green light.

### Aprobaci&oacute;n + criterios duros

Cuando aprob&aacute;s, mand&aacute; esto (ajustando seg&uacute;n su plan):

```
Apruebo el plan con estas restricciones no negociables:

REGLAS DURAS:
- El logo nunca se recolorea. Solo blanco o negro. Glow va alrededor, no encima.
- Tokens: #050505 fondo, #FFB800 acento. No introduzcas otros amarillos
  ni naranjas distintos del #FFB800.
- Fuentes: Syne para t&iacute;tulos, Manrope para body, JetBrains Mono para
  letras de canciones. Nada de Inter, ni Roboto, ni system-ui.
- Bilingual: cualquier string que agregues va en EN y ES.
  Archivo: frontend/src/i18n/translations.js
- Sin modo claro. La est&eacute;tica oscura de estudio es sagrada.

PROCESO:
- Hac&eacute; los cambios en commits chicos, uno por secci&oacute;n l&oacute;gica
- Despu&eacute;s de cada commit, mostrame el diff antes del siguiente
- Si necesit&aacute;s instalar paquetes npm, pedime permiso primero
- Si dud&aacute;s de un patr&oacute;n de UI, abrir&aacute;s prototype.html
  antes de inventar uno nuevo

Empez&aacute;.
```

### Iteraci&oacute;n

Despu&eacute;s de cada cambio, prob&aacute;:

```bash
# En otra terminal:
cd frontend
npm start
```

Y mir&aacute; en `http://localhost:3000`.

**Si algo se ve mal**, dec&iacute;selo a Claude Code con precisi&oacute;n:

- &#10003; "El espaciado entre las cards de features es muy ajustado. Subilo a 24px"
- &#10003; "El gradiente que pusiste sobre el logo viola la regla del logo. Quitalo y reemplaz&aacute; por un glow detr&aacute;s del contenedor"
- &#10003; "La nueva secci&oacute;n FAQ usa Inter en lugar de Manrope. Cambialo"
- &#10005; "no me gusta" (sin detalle, no le sirve)
- &#10005; "mejoralo" (vago, va a inventar cualquier cosa)

### Pedir screenshots

```
Sac&aacute; un screenshot de la landing actual usando playwright o puppeteer
y mostr&aacute;mela inline. Quiero ver la versi&oacute;n full HD.
```

Claude Code puede ejecutar c&oacute;digo, instalar Playwright al vuelo si hace falta, y devolverte la imagen.

---

## Sesi&oacute;n 3 &mdash; UI consistency pass

Una vez que la landing est&aacute; copada, sumale esto:

```
Ahora un pass de consistencia entre el prototype.html y el c&oacute;digo React:

1. Abr&iacute; el editor del prototipo (despu&eacute;s de loguearte y abrir cualquier canci&oacute;n)
   y compar&aacute; visualmente con frontend/src/pages/Editor.js
2. List&aacute; las diferencias:
   - Estilos (colores, espaciados, radios, sombras)
   - Componentes faltantes en React (ej: el split panel con firmas)
   - Modales que existen en prototype pero no en React
3. Por cada diferencia, propon&eacute; si:
   (a) Portear el patr&oacute;n del prototipo al React
   (b) Dejar el React como est&aacute; por una buena raz&oacute;n
4. Empez&aacute; portando el split panel + sign modal + PDF generation del
   prototipo al editor React. Es lo m&aacute;s cr&iacute;tico.
```

---

## Comandos &uacute;tiles de Claude Code

Estos los us&aacute;s adentro del prompt de `claude`:

| Comando | Para qu&eacute; |
| --- | --- |
| `/help` | Ver todos los comandos disponibles |
| `/init` | Regenerar CLAUDE.md analizando el repo (no destruye el que ya ten&eacute;s, propone adiciones) |
| `/clear` | Limpiar el contexto y arrancar fresco. **&Uacute;salo entre tareas grandes** |
| `/resume` | Continuar una conversaci&oacute;n anterior |
| `/cost` | Ver cu&aacute;ntos tokens (= $) llevas en esta sesi&oacute;n |
| `/hooks` | Configurar hooks (lint, format autom&aacute;tico al editar archivos) |
| `/login` | Cambiar de cuenta |
| `Ctrl+C` | Cancelar la operaci&oacute;n actual sin salir |
| `Ctrl+D` o `/exit` | Salir de Claude Code |

---

## Si algo sale mal

### El cambio rompe algo

```bash
git diff                  # Ver qu&eacute; cambi&oacute;
git checkout <archivo>    # Volver atr&aacute;s ese archivo
git reset --hard HEAD     # Volver atr&aacute;s todos los cambios sin commit
git revert <hash>         # Deshacer un commit espec&iacute;fico (mantiene historia)
```

Y dec&iacute;le al Claude Code:

```
Hice rollback de los &uacute;ltimos cambios porque [raz&oacute;n].
Antes de volver a intentarlo, expliquame qu&eacute; ibas a hacer distinto.
```

### Claude Code se va por la tangente

Ejemplos t&iacute;picos:

- Empieza a "refactorizar" cosas que no le pediste
- Instala paquetes que no necesit&aacute;s
- Sugiere "tambi&eacute;n podr&iacute;amos mejorar X"
- Cambia archivos no relacionados

Cort&aacute;lo en seco:

```
Stop. No te ped&iacute; eso. Volv&eacute; al pedido original: [recordatorio].
Si ves otras mejoras que sugerir, hac&eacute; una lista al final pero no las
implementes ahora.
```

### Pide permisos para muchas cosas

Por defecto, Claude Code te pregunta antes de hacer cosas potencialmente
destructivas (escribir archivos, ejecutar comandos, instalar paquetes).
Est&aacute; bien. **No actives el "auto-approve" en este proyecto**, al menos
hasta que conf&iacute;es en c&oacute;mo se comporta.

Cuando te pida permiso:

- &#10003; **Yes** &mdash; si el cambio est&aacute; en el plan que aprobaste
- &#10003; **Yes, don't ask again for this tool** &mdash; solo para comandos
  triviales (ej: `ls`, `cat`, `grep`)
- &#10005; **No** &mdash; si est&aacute; haciendo algo que no acordaron

### Se queda sin contexto

Si Claude Code empieza a "olvidar" cosas que dijo antes (por ejemplo, ya no
recuerda las reglas del logo), es porque el contexto se llen&oacute;.
Sol&uacute;ci&oacute;n:

```bash
# Dentro de Claude Code:
/clear

# Y despu&eacute;s, en el prompt:
```

```
Acabo de hacer /clear. Le&eacute; el CLAUDE.md y HANDOFF.md de vuelta.
Confirm&aacute; que entend&eacute;s las reglas del logo y la fuente de
verdad de UX antes de seguir.
```

---

## C&oacute;mo guardar el progreso

### Despu&eacute;s de cada sesi&oacute;n productiva

```bash
git status                       # ver qu&eacute; cambi&oacute;
git add -A                       # stage todo
git commit -m "feat: ..."        # commit con un mensaje claro
git log --oneline -5             # ver los &uacute;ltimos 5 commits
```

### Cuando lleg&aacute;s a un milestone

```bash
git push origin mejoras-ui-frontpage    # subir tu branch
# Despu&eacute;s en GitHub, abr&iacute; un PR contra main para revisar todo junto
```

### Si quer&eacute;s merger a main

```bash
git checkout main
git merge mejoras-ui-frontpage --no-ff   # merge con commit de merge
git push origin main
```

### Para que tu branch est&eacute; siempre al d&iacute;a con main

```bash
git checkout main
git pull
git checkout mejoras-ui-frontpage
git rebase main                  # tus cambios sobre la &uacute;ltima main
```

---

## Un truco que vale oro

Al final de cada sesi&oacute;n productiva con Claude Code, ped&iacute;le esto
antes de salir:

```
Actualiz&aacute; el CLAUDE.md (y el HANDOFF.md si hace falta) con lo que
aprendiste hoy. Espec&iacute;ficamente:

- Decisiones nuevas de UI/UX que tomamos
- Archivos nuevos que existen ahora y deber&iacute;an mencionarse
- Convenciones nuevas que segu&iacute;mos
- Pendientes que dejamos para la pr&oacute;xima sesi&oacute;n

No reescribas todo. Solo agreg&aacute; o modific&aacute; lo que cambi&oacute;.
```

As&iacute;, la pr&oacute;xima vez que abras Claude Code, ya tiene el contexto
de lo &uacute;ltimo que hicieron. Es como pasarte notas a vos mismo del futuro.

---

## &iexcl;Buena suerte, Profe! &#127908;
