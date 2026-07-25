/**
 * Generate SEO assets from data/plants.json:
 * - guides/index.html
 * - guides/{id}.html (one per plant)
 * - guides/{category}.html (category hubs)
 * - sitemap.xml
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const SITE = 'https://www.garden-green.co';
const TODAY = new Date().toISOString().slice(0, 10);

const plantsPath = path.join(root, 'data', 'plants.json');
const { plants } = JSON.parse(fs.readFileSync(plantsPath, 'utf8'));

const CATEGORY_META = {
    houseplants: {
        title: 'Houseplant Care Guides',
        description:
            'Care guides for popular indoor houseplants — watering, light, soil, pet safety, and troubleshooting.'
    },
    succulents: {
        title: 'Succulent Care Guides',
        description:
            'How to care for succulents and cacti: watering cadence, light needs, soil, and common problems.'
    },
    flowers: {
        title: 'Flowering Plant Care Guides',
        description:
            'Care guides for flowering plants and herbs — light, water, feeding, and bloom tips.'
    },
    trees: {
        title: 'Tree & Shrub Care Guides',
        description:
            'Outdoor and container trees — watering, sun exposure, soil, and seasonal care.'
    }
};

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function slugifyCategory(cat) {
    return cat;
}

function shell({ title, description, canonical, ogType = 'website', jsonLd = [], body, activeNav = 'guides' }) {
    const ld = jsonLd
        .map((obj) => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`)
        .join('\n    ');

    return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="theme-color" content="#09090b">
    <meta name="author" content="GardenGreen">
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta property="og:site_name" content="GardenGreen">
    <meta property="og:locale" content="en_CA">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${SITE}/greenthumb_hero_v2.png">
    <meta property="og:image:alt" content="GardenGreen plant care">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${SITE}/greenthumb_hero_v2.png">
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="/guides/guides.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
    ${ld}
</head>
<body class="guides-body">
    <header class="scrolled">
        <nav class="container" aria-label="Primary">
            <a class="logo" href="/">
                <span class="logo-mark" aria-hidden="true">🌿</span>
                <span>GardenGreen</span>
            </a>
            <ul class="nav-links">
                <li><a href="/#identify">Identify</a></li>
                <li><a href="/guides/"${activeNav === 'guides' ? ' aria-current="page"' : ''}>Guides</a></li>
                <li><a href="/#library">Library</a></li>
                <li><a href="/#dashboard">Garden</a></li>
                <li><a href="/#pricing">Pricing</a></li>
            </ul>
            <div class="nav-actions">
                <a href="/#dashboard" class="btn-primary">Open app</a>
            </div>
        </nav>
    </header>
    ${body}
    <footer>
        <div class="container site-footer">
            <div class="footer-brand">www.<span>garden-green</span>.co</div>
            <p>Plant care guides and tools for modern plant parents. Local-first by default.</p>
            <div class="footer-links-row">
                <a href="/guides/">All guides</a>
                <a href="/#identify">Identify a plant</a>
                <a href="/#pricing">Pricing</a>
                <a href="/">Home</a>
            </div>
            <p class="footer-copy">© ${new Date().getFullYear()} GardenGreen · Canada</p>
        </div>
    </footer>
</body>
</html>
`;
}

function breadcrumbs(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url
        }))
    };
}

function plantCard(plant) {
    return `
    <a class="guide-card" href="/guides/${escapeHtml(plant.id)}.html">
        <div class="guide-card-icon" aria-hidden="true">${plant.icon || '🌿'}</div>
        <div>
            <h3>${escapeHtml(plant.name)}</h3>
            <p class="guide-card-species">${escapeHtml(plant.species)}</p>
            <div class="guide-card-tags">
                <span>${escapeHtml(plant.difficulty)}</span>
                <span>${plant.toxicity === 'safe' ? 'Pet safer' : 'Toxic'}</span>
                <span>${escapeHtml(plant.sun)}</span>
            </div>
        </div>
    </a>`;
}

function writePlantPage(plant, related) {
    const title = `${plant.name} Care Guide (${plant.species}) | GardenGreen`;
    const description = `${plant.summary} Water every ${plant.interval} days. ${plant.sun}. ${
        plant.toxicity === 'safe' ? 'Generally pet-safer.' : 'Toxic to pets.'
    } Full ${plant.name} care tips.`.slice(0, 158);

    const canonical = `${SITE}/guides/${plant.id}.html`;
    const issues = plant.care?.commonIssues || [];
    const tips = plant.tips || [];

    const articleLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${plant.name} Care Guide`,
        description: plant.summary,
        dateModified: TODAY,
        datePublished: '2026-01-15',
        author: { '@type': 'Organization', name: 'GardenGreen', url: SITE },
        publisher: {
            '@type': 'Organization',
            name: 'GardenGreen',
            url: SITE,
            logo: { '@type': 'ImageObject', url: `${SITE}/greenthumb_hero_v2.png` }
        },
        mainEntityOfPage: canonical,
        about: {
            '@type': 'Thing',
            name: plant.species,
            alternateName: plant.name
        },
        keywords: [
            plant.name,
            plant.species,
            `${plant.name} care`,
            `${plant.name} watering`,
            plant.category,
            plant.toxicity === 'safe' ? 'pet safe plant' : 'toxic plant'
        ].join(', ')
    };

    const howToLd = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `How to care for ${plant.name}`,
        description: plant.summary,
        step: [
            {
                '@type': 'HowToStep',
                name: 'Watering',
                text: plant.care?.water || plant.water
            },
            {
                '@type': 'HowToStep',
                name: 'Light',
                text: plant.care?.light || plant.sun
            },
            {
                '@type': 'HowToStep',
                name: 'Soil & fertilizer',
                text: `${plant.care?.soil || plant.soil} ${plant.care?.fertilizer || ''}`.trim()
            }
        ]
    };

    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: `How often should I water ${plant.name}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: plant.care?.water || `About every ${plant.interval} days, adjusted for light and season.`
                }
            },
            {
                '@type': 'Question',
                name: `Is ${plant.name} safe for pets?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text:
                        plant.toxicity === 'safe'
                            ? `${plant.name} is generally considered a pet-safer choice, but supervise pets around any plant.`
                            : `${plant.name} (${plant.species}) is considered toxic to pets. Keep out of reach of cats and dogs.`
                }
            },
            {
                '@type': 'Question',
                name: `What light does ${plant.name} need?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: plant.care?.light || plant.sun
                }
            }
        ]
    };

    const body = `
    <main class="guide-main">
        <div class="container guide-wrap">
            <nav class="crumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">/</span>
                <a href="/guides/">Guides</a>
                <span aria-hidden="true">/</span>
                <a href="/guides/${escapeHtml(plant.category)}.html">${escapeHtml(plant.category)}</a>
                <span aria-hidden="true">/</span>
                <span>${escapeHtml(plant.name)}</span>
            </nav>

            <article class="guide-article">
                <header class="guide-header">
                    <div class="guide-emoji" aria-hidden="true">${plant.icon || '🌿'}</div>
                    <div>
                        <p class="sub-badge">${escapeHtml(plant.category)} · ${escapeHtml(plant.difficulty)}</p>
                        <h1>${escapeHtml(plant.name)} care guide</h1>
                        <p class="guide-lede"><em>${escapeHtml(plant.species)}</em> — ${escapeHtml(plant.summary)}</p>
                        <div class="detail-badges" style="margin-top:0.75rem">
                            <span class="safety-badge ${plant.toxicity}">${
                                plant.toxicity === 'safe' ? '🐾 Pet safer' : '⚠️ Toxic to pets'
                            }</span>
                            <span class="lib-tag">💧 Every ${plant.interval} days</span>
                            <span class="lib-tag">☀️ ${escapeHtml(plant.sun)}</span>
                        </div>
                    </div>
                </header>

                <section class="guide-stats detail-grid" aria-label="Quick care facts">
                    <div class="detail-stat"><span class="label">Water</span><span class="value">Every ${plant.interval} days</span></div>
                    <div class="detail-stat"><span class="label">Light</span><span class="value">${escapeHtml(plant.sun)}</span></div>
                    <div class="detail-stat"><span class="label">Humidity</span><span class="value">${escapeHtml(plant.humidity)}</span></div>
                    <div class="detail-stat"><span class="label">Temperature</span><span class="value">${escapeHtml(plant.temp)}</span></div>
                </section>

                <section>
                    <h2>Watering ${escapeHtml(plant.name)}</h2>
                    <p>${escapeHtml(plant.care?.water || plant.water)}</p>
                    <p>As a baseline, plan on watering about <strong>every ${plant.interval} days</strong>, then adjust for pot size, light, and season. In winter, many plants need less water.</p>
                </section>

                <section>
                    <h2>Light requirements</h2>
                    <p>${escapeHtml(plant.care?.light || plant.sun)}</p>
                </section>

                <section>
                    <h2>Soil &amp; fertilizer</h2>
                    <p>${escapeHtml(plant.care?.soil || plant.soil)}</p>
                    <p>${escapeHtml(plant.care?.fertilizer || `Feed about every ${plant.fertilizeDays} days in the growing season.`)}</p>
                </section>

                ${
                    issues.length
                        ? `<section>
                    <h2>Common problems</h2>
                    <ul>${issues.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
                </section>`
                        : ''
                }

                ${
                    tips.length
                        ? `<section>
                    <h2>Pro tips</h2>
                    <ul>${tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
                </section>`
                        : ''
                }

                <section class="guide-faq">
                    <h2>FAQ</h2>
                    <h3>How often should I water ${escapeHtml(plant.name)}?</h3>
                    <p>${escapeHtml(plant.care?.water || `About every ${plant.interval} days.`)}</p>
                    <h3>Is ${escapeHtml(plant.name)} safe for pets?</h3>
                    <p>${
                        plant.toxicity === 'safe'
                            ? `${escapeHtml(plant.name)} is generally considered a pet-safer choice. Still supervise curious pets.`
                            : `${escapeHtml(plant.name)} is considered toxic to pets. Keep it out of reach of cats and dogs.`
                    }</p>
                    <h3>What light does it need?</h3>
                    <p>${escapeHtml(plant.care?.light || plant.sun)}</p>
                </section>

                <aside class="guide-cta glass-card">
                    <h2>Track this plant in GardenGreen</h2>
                    <p>Add ${escapeHtml(plant.name)} to your garden for weather-aware watering reminders and a care ledger.</p>
                    <div class="detail-actions" style="border:none;padding-top:0.5rem;margin-top:0.5rem">
                        <a class="btn-primary" href="/#library">Open plant library</a>
                        <a class="btn-secondary" href="/#identify">Identify a plant</a>
                    </div>
                </aside>

                ${
                    related.length
                        ? `<section class="related">
                    <h2>Related ${escapeHtml(plant.category)} guides</h2>
                    <div class="guide-grid">
                        ${related.map(plantCard).join('')}
                    </div>
                </section>`
                        : ''
                }
            </article>
        </div>
    </main>`;

    const html = shell({
        title,
        description,
        canonical,
        ogType: 'article',
        jsonLd: [
            breadcrumbs([
                { name: 'Home', url: `${SITE}/` },
                { name: 'Guides', url: `${SITE}/guides/` },
                { name: CATEGORY_META[plant.category]?.title || plant.category, url: `${SITE}/guides/${plant.category}.html` },
                { name: plant.name, url: canonical }
            ]),
            articleLd,
            howToLd,
            faqLd
        ],
        body
    });

    fs.writeFileSync(path.join(root, 'guides', `${plant.id}.html`), html);
}

function writeCategoryPage(category, list) {
    const meta = CATEGORY_META[category] || {
        title: `${category} Care Guides`,
        description: `Plant care guides for ${category}.`
    };
    const title = `${meta.title} | GardenGreen`;
    const canonical = `${SITE}/guides/${category}.html`;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: meta.title,
        description: meta.description,
        url: canonical,
        isPartOf: { '@type': 'WebSite', name: 'GardenGreen', url: SITE },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: list.length,
            itemListElement: list.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE}/guides/${p.id}.html`,
                name: p.name
            }))
        }
    };

    const body = `
    <main class="guide-main">
        <div class="container guide-wrap">
            <nav class="crumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">/</span>
                <a href="/guides/">Guides</a>
                <span aria-hidden="true">/</span>
                <span>${escapeHtml(meta.title)}</span>
            </nav>
            <header class="guide-index-header">
                <p class="sub-badge">Category</p>
                <h1>${escapeHtml(meta.title)}</h1>
                <p class="guide-lede">${escapeHtml(meta.description)} ${list.length} guides.</p>
            </header>
            <div class="guide-grid">
                ${list.map(plantCard).join('')}
            </div>
        </div>
    </main>`;

    fs.writeFileSync(
        path.join(root, 'guides', `${category}.html`),
        shell({
            title,
            description: meta.description,
            canonical,
            jsonLd: [
                breadcrumbs([
                    { name: 'Home', url: `${SITE}/` },
                    { name: 'Guides', url: `${SITE}/guides/` },
                    { name: meta.title, url: canonical }
                ]),
                itemList
            ],
            body
        })
    );
}

function writeIndex() {
    const byCat = {};
    for (const p of plants) {
        byCat[p.category] = byCat[p.category] || [];
        byCat[p.category].push(p);
    }

    const title = 'Plant Care Guides | Watering, Light & Pet Safety | GardenGreen';
    const description =
        'Free plant care guides for houseplants, succulents, flowers, and trees. Learn watering, light, soil, fertilizer, and pet toxicity — then track care in GardenGreen.';
    const canonical = `${SITE}/guides/`;

    const collectionLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Plant Care Guides',
        description,
        url: canonical,
        isPartOf: {
            '@type': 'WebSite',
            name: 'GardenGreen',
            url: SITE,
            potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE}/guides/?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
            }
        },
        numberOfItems: plants.length
    };

    const body = `
    <main class="guide-main">
        <div class="container guide-wrap">
            <nav class="crumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">/</span>
                <span>Guides</span>
            </nav>
            <header class="guide-index-header">
                <p class="sub-badge">SEO care library</p>
                <h1>Plant care guides</h1>
                <p class="guide-lede">${escapeHtml(description)}</p>
                <div class="category-pills">
                    ${Object.keys(CATEGORY_META)
                        .map(
                            (c) =>
                                `<a class="chip" href="/guides/${c}.html">${escapeHtml(CATEGORY_META[c].title)} (${(byCat[c] || []).length})</a>`
                        )
                        .join('')}
                </div>
            </header>

            ${Object.entries(byCat)
                .map(
                    ([cat, list]) => `
                <section class="guide-section">
                    <div class="section-head">
                        <h2>${escapeHtml(CATEGORY_META[cat]?.title || cat)}</h2>
                        <a href="/guides/${escapeHtml(cat)}.html">View all →</a>
                    </div>
                    <div class="guide-grid">
                        ${list.map(plantCard).join('')}
                    </div>
                </section>`
                )
                .join('')}

            <aside class="guide-cta glass-card">
                <h2>Not sure what plant you have?</h2>
                <p>Use GardenGreen’s identify tool, then save it to your garden for watering reminders.</p>
                <div class="detail-actions" style="border:none;padding-top:0.5rem;margin-top:0.5rem">
                    <a class="btn-primary" href="/#identify">Identify a plant</a>
                    <a class="btn-secondary" href="/#dashboard">Open my garden</a>
                </div>
            </aside>
        </div>
    </main>`;

    fs.writeFileSync(
        path.join(root, 'guides', 'index.html'),
        shell({
            title,
            description,
            canonical,
            jsonLd: [
                breadcrumbs([
                    { name: 'Home', url: `${SITE}/` },
                    { name: 'Guides', url: canonical }
                ]),
                collectionLd
            ],
            body
        })
    );
}

function writeSitemap() {
    const urls = [
        { loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
        { loc: `${SITE}/guides/`, priority: '0.9', changefreq: 'weekly' },
        ...Object.keys(CATEGORY_META).map((c) => ({
            loc: `${SITE}/guides/${c}.html`,
            priority: '0.8',
            changefreq: 'weekly'
        })),
        ...plants.map((p) => ({
            loc: `${SITE}/guides/${p.id}.html`,
            priority: '0.7',
            changefreq: 'monthly'
        }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n')}
</urlset>
`;

    fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
}

// --- run ---
const guidesDir = path.join(root, 'guides');
fs.mkdirSync(guidesDir, { recursive: true });

// remove old generated plant pages (keep guides.css)
for (const file of fs.readdirSync(guidesDir)) {
    if (file.endsWith('.html')) fs.unlinkSync(path.join(guidesDir, file));
}

writeIndex();

const byCat = {};
for (const p of plants) {
    byCat[p.category] = byCat[p.category] || [];
    byCat[p.category].push(p);
}
for (const [cat, list] of Object.entries(byCat)) {
    writeCategoryPage(cat, list);
}

for (const plant of plants) {
    const related = plants
        .filter((p) => p.category === plant.category && p.id !== plant.id)
        .slice(0, 4);
    writePlantPage(plant, related);
}

writeSitemap();

console.log(
    `SEO generated: ${plants.length} plant guides, ${Object.keys(byCat).length} categories, sitemap.xml`
);
