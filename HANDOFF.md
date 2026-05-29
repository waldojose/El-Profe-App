# Handoff &mdash; El Profe Build Session

This document captures the full context of the multi-turn build session that produced the current state of the El Profe codebase and prototype. It exists so Claude Code (or any developer) can pick up where the session left off without losing the reasoning behind each decision.

## Project Goal

Build a professional songwriting collaboration platform for working songwriters. Not just a writing tool &mdash; a **legal infrastructure** that makes splits fair, signatures binding, and registrations defensible.

Founder Jos&eacute; G&oacute;mez ("El Profesor G&oacute;mez") wants the platform to feel creative on the surface but enforce real legal rigor underneath. Splits are decided manually by writers. The platform tracks every character of contribution so writers have hard data to negotiate with, but the platform never assigns percentages itself.

## Session Output Index

The build session produced these deliverables, all available in `/mnt/user-data/outputs/` from the original chat (or in this handoff bundle):

| File | Purpose |
| --- | --- |
| `el-profe-pro-v5.zip` | Latest full backend + frontend pack (all incremental work merged) |
| `el-profe-prototype.html` | Mobile-frame standalone prototype (iPhone-style) |
| `el-profe-web-prototype.html` | **Desktop web prototype &mdash; the UX source of truth** |
| `el-profe-pro-v2.zip` through `v5.zip` | Snapshots of each incremental milestone |
| `dictionary-patch.zip`, `i18n-patch.zip`, `mobile-pwa-patch.zip`, `logo-patch.zip` | Incremental-only files for if you want to reapply a single change |

## Build Timeline

### v2 &mdash; Foundation pack

- Replaced the fake `/subscription/upgrade` endpoint (which flipped `is_pro=true` with no payment) with real Stripe integration: Checkout Sessions, Customer Portal, signed webhooks
- New files: `backend/app/services/stripe_service.py`, `backend/app/routers/payments.py`, `frontend/src/pages/Pricing.js`, `frontend/src/pages/PaymentSuccess.js`
- Security hardening: `backend/app/config.py` validates `JWT_SECRET` at boot (refuses startup with default), CORS allowlist, SlowAPI rate limiting, WebSocket auth via `?token=`, bcrypt password validation
- Backend modularization: split the 1118-line `server.py` into `config.py`, `database.py`, `security.py`, `dependencies.py` and per-feature routers under `app/routers/`
- Frontend: centralized axios instance in `lib/api.js`

### v3 &mdash; Dictionary upgrade

- Curated Spanish-specific dictionary because open WordNet was too generic for songwriting:
  - 181 Spanish synonym entries (organized by songwriter-relevant clusters)
  - 141 Spanish antonym pairs
  - 134 ES&rarr;EN + 252 EN&rarr;ES translations
  - Suffix-based Spanish rhyme engine
- `backend/app/services/dictionary.py` with TTL+LRU cache, async httpx
- 5 endpoints in `backend/app/routers/dictionary.py`
- `frontend/src/components/SynonymsPanel.js` with 4 tabs: Sin&oacute;nimos / Ant&oacute;nimos / Rimas / Traducir

### v4 &mdash; PWA pack

- User explicitly chose: "Web primero luego iOS and Android", and has no Apple Developer / Google Play accounts yet ($99/year + $25 one-time deferred)
- Skipped Capacitor entirely for now. Built a real PWA instead &mdash; installable from any browser, $0 dev accounts needed
- All native-feeling hooks use an adapter pattern (`useHaptics`, `useShare`, `usePWA`, `usePushNotifications`) so a future Capacitor swap is mechanical
- Files: `frontend/public/manifest.json` (with shortcuts, share_target, maskable icons), `frontend/public/sw.js` (cache-first shell, network-first /api/, stale-while-revalidate /dictionary), `frontend/public/offline.html`, 17 generated icons
- Backend: `backend/app/routers/push.py` with `/api/push/{subscribe,unsubscribe,vapid-public}` + `send_to_user()` helper
- `MOBILE_GUIDE.md` documentation

### v5 &mdash; Real logo

- User uploaded two logo PNGs. Image 1 was usable (white bg, black silhouette). Image 2 was mostly unusable (black bg + black silhouette &mdash; only the "Profe" text was visible).
- Used Pillow to extract the black silhouette from Image 1, regenerated 17 PWA icons using the real logo on dark backgrounds
- Strictly enforced brand rules: only black or white, no recolor/gradient/shadow ON the logo (glow effects must go *around* it), no aspect-ratio distortion, 6% padding baked into the source PNG

### i18n pack

