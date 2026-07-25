# GardenGreen (greenthumb)

AI-assisted plant care web app: identify plants, track a virtual garden, weather-aware watering, and a care ledger.

## Quick start (static UI)

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). Garden data is stored in `localStorage` by default.

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
