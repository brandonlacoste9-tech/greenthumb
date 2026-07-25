# GardenGreen (greenthumb)

**Live site:** [https://www.garden-green.co](https://www.garden-green.co)

AI-assisted plant care web app: identify plants, track a virtual garden, weather-aware watering, care ledger, **Today’s tasks**, and **50+ plant care profiles** (`data/plants.json`).

**SEO guides:** [https://www.garden-green.co/guides/](https://www.garden-green.co/guides/) · [sitemap.xml](https://www.garden-green.co/sitemap.xml)

## Quick start (static UI)

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). Garden data is stored in `localStorage` by default.

### Regenerate plant data & SEO pages

```bash
npm run build:content
# or separately:
npm run plants   # data/plants.json
npm run seo      # guides/*.html + sitemap.xml
```

## Optional backend (Vercel)

API routes live under `api/`:

| Route | Purpose | Env vars |
|-------|---------|----------|
| `POST /api/identify` | PlantNet species ID from base64 image | `PLANTNET_API_KEY` |
| `GET/POST /api/garden` | Multi-device garden sync (Neon) | `DATABASE_URL` |

1. Copy `.env.example` → configure secrets in the Vercel project (or local `.env` for serverless dev).
2. Deploy with Vercel so `/api/*` is served as serverless functions.
3. Without keys, the UI still works offline with heuristic diagnosis and local storage.

## Stack

- Static frontend: HTML / CSS / vanilla JS
- Weather: [Open-Meteo](https://open-meteo.com/) (no API key)
- Optional ID: [PlantNet](https://my.plantnet.org/)
- Optional DB: [Neon](https://neon.tech/) via `@neondatabase/serverless`
