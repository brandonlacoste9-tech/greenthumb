document.addEventListener('DOMContentLoaded', () => {
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
    let myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [];

    function saveGarden() {
        localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
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
    const modal = document.getElementById('add-plant-modal');
    const btnOpenModal = document.getElementById('open-add-modal');
    const btnCloseModal = document.querySelector('.close-modal');
    const btnSavePlant = document.getElementById('save-plant');

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

    // Initial Render
    renderGarden();

    // AI Diagnosis Simulation
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('plant-upload');
    const resultsArea = document.getElementById('diagnosis-results');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            simulateDiagnosis(e.target.files[0]);
        }
    });

    function simulateDiagnosis(file) {
        resultsArea.innerHTML = `
            <div class="diagnosis-loading">
                <div class="spinner"></div>
                <h3>Analyzing plant health...</h3>
                <p>Consulting our AI botanical database</p>
            </div>
        `;

        setTimeout(() => {
            const results = [
                {
                    species: "Monstera Deliciosa",
                    title: "Leaf Spot Disease",
                    severity: "Moderate",
                    confidence: "94%",
                    cause: "Fungal infection (Cercospora) likely from high humidity or overwatering.",
                    treatment: "1. Prune affected leaves.\n2. Apply organic fungicide.\n3. Water only at the base."
                },
                {
                    species: "Fiddle Leaf Fig",
                    title: "Spider Mites",
                    severity: "High",
                    confidence: "88%",
                    cause: "Infestation of Tetranychidae, common in dry indoor environments.",
                    treatment: "1. Isolate the plant.\n2. Wipe leaves with Neem Oil.\n3. Increase local humidity."
                },
                {
                    species: "Snake Plant",
                    title: "Optimal Health",
                    severity: "None",
                    confidence: "99%",
                    cause: "No issues detected. Your care routine is perfect.",
                    treatment: "Maintain current light and water cycles. Fertilize every 2 weeks during growing season."
                }
            ];

            const result = results[Math.floor(Math.random() * results.length)];
            
            resultsArea.innerHTML = `
                <div class="diagnosis-card animate-in">
                    <div class="result-header">
                        <span class="severity-badge ${result.severity.toLowerCase()}">${result.severity}</span>
                        <span class="confidence">Confidence: ${result.confidence}</span>
                    </div>
                    <div class="id-row">
                        <span class="id-label">Identified Species:</span>
                        <h3 class="id-value">${result.species}</h3>
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
        }, 2500);
    }

    function openAddModal(prefillSpecies = '') {
        modal.style.display = 'flex';
        if (prefillSpecies) {
            document.getElementById('plant-species').value = prefillSpecies;
            document.getElementById('plant-name').focus();
        }
    }

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
