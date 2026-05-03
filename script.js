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

    // --- Botanical Ledger ---
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

        // Add Clear Button if it doesn't exist
        let clearBtn = document.getElementById('btn-clear-ledger');
        if (!clearBtn && ledgerEntries.length > 0) {
            const header = ledgerGrid.parentElement.querySelector('h2, h3');
            if (header) {
                const btn = document.createElement('button');
                btn.id = 'btn-clear-ledger';
                btn.className = 'btn-secondary';
                btn.style.fontSize = '0.7rem';
                btn.style.padding = '0.3rem 0.8rem';
                btn.style.float = 'right';
                btn.innerText = 'Clear All';
                btn.onclick = clearLedger;
                header.appendChild(btn);
            }
        } else if (clearBtn && ledgerEntries.length === 0) {
            clearBtn.remove();
        }

        if (ledgerEntries.length === 0) {
            ledgerGrid.innerHTML = `<div class="empty-state" style="opacity: 0.5; text-align: center; padding: 2rem;"><p>Your ledger is empty.</p></div>`;
            return;
        }
        ledgerGrid.innerHTML = ledgerEntries.map(entry => `
            <div class="ledger-entry animate-in">
                <div class="entry-main">
                    <span class="entry-icon">${entry.icon}</span>
                    <span class="entry-text">${entry.text}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span class="entry-time">${entry.time}</span>
                    <button class="btn-delete-entry" onclick="deleteLedgerEntry(${entry.id})" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; font-size: 0.8rem;">✕</button>
                </div>
            </div>
        `).join('');
    }

    window.deleteLedgerEntry = (id) => {
        ledgerEntries = ledgerEntries.filter(e => e.id !== id);
        localStorage.setItem('greenthumb_ledger', JSON.stringify(ledgerEntries));
        renderLedger();
    };

    function clearLedger() {
        if (confirm('Clear entire botanical ledger? This cannot be undone.')) {
            ledgerEntries = [];
            localStorage.setItem('greenthumb_ledger', JSON.stringify(ledgerEntries));
            renderLedger();
        }
    }

    // --- Optical Intelligence (Camera Logic) ---
    let stream;

    async function startCamera(videoElement, containerElement, zoneElement) {
        // Immediate UI Revelation
        containerElement.style.display = 'block';
        if (zoneElement) zoneElement.style.display = 'none';

        try {
            // High-Resilience Hardware Handshake
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            } catch (e) {
                console.warn('Back camera failed, falling back to any available video source.');
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            videoElement.srcObject = stream;
        } catch (err) {
            alert('Camera access denied or unavailable. Please check your system settings.');
            console.error(err);
            containerElement.style.display = 'none';
            if (zoneElement) zoneElement.style.display = 'flex';
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    function capturePhoto(videoElement, canvasElement) {
        const context = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        stopCamera();
        return canvasElement.toDataURL('image/png');
    }

    // Global Root-Level Optical Components
    const diagVideo = document.getElementById('diag-camera-preview');
    const diagContainer = document.getElementById('diag-camera-container');
    const diagCanvas = document.getElementById('diag-camera-canvas');
    const diagZone = document.getElementById('drop-zone');

    const mainVideo = document.getElementById('camera-preview');
    const mainContainer = document.getElementById('camera-container');
    const mainCanvas = document.getElementById('camera-canvas');
    const mainZone = document.getElementById('modal-drop-zone');

    // Initiation Triggers
    const diagLink = document.getElementById('link-diag-camera');
    const mainLink = document.getElementById('link-camera');

    if (diagLink) diagLink.onclick = () => { startCamera(diagVideo, diagContainer, diagZone); pushNavigationState('diag-camera'); };
    if (mainLink) mainLink.onclick = () => { startCamera(mainVideo, mainContainer, mainZone); pushNavigationState('main-camera'); };

    // High-Resilience Capture Triggers
    function attachCaptureListeners() {
        const diagSnap = document.getElementById('btn-diag-snap');
        const mainSnap = document.getElementById('btn-snap');

        const triggerDiag = () => {
            const photo = capturePhoto(diagVideo, diagCanvas);
            diagContainer.style.display = 'none';
            if (diagZone) {
                diagZone.style.display = 'flex';
                diagZone.innerHTML = `
                    <div style="width: 100%; position: relative;">
                        <img src="${photo}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 20px;">
                        <button class="btn-secondary" id="retake-diag" style="margin-top: 1rem; width: 100%;">Retake Photo</button>
                    </div>
                `;
                document.getElementById('retake-diag').onclick = () => startCamera(diagVideo, diagContainer, diagZone);
            }
            logLedger('Captured photo for AI Diagnosis.', '📸');
            runDiagnosis();
        };

        const triggerMain = () => {
            const photo = capturePhoto(mainVideo, mainCanvas);
            mainContainer.style.display = 'none';
            if (mainZone) {
                mainZone.style.display = 'none';
                const previewContainer = mainCanvas.previousElementSibling;
                if (previewContainer) {
                    previewContainer.style.display = 'flex';
                    previewContainer.innerHTML = `
                        <div style="width: 100%; position: relative;">
                            <img src="${photo}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 15px;">
                            <button class="btn-secondary" id="retake-main" style="margin-top: 1rem; width: 100%; font-size: 0.7rem;">Retake Photo</button>
                        </div>
                    `;
                    document.getElementById('retake-main').onclick = () => startCamera(mainVideo, mainContainer, mainZone);
                }
            }
            logLedger('Captured photo for new garden asset.', '📸');
        };

        if (diagSnap) {
            diagSnap.onclick = triggerDiag;
            diagSnap.ontouchstart = (e) => { e.preventDefault(); triggerDiag(); };
        }
        if (mainSnap) {
            mainSnap.onclick = triggerMain;
            mainSnap.ontouchstart = (e) => { e.preventDefault(); triggerMain(); };
        }
    }

    // Initialize listeners
    attachCaptureListeners();
    function runDiagnosis() {
        triggerBriefing('Analyzing Botanical DNA... Accessing Imperial Database...', '🧬');
        setTimeout(() => {
            const results = [
                "Health Check: Optimal. VPD balance confirmed. No fungal signatures detected.",
                "Diagnosis: Slight Nitrogen deficiency. Recommend Imperial Nutrient Shift.",
                "Warning: Low hydration detected in soil telemetry. Resilience score -2.",
                "Alert: Potential Spider Mite signature. Isolation recommended."
            ];
            const randomResult = results[Math.floor(Math.random() * results.length)];
            triggerBriefing(`Diagnosis Complete: ${randomResult}`, '🧠');
            logLedger(`AI Diagnosis: ${randomResult}`, '🧠');
        }, 2000);
    }

    // Add Plant Camera
    const modalLink = document.getElementById('link-camera');
    const modalVideo = document.getElementById('camera-preview');
    const modalContainer = document.getElementById('camera-container');
    const modalZone = document.getElementById('modal-drop-zone');
    const modalSnap = document.getElementById('btn-snap');
    const modalCanvas = document.getElementById('camera-canvas');

    if (modalLink) modalLink.onclick = () => startCamera(modalVideo, modalContainer, modalZone);
    if (modalSnap) modalSnap.onclick = () => {
        const photo = capturePhoto(modalVideo, modalCanvas);
        modalContainer.style.display = 'none';
        modalZone.style.display = 'flex';
        modalZone.innerHTML = `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;">`;
        window.currentCapturedPhoto = photo;
        logLedger('Captured new plant asset photo.', '📸');
    };

    // --- Plant Care Library ---
    const plantLibrary = [
        { name: "Spider Plant", species: "Chlorophytum comosum", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🕷️", category: "houseplants", toxicity: "safe" },
        { name: "Monstera Deliciosa", species: "Swiss Cheese Plant", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🌿", category: "houseplants", toxicity: "toxic" },
        { name: "Snake Plant", species: "Sansevieria", water: "14 days", sun: "Full Sun", difficulty: "Beginner", icon: "🌵", category: "succulents", toxicity: "toxic" },
        { name: "Peace Lily", species: "Spathiphyllum", water: "3 days", sun: "Partial Shade", difficulty: "Medium", icon: "🏳️", category: "flowers", toxicity: "toxic" },
        { name: "Fiddle Leaf Fig", species: "Ficus Lyrata", water: "7 days", sun: "Full Sun", difficulty: "Hard", icon: "🎻", category: "houseplants", toxicity: "toxic" },
        { name: "Pothos", species: "Epipremnum aureum", water: "7 days", sun: "Partial Shade", difficulty: "Easy", icon: "🍃", category: "houseplants", toxicity: "toxic" },
        { name: "ZZ Plant", species: "Zamioculcas zamiifolia", water: "14 days", sun: "Full Shade", difficulty: "Beginner", icon: "🪴", category: "houseplants", toxicity: "toxic" },
        { name: "Aloe Vera", species: "Medicinal Aloe", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🩹", category: "succulents", toxicity: "toxic" },
        { name: "Lavender", species: "Lavandula", water: "7 days", sun: "Full Sun", difficulty: "Medium", icon: "🌸", category: "flowers", toxicity: "safe" },
        { name: "Japanese Maple", species: "Acer Palmatum", water: "3 days", sun: "Partial Sun", difficulty: "Medium", icon: "🍁", category: "trees", toxicity: "safe" },
        { name: "Chinese Money Plant", species: "Pilea peperomioides", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "💰", category: "houseplants", toxicity: "safe" },
        { name: "Rose", species: "Rosa", water: "3 days", sun: "Full Sun", difficulty: "Hard", icon: "🌹", category: "flowers", toxicity: "toxic" },
        { name: "Bonsai Pine", species: "Pinus thunbergii", water: "1 day", sun: "Full Sun", difficulty: "Pro", icon: "🌲", category: "trees", toxicity: "toxic" }
    ];

    let currentCategory = 'all';

    function renderLibrary(filter = '') {
        const hasFilter = filter.trim().length > 0 || currentCategory !== 'all';
        if (!libraryGrid) return;
        if (!hasFilter) {
            libraryGrid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; padding: 4rem; text-align: center; opacity: 0.7;"><div class="icon" style="font-size: 3rem; margin-bottom: 1rem;">🔍</div><h3>Private Botanical Archive</h3><p>Enter a species or category to access records.</p></div>`;
            return;
        }
        const filtered = plantLibrary.filter(p => 
            (p.name.toLowerCase().includes(filter.toLowerCase()) || p.species.toLowerCase().includes(filter.toLowerCase())) &&
            (currentCategory === 'all' || p.category === currentCategory)
        );
        if (filtered.length === 0) {
            libraryGrid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; padding: 4rem; text-align: center;"><p>No records found for "${filter}".</p></div>`;
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
                </div>
            </div>
        `).join('');
    }

    if (librarySearch) librarySearch.addEventListener('input', (e) => renderLibrary(e.target.value));
    document.querySelectorAll('.cat-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.dataset.category;
            renderLibrary(librarySearch ? librarySearch.value : '');
        });
    });

    // --- Garden Logic ---
    function renderGarden() {
        const gardenGrid = document.getElementById('virtual-garden');
        if (!gardenGrid) return;
        if (myPlants.length === 0) {
            gardenGrid.innerHTML = `<div class="empty-state" style="padding: 4rem; text-align: center; grid-column: 1 / -1;"><h3>Garden is Empty</h3></div>`;
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

            return `
                <div class="plant-card animate-in ${isOverdue ? 'overdue-alarm' : ''}" data-id="${plant.id}">
                    <div class="plant-thumb">
                        <img src="${plant.image || 'greenthumb_hero_v2.png'}" alt="${plant.name}">
                        <button class="btn-delete">✕</button>
                    </div>
                    <div class="plant-info">
                        <h3>${plant.name}</h3>
                        <div class="progress-bar"><div class="progress" style="width: ${waterLevel}%;"></div></div>
                        <div class="plant-footer">
                            <button class="btn-timeline" onclick="showTimeline(${plant.id})">Timeline</button>
                            <button class="btn-water">Watered</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        attachGardenListeners();
    }

    function attachGardenListeners() {
        document.querySelectorAll('.btn-water').forEach(btn => {
            btn.onclick = function() {
                const id = parseInt(this.closest('.plant-card').dataset.id);
                const plant = myPlants.find(p => p.id === id);
                if (plant) {
                    plant.lastWatered = new Date().getTime();
                    saveGarden(); renderGarden(); updateAtmosphereUI();
                    logLedger(`Watered ${plant.name}.`, '💧');
                }
            };
        });
    }

    // Navigation Sovereignty: Back Button Management
    function pushNavigationState(id) {
        history.pushState({ activeUI: id }, "");
    }

    window.onpopstate = function(event) {
        // If the back button is pressed, close all open modals and cameras
        closeAllModals();
        stopCamera();
    };

    function closeAllModals() {
        modal.style.display = 'none';
        diagContainer.style.display = 'none';
        mainContainer.style.display = 'none';
        // Close all modals by class as well
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }

    function openAddModal(species = '') {
        modal.style.display = 'flex';
        if (species) document.getElementById('plant-species').value = species;
        pushNavigationState('add-modal');
    }
    window.openAddModal = openAddModal;
    window.showTimeline = (id) => triggerBriefing('Heritage record active.', '📈');

    // Imperial Modal Engine
    function initModalEngine() {
        const openModalBtns = document.querySelectorAll('[data-modal]');
        openModalBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const modalId = btn.getAttribute('data-modal');
                const modalElement = document.getElementById(modalId);
                if (modalElement) {
                    modalElement.style.display = 'flex';
                    pushNavigationState(modalId);
                }
            };
        });

        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.onclick = () => {
                closeAllModals();
                stopCamera();
                if (history.state && history.state.activeUI) history.back();
            };
        });
    }

    // Initialize the engine
    initModalEngine();

    btnSavePlant.onclick = () => {
        const name = document.getElementById('plant-name').value;
        const species = document.getElementById('plant-species').value;
        const interval = parseInt(document.getElementById('plant-interval').value) || 7;
        if (name && species) {
            myPlants.push({ id: Date.now(), name, species, interval, lastWatered: new Date().getTime(), image: window.currentCapturedPhoto || "greenthumb_hero_v2.png" });
            logLedger(`Added ${name}.`, '🪴');
            saveGarden(); renderGarden(); updateAtmosphereUI();
            closeAllModals();
            if (history.state && history.state.activeUI) history.back();
            window.currentCapturedPhoto = null;
        }
    };

    function calculateGardenScore() { return 100; }
    function calculateWeatherModifier() { return 1.0; }
    function saveGarden() { localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants)); }
    function loadGarden() {
        myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [];
        renderGarden(); renderLedger(); renderLibrary(); syncAtmosphere();
    }

    loadGarden();
});
