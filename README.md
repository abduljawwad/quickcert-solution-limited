# QuickCert Solution Limited

Astro site for QuickCert Solution Limited, a UK property-compliance business based in Coventry. This repository is the foundation only: the shell, design tokens, and business config. Homepage sections, service pages, booking, and server routes are not built yet.

Linked routes other than `/` return 404 until those pages exist.

## Requirements

Node.js 18.20.8, or 20.3+, or 22+.

## Run

```bash
npm install
npm run dev
```

Astro prints a local URL, usually http://localhost:4321.

- `npm run build` writes the static site to `dist/`
- `npm run preview` serves that build
- `npm run check` runs `astro check`

Copy `.env.example` to `.env` when you have values. `PUBLIC_SITE_URL` is the canonical origin used by the sitemap. If it is empty, the build uses `https://quickcertsolutions.co.uk`. `CALENDLY_WEBHOOK_SIGNING_KEY` verifies signed POSTs to `/api/calendly`. The other keys are for later server routes. Do not commit secrets.

## Where details live

`src/config/business.ts` is the source for the legal name, phone, email, hours, company number, registered office, where the company is registered, VAT number, towns, and the eight services. Prices are integer pence (`6500` is £65.00). `src/config/nav.ts` is the only header and footer link list. Colours and fonts are Tailwind theme values in `src/styles/global.css`. Fonts are self-hosted with `@fontsource`.

## Placeholders

Do not treat these as real until the client replaces them:

- `vatNumber` is empty until the company is VAT registered
- Every service `calendlyUrl` (empty)
- `googleReviewUrl` (empty). The footer says "Read our Google reviews" and links to `/review` until an http(s) URL is set.

No accreditations, star ratings, or postcode checker are included.

## Monitoring

- **Uptime:** Point your monitor at `GET /api/health` and expect HTTP 200 with `{"ok":true}`. You can also watch the homepage if you use a service such as UptimeRobot or Better Stack; the site does not sign you up for one.
- **Errors:** Set `SENTRY_DSN` in the host environment to your Sentry project DSN (leave it empty locally). Server API routes report unexpected exceptions to Sentry; request bodies and personal data are not sent.
- **Review flag job:** Once an hour, your scheduler should `POST /api/cron/review-email` with `Authorization: Bearer` plus the value of `CRON_SECRET`. A 200 response includes how many HubSpot deals were flagged; 401 means the bearer token was wrong.
- **Logs:** Each API request writes one JSON line to the host log stream (method, path, status, duration, outcome). Use the host’s log viewer or forward logs to your own tooling.
