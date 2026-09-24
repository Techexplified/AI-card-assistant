/* global window, document */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// Track current card data and latest AI improvement result
let currentCardDescription = '';
let currentCardName = 'Untitled';
let latestAiData = null;
let improvedColumnTemplate = '';

const FALLBACK_DESCRIPTION =
  "We need to redesign the marketing website. It's not working well and users are complaining. Need to make it better and improve conversions somehow.\n\nShould look modern and work on mobile. Jane said stakeholders want it done soon. Maybe add new landing pages too? Not sure about timeline or who's doing it.";
const FALLBACK_CARD_NAME = 'Website Redesign';
const FALLBACK_LIST_NAME = 'In Progress';

/**
 * Inject loading animation styles
 */
function injectCustomStyles() {
  const styleId = 'ai-improve-dynamic-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes ai-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .ai-loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e0e7ff;
        border-top-color: var(--color-primary, #5b4fe9);
        border-radius: 50%;
        animation: ai-spin 0.8s linear infinite;
      }
      .btn-save-main:disabled, .btn-secondary:disabled {
        opacity: 0.55;
        cursor: not-allowed !important;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Resize Trello iframe to content height
 */
function resizePopup() {
  if (t && typeof t.sizeTo === 'function') {
    const popupContainer = document.getElementById('popup-container') || document.body;
    try {
      t.sizeTo(popupContainer);
    } catch (e) {
      console.warn('[Improve Card] t.sizeTo error:', e);
    }
  }
}

/**
 * Update the original card description & word count
 */
function updateOriginalCardView(descriptionText) {
  const descEl = document.getElementById('raw-card-description');
  const wordCountPill = document.getElementById('original-word-count-pill');

  const trimmed = (descriptionText || '').trim();
  const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const displayText = trimmed.length > 0 ? trimmed : 'No description set';

  if (descEl) {
    descEl.textContent = displayText;
  }
  if (wordCountPill) {
    wordCountPill.textContent = `${wordCount} words`;
  }
}

/**
 * Call live AI improvement endpoint
 */
async function fetchImprovements(description, cardName) {
  const response = await fetch('/api/improve-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, cardName })
  });

  if (!response.ok) {
    let errorMessage = `Server returned ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMessage = errData.details ? `${errData.error} (${errData.details})` : errData.error;
      }
    } catch (e) {
      // If 404 when testing on plain vite without vercel dev
      if (response.status === 404) {
        errorMessage = 'Endpoint /api/improve-card not found. When testing locally, run with Vercel CLI (vercel dev) or deploy to Vercel.';
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Display loading state in the AI Improved column and related widgets
 */
function showLoadingState() {
  // 1. Disable Save & Generate Checklist button
  const btnSaveChecklist = document.getElementById('btn-save-checklist');
  if (btnSaveChecklist) {
    btnSaveChecklist.disabled = true;
    btnSaveChecklist.style.opacity = '0.5';
    btnSaveChecklist.style.cursor = 'not-allowed';
  }

  // 2. Set Regenerate button to loading
  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.disabled = true;
    btnRegenerate.style.opacity = '0.6';
    btnRegenerate.innerHTML = '<span>⏳ Analyzing...</span>';
  }

  // 3. Update header pill
  const headerPill = document.querySelector('.pill-improvements-made');
  if (headerPill) {
    headerPill.innerHTML = '✨ Analyzing card...';
  }

  // 4. Update Original column issues & current score to analyzing state
  const issuesTitleEl = document.getElementById('issues-detected-title');
  const issuesListEl = document.getElementById('issues-detected-list');
  if (issuesTitleEl) {
    issuesTitleEl.textContent = 'Analyzing issues...';
  }
  if (issuesListEl) {
    issuesListEl.innerHTML = '<li style="color: var(--color-text-muted);">Scanning card description...</li>';
  }

  const currentScoreDonutText = document.getElementById('current-score-donut-text');
  const currentScoreStatus = document.getElementById('current-score-status-text');
  if (currentScoreDonutText) currentScoreDonutText.textContent = '--%';
  if (currentScoreStatus) currentScoreStatus.textContent = 'Calculating...';

  // 5. Render Loading Box in Right Column
  const colImproved = document.getElementById('col-improved');
  if (colImproved) {
    colImproved.innerHTML = `
      <div class="column-header">
        <div class="column-title-group">
          <span class="col-dot purple">●</span>
          <span class="column-title purple">AI Improved</span>
        </div>
        <span class="pill-enhanced">✨ Analyzing...</span>
      </div>
      <div class="card-box" style="padding: 42px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: #faf5ff; border: 1.5px dashed var(--color-purple-border); border-radius: 10px;">
        <div class="ai-loading-spinner"></div>
        <div>
          <div style="font-weight: 700; color: var(--color-primary); font-size: 14px; margin-bottom: 4px;">Analyzing Card with AI...</div>
          <div style="font-size: 12px; color: var(--color-text-sub);">Structuring objective, key tasks &amp; definition of done</div>
        </div>
      </div>
    `;
  }

  resizePopup();
}

/**
 * Display inline error state in the AI Improved column with a retry button
 */
function showErrorState(errorMessage) {
  // 1. Keep Save & Generate Checklist button disabled
  const btnSaveChecklist = document.getElementById('btn-save-checklist');
  if (btnSaveChecklist) {
    btnSaveChecklist.disabled = true;
    btnSaveChecklist.style.opacity = '0.5';
    btnSaveChecklist.style.cursor = 'not-allowed';
  }

  // 2. Restore Regenerate button
  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.disabled = false;
    btnRegenerate.style.opacity = '1';
    btnRegenerate.innerHTML = '<span>🔄 Regenerate</span>';
  }

  // 3. Update header pill
  const headerPill = document.querySelector('.pill-improvements-made');
  if (headerPill) {
    headerPill.innerHTML = '⚠️ Analysis error';
  }

  // 4. Update Original column issues
  const issuesTitleEl = document.getElementById('issues-detected-title');
  const issuesListEl = document.getElementById('issues-detected-list');
  if (issuesTitleEl) {
    issuesTitleEl.textContent = 'Analysis unavailable';
  }
  if (issuesListEl) {
    issuesListEl.innerHTML = '<li style="color: var(--color-red-text);">Could not analyze issues</li>';
  }

  const currentScoreStatus = document.getElementById('current-score-status-text');
  if (currentScoreStatus) {
    currentScoreStatus.textContent = 'Unavailable';
  }

  // 5. Render Error Box in Right Column
  const colImproved = document.getElementById('col-improved');
  if (colImproved) {
    colImproved.innerHTML = `
      <div class="column-header">
        <div class="column-title-group">
          <span class="col-dot purple">●</span>
          <span class="column-title purple">AI Improved</span>
        </div>
        <span class="pill-enhanced" style="background-color: #fee2e2; color: #dc2626;">Error</span>
      </div>
      <div class="card-box" style="padding: 28px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: #fef2f2; border: 1.5px solid var(--color-red-border); border-radius: 10px;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <div style="font-weight: 700; color: #b91c1c; font-size: 14px; margin-bottom: 4px;">Couldn't generate improvements</div>
          <div style="font-size: 12px; color: #7f1d1d; line-height: 1.4; max-width: 300px; margin: 0 auto;">${errorMessage || 'Failed to generate improvements — try again.'}</div>
        </div>
        <button id="btn-retry-ai" class="btn-secondary" style="margin-top: 6px; border-color: #fca5a5; background: #ffffff; color: #b91c1c; font-weight: 600;">
          <span>🔄 Try Again</span>
        </button>
      </div>
    `;

    const btnRetry = document.getElementById('btn-retry-ai');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        loadAiImprovements(currentCardDescription, currentCardName);
      });
    }
  }

  resizePopup();
}

/**
 * Render all AI improvement live data into the DOM
 */
function renderAiImprovements(data) {
  // 1. Restore Right Column Template if needed
  const colImproved = document.getElementById('col-improved');
  if (colImproved && improvedColumnTemplate) {
    colImproved.innerHTML = improvedColumnTemplate;
  }

  // 2. Issues detected
  const issues = Array.isArray(data.issuesDetected) ? data.issuesDetected : [];
  const issuesTitleEl = document.getElementById('issues-detected-title');
  const issuesListEl = document.getElementById('issues-detected-list');
  if (issuesTitleEl) {
    issuesTitleEl.textContent = `${issues.length} issue${issues.length === 1 ? '' : 's'} detected`;
  }
  if (issuesListEl) {
    issuesListEl.innerHTML = '';
    issues.forEach((issue) => {
      const li = document.createElement('li');
      li.textContent = issue;
      issuesListEl.appendChild(li);
    });
  }

  // 3. Current score
  const currentScoreDonutText = document.getElementById('current-score-donut-text');
  const currentScoreStatus = document.getElementById('current-score-status-text');
  const currentScoreTrack = document.querySelector('.score-box-current .mini-donut-fill-red');
  if (data.currentScore) {
    const curVal = typeof data.currentScore.value === 'number' ? data.currentScore.value : 50;
    if (currentScoreDonutText) {
      currentScoreDonutText.textContent = `${curVal}%`;
    }
    if (currentScoreStatus) {
      currentScoreStatus.textContent = data.currentScore.status || 'Needs Work';
    }
    if (currentScoreTrack) {
      const offset = 100.53 - (100.53 * Math.min(100, Math.max(0, curVal)) / 100);
      currentScoreTrack.style.strokeDashoffset = offset.toFixed(2);
    }
  }

  // 4. AI Objective
  const objectiveEl = document.getElementById('ai-objective-text');
  if (objectiveEl) {
    objectiveEl.textContent = data.objective || 'No objective generated.';
  }

  // 5. Key tasks
  const tasks = Array.isArray(data.keyTasks) ? data.keyTasks : [];
  const tasksCountPill = document.getElementById('key-tasks-count-pill');
  const tasksListEl = document.getElementById('ai-key-tasks-list');
  if (tasksCountPill) {
    tasksCountPill.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
  }
  if (tasksListEl) {
    tasksListEl.innerHTML = '';
    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'ai-task-item';
      li.innerHTML = `
        <div class="task-icon-box">
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span>${task}</span>
      `;
      tasksListEl.appendChild(li);
    });
  }

  // 6. Definition of Done
  const dods = Array.isArray(data.definitionOfDone) ? data.definitionOfDone : [];
  const dodListEl = document.getElementById('ai-dod-list');
  if (dodListEl) {
    dodListEl.innerHTML = '';
    dods.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'ai-dod-item';
      li.innerHTML = `
        <div class="dod-icon-box">
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span>${item}</span>
      `;
      dodListEl.appendChild(li);
    });
  }

  // 7. New score & improvement %
  const newScoreDonutText = document.getElementById('new-score-donut-text');
  const newScoreStatus = document.getElementById('new-score-status-text');
  const improvementPill = document.getElementById('new-score-improvement-pill');
  const newScoreTrack = document.getElementById('new-score-donut-fill') || document.querySelector('.score-box-new .mini-donut-fill-green');

  if (data.newScore) {
    const curVal = typeof data.currentScore?.value === 'number' ? data.currentScore.value : 50;
    const improvement = typeof data.newScore.improvementPercent === 'number' ? data.newScore.improvementPercent : 38;
    const newVal = typeof data.newScore.value === 'number' ? data.newScore.value : Math.min(100, Math.max(0, curVal + improvement));

    if (newScoreDonutText) {
      newScoreDonutText.textContent = `${newVal}%`;
    }
    if (newScoreStatus) {
      newScoreStatus.textContent = data.newScore.status || 'Ready to Execute';
    }
    if (improvementPill) {
      improvementPill.textContent = `↗ +${improvement}% improvement`;
    }
    if (newScoreTrack) {
      const offset = 100.53 - (100.53 * Math.min(100, Math.max(0, newVal)) / 100);
      newScoreTrack.style.strokeDashoffset = offset.toFixed(2);
    }
  }

  // 8. Header improvement summary pill
  const headerPill = document.querySelector('.pill-improvements-made');
  if (headerPill) {
    const totalCount = issues.length + tasks.length + dods.length;
    headerPill.innerHTML = `✨ ${totalCount} improvements made`;
  }

  // 9. Save current data and re-enable actions
  latestAiData = data;

  const btnSaveChecklist = document.getElementById('btn-save-checklist');
  if (btnSaveChecklist) {
    btnSaveChecklist.disabled = false;
    btnSaveChecklist.style.opacity = '1';
    btnSaveChecklist.style.cursor = 'pointer';
  }

  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.disabled = false;
    btnRegenerate.style.opacity = '1';
    btnRegenerate.innerHTML = '<span>🔄 Regenerate</span>';
  }

  resizePopup();
}

/**
 * Main coordinator to fetch AI improvements and manage UI states
 */
async function loadAiImprovements(description, cardName) {
  if (!description || !description.trim()) {
    showErrorState('Card description is empty. Please add a description to your Trello card.');
    return;
  }

  showLoadingState();

  try {
    const result = await fetchImprovements(description, cardName);
    renderAiImprovements(result);
  } catch (err) {
    console.error('[Improve Card] fetchImprovements error:', err);
    showErrorState(err.message || 'Failed to generate improvements');
  }
}

/**
 * Switch view mode between 'side-by-side' and 'after-only'
 */
function setViewMode(mode) {
  const container = document.getElementById('columns-container');
  const colOriginal = document.getElementById('col-original');
  const btnSide = document.getElementById('btn-toggle-side');
  const btnAfter = document.getElementById('btn-toggle-after');

  if (mode === 'after-only') {
    if (btnAfter) btnAfter.classList.add('active');
    if (btnSide) btnSide.classList.remove('active');
    if (colOriginal) colOriginal.classList.add('hidden');
    if (container) container.classList.add('after-only-mode');
  } else {
    // default side-by-side
    if (btnSide) btnSide.classList.add('active');
    if (btnAfter) btnAfter.classList.remove('active');
    if (colOriginal) colOriginal.classList.remove('hidden');
    if (container) container.classList.remove('after-only-mode');
  }

  resizePopup();
}

/**
 * Fetch live card description and metadata from Trello with a safe timeout
 */
function initCardData() {
  const isInsideTrello = window.self !== window.top && Boolean(t);

  if (isInsideTrello && typeof t.card === 'function') {
    // Race Trello iframe handshake with a 1.5 second timeout
    const fetchTrelloData = Promise.all([
      t.card('desc', 'name'),
      typeof t.list === 'function' ? t.list('name') : Promise.resolve(null)
    ]);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Trello bridge timed out')), 1500);
    });

    Promise.race([fetchTrelloData, timeoutPromise])
      .then(function ([card, list]) {
        if (card && card.name) {
          currentCardName = card.name;
          const cardNameEl = document.getElementById('breadcrumb-card-name');
          if (cardNameEl) cardNameEl.textContent = card.name;
        }
        if (list && list.name) {
          const listNameEl = document.getElementById('breadcrumb-list-name');
          if (listNameEl) listNameEl.textContent = list.name;
        }

        currentCardDescription = (card && card.desc) ? card.desc : '';
        updateOriginalCardView(currentCardDescription);
        loadAiImprovements(currentCardDescription, currentCardName);
      })
      .catch(function (err) {
        console.warn('[Improve Card] Falling back to standalone sample data:', err);
        currentCardDescription = FALLBACK_DESCRIPTION;
        currentCardName = FALLBACK_CARD_NAME;
        const cardNameEl = document.getElementById('breadcrumb-card-name');
        if (cardNameEl) cardNameEl.textContent = FALLBACK_CARD_NAME;
        const listNameEl = document.getElementById('breadcrumb-list-name');
        if (listNameEl) listNameEl.textContent = FALLBACK_LIST_NAME;

        updateOriginalCardView(currentCardDescription);
        loadAiImprovements(currentCardDescription, currentCardName);
      });
  } else {
    // Standalone browser preview (direct tab)
    currentCardDescription = FALLBACK_DESCRIPTION;
    currentCardName = FALLBACK_CARD_NAME;
    const cardNameEl = document.getElementById('breadcrumb-card-name');
    if (cardNameEl) cardNameEl.textContent = FALLBACK_CARD_NAME;
    const listNameEl = document.getElementById('breadcrumb-list-name');
    if (listNameEl) listNameEl.textContent = FALLBACK_LIST_NAME;

    updateOriginalCardView(currentCardDescription);
    loadAiImprovements(currentCardDescription, currentCardName);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  injectCustomStyles();

  // 1. Cache the initial template for the AI Improved column
  const colImproved = document.getElementById('col-improved');
  if (colImproved) {
    improvedColumnTemplate = colImproved.innerHTML;
  }

  // 2. Fetch live description from Trello (or fallback) and start AI processing
  initCardData();

  // 3. View Mode Toggle wiring
  const btnSide = document.getElementById('btn-toggle-side');
  const btnAfter = document.getElementById('btn-toggle-after');
  if (btnSide) {
    btnSide.addEventListener('click', () => setViewMode('side-by-side'));
  }
  if (btnAfter) {
    btnAfter.addEventListener('click', () => setViewMode('after-only'));
  }

  // 4. Regenerate Button handler
  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', () => {
      loadAiImprovements(currentCardDescription, currentCardName);
    });
  }

  // 5. Close / Cancel Button handlers
  const closePopupAction = () => {
    if (window.self !== window.top && t) {
      if (typeof t.closePopup === 'function') {
        try { t.closePopup(); } catch (e) {}
      }
      if (typeof t.closeModal === 'function') {
        try { t.closeModal(); } catch (e) {}
      }
    } else {
      console.log('[Improve Card] Close popup triggered (standalone preview)');
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  };

  const btnClose = document.getElementById('btn-close-popup');
  if (btnClose) {
    btnClose.addEventListener('click', closePopupAction);
  }

  const btnCancel = document.getElementById('btn-cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', closePopupAction);
  }

  // 6. Save & Generate Checklist Button handler
  const btnSaveChecklist = document.getElementById('btn-save-checklist');
  if (btnSaveChecklist) {
    btnSaveChecklist.addEventListener('click', (event) => {
      console.log('save triggered with latest AI data:', latestAiData);
      const targetUrl = (t && typeof t.signUrl === 'function')
        ? t.signUrl('./checklist-generator.html')
        : './checklist-generator.html';

      if (window.self !== window.top && t && typeof t.popup === 'function') {
        try {
          t.popup({
            title: 'Smart Checklist Generator',
            url: targetUrl,
            height: 600,
            mouseEvent: event,
          });
        } catch (err) {
          console.warn('[Improve Card] t.popup failed, falling back to direct navigation:', err);
          window.location.href = './checklist-generator.html';
        }
      } else {
        // Fallback when viewing standalone in a browser tab
        console.log('[Improve Card] Opening checklist-generator.html (standalone preview)');
        window.location.href = './checklist-generator.html';
      }
    });
  }

  // 7. Auto size iframe to content in Trello if supported
  resizePopup();
});
