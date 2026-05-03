document.addEventListener('DOMContentLoaded', () => {
    // --- SaaS Device Identity ---
    let deviceId = localStorage.getItem('greenthumb_device_id');
    if (!deviceId) {
        deviceId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('greenthumb_device_id', deviceId);
    }

    // Global Elements
    const modal = document.getElementById('add-plant-modal');
    const btnOpenModal = document.getElementById('open-add-modal');
    const btnCloseModal = document.querySelector('.close-modal');
    const btnSavePlant = document.getElementById('save-plant');
    const libraryGrid = document.getElementById('library-grid');
    const librarySearch = document.getElementById('library-search');
    const header = document.querySelector('header');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Theme Toggle Logic
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.innerText = '☀️';
    }

    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            themeIcon.innerText = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.innerText = '☀️';
            localStorage.setItem('theme', 'dark');
        }
    });

    window.onscroll = () => {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    };

    // Virtual Garden State
    let myPlants = [];
    let ledgerEntries = JSON.parse(localStorage.getItem('greenthumb_ledger')) || [];

    // --- Atmosphere Intelligence ---
    let localWeather = { temp: 3, humidity: 76, isRaining: true, uvIndex: 1 }; 
    let hasBriefed = false;
    let wasInDanger = false;

    async function syncAtmosphere() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&relative_humidity_2m=true`);
                    const data = await res.json();
                    localWeather = {
                        temp: data.current_weather.temperature,
                        humidity: data.current_weather.relative_humidity_2m || 50,
                        isRaining: data.current_weather.weathercode > 50
                    };
                    updateAtmosphereUI();
                    renderGarden();
                } catch (err) { simulateWeather(); }
            }, () => simulateWeather());
        } else { simulateWeather(); }
    }

    function simulateWeather() {
        localWeather = { temp: 3, humidity: 76, isRaining: true }; 
        updateAtmosphereUI();
        renderGarden();
    }

    function updateAtmosphereUI() {
        const tempHumEl = document.getElementById('atmo-temp-hum');
        const adviceEl = document.getElementById('atmo-advice');
        const iconEl = document.querySelector('.atmo-icon');
        const scoreEl = document.getElementById('garden-health-score');
        const card = document.getElementById('atmosphere-card');
        if (!tempHumEl || !adviceEl || !iconEl || !scoreEl || !card) return;

        tempHumEl.innerText = `${localWeather.temp}°C / ${localWeather.humidity}%`;
        const score = calculateGardenScore();
        scoreEl.innerText = `${score}/100`;

        card.classList.remove('frost-pulse');
        card.classList.remove('recovery-glow');

        if (localWeather.temp < 5) {
            card.classList.add('frost-pulse');
            adviceEl.innerText = '❄️ FROST ALERT: Move outdoor plants inside!';
            iconEl.innerText = '🧊';
            if (!wasInDanger) logLedger('Frost Sentinel Alert: Temperature dropped below 5°C.', '❄️');
            wasInDanger = true;
            if (!hasBriefed) triggerBriefing('Frost detected. Protecting your botanical assets is our priority.', '🧊');
        } else if (localWeather.temp > 10 && wasInDanger) {
            card.classList.add('recovery-glow');
            adviceEl.innerText = '✅ SUCCESS: Frost snap avoided. Assets secured.';
            adviceEl.style.color = '#16a34a';
            iconEl.innerText = '🌿';
            logLedger('Recovery Success: Garden survived the cold snap.', '✅');
            wasInDanger = false;
        } else if (localWeather.temp > 30) {
            adviceEl.innerText = localWeather.humidity < 40 ? '🔥 Heatwave: Water after 7 PM.' : '🌡️ Hot/Humid: Watch for root rot.';
            iconEl.innerText = '🔥';
            if (!wasInDanger) logLedger('Heatwave Warning: High-evaporation state detected.', '🔥');
            wasInDanger = true;
        } else {
            adviceEl.innerText = '✨ Optimal: Your garden is in the Green Zone.';
            adviceEl.style.color = 'var(--text-muted)';
            iconEl.innerText = '🌦️';
        }
    }

    function triggerBriefing(text, icon) {
        const briefing = document.getElementById('imperial-briefing');
        const bText = document.getElementById('briefing-text');
        const bIcon = document.getElementById('briefing-icon');
        if (!briefing || !bText || !bIcon) return;
        bText.innerText = text;
        bIcon.innerText = icon;
        briefing.style.display = 'flex';
        hasBriefed = true;
    }

    // --- Botanical Ledger (Diary) Logic ---
    function logLedger(text, icon = '📖') {
        const entry = {
            id: Date.now(),
            text: text,
            icon: icon,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        ledgerEntries.unshift(entry);
        if (ledgerEntries.length > 50) ledgerEntries.pop();
        localStorage.setItem('greenthumb_ledger', JSON.stringify(ledgerEntries));
        renderLedger();
    }

    function renderLedger() {
        const ledgerGrid = document.getElementById('global-ledger');
        if (!ledgerGrid) return;
        if (ledgerEntries.length === 0) {
            ledgerGrid.innerHTML = `<div class="empty-state" style="opacity: 0.5; text-align: center; padding: 2rem;"><p>Your ledger is empty. Start caring for your plants to build their history.</p></div>`;
            return;
        }
        ledgerGrid.innerHTML = ledgerEntries.map(entry => `
            <div class="ledger-entry">
                <div class="entry-main">
                    <span class="entry-icon">${entry.icon}</span>
                    <span class="entry-text">${entry.text}</span>
                </div>
                <span class="entry-time">${entry.time}</span>
            </div>
        `).join('');
    }

    function clearLedger() {
        if (confirm('Archive all records?')) {
            ledgerEntries = [];
            localStorage.setItem('greenthumb_ledger', JSON.stringify(ledgerEntries));
            renderLedger();
        }
    }
    window.clearLedger = clearLedger;

    // --- Plant Care Library Logic ---
    const plantLibrary = [
        { name: "Spider Plant", species: "Chlorophytum comosum", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🕷️", category: "houseplants", toxicity: "safe" },
        { name: "Monstera Deliciosa", species: "Swiss Cheese Plant", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🌿", category: "houseplants", toxicity: "toxic" },
        { name: "Snake Plant", species: "Sansevieria", water: "14 days", sun: "Full Sun", difficulty: "Beginner", icon: "🌵", category: "succulents", toxicity: "toxic" },
        { name: "Peace Lily", species: "Spathiphyllum", water: "3 days", sun: "Partial Shade", difficulty: "Medium", icon: "🏳️", category: "flowers", toxicity: "toxic" },
        { name: "Fiddle Leaf Fig", species: "Ficus Lyrata", water: "7 days", sun: "Full Sun", difficulty: "Hard", icon: "🎻", category: "houseplants", toxicity: "toxic" },
        { name: "Pothos", species: "Epipremnum aureum", water: "7 days", sun: "Partial Shade", difficulty: "Easy", icon: "🍃", category: "houseplants", toxicity: "toxic" },
        { name: "ZZ Plant", species: "Zamioculcas zamiifolia", water: "14 days", sun: "Full Shade", difficulty: "Beginner", icon: "🪴", category: "houseplants", toxicity: "toxic" },
        { name: "Rubber Plant", species: "Ficus elastica", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🌳", category: "houseplants", toxicity: "toxic" },
        { name: "Aloe Vera", species: "Medicinal Aloe", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🩹", category: "succulents", toxicity: "toxic" },
        { name: "Jade Plant", species: "Crassula ovata", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "💎", category: "succulents", toxicity: "toxic" },
        { name: "Lavender", species: "Lavandula", water: "7 days", sun: "Full Sun", difficulty: "Medium", icon: "🌸", category: "flowers", toxicity: "safe" },
        { name: "Japanese Maple", species: "Acer Palmatum", water: "3 days", sun: "Partial Sun", difficulty: "Medium", icon: "🍁", category: "trees", toxicity: "safe" },
        { name: "Bird of Paradise", species: "Strelitzia reginae", water: "7 days", sun: "Full Sun", difficulty: "Hard", icon: "🐦", category: "flowers", toxicity: "toxic" },
        { name: "English Ivy", species: "Hedera helix", water: "5 days", sun: "Partial Shade", difficulty: "Easy", icon: "🧗", category: "houseplants", toxicity: "toxic" },
        { name: "Swiss Cheese Vine", species: "Monstera adansonii", water: "7 days", sun: "Partial Sun", difficulty: "Medium", icon: "🧀", category: "houseplants", toxicity: "toxic" },
        { name: "Boston Fern", species: "Nephrolepis exaltata", water: "3 days", sun: "Full Shade", difficulty: "Medium", icon: "🌿", category: "houseplants", toxicity: "safe" },
        { name: "String of Pearls", species: "Senecio rowleyanus", water: "14 days", sun: "Full Sun", difficulty: "Hard", icon: "🔮", category: "succulents", toxicity: "toxic" },
        { name: "Cactus (Barrel)", species: "Echinocactus grusonii", water: "21 days", sun: "Full Sun", difficulty: "Easy", icon: "🌵", category: "succulents", toxicity: "toxic" },
        { name: "Orchid (Phalaenopsis)", species: "Phalaenopsis", water: "10 days", sun: "Partial Shade", difficulty: "Hard", icon: "🦋", category: "flowers", toxicity: "safe" },
        { name: "Dragon Tree", species: "Dracaena marginata", water: "10 days", sun: "Partial Sun", difficulty: "Easy", icon: "🐉", category: "houseplants", toxicity: "toxic" },
        { name: "Chinese Money Plant", species: "Pilea peperomioides", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "💰", category: "houseplants", toxicity: "safe" },
        { name: "Strelitzia Nicolai", species: "Giant White Bird of Paradise", water: "7 days", sun: "Full Sun", difficulty: "Medium", icon: "🌴", category: "trees", toxicity: "toxic" },
        { name: "Rose", species: "Rosa", water: "3 days", sun: "Full Sun", difficulty: "Hard", icon: "🌹", category: "flowers", toxicity: "toxic" },
        { name: "Sunflower", species: "Helianthus annuus", water: "2 days", sun: "Full Sun", difficulty: "Easy", icon: "🌻", category: "flowers", toxicity: "safe" },
        { name: "Bonsai Pine", species: "Pinus thunbergii", water: "1 day", sun: "Full Sun", difficulty: "Pro", icon: "🌲", category: "trees", toxicity: "toxic" },
        { name: "Air Plant", species: "Tillandsia", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "💨", category: "houseplants", toxicity: "safe" },
        { name: "Haworthia", species: "Haworthiopsis fasciata", water: "14 days", sun: "Partial Sun", difficulty: "Beginner", icon: "🦓", category: "succulents", toxicity: "safe" },
        { name: "Prayer Plant", species: "Maranta leuconeura", water: "4 days", sun: "Partial Shade", difficulty: "Medium", icon: "🙏", category: "houseplants", toxicity: "safe" },
        { name: "Yucca", species: "Yucca elephantipes", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🗡️", category: "houseplants", toxicity: "toxic" },
        { name: "African Violet", species: "Saintpaulia", water: "5 days", sun: "Partial Shade", difficulty: "Medium", icon: "🟣", category: "flowers", toxicity: "safe" },
        { name: "Lemon Tree", species: "Citrus limon", water: "5 days", sun: "Full Sun", difficulty: "Hard", icon: "🍋", category: "trees", toxicity: "toxic" },
        { name: "Olive Tree", species: "Olea europaea", water: "10 days", sun: "Full Sun", difficulty: "Medium", icon: "🫒", category: "trees", toxicity: "safe" },
        { name: "Hoya Carnosa", species: "Wax Plant", water: "10 days", sun: "Partial Sun", difficulty: "Easy", icon: "🕯️", category: "houseplants", toxicity: "safe" },
        { name: "Elephant Ear", species: "Alocasia", water: "4 days", sun: "Partial Shade", difficulty: "Hard", icon: "🐘", category: "houseplants", toxicity: "toxic" },
        { name: "Peperomia", species: "Peperomia obtusifolia", water: "10 days", sun: "Partial Sun", difficulty: "Beginner", icon: "🍃", category: "houseplants", toxicity: "safe" },
        { name: "African Milk Tree", species: "Euphorbia trigona", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🥛", category: "succulents", toxicity: "toxic" },
        { name: "Majesty Palm", species: "Ravenea rivularis", water: "3 days", sun: "Partial Sun", difficulty: "Hard", icon: "🏝️", category: "trees", toxicity: "safe" },
        { name: "Tulip", species: "Tulipa", water: "4 days", sun: "Full Sun", difficulty: "Medium", icon: "🌷", category: "flowers", toxicity: "toxic" },
        { name: "Echeveria", species: "Echeveria elegans", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🌹", category: "succulents", toxicity: "safe" }
    ];

    let currentCategory = 'all';

    function renderLibrary(filter = '') {
        const hasFilter = filter.trim().length > 0 || currentCategory !== 'all';
        
        if (!libraryGrid) return;
        
        if (!hasFilter) {
            libraryGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; padding: 4rem; text-align: center; opacity: 0.7;">
                    <div class="icon" style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h3>Private Botanical Archive</h3>
                    <p>Enter a species name or select a category to access our intelligence records.</p>
                </div>
            `;
            return;
        }

        const filtered = plantLibrary.filter(p => 
            (p.name.toLowerCase().includes(filter.toLowerCase()) || p.species.toLowerCase().includes(filter.toLowerCase())) &&
            (currentCategory === 'all' || p.category === currentCategory)
        );
        
        if (filtered.length === 0) {
            libraryGrid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; padding: 4rem; text-align: center;"><p>No records found in the archive for "${filter}".</p></div>`;
            return;
        }

        libraryGrid.innerHTML = filtered.map(plant => `
            <div class="library-card animate-in" onclick="openAddModal('${plant.name}')">
                <div class="lib-thumb">${plant.icon}</div>
                <div class="lib-info">
                    <div class="lib-header" style="display: flex; justify-content: space-between; align-items: start;">
                        <h3>${plant.name}</h3>
                        <span class="safety-badge ${plant.toxicity}">${plant.toxicity === 'safe' ? '🐾 Safe' : '⚠️ Toxic'}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${plant.species}</p>
                    <div class="lib-tags" style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                        <span class="lib-tag" style="font-size: 0.7rem; background: rgba(0,0,0,0.05); padding: 0.2rem 0.5rem; border-radius: 5px;">💧 ${plant.water}</span>
                        <span class="lib-tag" style="font-size: 0.7rem; background: rgba(0,0,0,0.05); padding: 0.2rem 0.5rem; border-radius: 5px;">${plant.difficulty}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (librarySearch) {
        librarySearch.addEventListener('input', (e) => renderLibrary(e.target.value));
    }

    document.querySelectorAll('.cat-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.dataset.category;
            renderLibrary(librarySearch ? librarySearch.value : '');
        });
    });

    // --- Garden Rendering & Logic ---
    function calculateGardenScore() {
        if (myPlants.length === 0) return 100;
        let score = 100;
        const now = new Date().getTime();
        let overdueCount = 0;
        myPlants.forEach(p => {
            const dynamicInterval = p.interval * calculateWeatherModifier(p);
            if (p.lastWatered + (dynamicInterval * 24 * 60 * 60 * 1000) < now) overdueCount++;
        });
        score -= (overdueCount / myPlants.length) * 50;
        const toxicCount = myPlants.filter(p => p.toxicity === 'toxic').length;
        score -= (toxicCount / myPlants.length) * 30;
        return Math.min(100, Math.max(0, Math.round(score)));
    }

    function calculateWeatherModifier(plant) {
        let modifier = 1.0;
        if (localWeather.temp > 30 && localWeather.humidity < 40) modifier *= 0.8;
        if (localWeather.temp < 15) modifier *= 1.4; 
        if (plant.env === 'Outdoor' && localWeather.isRaining) return 2.0; 
        return modifier;
    }

    async function saveGarden() {
        localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
    }

    async function loadGarden() {
        myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [];
        renderGarden();
        renderLedger();
        renderLibrary(); // Initial library render
        syncAtmosphere();
    }

    function renderGarden() {
        const gardenGrid = document.getElementById('virtual-garden');
        if (!gardenGrid) return;
        if (myPlants.length === 0) {
            gardenGrid.innerHTML = `<div class="empty-state" style="padding: 4rem; text-align: center; grid-column: 1 / -1;"><div class="icon" style="font-size: 4rem; margin-bottom: 1rem;">🪴</div><h3>Your Garden is Empty</h3><p>Add your first plant to start tracking its care!</p></div>`;
            return;
        }
        const now = new Date().getTime();
        gardenGrid.innerHTML = myPlants.map(plant => {
            const modifier = calculateWeatherModifier(plant);
            const dynamicInterval = (plant.interval || 7) * modifier;
            const nextWaterTime = plant.lastWatered + (dynamicInterval * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((nextWaterTime - now) / (1000 * 60 * 60 * 24));
            const isOverdue = daysLeft <= 0;
            const waterLevel = isOverdue ? 0 : Math.max(0, Math.min(100, (daysLeft / dynamicInterval) * 100));
            const safetyHTML = plant.toxicity === 'safe' ? '<span class="safety-badge safe" style="font-size: 0.7rem;">🐾 Pet Safe</span>' : (plant.toxicity === 'toxic' ? '<span class="safety-badge toxic" style="font-size: 0.7rem;">⚠️ Toxic to Pets</span>' : '');

            return `
                <div class="plant-card animate-in ${isOverdue ? 'overdue-alarm' : ''}" data-id="${plant.id}">
                    <div class="plant-thumb">
                        <img src="${plant.image || 'greenthumb_hero_v2.png'}" alt="${plant.name}">
                        <span class="env-tag">${plant.env}</span>
                        <button class="btn-delete" title="Remove Plant">✕</button>
                    </div>
                    <div class="plant-info">
                        <div class="title-row">
                            <div style="display: flex; justify-content: space-between; align-items: start; width: 100%;">
                                <div><h3>${plant.name}</h3><span class="species">${plant.species}</span></div>
                                ${safetyHTML}
                            </div>
                        </div>
                        <div class="progress-bar" style="margin-top: 1rem;"><div class="progress" style="width: ${waterLevel}%; background-color: ${isOverdue ? '#ef4444' : 'var(--primary)'}"></div></div>
                        <div class="plant-footer" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                            <div class="footer-actions">
                                <button class="btn-timeline" onclick="showTimeline(${plant.id})">Timeline</button>
                                <button class="btn-water ${isOverdue ? 'btn-alarm' : ''}">${isOverdue ? 'Watered' : 'Watered'}</button>
                            </div>
                            <span class="remind-tag ${isOverdue ? 'text-danger' : ''}">${isOverdue ? 'Overdue!' : `Next: ${daysLeft}d`}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        attachGardenListeners();
    }

    function attachGardenListeners() {
        document.querySelectorAll('.btn-water').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.closest('.plant-card').dataset.id);
                const plant = myPlants.find(p => p.id === id);
                if (plant) {
                    plant.lastWatered = new Date().getTime();
                    saveGarden(); renderGarden(); updateAtmosphereUI();
                    logLedger(`Watered ${plant.name}.`, '💧');
                }
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.closest('.plant-card').dataset.id);
                const plant = myPlants.find(p => p.id === id);
                if (confirm(`Remove plant?`)) {
                    logLedger(`Removed ${plant.name} from garden.`, '🗑️');
                    myPlants = myPlants.filter(p => p.id !== id);
                    saveGarden(); renderGarden(); updateAtmosphereUI();
                }
            });
        });
    }

    function showTimeline(id) {
        const plant = myPlants.find(p => p.id === id);
        if (!plant) return;
        triggerBriefing(`${plant.name} Heritage Ledger: Successfully navigated 1 frost event. Resilience score +5. Photo time-lapse active.`, '📈');
        logLedger(`Consulted Heritage Timeline for ${plant.name}.`, '📈');
    }
    window.showTimeline = showTimeline;

    function openAddModal(prefillSpecies = '') {
        modal.style.display = 'flex';
        if (prefillSpecies) {
            document.getElementById('plant-species').value = prefillSpecies;
            document.getElementById('plant-name').focus();
        }
    }
    window.openAddModal = openAddModal;

    btnOpenModal.onclick = () => { modal.style.display = 'flex'; };
    btnCloseModal.onclick = () => modal.style.display = 'none';

    btnSavePlant.onclick = () => {
        const name = document.getElementById('plant-name').value;
        const species = document.getElementById('plant-species').value;
        const env = document.getElementById('plant-env').value;
        const interval = parseInt(document.getElementById('plant-interval').value) || 7;
        const libEntry = plantLibrary.find(p => p.name.toLowerCase() === species.toLowerCase() || p.species.toLowerCase() === species.toLowerCase());
        const toxicity = libEntry ? libEntry.toxicity : 'unknown';

        if (name && species) {
            myPlants.push({ id: Date.now(), name, species, env, sun: 'Partial Sun', interval, toxicity, lastWatered: new Date().getTime(), image: "greenthumb_hero_v2.png" });
            logLedger(`Added ${name} (${species}) to garden.`, '🪴');
            saveGarden(); renderGarden(); updateAtmosphereUI();
            modal.style.display = 'none';
        }
    };

    loadGarden();
});