- User: "Desde ahora crea un boton arriba para cambiar idioma Ingles / Espa&ntilde;ol y default en ingl&eacute;s."
- Custom Context-based `~50-LOC I18nProvider`. No external library. `localStorage` key: `elprofe.lang`
- `frontend/src/i18n/translations.js`: EN canonical + ES dictionaries, ~150 strings each
- `frontend/src/components/LanguageToggle.js`: Pill toggle with Framer Motion `layoutId` animation
- Mounted in `App.js` via `<I18nProvider defaultLang="en">` + global floating toggle

### Standalone prototypes

This is what the user spent the most time iterating on. The latest desktop prototype (`el-profe-web-prototype.html`, ~650 KB) is the definitive UX truth.

It contains:

- Landing page (hero, features, pricing) with smooth-scroll to features
- Login + Signup with demo-mode hint (any email/password logs you in)
- Dashboard with three sub-views: Songs / Inbox / Network
- Three example songs with real bilingual lyrics:
  - **Sunset Dreams** (3 writers, in-progress, 78%)
  - **Camino de Plata** (2 writers, pre-seeded with partial signature, 95%)
  - **Untitled Demo** (solo, 12% draft)
- Editor with:
  - Prominent "&larr; Back to songs" button + Escape keyboard shortcut
  - Character-attribution-colored lyrics (click any word for dict)
  - Three-tab right rail: Dictionary (with Synonyms / Antonyms / Rhymes / Translate sub-tabs), Contributions (live %, decision-support note), History (per-author edit log)
  - Real logo watermark behind lyrics
- Working modals: New Song (genre/lang/visibility), Propose Split (sliders + numeric inputs, must total 100%), **Sign Split Sheet (typed name + "I agree" checkbox)**, Export PDF (with Pro gate + checkbox options), Upgrade to Pro (simulated checkout), Invite Collaborators (From Network multi-select OR By Email)
- **Real PDF generation via jsPDF** &mdash; downloadable Letter-size split sheet with brand header, document ID, signature table with `/s/ Name` format, legal text, tamper-evident footer, DRAFT watermark if unsigned
- Toast notifications for every action
- EN/ES language toggle on every screen with animated sliding pill (Framer Motion `layoutId`-style)

## Hard-Won Design Decisions

### Signatures gate the document, always

The whole legal value proposition collapses if a split sheet can be exported without all parties signing. The flow is:

1. Owner proposes split &rarr; auto-signs themselves
2. Each remaining writer must sign individually (separate sign modal with typed name + "I agree" checkbox)
3. PDF is generated with DRAFT watermark while pending
4. PDF is "clean" only when `splitStatus === 'signed'`
5. "Propose split" button is disabled once locked (re-proposing would invalidate signatures)

In the demo, the user signs as each writer in turn ("Sign as Maya", "Sign as Adri&aacute;n") to simulate the flow. In production, each writer would receive an email with their personal signing link.

### Manual splits over algorithmic assignment

We considered auto-assigning percentages based on character contribution data. **We rejected this.** Royalty splits are negotiations, not formulas. The platform's job is to surface fair data, not impose conclusions. Every split UI repeats: *"Decision support only. These percentages help the negotiation."*

### Real Stripe over fake flag-flipping

A subscription endpoint that takes no payment and sets `is_pro=true` is worse than nothing &mdash; it tells reviewers / customers the team doesn't understand the difference between a demo and a product. The deleted endpoint was a tech-debt landmine. We replaced it with Checkout Sessions + Customer Portal + signed webhook validation.

### PWA before Capacitor

User has no Apple Developer or Google Play accounts yet. Going straight to native would cost $99 + $25 *and* delay user testing. A PWA is installable from any browser today, supports push notifications, share targets, app shortcuts, offline, and the iOS install path is one tap. When the user's ready to publish to stores, the adapter-pattern hooks make Capacitor a mechanical swap.

### Self-contained prototype HTML

The user is testing through Emergent.sh's preview and through a standalone HTML file. The HTML prototype is one file, no build step, no server. It loads jsPDF from a CDN and Google Fonts. Everything else is inline. This means:

- Anyone can open and play with the latest UX in 1 click
- Brand & UX decisions are visible immediately without setup
- It's a faithful target for the production React app

### Login form uses buttons, not form submit

We hit a bug where the login form would not advance to the dashboard. Root cause: `<form onsubmit="event.preventDefault(); doLogin()">` is not 100% reliable in all `file://` contexts &mdash; sometimes the form navigates before the JS runs. Fixed by replacing the form with a plain `<div>` and using `<button type="button" onclick="doLogin()">` plus `onkeydown="if(event.key==='Enter')doLogin()"` on the inputs.

