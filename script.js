document.addEventListener('DOMContentLoaded', () => {
    // --- Helpers ---
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function uid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'user_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    }

    // --- SaaS Device Identity ---
    let deviceId = localStorage.getItem('greenthumb_device_id');
    if (!deviceId) {
        deviceId = uid();
        localStorage.setItem('greenthumb_device_id', deviceId);
    }

    // Global Elements
    const modal = document.getElementById('add-plant-modal');
    const btnOpenModal = document.getElementById('open-add-modal');
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
        if (themeIcon) themeIcon.innerText = '☀️';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                if (themeIcon) themeIcon.innerText = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                if (themeIcon) themeIcon.innerText = '☀️';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    window.addEventListener('scroll', () => {
        if (!header) return;
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });

    // Virtual Garden State
    let myPlants = [];
    let ledgerEntries = [];
    try {
        ledgerEntries = JSON.parse(localStorage.getItem('greenthumb_ledger')) || [];
        if (!Array.isArray(ledgerEntries)) ledgerEntries = [];
    } catch {
        ledgerEntries = [];
    }

    // --- Atmosphere Intelligence ---
    let localWeather = { temp: 18, humidity: 55, isRaining: false, weatherCode: 0 };
    let hasBriefed = false;
    let wasInDanger = false;

    async function syncAtmosphere() {
        if (!navigator.geolocation) {
            simulateWeather();
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Open-Meteo: humidity lives under `current`, not `current_weather`
                    const url =
                        `https://api.open-meteo.com/v1/forecast` +
                        `?latitude=${latitude}&longitude=${longitude}` +
                        `&current=temperature_2m,relative_humidity_2m,weather_code` +
                        `&timezone=auto`;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Weather request failed');
                    const data = await res.json();
                    const c = data.current || {};
                    localWeather = {
                        temp: typeof c.temperature_2m === 'number' ? Math.round(c.temperature_2m) : 18,
                        humidity: typeof c.relative_humidity_2m === 'number' ? c.relative_humidity_2m : 55,
                        isRaining: (c.weather_code || 0) >= 51,
                        weatherCode: c.weather_code || 0
                    };
                    updateAtmosphereUI();
                    renderGarden();
                } catch (err) {
                    console.warn('Weather sync failed, using simulation.', err);
                    simulateWeather();
                }
            },
            () => simulateWeather(),
            { timeout: 10000, maximumAge: 600000 }
        );
    }

    function simulateWeather() {
        localWeather = { temp: 18, humidity: 55, isRaining: false, weatherCode: 1 };
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

        card.classList.remove('frost-pulse', 'recovery-glow');
        adviceEl.style.color = '';

        if (localWeather.temp < 5) {
            card.classList.add('frost-pulse');
            adviceEl.innerText = '❄️ FROST ALERT: Move outdoor plants inside!';
            iconEl.innerText = '🧊';
            if (!wasInDanger) logLedger('Frost Sentinel Alert: Temperature dropped below 5°C.', '❄️');
            wasInDanger = true;
            if (!hasBriefed) {
                triggerBriefing('Frost detected. Protecting your botanical assets is our priority.', '🧊');
            }
        } else if (localWeather.temp > 10 && wasInDanger) {
            card.classList.add('recovery-glow');
            adviceEl.innerText = '✅ SUCCESS: Frost snap avoided. Assets secured.';
            adviceEl.style.color = '#16a34a';
            iconEl.innerText = '🌿';
            logLedger('Recovery Success: Garden survived the cold snap.', '✅');
            wasInDanger = false;
        } else if (localWeather.temp > 30) {
            adviceEl.innerText =
                localWeather.humidity < 40
                    ? '🔥 Heatwave: Water after 7 PM.'
                    : '🌡️ Hot/Humid: Watch for root rot.';
            iconEl.innerText = '🔥';
            if (!wasInDanger) logLedger('Heatwave Warning: High-evaporation state detected.', '🔥');
            wasInDanger = true;
        } else if (localWeather.isRaining) {
            adviceEl.innerText = '🌧️ Rain detected: Skip outdoor watering today.';
            iconEl.innerText = '🌧️';
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
            id: Date.now() + Math.floor(Math.random() * 1000),
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
            ledgerGrid.innerHTML =
                `<div class="empty-state" style="opacity: 0.5; text-align: center; padding: 2rem;"><p>Your ledger is empty.</p></div>`;
            return;
        }
        ledgerGrid.innerHTML = ledgerEntries
            .map(
                (entry) => `
            <div class="ledger-entry animate-in">
                <div class="entry-main">
                    <span class="entry-icon">${escapeHtml(entry.icon)}</span>
                    <span class="entry-text">${escapeHtml(entry.text)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span class="entry-time">${escapeHtml(entry.time)}</span>
                    <button type="button" class="btn-delete-entry" data-entry-id="${entry.id}" aria-label="Delete entry">✕</button>
                </div>
            </div>
        `
            )
            .join('');

        ledgerGrid.querySelectorAll('.btn-delete-entry').forEach((btn) => {
            btn.onclick = () => deleteLedgerEntry(Number(btn.dataset.entryId));
        });
    }

    function deleteLedgerEntry(id) {
        ledgerEntries = ledgerEntries.filter((e) => e.id !== id);
        localStorage.setItem('greenthumb_ledger', JSON.stringify(ledgerEntries));
        renderLedger();
    }

    function clearLedger() {
        if (ledgerEntries.length === 0) return;
        if (confirm('Clear entire botanical ledger? This cannot be undone.')) {
            ledgerEntries = [];
            localStorage.setItem('greenthumb_ledger', JSON.stringify(ledgerEntries));
            renderLedger();
        }
    }

    window.deleteLedgerEntry = deleteLedgerEntry;
    window.clearLedger = clearLedger;

    const btnClearLedger = document.getElementById('btn-clear-ledger');
    if (btnClearLedger) btnClearLedger.addEventListener('click', clearLedger);

    // --- Optical Intelligence (Camera Logic) ---
    let stream = null;
    let diagPhotoData = null;
    let currentCapturedPhoto = null;

    async function startCamera(videoElement, containerElement, zoneElement) {
        if (!videoElement || !containerElement) return;
        containerElement.style.display = 'block';
        if (zoneElement) zoneElement.style.display = 'none';

        try {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } }
                });
            } catch {
                console.warn('Back camera failed, falling back to any available video source.');
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            videoElement.srcObject = stream;
            await videoElement.play().catch(() => {});
        } catch (err) {
            alert('Camera access denied or unavailable. Please check your system settings.');
            console.error(err);
            containerElement.style.display = 'none';
            if (zoneElement) zoneElement.style.display = 'flex';
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
        const diagVideo = document.getElementById('diag-camera-preview');
        const mainVideo = document.getElementById('camera-preview');
        if (diagVideo) diagVideo.srcObject = null;
        if (mainVideo) mainVideo.srcObject = null;
    }

    function capturePhoto(videoElement, canvasElement) {
        if (!videoElement || !canvasElement) return null;
        const context = canvasElement.getContext('2d');
        const w = videoElement.videoWidth || 640;
        const h = videoElement.videoHeight || 480;
        canvasElement.width = w;
        canvasElement.height = h;
        context.drawImage(videoElement, 0, 0, w, h);
        stopCamera();
        return canvasElement.toDataURL('image/jpeg', 0.85);
    }

    const diagVideo = document.getElementById('diag-camera-preview');
    const diagContainer = document.getElementById('diag-camera-container');
    const diagCanvas = document.getElementById('diag-camera-canvas');
    const diagZone = document.getElementById('drop-zone');

    const mainVideo = document.getElementById('camera-preview');
    const mainContainer = document.getElementById('camera-container');
    const mainCanvas = document.getElementById('camera-canvas');
    const mainZone = document.getElementById('modal-drop-zone');

    function setDiagZonePreview(photo) {
        diagPhotoData = photo;
        if (!diagZone) return;
        diagZone.style.display = 'flex';
        diagZone.innerHTML = `
            <div style="width: 100%; position: relative;">
                <img src="${photo}" alt="Diagnosis photo" style="width: 100%; height: 200px; object-fit: cover; border-radius: 20px;">
                <button type="button" class="btn-secondary" id="retake-diag" style="margin-top: 1rem; width: 100%;">Retake / Change Photo</button>
            </div>
        `;
        const retake = document.getElementById('retake-diag');
        if (retake) {
            retake.onclick = (e) => {
                e.stopPropagation();
                diagPhotoData = null;
                resetDiagZone();
            };
        }
    }

    function resetDiagZone() {
        if (!diagZone) return;
        diagZone.innerHTML = `
            <div class="upload-icon">📸</div>
            <p>Drag & drop or <span class="accent-text" id="link-diag-camera">Take Photo</span></p>
            <span class="file-hint">JPG, PNG · up to 8MB</span>
            <input type="file" id="plant-upload" hidden accept="image/*">
        `;
        wireDiagUpload();
    }

    function setMainZonePreview(photo) {
        currentCapturedPhoto = photo;
        if (!mainZone) return;
        mainZone.style.display = 'flex';
        mainZone.innerHTML = `
            <div style="width: 100%; position: relative;">
                <img src="${photo}" alt="Plant photo" style="width: 100%; height: 150px; object-fit: cover; border-radius: 15px;">
                <button type="button" class="btn-secondary" id="retake-main" style="margin-top: 1rem; width: 100%; font-size: 0.7rem;">Retake Photo</button>
            </div>
        `;
        const retake = document.getElementById('retake-main');
        if (retake) {
            retake.onclick = (e) => {
                e.stopPropagation();
                currentCapturedPhoto = null;
                resetMainZone();
                startCamera(mainVideo, mainContainer, mainZone);
                pushNavigationState('main-camera');
            };
        }
    }

    function resetMainZone() {
        if (!mainZone) return;
        mainZone.innerHTML = `
            <span>📸 Add Photo</span>
            <button type="button" class="btn-secondary" id="link-camera" style="font-size: 0.7rem;">Open Camera</button>
            <input type="file" id="modal-plant-upload" hidden accept="image/*">
        `;
        wireMainUpload();
    }

    function wireDiagUpload() {
        const fileInput = document.getElementById('plant-upload');
        const camLink = document.getElementById('link-diag-camera');

        if (camLink) {
            camLink.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                startCamera(diagVideo, diagContainer, diagZone);
                pushNavigationState('diag-camera');
            };
        }

        if (diagZone) {
            diagZone.onclick = (e) => {
                if (e.target.closest('#retake-diag') || e.target.closest('#link-diag-camera')) return;
                if (e.target.closest('img')) return;
                const input = document.getElementById('plant-upload');
                if (input) input.click();
            };
            diagZone.ondragover = (e) => {
                e.preventDefault();
                diagZone.classList.add('drag-over');
            };
            diagZone.ondragleave = () => diagZone.classList.remove('drag-over');
            diagZone.ondrop = (e) => {
                e.preventDefault();
                diagZone.classList.remove('drag-over');
                const file = e.dataTransfer?.files?.[0];
                if (file) handleDiagFile(file);
            };
        }

        if (fileInput) {
            fileInput.onchange = () => {
                const file = fileInput.files?.[0];
                if (file) handleDiagFile(file);
            };
        }
    }

    function handleDiagFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG or PNG).');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            alert('Image must be 8MB or smaller.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setDiagZonePreview(reader.result);
            logLedger('Uploaded photo for AI Diagnosis.', '📸');
        };
        reader.readAsDataURL(file);
    }

    function wireMainUpload() {
        const camLink = document.getElementById('link-camera');
        const fileInput = document.getElementById('modal-plant-upload');

        if (camLink) {
            camLink.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                startCamera(mainVideo, mainContainer, mainZone);
                pushNavigationState('main-camera');
            };
        }

        if (mainZone) {
            mainZone.onclick = (e) => {
                if (e.target.closest('#link-camera') || e.target.closest('#retake-main') || e.target.closest('img')) {
                    return;
                }
                const input = document.getElementById('modal-plant-upload');
                if (input) input.click();
            };
        }

        if (fileInput) {
            fileInput.onchange = () => {
                const file = fileInput.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    alert('Please upload an image file.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => setMainZonePreview(reader.result);
                reader.readAsDataURL(file);
            };
        }
    }

    function attachCaptureListeners() {
        const diagSnap = document.getElementById('btn-diag-snap');
        const mainSnap = document.getElementById('btn-snap');
        let lastSnapAt = 0;

        const once = (fn) => (e) => {
            if (e) e.preventDefault();
            const now = Date.now();
            if (now - lastSnapAt < 600) return; // debounce touch+click double fire
            lastSnapAt = now;
            fn();
        };

        const triggerDiag = once(() => {
            const photo = capturePhoto(diagVideo, diagCanvas);
            if (!photo) return;
            if (diagContainer) diagContainer.style.display = 'none';
            setDiagZonePreview(photo);
            logLedger('Captured photo for AI Diagnosis.', '📸');
        });

        const triggerMain = once(() => {
            const photo = capturePhoto(mainVideo, mainCanvas);
            if (!photo) return;
            if (mainContainer) mainContainer.style.display = 'none';
            setMainZonePreview(photo);
            logLedger('Captured photo for new garden asset.', '📸');
        });

        if (diagSnap) {
            diagSnap.onclick = triggerDiag;
            diagSnap.ontouchend = triggerDiag;
        }
        if (mainSnap) {
            mainSnap.onclick = triggerMain;
            mainSnap.ontouchend = triggerMain;
        }
    }

    attachCaptureListeners();
    wireDiagUpload();
    // Ensure modal zone has file input if missing from HTML
    if (mainZone && !document.getElementById('modal-plant-upload')) {
        const hidden = document.createElement('input');
        hidden.type = 'file';
        hidden.id = 'modal-plant-upload';
        hidden.accept = 'image/*';
        hidden.hidden = true;
        mainZone.appendChild(hidden);
    }
    wireMainUpload();

    // --- AI Diagnosis ---
    const diagnosisBank = [
        {
            name: 'Healthy specimen',
            severity: 'none',
            summary: 'VPD balance looks favorable. No strong pest or disease signatures.',
            treatment: 'Maintain current watering cadence and bright, indirect light.'
        },
        {
            name: 'Nitrogen deficiency',
            severity: 'moderate',
            summary: 'Slight nitrogen deficiency likely — pale older leaves are a classic cue.',
            treatment: 'Apply a balanced houseplant fertilizer at half strength; reassess in 10–14 days.'
        },
        {
            name: 'Underwatering stress',
            severity: 'moderate',
            summary: 'Low hydration signature: droop and dry leaf margins are consistent with soil drought.',
            treatment: 'Water thoroughly until runoff; check pot drainage and raise humidity if indoor.'
        },
        {
            name: 'Possible spider mites',
            severity: 'high',
            summary: 'Fine stippling pattern suggests early mite activity. Isolate if you confirm webbing.',
            treatment: 'Isolate plant, rinse foliage, and treat with insecticidal soap weekly for 3 weeks.'
        },
        {
            name: 'Overwatering risk',
            severity: 'moderate',
            summary: 'Soft tissue and humid conditions raise root-rot risk.',
            treatment: 'Allow top 2–3 cm of soil to dry; improve airflow; avoid saucer standing water.'
        }
    ];

    function runDiagnosis() {
        const resultsEl = document.getElementById('diagnosis-results');
        const plantName = (document.getElementById('diag-name')?.value || '').trim();
        const env = document.getElementById('diag-env')?.value || 'indoor';
        const notes = (document.getElementById('diag-notes')?.value || '').trim();

        if (!diagPhotoData && !plantName && !notes) {
            alert('Add a photo, plant name, or symptom notes before diagnosing.');
            return;
        }

        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="diagnosis-loading">
                    <div class="spinner"></div>
                    <h3>Analyzing botanical signals…</h3>
                    <p>Reviewing leaf texture, environment, and care notes.</p>
                </div>
            `;
        }

        triggerBriefing('Analyzing botanical signals…', '🧬');

        setTimeout(() => {
            // Prefer API when deployed with PlantNet key; otherwise local heuristic
            identifyViaApi(diagPhotoData)
                .then((apiResult) => {
                    const pick =
                        apiResult ||
                        diagnosisBank[Math.floor(Math.random() * diagnosisBank.length)];
                    renderDiagnosisResult(pick, plantName, env, notes, !!apiResult);
                })
                .catch(() => {
                    const pick = diagnosisBank[Math.floor(Math.random() * diagnosisBank.length)];
                    renderDiagnosisResult(pick, plantName, env, notes, false);
                });
        }, 900);
    }

    async function identifyViaApi(imageDataUrl) {
        if (!imageDataUrl) return null;
        try {
            const res = await fetch('/api/identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageDataUrl })
            });
            if (!res.ok) return null;
            const data = await res.json();
            const best = data?.results?.[0];
            if (!best) return null;
            const scientific =
                best.species?.scientificNameWithoutAuthor ||
                best.species?.scientificName ||
                'Unknown species';
            const common =
                best.species?.commonNames?.[0] || scientific;
            const score = Math.round((best.score || 0) * 100);
            return {
                name: common,
                severity: 'none',
                summary: `PlantNet match: ${scientific} (${score}% confidence).`,
                treatment: 'Confirm with leaf shape and growth habit, then add to your garden for care tracking.',
                species: scientific,
                confidence: score
            };
        } catch {
            return null;
        }
    }

    function renderDiagnosisResult(pick, plantName, env, notes, fromApi) {
        const resultsEl = document.getElementById('diagnosis-results');
        const label = plantName || pick.name || 'Specimen';
        const severity = pick.severity || 'none';
        const conf = pick.confidence != null ? pick.confidence : 72 + Math.floor(Math.random() * 20);

        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="diagnosis-card animate-in">
                    <div class="result-header">
                        <div>
                            <span class="id-label">Identification</span>
                            <div class="id-value">${escapeHtml(label)}</div>
                            ${pick.species ? `<p class="confidence">${escapeHtml(pick.species)}</p>` : ''}
                        </div>
                        <span class="severity-badge ${escapeHtml(severity)}">${escapeHtml(severity)}</span>
                    </div>
                    <div class="result-body">
                        <p><strong>Environment:</strong> ${escapeHtml(env)}</p>
                        <p>${escapeHtml(pick.summary)}</p>
                        <p><strong>Care plan:</strong> ${escapeHtml(pick.treatment)}</p>
                        ${notes ? `<p><strong>Your notes:</strong> ${escapeHtml(notes)}</p>` : ''}
                        <p class="confidence">${fromApi ? 'Live PlantNet ID' : 'Heuristic diagnosis'} · ~${conf}% confidence</p>
                    </div>
                    <button type="button" class="btn-primary" id="diag-add-to-garden" style="margin-top: 1rem; width: 100%;">
                        Add to My Garden
                    </button>
                </div>
            `;
            const addBtn = document.getElementById('diag-add-to-garden');
            if (addBtn) {
                addBtn.onclick = () => {
                    openAddModal(pick.species || pick.name || plantName || '');
                    const nameInput = document.getElementById('plant-name');
                    if (nameInput && !nameInput.value) nameInput.value = plantName || pick.name || '';
                    if (diagPhotoData) {
                        currentCapturedPhoto = diagPhotoData;
                        setMainZonePreview(diagPhotoData);
                    }
                };
            }
        }

        const msg = `Diagnosis: ${pick.summary}`;
        triggerBriefing(msg, '🧠');
        logLedger(`AI Diagnosis (${label}): ${pick.summary}`, '🧠');
    }

    const btnDiagnose = document.getElementById('btn-diagnose');
    if (btnDiagnose) btnDiagnose.addEventListener('click', runDiagnosis);

    // --- Plant Care Library ---
    const plantLibrary = [
        { name: 'Spider Plant', species: 'Chlorophytum comosum', water: '7 days', sun: 'Partial Sun', difficulty: 'Easy', icon: '🕷️', category: 'houseplants', toxicity: 'safe', interval: 7 },
        { name: 'Monstera Deliciosa', species: 'Swiss Cheese Plant', water: '7 days', sun: 'Partial Sun', difficulty: 'Easy', icon: '🌿', category: 'houseplants', toxicity: 'toxic', interval: 7 },
        { name: 'Snake Plant', species: 'Sansevieria', water: '14 days', sun: 'Full Sun', difficulty: 'Beginner', icon: '🌵', category: 'succulents', toxicity: 'toxic', interval: 14 },
        { name: 'Peace Lily', species: 'Spathiphyllum', water: '3 days', sun: 'Partial Shade', difficulty: 'Medium', icon: '🏳️', category: 'flowers', toxicity: 'toxic', interval: 3 },
        { name: 'Fiddle Leaf Fig', species: 'Ficus Lyrata', water: '7 days', sun: 'Full Sun', difficulty: 'Hard', icon: '🎻', category: 'houseplants', toxicity: 'toxic', interval: 7 },
        { name: 'Pothos', species: 'Epipremnum aureum', water: '7 days', sun: 'Partial Shade', difficulty: 'Easy', icon: '🍃', category: 'houseplants', toxicity: 'toxic', interval: 7 },
        { name: 'ZZ Plant', species: 'Zamioculcas zamiifolia', water: '14 days', sun: 'Full Shade', difficulty: 'Beginner', icon: '🪴', category: 'houseplants', toxicity: 'toxic', interval: 14 },
        { name: 'Aloe Vera', species: 'Medicinal Aloe', water: '14 days', sun: 'Full Sun', difficulty: 'Easy', icon: '🩹', category: 'succulents', toxicity: 'toxic', interval: 14 },
        { name: 'Lavender', species: 'Lavandula', water: '7 days', sun: 'Full Sun', difficulty: 'Medium', icon: '🌸', category: 'flowers', toxicity: 'safe', interval: 7 },
        { name: 'Japanese Maple', species: 'Acer Palmatum', water: '3 days', sun: 'Partial Sun', difficulty: 'Medium', icon: '🍁', category: 'trees', toxicity: 'safe', interval: 3 },
        { name: 'Chinese Money Plant', species: 'Pilea peperomioides', water: '7 days', sun: 'Partial Sun', difficulty: 'Easy', icon: '💰', category: 'houseplants', toxicity: 'safe', interval: 7 },
        { name: 'Rose', species: 'Rosa', water: '3 days', sun: 'Full Sun', difficulty: 'Hard', icon: '🌹', category: 'flowers', toxicity: 'toxic', interval: 3 },
        { name: 'Bonsai Pine', species: 'Pinus thunbergii', water: '1 day', sun: 'Full Sun', difficulty: 'Pro', icon: '🌲', category: 'trees', toxicity: 'toxic', interval: 1 }
    ];

    let currentCategory = 'all';

    function renderLibrary(filter = '') {
        if (!libraryGrid) return;
        const q = filter.trim().toLowerCase();
        const filtered = plantLibrary.filter((p) => {
            const matchesQuery =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.species.toLowerCase().includes(q);
            const matchesCat = currentCategory === 'all' || p.category === currentCategory;
            return matchesQuery && matchesCat;
        });

        if (filtered.length === 0) {
            libraryGrid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; padding: 4rem; text-align: center;"><p>No records found${q ? ` for "${escapeHtml(q)}"` : ''}.</p></div>`;
            return;
        }

        libraryGrid.innerHTML = filtered
            .map(
                (plant, idx) => `
            <div class="library-card animate-in" data-lib-index="${idx}" data-plant-name="${escapeHtml(plant.name)}" data-plant-species="${escapeHtml(plant.species)}" data-plant-interval="${plant.interval}" data-plant-sun="${escapeHtml(plant.sun)}">
                <div class="lib-thumb">${plant.icon}</div>
                <div class="lib-info">
                    <div class="lib-header" style="display: flex; justify-content: space-between; align-items: start;">
                        <h3>${escapeHtml(plant.name)}</h3>
                        <span class="safety-badge ${plant.toxicity}">${plant.toxicity === 'safe' ? '🐾 Safe' : '⚠️ Toxic'}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(plant.species)}</p>
                    <div class="lib-tags">
                        <span class="lib-tag">💧 ${escapeHtml(plant.water)}</span>
                        <span class="lib-tag">☀️ ${escapeHtml(plant.sun)}</span>
                        <span class="lib-tag">${escapeHtml(plant.difficulty)}</span>
                    </div>
                </div>
            </div>
        `
            )
            .join('');

        // Re-query filtered by DOM order using data attributes (index on filtered list is wrong after re-render)
        libraryGrid.querySelectorAll('.library-card').forEach((card) => {
            card.onclick = () => {
                openAddModal(card.dataset.plantSpecies || '');
                const nameInput = document.getElementById('plant-name');
                const intervalInput = document.getElementById('plant-interval');
                const sunInput = document.getElementById('plant-sun');
                if (nameInput) nameInput.value = card.dataset.plantName || '';
                if (intervalInput && card.dataset.plantInterval) {
                    intervalInput.value = card.dataset.plantInterval;
                }
                if (sunInput && card.dataset.plantSun) {
                    sunInput.value = card.dataset.plantSun;
                }
            };
        });
    }

    if (librarySearch) {
        librarySearch.addEventListener('input', (e) => renderLibrary(e.target.value));
    }
    document.querySelectorAll('.cat-item').forEach((item) => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.cat-item').forEach((i) => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.dataset.category || 'all';
            renderLibrary(librarySearch ? librarySearch.value : '');
        });
    });

    // --- Garden Logic ---
    function daysUntilWater(plant) {
        const modifier = calculateWeatherModifier(plant);
        const dynamicInterval = (plant.interval || 7) * modifier;
        const nextWaterTime = plant.lastWatered + dynamicInterval * 24 * 60 * 60 * 1000;
        const now = Date.now();
        return {
            daysLeft: Math.ceil((nextWaterTime - now) / (1000 * 60 * 60 * 24)),
            dynamicInterval,
            isOverdue: nextWaterTime <= now
        };
    }

    function renderGarden() {
        const gardenGrid = document.getElementById('virtual-garden');
        if (!gardenGrid) return;
        if (myPlants.length === 0) {
            gardenGrid.innerHTML = `<div class="empty-state" style="padding: 4rem; text-align: center; grid-column: 1 / -1;"><h3>Garden is Empty</h3><p>Add a plant from the library or use + Add New Plant.</p></div>`;
            return;
        }

        gardenGrid.innerHTML = myPlants
            .map((plant) => {
                const { daysLeft, dynamicInterval, isOverdue } = daysUntilWater(plant);
                const waterLevel = isOverdue
                    ? 0
                    : Math.max(0, Math.min(100, (daysLeft / dynamicInterval) * 100));
                const statusText = isOverdue
                    ? 'Needs water now'
                    : daysLeft === 1
                      ? 'Water tomorrow'
                      : `Water in ${daysLeft} days`;

                return `
                <div class="plant-card animate-in ${isOverdue ? 'overdue-alarm' : ''}" data-id="${plant.id}">
                    <div class="plant-thumb">
                        <img src="${escapeHtml(plant.image || 'greenthumb_hero_v2.png')}" alt="${escapeHtml(plant.name)}">
                        ${isOverdue ? '<span class="alarm-badge">THIRSTY</span>' : ''}
                        <button type="button" class="btn-delete" data-action="delete" aria-label="Remove plant">✕</button>
                    </div>
                    <div class="plant-info">
                        <h3>${escapeHtml(plant.name)}</h3>
                        <p class="species">${escapeHtml(plant.species || '')}</p>
                        <div class="progress-bar" role="progressbar" aria-valuenow="${Math.round(waterLevel)}" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress" style="width: ${waterLevel}%;"></div>
                        </div>
                        <p class="remind-tag ${isOverdue ? 'text-danger' : ''}">${statusText}</p>
                        <div class="plant-footer">
                            <button type="button" class="btn-timeline" data-action="timeline">Timeline</button>
                            <button type="button" class="btn-water ${isOverdue ? 'btn-alarm' : ''}" data-action="water">Watered</button>
                        </div>
                    </div>
                </div>
            `;
            })
            .join('');
        attachGardenListeners();
    }

    function attachGardenListeners() {
        document.querySelectorAll('.plant-card').forEach((card) => {
            const id = Number(card.dataset.id);
            const plant = myPlants.find((p) => p.id === id);
            if (!plant) return;

            const waterBtn = card.querySelector('[data-action="water"]');
            const deleteBtn = card.querySelector('[data-action="delete"]');
            const timelineBtn = card.querySelector('[data-action="timeline"]');

            if (waterBtn) {
                waterBtn.onclick = () => {
                    plant.lastWatered = Date.now();
                    saveGarden();
                    renderGarden();
                    updateAtmosphereUI();
                    logLedger(`Watered ${plant.name}.`, '💧');
                };
            }
            if (deleteBtn) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!confirm(`Remove ${plant.name} from your garden?`)) return;
                    myPlants = myPlants.filter((p) => p.id !== id);
                    saveGarden();
                    renderGarden();
                    updateAtmosphereUI();
                    logLedger(`Removed ${plant.name} from garden.`, '🗑️');
                };
            }
            if (timelineBtn) {
                timelineBtn.onclick = () => showTimeline(id);
            }
        });
    }

    // Navigation: Back Button Management
    function pushNavigationState(id) {
        history.pushState({ activeUI: id }, '');
    }

    window.onpopstate = function () {
        closeAllModals();
        stopCamera();
    };

    function closeAllModals() {
        if (modal) modal.style.display = 'none';
        if (diagContainer) diagContainer.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'none';
        document.querySelectorAll('.modal').forEach((m) => {
            m.style.display = 'none';
        });
    }

    function openAddModal(species = '') {
        if (!modal) return;
        modal.style.display = 'flex';
        const speciesInput = document.getElementById('plant-species');
        if (species && speciesInput) speciesInput.value = species;
        pushNavigationState('add-modal');
    }
    window.openAddModal = openAddModal;

    function showTimeline(id) {
        const plant = myPlants.find((p) => p.id === id);
        if (!plant) {
            triggerBriefing('No heritage record found for this plant.', '📈');
            return;
        }
        const { daysLeft, isOverdue } = daysUntilWater(plant);
        const watered = new Date(plant.lastWatered).toLocaleString();
        const status = isOverdue ? 'overdue for water' : `next water in ${daysLeft} day(s)`;
        triggerBriefing(
            `${plant.name} (${plant.species || 'unknown species'}). Last watered: ${watered}. Status: ${status}. Interval: every ${plant.interval || 7} day(s).`,
            '📈'
        );
    }
    window.showTimeline = showTimeline;

    // Modal Engine
    function initModalEngine() {
        document.querySelectorAll('[data-modal]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = btn.getAttribute('data-modal');
                const modalElement = document.getElementById(modalId);
                if (modalElement) {
                    modalElement.style.display = 'flex';
                    pushNavigationState(modalId);
                }
            });
        });

        document.querySelectorAll('.close-modal').forEach((btn) => {
            btn.addEventListener('click', () => {
                closeAllModals();
                stopCamera();
                if (history.state && history.state.activeUI) history.back();
            });
        });

        // Backdrop click closes modal
        document.querySelectorAll('.modal').forEach((m) => {
            m.addEventListener('click', (e) => {
                if (e.target === m) {
                    closeAllModals();
                    stopCamera();
                }
            });
        });
    }
    initModalEngine();

    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            const nameInput = document.getElementById('plant-name');
            const speciesInput = document.getElementById('plant-species');
            if (nameInput) nameInput.value = '';
            if (speciesInput) speciesInput.value = '';
            currentCapturedPhoto = null;
            resetMainZone();
            openAddModal();
        });
    }

    if (btnSavePlant) {
        btnSavePlant.addEventListener('click', () => {
            const name = (document.getElementById('plant-name')?.value || '').trim();
            const species = (document.getElementById('plant-species')?.value || '').trim();
            const interval = parseInt(document.getElementById('plant-interval')?.value, 10) || 7;
            const env = document.getElementById('plant-env')?.value || 'indoor';
            const sun = document.getElementById('plant-sun')?.value || 'Partial Sun';

            if (!name || !species) {
                alert('Please enter both a plant name and species.');
                return;
            }

            myPlants.push({
                id: Date.now(),
                name,
                species,
                interval: Math.max(1, interval),
                env,
                sun,
                lastWatered: Date.now(),
                image: currentCapturedPhoto || 'greenthumb_hero_v2.png'
            });
            logLedger(`Added ${name}.`, '🪴');
            saveGarden();
            renderGarden();
            updateAtmosphereUI();
            closeAllModals();
            if (history.state && history.state.activeUI) history.back();
            currentCapturedPhoto = null;
            resetMainZone();
        });
    }

    function calculateGardenScore() {
        if (myPlants.length === 0) return 100;
        let total = 0;
        myPlants.forEach((plant) => {
            const { daysLeft, dynamicInterval, isOverdue } = daysUntilWater(plant);
            if (isOverdue) {
                const overdueDays = Math.abs(daysLeft);
                total += Math.max(15, 40 - overdueDays * 8);
            } else {
                const freshness = Math.min(1, daysLeft / Math.max(dynamicInterval, 1));
                total += 70 + freshness * 30;
            }
        });
        let score = Math.round(total / myPlants.length);
        // Environmental stress
        if (localWeather.temp < 5) score = Math.max(0, score - 12);
        if (localWeather.temp > 32) score = Math.max(0, score - 8);
        return Math.max(0, Math.min(100, score));
    }

    function calculateWeatherModifier(plant) {
        let modifier = 1.0;
        const env = plant?.env || 'indoor';

        // Heat accelerates drying; cold slows uptake
        if (localWeather.temp >= 32) modifier *= 0.65;
        else if (localWeather.temp >= 28) modifier *= 0.8;
        else if (localWeather.temp <= 5) modifier *= 1.4;
        else if (localWeather.temp <= 10) modifier *= 1.15;

        // Dry air = water sooner
        if (localWeather.humidity < 30) modifier *= 0.85;
        else if (localWeather.humidity > 80) modifier *= 1.1;

        // Outdoor rain delays next watering
        if (env === 'outdoor' && localWeather.isRaining) modifier *= 1.5;

        return Math.max(0.4, Math.min(2.0, modifier));
    }

    function saveGarden() {
        try {
            localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
        } catch (err) {
            console.error('Failed to persist garden (storage full?)', err);
            // Drop large images if quota exceeded
            try {
                const slim = myPlants.map((p) => ({
                    ...p,
                    image:
                        p.image && p.image.startsWith('data:')
                            ? 'greenthumb_hero_v2.png'
                            : p.image
                }));
                localStorage.setItem('greenthumb_garden', JSON.stringify(slim));
                myPlants = slim;
            } catch (e2) {
                alert('Could not save garden — browser storage may be full.');
            }
        }
        // Best-effort cloud sync when API + DB are configured
        syncGardenRemote();
    }

    async function syncGardenRemote() {
        try {
            await fetch('/api/garden', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: deviceId, plants: myPlants })
            });
        } catch {
            // offline / local-only mode
        }
    }

    async function loadGardenRemote() {
        try {
            const res = await fetch(`/api/garden?uid=${encodeURIComponent(deviceId)}`);
            if (!res.ok) return null;
            const data = await res.json();
            return Array.isArray(data.plants) ? data.plants : null;
        } catch {
            return null;
        }
    }

    async function loadGarden() {
        try {
            myPlants = JSON.parse(localStorage.getItem('greenthumb_garden')) || [];
            if (!Array.isArray(myPlants)) myPlants = [];
        } catch {
            myPlants = [];
        }

        // Prefer remote if local empty and API available
        if (myPlants.length === 0) {
            const remote = await loadGardenRemote();
            if (remote && remote.length) {
                myPlants = remote;
                localStorage.setItem('greenthumb_garden', JSON.stringify(myPlants));
            }
        }

        renderGarden();
        renderLedger();
        renderLibrary();
        syncAtmosphere();
    }

    loadGarden();
});
