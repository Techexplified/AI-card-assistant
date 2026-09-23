/* global window, document */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// TODO: replace with real AI generation call to backend once built.
// Only `originalDescription` above is live data (from t.card('desc')) — everything
// below is stub/placeholder until the AI rewrite endpoint exists.
const aiImprovementData = {
  issuesDetected: [
    'Vague, unmeasurable objective',
    'No structured task breakdown',
    'No definition of done or success criteria',
    'Missing owner, timeline, and scope'
  ],
  currentScore: { value: 54, status: 'Needs Work' },
  objective: 'Redesign the marketing website to improve user experience, increase conversion rates by 30%, and reduce bounce rate through modern, mobile-first design and optimized user flows.',
  keyTasks: [
    'Review current website analytics and conduct a full UX audit',
    'Create wireframes for key pages — home, product, and checkout',
    'Design high-fidelity mockups and get stakeholder approval',
    'Implement responsive layouts across mobile and desktop breakpoints',
    'QA, cross-browser testing, and page performance audit'
  ],
  definitionOfDone: [
    'New design is live and fully mobile responsive',
    'Stakeholder sign-off received and documented',
    'Conversion rate improved by 30% or more',
    'Page load time under 3 seconds on all devices'
  ],
  newScore: { value: 92, status: 'Ready to Execute', improvementPercent: 38 }
};

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
 * Render all AI improvement stub data into the DOM
 */
function renderAiImprovements(data) {
  // 1. Issues detected
  const issuesTitleEl = document.getElementById('issues-detected-title');
  const issuesListEl = document.getElementById('issues-detected-list');
  if (issuesTitleEl) {
    issuesTitleEl.textContent = `${data.issuesDetected.length} issues detected`;
  }
  if (issuesListEl) {
    issuesListEl.innerHTML = '';
    data.issuesDetected.forEach((issue) => {
      const li = document.createElement('li');
      li.textContent = issue;
      issuesListEl.appendChild(li);
    });
  }

  // 2. Current score
  const currentScoreDonutText = document.getElementById('current-score-donut-text');
  const currentScoreStatus = document.getElementById('current-score-status-text');
  if (currentScoreDonutText && data.currentScore) {
    currentScoreDonutText.textContent = `${data.currentScore.value}%`;
  }
  if (currentScoreStatus && data.currentScore) {
    currentScoreStatus.textContent = data.currentScore.status;
  }

  // 3. AI Objective
  const objectiveEl = document.getElementById('ai-objective-text');
  if (objectiveEl) {
    objectiveEl.textContent = data.objective;
  }

  // 4. Key tasks
  const tasksCountPill = document.getElementById('key-tasks-count-pill');
  const tasksListEl = document.getElementById('ai-key-tasks-list');
  if (tasksCountPill) {
    tasksCountPill.textContent = `${data.keyTasks.length} tasks`;
  }
  if (tasksListEl) {
    tasksListEl.innerHTML = '';
    data.keyTasks.forEach((task) => {
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

  // 5. Definition of Done
  const dodListEl = document.getElementById('ai-dod-list');
  if (dodListEl) {
    dodListEl.innerHTML = '';
    data.definitionOfDone.forEach((item) => {
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

  // 6. New score & improvement %
  const newScoreDonutText = document.getElementById('new-score-donut-text');
  const newScoreStatus = document.getElementById('new-score-status-text');
  const improvementPill = document.getElementById('new-score-improvement-pill');
  if (newScoreDonutText && data.newScore) {
    newScoreDonutText.textContent = `${data.newScore.value}%`;
  }
  if (newScoreStatus && data.newScore) {
    newScoreStatus.textContent = data.newScore.status;
  }
  if (improvementPill && data.newScore) {
    improvementPill.textContent = `↗ +${data.newScore.improvementPercent}% improvement`;
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

  // Resize iframe if supported
  if (t && typeof t.sizeTo === 'function') {
    const popupContainer = document.getElementById('popup-container') || document.body;
    t.sizeTo(popupContainer);
  }
}

/**
 * Fetch live card description and metadata from Trello
 */
function initCardData() {
  if (t && typeof t.card === 'function') {
    t.card('desc', 'name', 'list')
      .then(function (card) {
        if (card) {
          if (card.name) {
            const cardNameEl = document.getElementById('breadcrumb-card-name');
            if (cardNameEl) cardNameEl.textContent = card.name;
          }
          if (card.list && card.list.name) {
            const listNameEl = document.getElementById('breadcrumb-list-name');
            if (listNameEl) listNameEl.textContent = card.list.name;
          }
          updateOriginalCardView(card.desc);
        }
      })
      .catch(function (err) {
        console.warn('[Improve Card] Could not fetch live card from Trello:', err);
        // Fallback for standalone preview matching reference
        updateOriginalCardView(
          "We need to redesign the marketing website. It's not working well and users are complaining. Need to make it better and improve conversions somehow.\n\nShould look modern and work on mobile. Jane said stakeholders want it done soon. Maybe add new landing pages too? Not sure about timeline or who's doing it."
        );
      });
  } else {
    // Standalone preview fallback
    updateOriginalCardView(
      "We need to redesign the marketing website. It's not working well and users are complaining. Need to make it better and improve conversions somehow.\n\nShould look modern and work on mobile. Jane said stakeholders want it done soon. Maybe add new landing pages too? Not sure about timeline or who's doing it."
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Render stub AI data
  renderAiImprovements(aiImprovementData);

  // 2. Fetch live description
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
      // TODO: call backend AI endpoint to regenerate objective/tasks/DoD, replacing aiImprovementData
      console.log('regenerate triggered');
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
    btnSaveChecklist.addEventListener('click', () => {
      // TODO: write improved description back to card via Trello REST API, and create a real Trello checklist from keyTasks — requires OAuth token
      console.log('save triggered', aiImprovementData);
      if (t && typeof t.popup === 'function') {
        t.popup({
          title: 'Smart Checklist Generator',
          url: t.signUrl ? t.signUrl('./checklist-generator.html') : './checklist-generator.html',
          height: 600,
        });
      } else {
        window.location.href = './checklist-generator.html';
      }
    });
  }

  // 7. Auto size iframe to content in Trello if supported
  if (t && typeof t.sizeTo === 'function') {
    const popupContainer = document.getElementById('popup-container') || document.body;
    t.sizeTo(popupContainer);
  }
});
