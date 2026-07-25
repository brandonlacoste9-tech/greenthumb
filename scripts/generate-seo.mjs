/**
 * Generate SEO assets from data/plants.json:
 * - guides/index.html
 * - guides/{id}.html (one per plant)
 * - guides/{category}.html (category hubs)
 * - guides/topics/*.html (intent / problem pages)
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
                    <a class="chip" href="/guides/topics/">Care topics</a>
                    <a class="chip" href="/guides/topics/pet-safe-houseplants.html">Pet-safe plants</a>
                    <a class="chip" href="/guides/topics/yellow-leaves.html">Yellow leaves</a>
                    <a class="chip" href="/guides/topics/frost-protection-canada.html">Frost (Canada)</a>
                </div>
            </header>

            <section class="guide-section">
                <div class="section-head">
                    <h2>Popular care topics</h2>
                    <a href="/guides/topics/">View all →</a>
                </div>
                <div class="topic-list">
                    <a class="topic-row" href="/guides/topics/pet-safe-houseplants.html"><span class="topic-badge">Safety</span><span><strong>Pet-safe houseplants</strong><span class="topic-desc">Cat and dog friendlier plant picks</span></span><span class="topic-arrow">→</span></a>
                    <a class="topic-row" href="/guides/topics/yellow-leaves.html"><span class="topic-badge">Fix</span><span><strong>Yellow leaves</strong><span class="topic-desc">Causes and what to do this week</span></span><span class="topic-arrow">→</span></a>
                    <a class="topic-row" href="/guides/topics/watering-schedule.html"><span class="topic-badge">How-to</span><span><strong>Watering schedules</strong><span class="topic-desc">How often to water by plant type</span></span><span class="topic-arrow">→</span></a>
                    <a class="topic-row" href="/guides/topics/frost-protection-canada.html"><span class="topic-badge">Canada</span><span><strong>Frost protection</strong><span class="topic-desc">Cold snaps and patio plants</span></span><span class="topic-arrow">→</span></a>
                </div>
            </section>

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

/** High-intent topic pages (problems, how-tos, regional) */
function buildIntentTopics() {
    const petSafe = plants.filter((p) => p.toxicity === 'safe');
    const beginners = plants.filter((p) =>
        ['Beginner', 'Easy'].includes(p.difficulty)
    );
    const outdoor = plants.filter((p) => p.category === 'trees' || p.category === 'flowers');
    const thirsty = plants.filter((p) => (p.interval || 7) <= 4).slice(0, 8);
    const drought = plants.filter((p) => (p.interval || 7) >= 12).slice(0, 8);

    return [
        {
            id: 'pet-safe-houseplants',
            title: 'Pet-Safe Houseplants (Cat & Dog Friendly List)',
            h1: 'Pet-safe houseplants',
            description:
                'Generally pet-safer houseplants for homes with cats and dogs, plus care basics and toxicity notes. Always double-check with a vet for your pet.',
            badge: 'Safety',
            intro: 'Looking for greenery that is kinder to curious pets? Below are plants in our library marked as generally pet-safer. "Safer" is not a guarantee—supervise pets, and confirm with your veterinarian if your animal chews plants.',
            sections: [
                {
                    h2: 'How we label pet safety',
                    html: `<p>Each GardenGreen profile includes a toxicity flag based on common horticultural guidance. Plants marked <strong>pet safer</strong> are typically listed as non-toxic to cats and dogs in popular references, while others are flagged toxic.</p>
                    <p>If a plant is toxic, keep it out of reach or skip it. When in doubt, choose known safer options or hang plants high.</p>`
                },
                {
                    h2: 'Generally pet-safer plants in our guides',
                    html: `<div class="guide-grid">${petSafe.map(plantCard).join('')}</div>`
                },
                {
                    h2: 'Care tips for pet households',
                    html: `<ul>
                        <li>Place plants out of jump/chew range, or use hanging planters.</li>
                        <li>Offer pet grass so cats are less interested in your houseplants.</li>
                        <li>Wipe leaves without systemic pesticides pets might contact.</li>
                        <li>If ingestion happens, contact a vet or pet poison hotline immediately.</li>
                    </ul>`
                }
            ],
            faqs: [
                {
                    q: 'Are spider plants safe for cats?',
                    a: 'Spider plants are commonly listed as non-toxic to cats, though eating lots of any plant can cause mild stomach upset.'
                },
                {
                    q: 'What houseplants are safest for dogs?',
                    a: 'Options often recommended include spider plant, prayer plant (Maranta), pilea, and many ferns. Always verify the exact species.'
                },
                {
                    q: 'Is pothos safe for pets?',
                    a: 'No. Pothos (Epipremnum) is considered toxic to cats and dogs and should be kept out of reach or avoided in pet homes.'
                }
            ],
            cta: { title: 'Track pet-safer plants in your garden', text: 'Add plants from the library and set watering reminders that fit your home.' }
        },
        {
            id: 'yellow-leaves',
            title: 'Yellow Leaves on Houseplants: Causes and Fixes',
            h1: 'Why are my plant leaves turning yellow?',
            description:
                'Yellow leaves usually mean watering stress, light issues, or nutrients. Learn the most common causes and what to do next.',
            badge: 'Troubleshooting',
            intro: 'Yellow leaves are one of the most common plant problems. The good news: patterns usually point to a cause. Use the checklist below before you repot or fertilize in a panic.',
            sections: [
                {
                    h2: 'Quick diagnosis checklist',
                    html: `<ol>
                        <li><strong>Feel the soil.</strong> Soggy for days? Likely overwatering. Bone dry and crispy? Underwatering or heat stress.</li>
                        <li><strong>Look at which leaves yellow first.</strong> Older bottom leaves often age out or signal nitrogen/light issues. New growth yellowing can mean root or watering stress.</li>
                        <li><strong>Check light.</strong> Sudden move to a darker room can yellow leaves. Harsh direct sun can bleach or scorch.</li>
                        <li><strong>Inspect pests.</strong> Sticky residue, webbing, or speckles can mean insects stressing the plant.</li>
                    </ol>`
                },
                {
                    h2: 'Common causes',
                    html: `<ul>
                        <li><strong>Overwatering / root rot</strong> — yellow, soft leaves; soil stays wet; pot may smell sour.</li>
                        <li><strong>Underwatering</strong> — yellow then crispy edges; light pot; soil pulls from sides.</li>
                        <li><strong>Low light</strong> — pale yellow, stretchy growth, few new leaves.</li>
                        <li><strong>Nutrient deficiency</strong> — gradual yellowing with otherwise healthy roots (after checking water/light).</li>
                        <li><strong>Natural aging</strong> — occasional lower leaf yellowing on otherwise thriving plants is normal.</li>
                    </ul>`
                },
                {
                    h2: 'What to do this week',
                    html: `<ul>
                        <li>Only water when the top of the soil is dry (depth depends on species).</li>
                        <li>Empty saucers so roots are not sitting in water.</li>
                        <li>Move to brighter indirect light if the plant is in a dark corner.</li>
                        <li>Hold fertilizer until you see healthy new growth again.</li>
                        <li>Use GardenGreen diagnose if you want a structured read from a photo and notes.</li>
                    </ul>
                    <p><a class="btn-primary" href="/#identify" style="display:inline-flex;margin-top:0.5rem">Open plant doctor</a></p>`
                },
                {
                    h2: 'Species that often show watering stress',
                    html: `<div class="guide-grid">${[...thirsty, ...drought].slice(0, 8).map(plantCard).join('')}</div>`
                }
            ],
            faqs: [
                {
                    q: 'Should I cut off yellow leaves?',
                    a: 'Yes, once a leaf is mostly yellow it will not turn green again. Remove it cleanly to tidy the plant and reduce pest hiding spots.'
                },
                {
                    q: 'Can yellow leaves mean too much sun?',
                    a: 'Yes. Bleached, washed-out yellow patches or crispy burn often mean excess direct sun. Move back to bright indirect light.'
                },
                {
                    q: 'Why is my monstera getting yellow leaves?',
                    a: 'Monsteras often yellow from overwatering or low light. Let the top third of soil dry, ensure drainage, and give bright indirect light.'
                }
            ],
            cta: { title: 'Log symptoms in GardenGreen', text: 'Run a diagnosis and keep a care ledger so you can see what changed after you adjust watering or light.' }
        },
        {
            id: 'watering-schedule',
            title: 'Plant Watering Schedule: How Often to Water Houseplants',
            h1: 'How often should you water houseplants?',
            description:
                'Build a practical plant watering schedule by species, pot size, light, and weather—not a rigid calendar alone.',
            badge: 'How-to',
            intro: 'There is no universal “water every Sunday” rule. Good schedules start with species needs, then adjust for light, pot size, humidity, and season. GardenGreen tracks intervals and can factor local weather when your garden plants are outdoors or climate-sensitive.',
            sections: [
                {
                    h2: 'A simple schedule framework',
                    html: `<ol>
                        <li><strong>Start with the species interval</strong> (for example every 7 days for many tropicals, 14+ for succulents).</li>
                        <li><strong>Check soil before watering</strong>—finger test or moisture meter on larger pots.</li>
                        <li><strong>Water thoroughly</strong> until excess drains, then empty the saucer.</li>
                        <li><strong>Adjust seasonally</strong>—most plants need less in winter, more in bright summer growth.</li>
                    </ol>`
                },
                {
                    h2: 'Faster-drying plants (check more often)',
                    html: `<div class="guide-grid">${thirsty.map(plantCard).join('')}</div>`
                },
                {
                    h2: 'Slower schedules (let soil dry more)',
                    html: `<div class="guide-grid">${drought.map(plantCard).join('')}</div>`
                },
                {
                    h2: 'Weather-aware watering',
                    html: `<p>Heat and dry air speed evaporation; cool and humid conditions slow it down. Outdoor plants may skip a watering after rain. In GardenGreen, garden tasks and weather context help you prioritize what actually needs water today.</p>
                    <p><a class="btn-primary" href="/#dashboard" style="display:inline-flex;margin-top:0.5rem">Open My Garden tasks</a></p>`
                }
            ],
            faqs: [
                {
                    q: 'Is it better to water on a fixed day?',
                    a: 'A reminder day is fine as a prompt, but always confirm soil moisture. Fixed days without checking are a common path to root rot.'
                },
                {
                    q: 'How much water should I give?',
                    a: 'Water until it runs from drainage holes for most potting mixes. Avoid frequent tiny sips that leave the bottom dry or salt-loaded.'
                },
                {
                    q: 'Do plants need less water in winter?',
                    a: 'Usually yes. Lower light and slower growth mean soil stays wet longer. Extend intervals and check before every watering.'
                }
            ],
            cta: { title: 'Never guess the next watering', text: 'Add plants to your garden and use Today’s care tasks for water and fertilizer due dates.' }
        },
        {
            id: 'frost-protection-canada',
            title: 'Frost Protection for Plants in Canada',
            h1: 'Frost protection for Canadian gardens',
            description:
                'How to protect outdoor plants from frost in Canada—when to cover, move pots inside, and plan around cold snaps.',
            badge: 'Seasonal · Canada',
            intro: 'Late spring and early fall frosts are a classic Canadian plant killer—especially for containers and tender patio plants. A little forecasting goes a long way.',
            sections: [
                {
                    h2: 'Know your risk window',
                    html: `<p>Frost risk depends on your region and microclimate (city balconies can be milder than open yards). Watch overnight lows near <strong>5°C and below</strong>, especially under clear skies and calm wind.</p>
                    <p>GardenGreen’s atmosphere card can flag frost conditions when location weather is available—use that as a heads-up, not a substitute for local forecasts.</p>`
                },
                {
                    h2: 'What to do before a frost night',
                    html: `<ul>
                        <li><strong>Move containers</strong> against the house, into a garage, or indoors if tender.</li>
                        <li><strong>Cover in-ground plants</strong> with frost cloth, old sheets, or row cover before dusk; remove in the morning for light.</li>
                        <li><strong>Water soil earlier in the day</strong> (moist soil can buffer temperature better than bone-dry soil—avoid soaking leaves at night).</li>
                        <li><strong>Prioritize tropicals</strong> (citrus, basil, tomatoes, many houseplants summering outside).</li>
                    </ul>`
                },
                {
                    h2: 'Plants often grown outdoors in our library',
                    html: `<div class="guide-grid">${outdoor.slice(0, 12).map(plantCard).join('')}</div>`
                },
                {
                    h2: 'After a frost',
                    html: `<p>Wait to prune until you see what recovers. Blackened soft tissue can be removed once damage is clear. Move survivors to brighter protected spots and resume careful watering.</p>`
                }
            ],
            faqs: [
                {
                    q: 'At what temperature should I protect plants?',
                    a: 'Many tender plants need protection at or below about 5°C, especially if the low lasts for hours. Hardier shrubs tolerate more cold once established.'
                },
                {
                    q: 'Can I leave houseplants outside in Canadian summer?',
                    a: 'Yes in warm months if light is appropriate—but bring them in before nights cool in late summer/early fall, and harden them to outdoor sun gradually.'
                },
                {
                    q: 'Do frost blankets really work?',
                    a: 'Yes when draped to the ground before dusk and secured. Plastic touching leaves can worsen damage; use fabric covers instead.'
                }
            ],
            cta: { title: 'Get frost-aware garden tracking', text: 'Keep outdoor plants in My Garden and watch the atmosphere card when cold weather hits.' }
        },
        {
            id: 'beginner-houseplants',
            title: 'Best Beginner Houseplants (Hard to Kill)',
            h1: 'Best beginner houseplants',
            description:
                'Hard-to-kill houseplants for beginners: low-fuss species, simple watering, and care guides to start strong.',
            badge: 'Beginner',
            intro: 'New to plants? Start with species that forgive missed waterings and medium light. Build confidence, then graduate to divas like calatheas and fiddle leaf figs.',
            sections: [
                {
                    h2: 'Why beginners succeed with tough plants',
                    html: `<p>Beginner-friendly plants usually store water, tolerate a range of light, or clearly signal thirst. That reduces the two biggest failure modes: constant overwatering and putting a high-light plant in a dark room.</p>`
                },
                {
                    h2: 'Easy plants from our care library',
                    html: `<div class="guide-grid">${beginners.slice(0, 16).map(plantCard).join('')}</div>`
                },
                {
                    h2: 'Beginner setup checklist',
                    html: `<ul>
                        <li>Pots with drainage holes (non-negotiable).</li>
                        <li>Well-draining mix suited to the plant (succulent mix vs standard).</li>
                        <li>A bright spot near a window without harsh midday scorch for most tropicals.</li>
                        <li>A simple reminder system—GardenGreen’s garden tasks work well.</li>
                    </ul>`
                }
            ],
            faqs: [
                {
                    q: 'What is the easiest houseplant to keep alive?',
                    a: 'Snake plant, ZZ plant, and pothos are classic starter plants because they tolerate irregular watering and a range of light.'
                },
                {
                    q: 'How many plants should a beginner start with?',
                    a: 'Two or three is enough to learn watering without overwhelm. Add more once those are stable for a month.'
                },
                {
                    q: 'Should beginners buy a grow light?',
                    a: 'Not required if you have a decent window. Grow lights help in basements or north-facing rooms with very low natural light.'
                }
            ],
            cta: { title: 'Start your virtual garden', text: 'Add a beginner plant, set its watering interval, and check Today’s care when you need a nudge.' }
        },
        {
            id: 'overwatering-vs-underwatering',
            title: 'Overwatering vs Underwatering: How to Tell the Difference',
            h1: 'Overwatering vs underwatering',
            description:
                'Tell overwatering from underwatering with soil checks, leaf symptoms, and simple recovery steps for houseplants.',
            badge: 'Troubleshooting',
            intro: 'Both over- and underwatering can cause yellow leaves and droop—so look at soil and stems, not leaves alone.',
            sections: [
                {
                    h2: 'Side-by-side symptoms',
                    html: `<div class="compare-grid">
                        <div class="compare-card">
                            <h3>Likely overwatering</h3>
                            <ul>
                                <li>Soil wet for many days</li>
                                <li>Soft, yellow leaves</li>
                                <li>Mushy stems or foul soil smell</li>
                                <li>Fungus gnats</li>
                            </ul>
                        </div>
                        <div class="compare-card">
                            <h3>Likely underwatering</h3>
                            <ul>
                                <li>Soil dry and pulling from pot edges</li>
                                <li>Crispy brown edges</li>
                                <li>Lightweight pot</li>
                                <li>Dramatic droop that firms up after a thorough water</li>
                            </ul>
                        </div>
                    </div>`
                },
                {
                    h2: 'Recovery steps',
                    html: `<p><strong>If overwatered:</strong> stop watering, increase airflow and light, check drainage holes, and repot into fresh mix if roots are brown and mushy.</p>
                    <p><strong>If underwatered:</strong> soak thoroughly until water drains, let excess leave the saucer, and resume a check-then-water routine rather than tiny daily sips.</p>`
                },
                {
                    h2: 'Match the plant to the routine',
                    html: `<p>Succulents and ZZ plants hate wet feet. Ferns and peace lilies prefer more even moisture. Read the species guide before copying a neighbor’s schedule.</p>
                    <div class="guide-grid">${plants.filter((p) => ['snake-plant', 'zz-plant', 'peace-lily', 'boston-fern', 'aloe', 'pothos'].includes(p.id)).map(plantCard).join('')}</div>`
                }
            ],
            faqs: [
                {
                    q: 'Can a plant be both over- and underwatered?',
                    a: 'Yes over time—chronic shallow watering can leave lower roots dry while the top looks wet, or compacted soil can hold water poorly. Full soaks and airy soil help.'
                },
                {
                    q: 'Should I use ice cubes to water?',
                    a: 'Usually no. Cold shock is unhelpful for tropicals. Use room-temperature water and water the soil thoroughly instead.'
                }
            ],
            cta: { title: 'Diagnose with a photo', text: 'Upload a leaf shot and notes in Identify & diagnose for a guided next step.' }
        }
    ];
}

