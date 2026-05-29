# El Profe — Songwriter's Platform

> Professional songwriting collaboration with character-level contribution tracking, manual splits, digital signatures, and legally defensible PDF documentation.

**Tagline / brand mandate:** *"Creative on surface, legal system underneath."*

The app helps working songwriters do real co-writes, settle splits fairly with data support (never AI-decided), get every writer to sign, and export tamper-evident PDFs for ASCAP/BMI/SESAC/SGAE registration.

## Founder & Voice

Jos&eacute; G&oacute;mez ("El Profesor G&oacute;mez"). Bilingual EN/ES — Spanish-first audience, English secondary. Default UI language is English; toggle is always visible.

## Stack

- **Backend:** FastAPI + MongoDB (Motor async) + JWT auth + Stripe (real, not stubbed) + SlowAPI rate limiting
- **Frontend:** React 19, Tailwind, shadcn/ui, Framer Motion, Socket.io client
- **PWA:** Manifest + Service Worker + offline.html + push notifications, all set up. Capacitor migration planned (deferred — no Apple/Play accounts yet)
- **PDF:** jsPDF (client-side) in the standalone prototype; server-side generator planned for production

## Brand & Design Tokens

```
Background: #050505
Accent:     #FFB800 (amber, primary CTA, links, focus states)
Success:    #22c55e
Error:      #ef4444

Fonts:
  Headings: Syne (700/800)
  UI body:  Manrope (400/500/600/700)
  Lyrics &
  legal:    JetBrains Mono (400/500)
```

### Logo rules (NON-NEGOTIABLE)

- Heisenberg-style silhouette: man in hat + sunglasses + "Profe" text on hat brim
- **Only black OR white.** Never recolor, gradient, or shadow ON the logo
- Glow effects must be AROUND the logo, not on it
- 6% clear-space padding is already baked into the PNG assets — do not crop
- Never distort the aspect ratio
- Real logo assets: `frontend/public/logo-white.png`, `logo-black.png`, plus 17 generated icons in `frontend/public/icons/`

## Key Architecture Decisions

1. **Manual splits, never AI-assigned.** Character-level tracking provides *decision support* for the percentage negotiation, but the writers always set the numbers and must sign.
2. **Signatures are gated.** A split is not "locked" until every co-writer signs. PDF export shows DRAFT watermark until all signatures collected.
3. **Real Stripe.** Never stub a `/subscription/upgrade` endpoint that flips `is_pro=true` without payment. Use Checkout Sessions + Customer Portal + webhooks.
4. **PWA first.** Installable from any browser for $0 in dev accounts. All hooks (`useHaptics`, `useShare`, `usePWA`, `usePushNotifications`) use an adapter pattern so swapping to Capacitor later is mechanical.
5. **Bilingual via Context.** Custom ~50-LOC `I18nProvider`, localStorage-backed under key `elprofe.lang`. No external i18n library. EN is canonical, ES translations are first-class (not afterthought).
6. **Curated Spanish dictionary.** 181 synonyms, 141 antonym pairs, 134 ES→EN + 252 EN→ES translations, suffix-based Spanish rhyme engine. Files in `backend/app/data/`.

## Repository Layout

```
backend/
  app/
    config.py            # Settings, env vars, JWT enforcement
    database.py          # Motor client, connection lifecycle
    security.py          # Password hashing, JWT, WS auth
    dependencies.py      # FastAPI deps (current_user, rate limit, etc)
    routers/
      auth.py            # /auth/*
      payments.py        # /payments/* (Stripe)
      push.py            # /api/push/{subscribe,unsubscribe,vapid-public}
      dictionary.py      # /dictionary/* (synonyms, antonyms, rhymes, translate)
      # PENDING modularization: songs.py, splits.py, messages.py, social.py, exports.py
    services/
      stripe_service.py
      dictionary.py      # TTL+LRU cache, httpx async client
    data/
      synonyms_es.py     # 181 entries
      antonyms_es.py     # 141 pairs
      translations.py    # ES&harr;EN
    server.py            # Lifespan + remaining unmigrated routes

frontend/
  public/
    manifest.json
    sw.js
    offline.html
    logo-white.png, logo-black.png
    icons/               # 17 PWA icons, all using the real logo
    generate_icons.py    # If you need to regenerate
  src/
    App.js
    i18n/
      I18nProvider.js
      translations.js    # ~150 strings each lang
    components/
      LanguageToggle.js
      InstallPrompt.js
      SynonymsPanel.js
    hooks/
      useHaptics.js
      useShare.js
      usePWA.js
      usePushNotifications.js
    lib/
      api.js             # Centralized axios instance
      registerSW.js
    pages/
      Pricing.js, PaymentSuccess.js, Auth.js (i18n-ready)
```

## Source of UX Truth

`el-profe-web-prototype.html` (in the handoff folder) is the **definitive UX reference** for what the production app should look and feel like. It contains:

- Landing page with hero, features grid, pricing
- Login + Signup screens with demo-mode hint
- Dashboard with Songs / Inbox / Network sub-views
- Editor with character-attribution-colored lyrics, three-tab right rail (Dictionary / Contributions / History)
- Working modals: New Song, Propose Split (sliders), Sign Split Sheet, Export PDF, Upgrade to Pro, Invite Collaborators
- Real PDF generation via jsPDF
- Toast notifications
- EN/ES toggle with animated pill
- Three example songs with real bilingual lyrics

When in doubt about a UI pattern, **open the prototype HTML and copy the pattern.** The prototype is opinionated, brand-consistent, and battle-tested through multiple user feedback rounds.

## What's Done

- Stripe Checkout + Customer Portal + webhook (real)
- Security hardening: JWT enforcement, CORS allowlist, rate limiting, WS auth, bcrypt password validation
- Backend modularization for `auth`, `payments`, `push`, `dictionary` routers
- Frontend i18n system (EN canonical + ES) with floating language toggle
- PWA: manifest, service worker, offline.html, push notifications, 17 icons with real logo
- Real logo integration (black silhouette extracted from upload, used everywhere)
- Standalone interactive prototype (the UX truth)

## What's Pending

- Modularize remaining backend routes (`songs`, `splits`, `messages`, `social`, `exports`) following the `auth.py` pattern
- Connect the React editor to MongoDB for live character-level contributions
- Apply i18n strings to the still-EN-only pages (Auth, Pricing, PaymentSuccess have keys ready in `translations.js`)
- Server-side PDF generation (currently jsPDF client-side in prototype)
- Email delivery for invitations and signature requests (SMTP or Postmark / Resend)
- Apple Developer + Google Play accounts → Capacitor migration

## Testing the App

Backend: `cd backend && uvicorn app.server:app --reload` (needs `.env` with `JWT_SECRET`, `MONGO_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

Frontend: `cd frontend && npm start` &mdash; default `http://localhost:3000`

Prototype: open `el-profe-web-prototype.html` directly in any browser.

## When Modifying the UI

1. Open the prototype HTML for the visual reference
2. Keep all brand tokens (colors, fonts, logo rules)
3. Maintain bilingual coverage &mdash; every new string goes in `frontend/src/i18n/translations.js` in BOTH `en` and `es`
4. Test the language toggle on every new screen
5. Never produce mock data that pretends to be real. If demo data is needed, label it as demo
6. The dark studio aesthetic is sacred &mdash; no light mode in v1
