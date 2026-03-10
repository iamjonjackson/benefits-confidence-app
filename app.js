/**
 * Benefits Confidence Dashboard – Application Logic
 *
 * Responsibilities:
 *  - IndexedDB setup and CRUD operations
 *  - Wiring the benefit input form
 *  - Rendering benefit cards on the dashboard
 */

/* ============================================================
   Calculator (inline so the page has no module-import requirement)
   ============================================================ */

function normaliseScale(value) {
    return ((value - 1) / 4) * 100;
}

function calculateConfidenceScore({ kpiPerformance, projectCompletion, stakeholderEngagement, riskLevel }) {
    const stakeholderNorm = normaliseScale(stakeholderEngagement);
    const riskNorm = normaliseScale(riskLevel);

    const score =
        kpiPerformance * 0.4 +
        projectCompletion * 0.3 +
        stakeholderNorm * 0.2 -
        riskNorm * 0.1;

    return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

function getConfidenceStatus(score) {
    if (score >= 70) return { label: 'High', colour: 'green' };
    if (score >= 40) return { label: 'Medium', colour: 'amber' };
    return { label: 'Low', colour: 'red' };
}

/* ============================================================
   IndexedDB
   ============================================================ */

const DB_NAME    = 'BenefitsConfidenceDB';
const DB_VERSION = 1;
const STORE_NAME = 'benefits';

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror   = (event) => reject(event.target.error);
    });
}

function getAllBenefits() {
    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORE_NAME, 'readonly');
        const store   = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror   = () => reject(request.error);
    });
}

function addBenefit(benefit) {
    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORE_NAME, 'readwrite');
        const store   = tx.objectStore(STORE_NAME);
        const request = store.add(benefit);
        request.onsuccess = () => resolve(request.result);
        request.onerror   = () => reject(request.error);
    });
}

function deleteBenefit(id) {
    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORE_NAME, 'readwrite');
        const store   = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror   = () => reject(request.error);
    });
}

/* ============================================================
   Rendering
   ============================================================ */

function buildScoreRingSVG(score, colour) {
    const radius        = 26;
    const circumference = 2 * Math.PI * radius;
    const offset        = circumference - (score / 100) * circumference;

    return `
        <svg class="score-ring" viewBox="0 0 64 64" aria-hidden="true">
            <circle class="ring-bg"   cx="32" cy="32" r="${radius}" />
            <circle class="ring-fill ${colour}" cx="32" cy="32" r="${radius}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                    transform="rotate(-90 32 32)" />
        </svg>`;
}

function buildFactorBar(value, max, colour) {
    const pct = Math.round((value / max) * 100);
    return `
        <div class="factor-bar" role="progressbar" aria-valuenow="${value}" aria-valuemax="${max}">
            <div class="factor-bar-fill ${colour}" style="width:${pct}%"></div>
        </div>`;
}

function renderCard(benefit) {
    const score  = calculateConfidenceScore(benefit);
    const status = getConfidenceStatus(score);

    return `
        <article class="benefit-card ${status.colour}"
                 aria-label="Benefit: ${escapeHtml(benefit.name)}">
            <div class="card-header">
                <h3 class="benefit-name">${escapeHtml(benefit.name)}</h3>
                <span class="status-badge ${status.colour}">${status.label} Confidence</span>
            </div>

            <div class="score-section">
                ${buildScoreRingSVG(score, status.colour)}
                <div>
                    <div class="score-text">${score}%</div>
                    <div class="score-label">Confidence Score</div>
                </div>
            </div>

            <div>
                <div class="factors-title">Contributing Factors</div>
                <div class="factors-list">
                    <div class="factor-item">
                        <span class="factor-label">KPI Performance</span>
                        <span class="factor-value">${benefit.kpiPerformance}%</span>
                    </div>
                    <div class="factor-item">
                        <span class="factor-label">Project Completion</span>
                        <span class="factor-value">${benefit.projectCompletion}%</span>
                    </div>
                    <div class="factor-item">
                        <span class="factor-label">Stakeholder Engagement</span>
                        <span class="factor-value">${benefit.stakeholderEngagement}/5</span>
                    </div>
                    <div class="factor-item">
                        <span class="factor-label">Risk Level</span>
                        <span class="factor-value">${benefit.riskLevel}/5</span>
                    </div>
                </div>
                <div class="factor-bar-wrap">
                    ${buildFactorBar(score, 100, status.colour)}
                </div>
            </div>

            <div class="card-footer">
                <button class="btn-delete"
                        data-id="${benefit.id}"
                        aria-label="Delete benefit ${escapeHtml(benefit.name)}">
                    ✕ Remove
                </button>
            </div>
        </article>`;
}

function countByStatus(benefits) {
    const counts = { green: 0, amber: 0, red: 0 };
    benefits.forEach(b => {
        const score = calculateConfidenceScore(b);
        counts[getConfidenceStatus(score).colour]++;
    });
    return counts;
}

async function renderDashboard() {
    const benefits = await getAllBenefits();
    const container = document.getElementById('card-grid');

    if (benefits.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002
                             2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6
                             0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012
                             2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <p>No benefits added yet.<br>Use the form above to add your first benefit.</p>
            </div>`;
    } else {
        container.innerHTML = benefits.map(renderCard).join('');

        // Delete listeners
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.id);
                await deleteBenefit(id);
                renderDashboard();
                showToast('Benefit removed.');
            });
        });
    }

    // Summary pills
    const counts = countByStatus(benefits);
    document.getElementById('pill-green').textContent = `${counts.green} High`;
    document.getElementById('pill-amber').textContent = `${counts.amber} Medium`;
    document.getElementById('pill-red').textContent   = `${counts.red} Low`;
}

/* ============================================================
   Form
   ============================================================ */

function getFormValues() {
    return {
        name:                   document.getElementById('benefitName').value.trim(),
        kpiPerformance:         parseFloat(document.getElementById('kpiPerformance').value),
        stakeholderEngagement:  parseInt(document.getElementById('stakeholderEngagement').value, 10),
        riskLevel:              parseInt(document.getElementById('riskLevel').value, 10),
        projectCompletion:      parseFloat(document.getElementById('projectCompletion').value),
    };
}

function clearForm() {
    document.getElementById('benefit-form').reset();
    document.getElementById('benefitName').focus();
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ============================================================
   Bootstrap
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    db = await openDB();
    await renderDashboard();

    const form = document.getElementById('benefit-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const values = getFormValues();

        if (!values.name) {
            showToast('Please enter a benefit name.');
            return;
        }

        await addBenefit(values);
        clearForm();
        await renderDashboard();
        showToast(`"${values.name}" added successfully.`);
    });

    document.getElementById('btn-clear').addEventListener('click', clearForm);
});

/* ============================================================
   Utility
   ============================================================ */

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
