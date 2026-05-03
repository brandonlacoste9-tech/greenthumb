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

    // --- Atmosphere Intelligence (Heritage Edition) ---
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
            wasInDanger = true;
            if (!hasBriefed) triggerBriefing('Frost detected. Protecting your botanical assets is our priority.', '🧊');
        } else if (localWeather.temp > 10 && wasInDanger) {
            card.classList.add('recovery-glow');
            adviceEl.innerText = '✅ SUCCESS: Frost snap avoided. Assets secured.';
            adviceEl.style.color = '#16a34a';
            iconEl.innerText = '🌿';
        } else if (localWeather.temp > 30) {
            adviceEl.innerText = localWeather.humidity < 40 ? '🔥 Heatwave: Water after 7 PM.' : '🌡️ Hot/Humid: Watch for root rot.';
            iconEl.innerText = '🔥';
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
        if (localWeather.temp > 10 && wasInDanger) score += 5; 
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

    function showTimeline(id) {
        const plant = myPlants.find(p => p.id === id);
        if (!plant) return;
        triggerBriefing(`${plant.name} Heritage Ledger: Successfully navigated 1 frost event. Resilience score +5. Photo time-lapse active.`, '📈');
    }
    window.showTimeline = showTimeline;

    btnOpenModal.onclick = () => { modal.style.display = 'flex'; };
    btnCloseModal.onclick = () => modal.style.display = 'none';

    btnSavePlant.onclick = () => {
        const name = document.getElementById('plant-name').value;
        const species = document.getElementById('plant-species').value;
        const env = document.getElementById('plant-env').value;
        if (name && species) {
            myPlants.push({ id: Date.now(), name, species, env, sun: 'Partial Sun', interval: 7, toxicity: 'safe', lastWatered: new Date().getTime(), image: "greenthumb_hero_v2.png" });
            saveGarden(); renderGarden(); updateAtmosphereUI();
            modal.style.display = 'none';
        }
    };

    loadGarden();
});
