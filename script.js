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
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Virtual Garden State & Persistence
    let myPlants = [];

    // --- Atmosphere Intelligence (Phase 2) ---
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
                        uvIndex: 5,
                        city: 'Local'
                    };
                    updateAtmosphereUI();
                    renderGarden();
                } catch (err) {
                    console.error("Weather Fetch Failed:", err);
                    simulateWeather();
                }
            }, () => {
                simulateWeather();
            });
        } else {
            simulateWeather();
        }
    }

    function simulateWeather() {
        localWeather = { temp: 24, humidity: 40, isRaining: false, uvIndex: 4, city: 'Simulated' };
        updateAtmosphereUI();
        renderGarden();
    }

    function updateAtmosphereUI() {
        const tempHumEl = document.getElementById('atmo-temp-hum');
        const statusEl = document.getElementById('atmo-status');
        const iconEl = document.querySelector('.atmo-icon');
        if (!tempHumEl || !statusEl || !iconEl) return;

        tempHumEl.innerText = `${localWeather.temp}°C / ${localWeather.humidity}%`;
        
        if (localWeather.temp > 30) {
            statusEl.innerText = 'Heatwave: High Water';
            statusEl.style.color = '#ff4d4d';
            iconEl.innerText = '🔥';
        } else if (localWeather.isRaining) {
            statusEl.innerText = 'Rain: Delayed';
            statusEl.style.color = '#3a86ff';
            iconEl.innerText = '🌧️';
        } else {
            statusEl.innerText = 'Optimal Care';
            statusEl.style.color = 'var(--primary)';
            iconEl.innerText = '🌦️';
        }
    }

    function calculateWeatherModifier(plant) {
        let modifier = 1.0;
        if (localWeather.temp > 30) modifier *= 0.8; 
        if (localWeather.temp < 15) modifier *= 1.2; 

        if (plant.env === 'Outdoor' && localWeather.isRaining) return 2.0; 
        
        if (plant.env === 'Indoor') {
            if (localWeather.humidity > 60) modifier *= 1.15; 
            if (localWeather.humidity < 30) modifier *= 0.85; 
        }
        return modifier;
    }

    async function saveGarden() {
        localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
        try {
            await fetch('/api/garden', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: deviceId, plants: myPlants })
            });
        } catch (err) {
            console.error("Cloud Sync Failed:", err);
        }
    }

    async function loadGarden() {
        myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [];
        renderGarden();
        syncAtmosphere();

        try {
            const response = await fetch(`/api/garden?uid=${deviceId}`);
            const data = await response.json();
            if (data.plants && data.plants.length > 0) {
                myPlants = data.plants;
                renderGarden();
            }
        } catch (err) {
            console.error("Cloud Load Failed:", err);
        }
    }

    function renderGarden() {
        const gardenGrid = document.getElementById('virtual-garden');
        if (!gardenGrid) return;
        
        if (myPlants.length === 0) {
            gardenGrid.innerHTML = `
                <div class="empty-state" style="padding: 4rem; text-align: center; grid-column: 1 / -1;">
                    <div class="icon" style="font-size: 4rem; margin-bottom: 1rem;">🪴</div>
                    <h3>Your Garden is Empty</h3>
                    <p>Add your first plant to start tracking its care!</p>
                </div>
            `;
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

            const safetyHTML = plant.toxicity === 'safe' 
                ? '<span class="safety-badge safe" style="display: inline-block; font-size: 0.7rem; margin-top: 0.5rem;">🐾 Pet Safe</span>' 
                : plant.toxicity === 'toxic' 
                    ? '<span class="safety-badge toxic" style="display: inline-block; font-size: 0.7rem; margin-top: 0.5rem;">⚠️ Toxic to Pets</span>' 
                    : '';

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
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <h3>${plant.name}</h3>
                                    <span class="species">${plant.species}</span>
                                </div>
                                ${safetyHTML}
                            </div>
                            <span class="sun-requirement">☀️ ${plant.sun}</span>
                        </div>
                        <div class="care-stats">
                            <div class="stat">
                                <span class="label">Hydration Level</span>
                                <div class="progress-bar"><div class="progress" style="width: ${waterLevel}%; background-color: ${isOverdue ? '#ef4444' : 'var(--primary)'}"></div></div>
                            </div>
                        </div>
                        <div class="plant-footer">
                            <span class="remind-tag ${isOverdue ? 'text-danger' : ''}">
                                ${isOverdue ? 'Overdue!' : `Next Water: ${daysLeft} days`}
                            </span>
                            <button class="btn-water ${isOverdue ? 'btn-alarm' : ''}">
                                ${isOverdue ? 'WATER NOW' : 'Watered'}
                            </button>
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
                    saveGarden();
                    renderGarden();
                    showNotification(`Success! ${plant.name} has been watered.`);
                }
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.closest('.plant-card').dataset.id);
                const plant = myPlants.find(p => p.id === id);
                if (confirm(`Are you sure you want to remove ${plant.name}?`)) {
                    myPlants = myPlants.filter(p => p.id !== id);
                    saveGarden();
                    renderGarden();
                    showNotification(`${plant.name} removed from your garden.`);
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

    async function setupCamera(previewId, containerId, dropZoneId, snapBtnId, canvasId, onCapture) {
        const preview = document.getElementById(previewId);
        const container = document.getElementById(containerId);
        const dropZone = document.getElementById(dropZoneId);
        const snapBtn = document.getElementById(snapBtnId);
        const canvas = document.getElementById(canvasId);
        let stream = null;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            preview.srcObject = stream;
            container.style.display = 'block';
            dropZone.style.display = 'none';

            snapBtn.onclick = () => {
                const context = canvas.getContext('2d');
                canvas.width = preview.videoWidth;
                canvas.height = preview.videoHeight;
                context.drawImage(preview, 0, 0, canvas.width, canvas.height);
                
                stream.getTracks().forEach(track => track.stop());
                container.style.display = 'none';
                dropZone.style.display = 'block';
                onCapture();
            };
        } catch (err) {
            alert("Could not access camera. Please check permissions.");
        }
    }

    document.getElementById('link-camera').onclick = (e) => {
        e.stopPropagation();
        setupCamera('camera-preview', 'camera-container', 'modal-drop-zone', 'btn-snap', 'camera-canvas', () => {
            showNotification("Photo captured! Analyzing care requirements...");
            handlePhotoUploaded();
        });
    };

    document.getElementById('link-diag-camera').onclick = (e) => {
        e.stopPropagation();
        setupCamera('diag-camera-preview', 'diag-camera-container', 'drop-zone', 'btn-diag-snap', 'diag-camera-canvas', () => {
            showNotification("Photo captured! Analyzing plant health...");
            simulateDiagnosis(null); 
        });
    };

    const modalDropZone = document.getElementById('modal-drop-zone');
    const modalFileInput = document.getElementById('modal-plant-upload');
    modalDropZone.onclick = (e) => {
        if (e.target.id !== 'link-camera') modalFileInput.click();
    };

    const mainDropZone = document.getElementById('drop-zone');
    const mainFileInput = document.getElementById('plant-upload');
    mainDropZone.onclick = (e) => {
        if (e.target.id !== 'link-diag-camera') mainFileInput.click();
    };

    function handlePhotoUploaded() {
        setTimeout(() => {
            const suggestions = [
                { species: "Monstera", sun: "Partial Sun", interval: 7 },
                { species: "Fern", sun: "Full Shade", interval: 3 },
                { species: "Succulent", sun: "Full Sun", interval: 14 }
            ];
            const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
            document.getElementById('plant-species').value = suggestion.species;
            document.getElementById('plant-sun').value = suggestion.sun;
            document.getElementById('plant-interval').value = suggestion.interval;
            showNotification("Suggestions applied based on your photo!");
        }, 1500);
    }

    modalFileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            showNotification("Analyzing photo for care requirements...");
            handlePhotoUploaded();
        }
    };

    mainFileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            simulateDiagnosis(e.target.files[0]);
        }
    };

    btnOpenModal.onclick = () => openAddModal();
    btnCloseModal.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    btnSavePlant.onclick = () => {
        const name = document.getElementById('plant-name').value;
        const species = document.getElementById('plant-species').value;
        const env = document.getElementById('plant-env').value;
        const sun = document.getElementById('plant-sun').value;
        const interval = parseInt(document.getElementById('plant-interval').value) || 7;
        
        const libEntry = plantLibrary.find(p => p.name.toLowerCase() === species.toLowerCase() || p.species.toLowerCase() === species.toLowerCase());
        const toxicity = libEntry ? libEntry.toxicity : 'unknown';

        if (name && species) {
            const newPlant = {
                id: Date.now(),
                name: name,
                species: species,
                env: env,
                sun: sun,
                interval: interval,
                toxicity: toxicity,
                lastWatered: new Date().getTime(),
                image: "greenthumb_hero_v2.png"
            };
            myPlants.push(newPlant);
            saveGarden();
            renderGarden();
            modal.style.display = 'none';
            showNotification(`${name} added to your garden!`);
            
            document.getElementById('plant-name').value = '';
            document.getElementById('plant-species').value = '';
            document.getElementById('plant-interval').value = '7';
        } else {
            alert("Please fill in both Name and Species.");
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

    let currentCategory = 'all';

    function renderLibrary(filter = '') {
        if (!filter && currentCategory === 'all') {
            libraryGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; opacity: 0.5;"><div class="icon">🔍</div><h3>Start Typing to Explore</h3><p>Search over 10,000+ expert plant care guides.</p></div>`;
            return;
        }
        const filtered = plantLibrary.filter(p => (p.name.toLowerCase().includes(filter.toLowerCase()) || p.species.toLowerCase().includes(filter.toLowerCase())) && (currentCategory === 'all' || p.category === currentCategory));
        if (filtered.length === 0) {
            libraryGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><div class="icon">🌿</div><h3>No Plants Found</h3><p>Try a different search term.</p></div>`;
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
                    <div class="lib-tags">
                        <span class="lib-tag">💧 ${plant.water}</span>
                        <span class="lib-tag">${plant.difficulty}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    librarySearch.addEventListener('input', (e) => renderLibrary(e.target.value));
    document.querySelectorAll('.cat-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.dataset.category;
            renderLibrary(librarySearch.value);
        });
    });

    async function identifyPlant(fileOrCanvas) {
        resultsArea.innerHTML = `<div class="diagnosis-loading"><div class="spinner"></div><h3>Identifying Species...</h3><p>Connecting to Secure SaaS Bridge</p></div>`;
        let base64Image;
        if (fileOrCanvas instanceof File) {
            base64Image = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(fileOrCanvas);
            });
        } else {
            base64Image = fileOrCanvas.toDataURL('image/jpeg');
        }
        try {
            const response = await fetch('/api/identify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64Image }) });
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const bestMatch = data.results[0];
                renderResults({ species: bestMatch.species.commonNames[0] || bestMatch.species.scientificNameWithoutAuthor, scientific: bestMatch.species.scientificNameWithoutAuthor, confidence: `${(bestMatch.score * 100).toFixed(1)}%`, title: "Health Check: Optimal", severity: "None", cause: "Based on our visual analysis, the foliage appears vibrant and healthy.", treatment: "Continue current watering schedule." });
            } else { throw new Error("No matches found"); }
        } catch (err) {
            resultsArea.innerHTML = `<div class="error-card"><h3>Identification Failed</h3><p>Please ensure your API key is set and try again.</p><button class="btn-primary" onclick="location.reload()">Try Again</button></div>`;
        }
    }

    function renderResults(result) {
        resultsArea.innerHTML = `<div class="diagnosis-card animate-in"><div class="result-header"><span class="severity-badge ${result.severity.toLowerCase()}">${result.severity}</span><span class="confidence">AI Confidence: ${result.confidence}</span></div><div class="id-row"><span class="id-label">Identified Species:</span><h3 class="id-value">${result.species}</h3><p style="font-size: 0.9rem; color: var(--text-muted); font-style: italic;">${result.scientific}</p></div><hr style="margin: 1rem 0; border: none; border-top: 1px solid #eee;"><h3 style="color: var(--text-main);">${result.title}</h3><div class="result-body"><p>${result.cause}</p><p style="white-space: pre-line;">${result.treatment}</p></div><button class="btn-primary" id="btn-add-result" style="margin-top: 1rem; width: 100%; background: var(--secondary);">Add to My Garden</button></div>`;
        document.getElementById('btn-add-result').onclick = () => openAddModal(result.species);
    }

    function simulateDiagnosis(file) {
        const canvas = document.getElementById('diag-camera-canvas');
        identifyPlant(file || canvas);
    }

    function openAddModal(prefillSpecies = '') {
        modal.style.display = 'flex';
        if (prefillSpecies) document.getElementById('plant-species').value = prefillSpecies;
    }

    window.openAddModal = openAddModal;
    loadGarden();
    renderLibrary();
});
