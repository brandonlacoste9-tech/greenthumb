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
    const resultsArea = document.getElementById('diagnosis-results');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('plant-upload');
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
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Virtual Garden State
    let myPlants = [];

    // --- Atmosphere Intelligence (Phase 2 & 3) ---
    let localWeather = { temp: 22, humidity: 45, isRaining: false, uvIndex: 5, city: 'Unknown' };

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
                        isRaining: data.current_weather.weathercode > 50,
                        uvIndex: 5
                    };
                    updateAtmosphereUI();
                    renderGarden();
                } catch (err) { simulateWeather(); }
            }, () => simulateWeather());
        } else { simulateWeather(); }
    }

    function simulateWeather() {
        localWeather = { temp: 24, humidity: 40, isRaining: false, uvIndex: 4 };
        updateAtmosphereUI();
        renderGarden();
    }

    function updateAtmosphereUI() {
        const tempHumEl = document.getElementById('atmo-temp-hum');
        const adviceEl = document.getElementById('atmo-advice');
        const iconEl = document.querySelector('.atmo-icon');
        const scoreEl = document.getElementById('garden-health-score');
        if (!tempHumEl || !adviceEl || !iconEl || !scoreEl) return;

        tempHumEl.innerText = `${localWeather.temp}°C / ${localWeather.humidity}%`;
        
        // Calculate Score
        const score = calculateGardenScore();
        scoreEl.innerText = `${score}/100`;
        scoreEl.style.color = score > 80 ? '#16a34a' : (score > 50 ? '#ca8a04' : '#ef4444');

        // Expert Advice & Sentinel Alerts
        if (localWeather.temp < 5) {
            adviceEl.innerText = '❄️ FROST ALERT: Move outdoor plants inside!';
            adviceEl.style.color = '#3a86ff';
            iconEl.innerText = '🧊';
        } else if (localWeather.temp > 30) {
            const tip = localWeather.humidity < 40 ? '🔥 Heatwave: Water after 7 PM (Sunset Shift).' : '🌡️ Hot but Humid: Monitor for root rot.';
            adviceEl.innerText = tip;
            adviceEl.style.color = '#ff4d4d';
            iconEl.innerText = '🔥';
        } else if (localWeather.isRaining) {
            adviceEl.innerText = '🌧️ Raining: Natural hydration in progress.';
            adviceEl.style.color = '#3a86ff';
            iconEl.innerText = '🌧️';
        } else {
            adviceEl.innerText = '✨ Optimal: Your garden is in the Green Zone.';
            adviceEl.style.color = 'var(--text-muted)';
            iconEl.innerText = '🌦️';
        }
    }

    function calculateGardenScore() {
        if (myPlants.length === 0) return 100;
        let score = 100;
        const now = new Date().getTime();

        // 1. Hydration (50%)
        let overdueCount = 0;
        myPlants.forEach(p => {
            const dynamicInterval = p.interval * calculateWeatherModifier(p);
            const nextWater = p.lastWatered + (dynamicInterval * 24 * 60 * 60 * 1000);
            if (nextWater < now) overdueCount++;
        });
        score -= (overdueCount / myPlants.length) * 50;

        // 2. Safety (30%)
        const toxicCount = myPlants.filter(p => p.toxicity === 'toxic').length;
        score -= (toxicCount / myPlants.length) * 30;

        // 3. Environmental Alignment (20%)
        if (localWeather.temp > 35 || localWeather.temp < 2) score -= 10;
        if (localWeather.humidity < 20) score -= 10;

        return Math.max(0, Math.round(score));
    }

    function calculateWeatherModifier(plant) {
        let modifier = 1.0;
        // VPD-Aware logic
        if (localWeather.temp > 30 && localWeather.humidity < 40) modifier *= 0.8; // Fast drying
        if (localWeather.temp < 15) modifier *= 1.3; // Dormancy

        if (plant.env === 'Outdoor' && localWeather.isRaining) return 2.0; 
        return modifier;
    }

    async function saveGarden() {
        localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
        try {
            await fetch('/api/garden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: deviceId, plants: myPlants }) });
        } catch (err) {}
    }

    async function loadGarden() {
        myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [];
        renderGarden();
        syncAtmosphere();
    }

    function renderGarden() {
        const gardenGrid = document.getElementById('virtual-garden');
        if (!gardenGrid) return;
        if (myPlants.length === 0) {
            gardenGrid.innerHTML = `<div class="empty-state" style="padding: 4rem; text-align: center; grid-column: 1 / -1;"><div class="icon" style="font-size: 4rem; margin-bottom: 1rem;">🪴</div><h3>Your Garden is Empty</h3><p>Add your first plant to start tracking its care!</p></div>`;
            gardenGrid.style.display = 'block';
            return;
        }
        const now = new Date().getTime();
        gardenGrid.style.display = 'grid';
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
                        ${isOverdue ? '<span class="alarm-badge">⚠️ ALARM</span>' : ''}
                        <button class="btn-delete" title="Remove Plant">✕</button>
                    </div>
                    <div class="plant-info">
                        <div class="title-row">
                            <div style="display: flex; justify-content: space-between; align-items: start; width: 100%;">
                                <div><h3>${plant.name}</h3><span class="species">${plant.species}</span></div>
                                ${safetyHTML}
                            </div>
                        </div>
                        <div class="care-stats">
                            <div class="stat">
                                <span class="label">Hydration Level</span>
                                <div class="progress-bar"><div class="progress" style="width: ${waterLevel}%; background-color: ${isOverdue ? '#ef4444' : 'var(--primary)'}"></div></div>
                            </div>
                        </div>
                        <div class="plant-footer">
                            <span class="remind-tag ${isOverdue ? 'text-danger' : ''}">${isOverdue ? 'Overdue!' : `Next Water: ${daysLeft} days`}</span>
                            <button class="btn-water ${isOverdue ? 'btn-alarm' : ''}">${isOverdue ? 'WATER NOW' : 'Watered'}</button>
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
                    showNotification(`${plant.name} watered! Score updated.`);
                }
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.closest('.plant-card').dataset.id);
                if (confirm(`Remove plant?`)) {
                    myPlants = myPlants.filter(p => p.id !== id);
                    saveGarden(); renderGarden(); updateAtmosphereUI();
                }
            });
        });
    }

    function showNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'toast animate-in';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    btnOpenModal.onclick = () => { modal.style.display = 'flex'; };
    btnCloseModal.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    btnSavePlant.onclick = () => {
        const name = document.getElementById('plant-name').value;
        const species = document.getElementById('plant-species').value;
        const env = document.getElementById('plant-env').value;
        const interval = parseInt(document.getElementById('plant-interval').value) || 7;
        const libEntry = plantLibrary.find(p => p.name.toLowerCase() === species.toLowerCase() || p.species.toLowerCase() === species.toLowerCase());
        const toxicity = libEntry ? libEntry.toxicity : 'unknown';

        if (name && species) {
            myPlants.push({ id: Date.now(), name, species, env, sun: 'Partial Sun', interval, toxicity, lastWatered: new Date().getTime(), image: "greenthumb_hero_v2.png" });
            saveGarden(); renderGarden(); updateAtmosphereUI();
            modal.style.display = 'none';
            document.getElementById('plant-name').value = '';
            document.getElementById('plant-species').value = '';
        }
    };

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

    loadGarden();
});
