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
    let myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [
        {
            id: 1,
            name: "Monstera Deliciosa",
            image: "greenthumb_hero.png",
            waterLevel: 75,
            light: "Partial Sun",
            nextWater: "2 days"
        },
        {
            id: 2,
            name: "Fiddle Leaf Fig",
            image: "fiddle_leaf_fig.png",
            waterLevel: 30,
            light: "Bright Indirect",
            nextWater: "Needs Water!"
        }
    ];

    function saveGarden() {
        localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
    }

    function renderGarden() {
        const gardenGrid = document.getElementById('virtual-garden');
        gardenGrid.innerHTML = myPlants.map(plant => `
            <div class="plant-card animate-in" data-id="${plant.id}">
                <div class="plant-thumb">
                    <img src="${plant.image}" alt="${plant.name}">
                </div>
                <div class="plant-info">
                    <h3>${plant.name}</h3>
                    <div class="care-stats">
                        <div class="stat">
                            <span class="label">Water</span>
                            <div class="progress-bar"><div class="progress" style="width: ${plant.waterLevel}%; background-color: ${plant.waterLevel < 40 ? '#ef4444' : '#4A7856'}"></div></div>
                        </div>
                        <div class="stat">
                            <span class="label">Light</span>
                            <span class="value">${plant.light}</span>
                        </div>
                    </div>
                    <div class="plant-footer">
                        <span class="remind-tag">${plant.nextWater}</span>
                        <button class="btn-water" ${plant.waterLevel === 100 ? 'disabled' : ''}>
                            ${plant.waterLevel === 100 ? 'Watered!' : 'Water Now'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Re-attach listeners
        attachGardenListeners();
    }

    function attachGardenListeners() {
        document.querySelectorAll('.btn-water').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.closest('.plant-card').dataset.id);
                const plant = myPlants.find(p => p.id === id);
                if (plant) {
                    plant.waterLevel = 100;
                    plant.nextWater = "Next Water: 7 days";
                    saveGarden();
                    renderGarden();
                    showNotification(`Success! ${plant.name} has been watered.`);
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

    // Add Plant Functionality
    const btnAdd = document.querySelector('.btn-add');
    btnAdd.addEventListener('click', () => {
        const name = prompt("Enter plant name:");
        if (name) {
            const newPlant = {
                id: Date.now(),
                name: name,
                image: "greenthumb_hero.png", // Default image
                waterLevel: 50,
                light: "Full Sun",
                nextWater: "4 days"
            };
            myPlants.push(newPlant);
            saveGarden();
            renderGarden();
            showNotification(`${name} added to your garden!`);
        }
    });

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
            const issues = [
                {
                    title: "Leaf Spot Disease",
                    severity: "Moderate",
                    confidence: "94%",
                    cause: "Fungal infection (Cercospora) likely from high humidity or overwatering.",
                    treatment: "1. Prune affected leaves.\n2. Apply organic fungicide.\n3. Water only at the base."
                },
                {
                    title: "Spider Mites",
                    severity: "High",
                    confidence: "88%",
                    cause: "Infestation of Tetranychidae, common in dry indoor environments.",
                    treatment: "1. Isolate the plant.\n2. Wipe leaves with Neem Oil.\n3. Increase local humidity."
                },
                {
                    title: "Optimal Health",
                    severity: "None",
                    confidence: "99%",
                    cause: "No issues detected. Your care routine is perfect.",
                    treatment: "Maintain current light and water cycles. Fertilize every 2 weeks during growing season."
                }
            ];

            const result = issues[Math.floor(Math.random() * issues.length)];
            
            resultsArea.innerHTML = `
                <div class="diagnosis-card animate-in">
                    <div class="result-header">
                        <span class="severity-badge ${result.severity.toLowerCase()}">${result.severity}</span>
                        <span class="confidence">Confidence: ${result.confidence}</span>
                    </div>
                    <h3>${result.title}</h3>
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
                    <button class="btn-primary" onclick="location.reload()" style="margin-top: 1.5rem; width: 100%;">Run New Check</button>
                </div>
            `;
        }, 2500);
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
