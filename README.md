# Baruga Medical Center – Promo landing page

Mobile-first landing page for the Instagram campaign (Promo Behel 20% + konsultasi gratis, 23 Okt – 22 Nov 2026).
Live: https://promo.barugamedicalcenter.com/ (also garlan730.github.io/baruga-promo/)

- **Content** (promo, treatments, doctors, dates, WhatsApp number): `src/config.js`
- **Booking**: date/time → Google Apps Script (`apps-script/`) locks the slot and adds a Google Calendar event → opens WhatsApp. Setup in `apps-script/README.md`.
- **Instagram stories**: `marketing/` (static PNG, animated MP4 via `render_story.py`).

## Develop

```bash
npm install
npm run dev
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).
