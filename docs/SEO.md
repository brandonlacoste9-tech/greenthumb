# SEO & Search Console checklist

Live host: **https://www.garden-green.co**

## What’s already on the site

| Asset | URL |
|--------|-----|
| Sitemap | https://www.garden-green.co/sitemap.xml |
| Robots | https://www.garden-green.co/robots.txt |
| Guides hub | https://www.garden-green.co/guides/ |
| Topics hub | https://www.garden-green.co/guides/topics/ |
| Species guides | `/guides/{plant-id}.html` (59+) |
| Intent pages | pet-safe, yellow leaves, watering, frost (Canada), beginners, over/underwater |

Structured data on pages includes `Organization`, `WebSite`, `Article`, `HowTo`, `FAQPage`, and `BreadcrumbList` where relevant.

## Google Search Console (do once after deploy)

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add property → **URL prefix** → `https://www.garden-green.co`.
3. Verify with DNS TXT (domain registrar) or HTML meta/file if you prefer.
4. **Sitemaps** → submit: `https://www.garden-green.co/sitemap.xml`.
5. **URL inspection** → request indexing for:
   - `https://www.garden-green.co/`
   - `https://www.garden-green.co/guides/`
   - `https://www.garden-green.co/guides/topics/`
   - 2–3 top guides (e.g. monstera, snake-plant, pet-safe-houseplants).
6. Optional: add the same property in [Bing Webmaster Tools](https://www.bing.com/webmasters) and import from GSC or submit the same sitemap.

## Preferred domain

- Pick **one** canonical host: `www.garden-green.co` (already used in meta/canonicals).
- In your DNS/host (Vercel): redirect apex `garden-green.co` → `www` (or the reverse—then regenerate SEO with the matching `SITE` constant in `scripts/generate-seo.mjs`).

## After content updates

```bash
npm run build:content   # plants.json + all guide HTML + sitemap
```

Redeploy. In GSC, re-submit the sitemap if you add many URLs.

## Monthly SEO hygiene

- [ ] Check **Coverage / Pages** for 404s or soft 404s on `/guides/*`
- [ ] Fix any **Enhancements** warnings (FAQ / Article)
- [ ] Note queries in **Performance** → expand guides that already get impressions
- [ ] Add 1–2 new intent pages for rising queries (seasonal frost, pests, etc.)

## Content ideas that rank (next backlog)

- “Monstera yellow leaves” (species + symptom)
- “Best hanging plants for apartments”
- “Low light office plants”
- French (`fr-CA`) guides for Montreal/Québec

## Local preview

```bash
npm start
# open http://localhost:3000/guides/
# open http://localhost:3000/guides/topics/
# open http://localhost:3000/sitemap.xml
```
