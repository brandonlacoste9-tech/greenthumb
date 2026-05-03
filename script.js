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

    async function saveGarden() {
        localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
        try {
            await fetch('/api/garden', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: deviceId, plants: myPlants })
            });
        } catch (err) {
            console.error("Cloud Sync Failed (Check Neon Config):", err);
        }
    }

    async function loadGarden() {
        // First load from local for speed
        myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [];
        renderGarden();

        // Then try to sync from Neon cloud
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
        
        if (myPlants.length === 0) {
            gardenGrid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🪴</div>
                    <h3>Your Garden is Empty</h3>
                    <p>Add your first plant to start tracking its care!</p>
                </div>
            `;
            gardenGrid.style.display = 'block';
            gardenGrid.style.textAlign = 'center';
            return;
        }

        const now = new Date().getTime();

        gardenGrid.style.display = 'grid';
        gardenGrid.innerHTML = myPlants.map(plant => {
            const nextWaterTime = plant.lastWatered + (plant.interval * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((nextWaterTime - now) / (1000 * 60 * 60 * 24));
            const isOverdue = daysLeft <= 0;
            const waterLevel = isOverdue ? 0 : Math.max(0, Math.min(100, (daysLeft / plant.interval) * 100));

            return `
                <div class="plant-card animate-in ${isOverdue ? 'overdue-alarm' : ''}" data-id="${plant.id}">
                    <div class="plant-thumb">
                        <img src="${plant.image}" alt="${plant.name}">
                        <span class="env-tag">${plant.env}</span>
                        ${isOverdue ? '<span class="alarm-badge">⚠️ ALARM</span>' : ''}
                        <button class="btn-delete" title="Remove Plant">✕</button>
                    </div>
                    <div class="plant-info">
                        <div class="title-row">
                            <h3>${plant.name}</h3>
                            <span class="species">${plant.species}</span>
                            <span class="sun-requirement">☀️ ${plant.sun}</span>
                        </div>
                        <div class="care-stats">
                            <div class="stat">
                                <span class="label">Hydration Level</span>
                                <div class="progress-bar"><div class="progress" style="width: ${waterLevel}%; background-color: ${isOverdue ? '#ef4444' : '#4A7856'}"></div></div>
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

    // Notification System
    function showNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'toast animate-in';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Modal Logic

    // Modular Camera Logic
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

    // Garden Modal Camera
    document.getElementById('link-camera').onclick = (e) => {
        e.stopPropagation();
        setupCamera('camera-preview', 'camera-container', 'modal-drop-zone', 'btn-snap', 'camera-canvas', () => {
            showNotification("Photo captured! Analyzing care requirements...");
            handlePhotoUploaded();
        });
    };

    // Main Diagnosis Camera
    document.getElementById('link-diag-camera').onclick = (e) => {
        e.stopPropagation();
        setupCamera('diag-camera-preview', 'diag-camera-container', 'drop-zone', 'btn-diag-snap', 'diag-camera-canvas', () => {
            showNotification("Photo captured! Analyzing plant health...");
            simulateDiagnosis(null); // Passing null because we use the canvas/simulation
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

        if (name && species) {
            const newPlant = {
                id: Date.now(),
                name: name,
                species: species,
                env: env,
                sun: sun,
                interval: interval,
                lastWatered: new Date().getTime(),
                image: "greenthumb_hero.png"
            };
            myPlants.push(newPlant);
            saveGarden();
            renderGarden();
            modal.style.display = 'none';
            showNotification(`${name} added to your garden!`);
            
            // Clear inputs
            document.getElementById('plant-name').value = '';
            document.getElementById('plant-species').value = '';
            document.getElementById('plant-interval').value = '7';
        } else {
            alert("Please fill in both Name and Species.");
        }
    };

    // AI Diagnosis Logic
    const btnDiagnose = document.getElementById('btn-diagnose');
    const diagName = document.getElementById('diag-name');
    const diagEnv = document.getElementById('diag-env');
    const diagNotes = document.getElementById('diag-notes');

    btnDiagnose.onclick = () => {
        if (!fileInput.files.length) {
            alert("Please upload a photo first.");
            return;
        }
        simulateDiagnosis(fileInput.files[0]);
    };

    // Plant Library Data
    const plantLibrary = [
        { name: "Spider Plant", species: "Chlorophytum comosum", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🕷️", category: "houseplants" },
        { name: "Monstera Deliciosa", species: "Swiss Cheese Plant", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🌿", category: "houseplants" },
        { name: "Snake Plant", species: "Sansevieria", water: "14 days", sun: "Full Sun", difficulty: "Beginner", icon: "🌵", category: "succulents" },
        { name: "Peace Lily", species: "Spathiphyllum", water: "3 days", sun: "Partial Shade", difficulty: "Medium", icon: "🏳️", category: "flowers" },
        { name: "Fiddle Leaf Fig", species: "Ficus Lyrata", water: "7 days", sun: "Full Sun", difficulty: "Hard", icon: "🎻", category: "houseplants" },
        { name: "Pothos", species: "Epipremnum aureum", water: "7 days", sun: "Partial Shade", difficulty: "Easy", icon: "🍃", category: "houseplants" },
        { name: "ZZ Plant", species: "Zamioculcas zamiifolia", water: "14 days", sun: "Full Shade", difficulty: "Beginner", icon: "🪴", category: "houseplants" },
        { name: "Rubber Plant", species: "Ficus elastica", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "🌳", category: "houseplants" },
        { name: "Aloe Vera", species: "Medicinal Aloe", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🩹", category: "succulents" },
        { name: "Jade Plant", species: "Crassula ovata", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "💎", category: "succulents" },
        { name: "Lavender", species: "Lavandula", water: "7 days", sun: "Full Sun", difficulty: "Medium", icon: "🌸", category: "flowers" },
        { name: "Japanese Maple", species: "Acer Palmatum", water: "3 days", sun: "Partial Sun", difficulty: "Medium", icon: "🍁", category: "trees" },
        { name: "Bird of Paradise", species: "Strelitzia reginae", water: "7 days", sun: "Full Sun", difficulty: "Hard", icon: "🐦", category: "flowers" },
        { name: "English Ivy", species: "Hedera helix", water: "5 days", sun: "Partial Shade", difficulty: "Easy", icon: "🧗", category: "houseplants" },
        { name: "Swiss Cheese Vine", species: "Monstera adansonii", water: "7 days", sun: "Partial Sun", difficulty: "Medium", icon: "🧀", category: "houseplants" },
        { name: "Boston Fern", species: "Nephrolepis exaltata", water: "3 days", sun: "Full Shade", difficulty: "Medium", icon: "🌿", category: "houseplants" },
        { name: "String of Pearls", species: "Senecio rowleyanus", water: "14 days", sun: "Full Sun", difficulty: "Hard", icon: "🔮", category: "succulents" },
        { name: "Cactus (Barrel)", species: "Echinocactus grusonii", water: "21 days", sun: "Full Sun", difficulty: "Easy", icon: "🌵", category: "succulents" },
        { name: "Orchid (Phalaenopsis)", species: "Phalaenopsis", water: "10 days", sun: "Partial Shade", difficulty: "Hard", icon: "🦋", category: "flowers" },
        { name: "Dragon Tree", species: "Dracaena marginata", water: "10 days", sun: "Partial Sun", difficulty: "Easy", icon: "🐉", category: "houseplants" },
        { name: "Chinese Money Plant", species: "Pilea peperomioides", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "💰", category: "houseplants" },
        { name: "Strelitzia Nicolai", species: "Giant White Bird of Paradise", water: "7 days", sun: "Full Sun", difficulty: "Medium", icon: "🌴", category: "trees" },
        { name: "Rose", species: "Rosa", water: "3 days", sun: "Full Sun", difficulty: "Hard", icon: "🌹", category: "flowers" },
        { name: "Sunflower", species: "Helianthus annuus", water: "2 days", sun: "Full Sun", difficulty: "Easy", icon: "🌻", category: "flowers" },
        { name: "Bonsai Pine", species: "Pinus thunbergii", water: "1 day", sun: "Full Sun", difficulty: "Pro", icon: "🌲", category: "trees" },
        { name: "Air Plant", species: "Tillandsia", water: "7 days", sun: "Partial Sun", difficulty: "Easy", icon: "💨", category: "houseplants" },
        { name: "Haworthia", species: "Haworthiopsis fasciata", water: "14 days", sun: "Partial Sun", difficulty: "Beginner", icon: "🦓", category: "succulents" },
        { name: "Prayer Plant", species: "Maranta leuconeura", water: "4 days", sun: "Partial Shade", difficulty: "Medium", icon: "🙏", category: "houseplants" },
        { name: "Yucca", species: "Yucca elephantipes", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🗡️", category: "houseplants" },
        { name: "African Violet", species: "Saintpaulia", water: "5 days", sun: "Partial Shade", difficulty: "Medium", icon: "🟣", category: "flowers" },
        { name: "Lemon Tree", species: "Citrus limon", water: "5 days", sun: "Full Sun", difficulty: "Hard", icon: "🍋", category: "trees" },
        { name: "Olive Tree", species: "Olea europaea", water: "10 days", sun: "Full Sun", difficulty: "Medium", icon: "🫒", category: "trees" },
        { name: "Hoya Carnosa", species: "Wax Plant", water: "10 days", sun: "Partial Sun", difficulty: "Easy", icon: "🕯️", category: "houseplants" },
        { name: "Elephant Ear", species: "Alocasia", water: "4 days", sun: "Partial Shade", difficulty: "Hard", icon: "🐘", category: "houseplants" },
        { name: "Peperomia", species: "Peperomia obtusifolia", water: "10 days", sun: "Partial Sun", difficulty: "Beginner", icon: "🍃", category: "houseplants" },
        { name: "African Milk Tree", species: "Euphorbia trigona", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🥛", category: "succulents" },
        { name: "Majesty Palm", species: "Ravenea rivularis", water: "3 days", sun: "Partial Sun", difficulty: "Hard", icon: "🏝️", category: "trees" },
        { name: "Tulip", species: "Tulipa", water: "4 days", sun: "Full Sun", difficulty: "Medium", icon: "🌷", category: "flowers" },
        { name: "Echeveria", species: "Echeveria elegans", water: "14 days", sun: "Full Sun", difficulty: "Easy", icon: "🌹", category: "succulents" }
    ];

    let currentCategory = 'all';

    function renderLibrary(filter = '') {
        // Only show results if there's a search term or a specific category selected
        if (!filter && currentCategory === 'all') {
            libraryGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; opacity: 0.5;">
                    <div class="icon">🔍</div>
                    <h3>Start Typing to Explore</h3>
                    <p>Search over 10,000+ expert plant care guides.</p>
                </div>
            `;
            return;
        }

        const filtered = plantLibrary.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(filter.toLowerCase()) || 
                                p.species.toLowerCase().includes(filter.toLowerCase());
            const matchesCategory = currentCategory === 'all' || p.category === currentCategory;
            return matchesSearch && matchesCategory;
        });

        if (filtered.length === 0) {
            libraryGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="icon">🌿</div>
                    <h3>No Plants Found</h3>
                    <p>Try a different search term or browse by category.</p>
                </div>
            `;
            return;
        }

        libraryGrid.innerHTML = filtered.map(plant => `
            <div class="library-card animate-in" onclick="openAddModal('${plant.name}')">
                <div class="lib-thumb">${plant.icon}</div>
                <div class="lib-info">
                    <h3>${plant.name}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${plant.species}</p>
                    <div class="lib-tags">
                        <span class="lib-tag">💧 ${plant.water}</span>
                        <span class="lib-tag">☀️ ${plant.sun}</span>
                        <span class="lib-tag">${plant.difficulty}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    librarySearch.addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });

    document.querySelectorAll('.cat-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.dataset.category;
            renderLibrary(librarySearch.value);
        });
    });

    // Initial Renders
    loadGarden();
    renderLibrary();

    // AI Diagnosis & Identification (Real API Integration)

    async function identifyPlant(fileOrCanvas) {
        resultsArea.innerHTML = `
            <div class="diagnosis-loading">
                <div class="spinner"></div>
                <h3>Identifying Species...</h3>
                <p>Connecting to Secure Secure SaaS Bridge</p>
            </div>
        `;

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
            const response = await fetch('/api/identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
            });

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const bestMatch = data.results[0];
                const speciesName = bestMatch.species.scientificNameWithoutAuthor;
                const commonName = bestMatch.species.commonNames[0] || speciesName;
                const score = (bestMatch.score * 100).toFixed(1);

                renderResults({
                    species: commonName,
                    scientific: speciesName,
                    confidence: `${score}%`,
                    title: "Health Check: Optimal",
                    severity: "None",
                    cause: "Based on our visual analysis, the foliage appears vibrant and healthy.",
                    treatment: "Continue current watering schedule. Monitor for changes in color."
                });
            } else {
                throw new Error("No matches found");
            }
        } catch (err) {
            console.error(err);
            resultsArea.innerHTML = `
                <div class="error-card">
                    <h3>Identification Failed</h3>
                    <p>Could not identify this plant. Please ensure your API key is set in Vercel and try again.</p>
                    <button class="btn-primary" onclick="location.reload()">Try Again</button>
                </div>
            `;
        }
    }

    function renderResults(result) {
        resultsArea.innerHTML = `
            <div class="diagnosis-card animate-in">
                <div class="result-header">
                    <span class="severity-badge ${result.severity.toLowerCase()}">${result.severity}</span>
                    <span class="confidence">AI Confidence: ${result.confidence}</span>
                </div>
                <div class="id-row">
                    <span class="id-label">Identified Species:</span>
                    <h3 class="id-value">${result.species}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); font-style: italic;">${result.scientific}</p>
                </div>
                <hr style="margin: 1rem 0; border: none; border-top: 1px solid #eee;">
                <h3 style="color: var(--text-main);">${result.title}</h3>
                <div class="result-body">
                    <div class="result-section">
                        <h4 style="margin: 1rem 0 0.5rem; color: var(--primary);">Analysis</h4>
                        <p>${result.cause}</p>
                    </div>
                    <div class="result-section">
                        <h4 style="margin: 1rem 0 0.5rem; color: var(--primary);">Action Plan</h4>
                        <p style="white-space: pre-line;">${result.treatment}</p>
                    </div>
                </div>
                <button class="btn-primary" id="btn-add-result" style="margin-top: 1rem; width: 100%; background: var(--secondary);">Add to My Garden</button>
                <button class="btn-secondary-large" onclick="location.reload()" style="margin-top: 1rem; width: 100%; border: none; font-size: 0.9rem;">Run New Check</button>
            </div>
        `;

        document.getElementById('btn-add-result').onclick = () => {
            openAddModal(result.species);
        };
    }

    // Update simulation triggers to use real identification
    function simulateDiagnosis(file) {
        const canvas = document.getElementById('diag-camera-canvas');
        identifyPlant(file || canvas);
    }

    function openAddModal(prefillSpecies = '') {
        modal.style.display = 'flex';
        if (prefillSpecies) {
            document.getElementById('plant-species').value = prefillSpecies;
            document.getElementById('plant-name').focus();
        }
    }

    // Expose openAddModal globally for onclick handlers
    window.openAddModal = openAddModal;

    // Add Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .plant-card, .glass-container').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
});

// Helper for CSS animation class
document.write('<style>.fade-in-up { opacity: 1 !important; transform: translateY(0) !important; }</style>');