function writeIntentPages() {
    const topics = buildIntentTopics();
    const topicsDir = path.join(root, 'guides', 'topics');
    fs.mkdirSync(topicsDir, { recursive: true });

    // topic hub
    const hubCanonical = `${SITE}/guides/topics/`;
    const hubTitle = 'Plant Care Topics: Pet Safety, Watering, Frost & Fixes | GardenGreen';
    const hubDescription =
        'Practical plant care topics: pet-safe houseplants, yellow leaves, watering schedules, frost protection in Canada, and beginner plant lists.';

    const hubBody = `
    <main class="guide-main">
        <div class="container guide-wrap">
            <nav class="crumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">/</span>
                <a href="/guides/">Guides</a>
                <span aria-hidden="true">/</span>
                <span>Topics</span>
            </nav>
            <header class="guide-index-header">
                <p class="sub-badge">Intent guides</p>
                <h1>Plant care topics</h1>
                <p class="guide-lede">${escapeHtml(hubDescription)}</p>
            </header>
            <div class="topic-list">
                ${topics
                    .map(
                        (t) => `
                    <a class="topic-row" href="/guides/topics/${t.id}.html">
                        <span class="topic-badge">${escapeHtml(t.badge)}</span>
                        <span>
                            <strong>${escapeHtml(t.h1)}</strong>
                            <span class="topic-desc">${escapeHtml(t.description)}</span>
                        </span>
                        <span class="topic-arrow" aria-hidden="true">→</span>
                    </a>`
                    )
                    .join('')}
            </div>
        </div>
    </main>`;

    fs.writeFileSync(
        path.join(topicsDir, 'index.html'),
        shell({
            title: hubTitle,
            description: hubDescription,
            canonical: hubCanonical,
            jsonLd: [
                breadcrumbs([
                    { name: 'Home', url: `${SITE}/` },
                    { name: 'Guides', url: `${SITE}/guides/` },
                    { name: 'Topics', url: hubCanonical }
                ]),
                {
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: 'Plant Care Topics',
                    description: hubDescription,
                    url: hubCanonical
                }
            ],
            body: hubBody
        })
    );

    for (const topic of topics) {
        const canonical = `${SITE}/guides/topics/${topic.id}.html`;
        const title = `${topic.title} | GardenGreen`;
        const faqLd = {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: (topic.faqs || []).map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a }
            }))
        };
        const articleLd = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: topic.h1,
            description: topic.description,
            dateModified: TODAY,
            datePublished: '2026-03-01',
            author: { '@type': 'Organization', name: 'GardenGreen', url: SITE },
            publisher: {
                '@type': 'Organization',
                name: 'GardenGreen',
                url: SITE,
                logo: { '@type': 'ImageObject', url: `${SITE}/greenthumb_hero_v2.png` }
            },
            mainEntityOfPage: canonical
        };

        const body = `
    <main class="guide-main">
        <div class="container guide-wrap">
            <nav class="crumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">/</span>
                <a href="/guides/">Guides</a>
                <span aria-hidden="true">/</span>
                <a href="/guides/topics/">Topics</a>
                <span aria-hidden="true">/</span>
                <span>${escapeHtml(topic.h1)}</span>
            </nav>
            <article class="guide-article">
                <header class="guide-index-header">
                    <p class="sub-badge">${escapeHtml(topic.badge)}</p>
                    <h1>${escapeHtml(topic.h1)}</h1>
                    <p class="guide-lede">${escapeHtml(topic.intro)}</p>
                </header>
                ${topic.sections
                    .map(
                        (s) => `
                <section>
                    <h2>${escapeHtml(s.h2)}</h2>
                    ${s.html}
                </section>`
                    )
                    .join('')}
                ${
                    topic.faqs?.length
                        ? `<section class="guide-faq">
                    <h2>FAQ</h2>
                    ${topic.faqs
                        .map(
                            (f) => `
                    <h3>${escapeHtml(f.q)}</h3>
                    <p>${escapeHtml(f.a)}</p>`
                        )
                        .join('')}
                </section>`
                        : ''
                }
                <aside class="guide-cta glass-card">
                    <h2>${escapeHtml(topic.cta.title)}</h2>
                    <p>${escapeHtml(topic.cta.text)}</p>
                    <div class="detail-actions" style="border:none;padding-top:0.5rem;margin-top:0.5rem">
                        <a class="btn-primary" href="/#dashboard">Open app</a>
                        <a class="btn-secondary" href="/guides/">All plant guides</a>
                    </div>
                </aside>
                <p class="more-topics"><a href="/guides/topics/">More care topics →</a></p>
            </article>
        </div>
    </main>`;

        fs.writeFileSync(
            path.join(topicsDir, `${topic.id}.html`),
            shell({
                title,
                description: topic.description,
                canonical,
                ogType: 'article',
                jsonLd: [
                    breadcrumbs([
                        { name: 'Home', url: `${SITE}/` },
                        { name: 'Guides', url: `${SITE}/guides/` },
                        { name: 'Topics', url: `${SITE}/guides/topics/` },
                        { name: topic.h1, url: canonical }
                    ]),
                    articleLd,
                    faqLd
                ],
                body
            })
        );
    }

    return topics;
}

function writeSitemap(topics = []) {
    const urls = [
        { loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
        { loc: `${SITE}/guides/`, priority: '0.9', changefreq: 'weekly' },
        { loc: `${SITE}/guides/topics/`, priority: '0.85', changefreq: 'weekly' },
        ...Object.keys(CATEGORY_META).map((c) => ({
            loc: `${SITE}/guides/${c}.html`,
            priority: '0.8',
            changefreq: 'weekly'
        })),
        ...topics.map((t) => ({
            loc: `${SITE}/guides/topics/${t.id}.html`,
            priority: '0.85',
            changefreq: 'monthly'
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

// remove old generated HTML under guides/ (keep css); clear topics too
function wipeHtml(dir) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        const st = fs.statSync(full);
        if (st.isDirectory()) wipeHtml(full);
        else if (file.endsWith('.html')) fs.unlinkSync(full);
    }
}
wipeHtml(guidesDir);

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

const topics = writeIntentPages();
writeSitemap(topics);

console.log(
    `SEO generated: ${plants.length} plant guides, ${Object.keys(byCat).length} categories, ${topics.length} topics, sitemap.xml`
);