### Logo never recolored

There's a constant temptation to gradient-fill the logo or apply a drop-shadow to it directly. Always resist. The logo is a flat silhouette in pure black or pure white. Glows live around it. Drop-shadows are CSS filters on the logo's *container*, not on the logo itself.

## What Claude Code Should Tackle Next

The user explicitly asked for "verificar y hacer una mejor front page y UI" &mdash; **verify the current code and improve the front page and UI**.

### Phase 1 &mdash; Verify what's there

1. Open `el-profe-web-prototype.html` in a browser, walk through every flow (signup, dashboard, editor, propose split, sign as each writer, download PDF, upgrade to Pro, invite by email, invite from network)
2. Confirm the React frontend in `el-profe-pro-v5.zip` matches the prototype's component structure
3. Check that all bilingual strings have ES translations (no English fallbacks visible in `lang=es` mode)
4. Confirm Stripe webhook signature validation is in place
5. Confirm `JWT_SECRET` cannot be a default value in production

### Phase 2 &mdash; Improve the front page

The current landing has:
- Hero with logo float animation
- 6-card feature grid
- 2-card pricing section
- Footer

Areas where it could be stronger (these are suggestions, not directives &mdash; use judgment):

- **Social proof section** &mdash; once the user has actual users, testimonials from songwriters, ASCAP/BMI representatives, etc. Until then, maybe a "Trusted by" placeholder for industry orgs?
- **"How it works" walkthrough** &mdash; a 3-4 step illustrated section showing: (1) Write together, (2) See contributions, (3) Propose split, (4) Get signatures + PDF. Could use screenshots from the actual editor
- **Comparison table** &mdash; "El Profe vs. spreadsheet vs. lawyer drafts" to make the value concrete
- **Demo video / animation** in the hero instead of static logo float? Or a small embedded prototype iframe?
- **FAQ section** &mdash; common questions about how splits work, what makes the PDF "legally defensible", PRO registration process
- **Two-language hero** &mdash; current hero is one block of text per language. Consider a hero where both English and Spanish appear simultaneously to signal bilingual-first explicitly

### Phase 3 &mdash; UI consistency pass

- The React app's component library should match the prototype's visual choices: card border radius, shadow depth, color values, font weights, motion timing
- The "Editor" page in React likely doesn't yet have the split-sheet status panel from the latest prototype iteration &mdash; port it over
- The Invite Collaborators modal pattern needs to exist in the React app (it was added to the prototype but the React Auth/Pricing pages predate it)

### Phase 4 &mdash; Production wiring

- Server-side PDF generation (current jsPDF is client-side, ok for now, but for tamper-evidence the PDF should be generated on the backend with the cryptographic hash truly embedded)
- Email service for invitations and signature requests (Resend, Postmark, or AWS SES)
- Real-time WebSocket for the live co-writing experience
- Migrate remaining `server.py` routes into modular routers following the `auth.py` pattern

## Open Questions for the User

These came up during the session and were not fully resolved:

1. **PDF storage & retrieval.** Once a split sheet is signed, should the PDF be stored in S3 / R2 / GridFS? Should past versions be accessible? Should there be a "version history" of the document itself?

2. **What's the legal entity behind the signatures?** El Profe as a witness? Or are the signatures self-executing between the writers themselves and El Profe merely facilitates? This affects what disclaimer language goes on the PDF.

3. **PRO registration integration.** Does El Profe want to integrate directly with ASCAP/BMI APIs to register works automatically, or just generate a PDF the user manually uploads?

4. **Pricing for the long tail.** $9.99/mo for Pro is good for active writers but what about hobbyists who write 3-4 songs a year? A per-song pricing tier ("$2 to sign + export this one") might capture users who can't justify a monthly subscription.

5. **Localization beyond ES.** Brazilian Portuguese is the obvious next language for the Latin market. After that, French (Quebec + Africa). Should the i18n architecture be tightened up to handle 5+ languages cleanly?

## A Note on the User

Jos&eacute; is sharp, gives precise feedback, tests every claim, and pushes for working functionality over impressive descriptions. When he says "esto no funciona", he means it &mdash; there's a real bug. He writes in Spanish but is comfortable with English code and docs. He cares deeply about the brand and will catch logo-recolor, gradient-on-logo, and font-substitution mistakes immediately.

Match his standard: ship things that actually work end-to-end. Demo data should be labeled as demo. Buttons should do what they look like they should do. Bilingual coverage should be complete. If something is "coming soon", say "coming soon" instead of wiring up a fake.
