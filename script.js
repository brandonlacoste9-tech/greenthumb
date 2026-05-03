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
        // Show loading state
        resultsArea.innerHTML = `
            <div class="diagnosis-loading">
                <div class="spinner"></div>
                <h3>Analyzing plant health...</h3>
                <p>Consulting our AI botanical database</p>
            </div>
        `;

        // Simulate network delay
        setTimeout(() => {
            const issues = [
                {
                    title: "Leaf Spot Disease",
                    severity: "Moderate",
                    cause: "Fungal infection from overwatering",
                    treatment: "Prune affected leaves, reduce watering frequency, and improve air circulation."
                },
                {
                    title: "Spider Mites",
                    severity: "High",
                    cause: "Dry, warm environment",
                    treatment: "Mist the plant regularly, wipe leaves with neem oil solution, and isolate from other plants."
                },
                {
                    title: "Perfectly Healthy",
                    severity: "None",
                    cause: "Excellent care",
                    treatment: "Keep doing what you're doing! Ensure consistent light levels."
                }
            ];

            const result = issues[Math.floor(Math.random() * issues.length)];
            
            resultsArea.innerHTML = `
                <div class="diagnosis-card animate-in">
                    <div class="result-header">
                        <span class="severity-badge ${result.severity.toLowerCase()}">${result.severity}</span>
                        <h3>${result.title}</h3>
                    </div>
                    <div class="result-body">
                        <p><strong>Cause:</strong> ${result.cause}</p>
                        <p><strong>Treatment Plan:</strong></p>
                        <p>${result.treatment}</p>
                    </div>
                    <button class="btn-primary" onclick="location.reload()">New Diagnosis</button>
                </div>
            `;
        }, 2500);
    }

    // Dashboard Interaction
    const waterButtons = document.querySelectorAll('.btn-water');
    waterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.plant-card');
            const progressBar = card.querySelector('.progress');
            const remindTag = card.querySelector('.remind-tag');
            
            // Update UI
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#4ade80';
            this.textContent = 'Watered!';
            this.disabled = true;
            remindTag.textContent = 'Next Water: 7 days';
            
            // Particle effect or small animation could go here
            console.log('Plant watered successfully');
        });
    });

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
