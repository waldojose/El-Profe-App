# C&oacute;mo continuar con Claude Code

Esta carpeta tiene todo lo que Claude Code necesita para retomar el proyecto sin perder contexto.

## Paso 1 &mdash; Tener tu c&oacute;digo local

Si todav&iacute;a no lo ten&eacute;s en tu m&aacute;quina:

```bash
git clone https://github.com/waldojose/El-Profe-App.git
cd El-Profe-App
```

Si quer&eacute;s usar el pack m&aacute;s reciente (con Stripe + seguridad + diccionario + i18n + PWA + logo), descomprim&iacute; `el-profe-pro-v5.zip` *sobre* tu repo (sobrescribe lo viejo):

```bash
cd El-Profe-App
unzip -o /ruta/a/el-profe-pro-v5.zip
```

## Paso 2 &mdash; Poner CLAUDE.md y HANDOFF.md en el repo

Estos dos archivos son los que le dan contexto a Claude Code. **El `CLAUDE.md` se lee autom&aacute;ticamente** cada vez que abr&iacute;s Claude Code en el directorio del proyecto. El `HANDOFF.md` es referencia opcional con m&aacute;s detalle.

```bash
cp CLAUDE.md /ruta/a/El-Profe-App/CLAUDE.md
cp HANDOFF.md /ruta/a/El-Profe-App/HANDOFF.md
cp el-profe-web-prototype.html /ruta/a/El-Profe-App/prototype.html
```

El prototipo HTML es importante &mdash; es la **fuente de verdad de UX**. CLAUDE.md le dice expl&iacute;citamente a Claude Code que cuando dude de un patr&oacute;n de UI, abra este archivo.

## Paso 3 &mdash; Instalar Claude Code

**Opci&oacute;n recomendada (nativo):**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

En Windows PowerShell:

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Alternativa npm** (si ya ten&eacute;s Node 18+):

```bash
npm install -g @anthropic-ai/claude-code
```

Verificar:

```bash
claude doctor
claude --version
```

Necesit&aacute;s una cuenta Claude Pro, Max, Team o Enterprise (el plan gratis de Claude.ai *no* incluye Claude Code).

## Paso 4 &mdash; Iniciar sesi&oacute;n

```bash
cd /ruta/a/El-Profe-App
claude
```

La primera vez te va a pedir login: `/login` y seguir los pasos.

Una vez adentro, Claude Code ya ley&oacute; el `CLAUDE.md` autom&aacute;ticamente y conoce todo el contexto del proyecto.

## Paso 5 &mdash; Pedirle que verifique y mejore la front page

Cuando est&eacute;s en el prompt de Claude Code, pegale esto (en espa&ntilde;ol o ingl&eacute;s, los dos funcionan):

```
Le&iacute; el CLAUDE.md y el HANDOFF.md. Quiero que hagas dos cosas:

1. Verificar el estado actual del c&oacute;digo
   - Confirmar que el endpoint /subscription/upgrade fake fue eliminado y reemplazado por Stripe real
   - Confirmar que JWT_SECRET se valida al arranque
   - Confirmar que todas las cadenas EN tienen su contraparte ES en frontend/src/i18n/translations.js
   - Listar los routers que todav&iacute;a no fueron modularizados desde server.py

2. Mejorar la front page tomando el prototype.html como referencia visual
   - Abr&iacute; prototype.html y mir&aacute; c&oacute;mo se ve la landing
   - Agreg&aacute; una secci&oacute;n "C&oacute;mo funciona" con 4 pasos ilustrados:
     escribir junto, ver contribuciones, proponer split, firmar y descargar PDF
   - Agreg&aacute; una secci&oacute;n FAQ con 5-6 preguntas reales sobre el flujo
   - Reemplaz&aacute; el hero est&aacute;tico con uno que muestre una demo animada
     (puede ser una capa de tarjetas que se acomodan, o lyrics que se escriben solas)
   - Mant&eacute;n todos los tokens de marca: #050505 fondo, #FFB800 acento,
     Syne + Manrope + JetBrains Mono, logo nunca recoloreado

Cuando termines, mostr&aacute;me las decisiones clave que tomaste y proponeme
3 mejoras m&aacute;s que vos har&iacute;as.
```

## Tips para sacarle el m&aacute;ximo a Claude Code

- **Us&aacute; `/init`** la primera vez para que Claude Code mire el c&oacute;digo y proponga adiciones al CLAUDE.md. No deja todo perfecto pero te ahorra setup.
- **Pegale errores enteros** &mdash; stack traces, output de tests. No los resumas.
- **Ped&iacute;le que escriba tests** antes de cambios grandes. "Antes de modificar el editor, escrib&iacute; tests que validen el comportamiento actual" &mdash; te ahorra regresiones.
- **Para cambios visuales**, ped&iacute;le screenshots con `playwright` o `puppeteer`. Claude Code puede ejecutar c&oacute;digo, no solo escribirlo.
- **Si se desv&iacute;a**, dec&iacute;selo. "Ese cambio rompe la regla de no-recolorear-el-logo. Volv&eacute; al estado anterior y prob&aacute; otro approach."

## Verificar la informaci&oacute;n actual de Claude Code

Por las dudas que algo cambie en futuras versiones:

- Quickstart oficial: https://docs.claude.com/en/docs/claude-code/quickstart
- Docs map: https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md
