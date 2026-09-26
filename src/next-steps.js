/* global window, document, sessionStorage */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// Live next steps data
let nextStepsData = [];
let currentImprovementData = null;
let currentCardName = 'Untitled';
let currentListName = 'In Progress';

// Color palette cycling for step number badges (indigo, purple, orange, green, etc.)
const STEP_COLORS = ['#4f46e5', '#a855f7', '#f97316', '#10b981', '#6366f1', '#ec4899'];

// Priority themes dictionary for dynamic styling
const PRIORITY_THEMES = {
  high: {
    className: 'tag-priority-high',
    label: 'High priority',
    iconSvg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
  },
  medium: {
    className: 'tag-priority-medium',
    label: 'Medium priority',
    iconSvg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
  },
  low: {
    className: 'tag-priority-low',
    label: 'Low priority',
    iconSvg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
  }
};

/**
 * Auto-resize iframe in Trello if supported
 */
function autoResize() {
  if (t && typeof t.sizeTo === 'function') {
    try {
      t.sizeTo('body');
    } catch (e) {
      try {
        const container = document.getElementById('popup-container') || document.body;
        t.sizeTo(container);
      } catch (err) {
        console.warn('[Next Steps] autoResize error:', err);
      }
    }
  }
}

/**
 * Close popup helper with iframe / standalone fallback
 */
function closePopupAction() {
  if (window.self !== window.top && t) {
    if (typeof t.closePopup === 'function') {
      try { t.closePopup(); } catch (e) {}
    }
    if (typeof t.closeModal === 'function') {
      try { t.closeModal(); } catch (e) {}
    }
  } else {
    console.log('[Next Steps] Close popup triggered (standalone preview)');
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }
}

/**
 * Read persisted improvement data from Trello card storage or session storage fallback
 */
async function getStoredImprovementData() {
  let data = null;
  if (t && typeof t.get === 'function') {
    try {
      data = await t.get('card', 'shared', 'improvementData');
    } catch (e) {
      console.warn('[Next Steps] Could not read improvementData from Trello card storage:', e);
    }
  }

  if (!data) {
    try {
      const sessionData = sessionStorage.getItem('trello_improvementData');
      if (sessionData) {
        data = JSON.parse(sessionData);
      }
    } catch (e) {}
  }

  return data;
}

/**
 * Call serverless endpoint to generate suggested next steps
 */
async function fetchNextSteps(improvementData, cardName) {
  const response = await fetch('/api/generate-next-steps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...improvementData, cardName })
  });

  if (!response.ok) {
    let errorMsg = `Server returned ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMsg = errData.details ? `${errData.error} (${errData.details})` : errData.error;
      }
    } catch (e) {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.steps;
}

/**
 * Show loading spinner while AI generates next steps
 */
function showLoadingState() {
  const container = document.getElementById('steps-container');
  if (container) {
    container.innerHTML = `
      <div class="steps-loading-box">
        <div class="steps-spinner"></div>
        <div>
          <div class="steps-loading-title">Generating Suggested Next Steps...</div>
          <div class="steps-loading-sub">Analyzing project goals to outline high-level phases</div>
        </div>
      </div>
    `;
  }

  const btnFinish = document.getElementById('btn-finish');
  if (btnFinish) btnFinish.disabled = true;

  const btnRegen = document.getElementById('btn-regenerate');
  if (btnRegen) {
    btnRegen.disabled = true;
    btnRegen.innerHTML = `<span>⏳ Generating...</span>`;
  }

  autoResize();
}

/**
 * Show missing improvement data state with navigation link back to improve step
 */
function showMissingState() {
  const container = document.getElementById('steps-container');
  if (container) {
    container.innerHTML = `
      <div class="steps-empty-state">
        <div class="state-icon-box warning">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <div class="state-title">No Card Analysis Found</div>
          <div class="state-desc">No card analysis found — go back and generate improvements first.</div>
        </div>
        <button type="button" id="btn-go-improve" class="btn-action-state" style="background-color: var(--color-primary); color: #ffffff;">
          <span>← Go to Improve Card</span>
        </button>
      </div>
    `;

    const btnGo = document.getElementById('btn-go-improve');
    if (btnGo) {
      btnGo.addEventListener('click', () => {
        const search = window.location.search || '';
        const targetUrl = (t && typeof t.signUrl === 'function')
          ? t.signUrl('./improve-card.html')
          : ('./improve-card.html' + search);
        window.location.href = targetUrl;
      });
    }
  }

  const btnFinish = document.getElementById('btn-finish');
  if (btnFinish) btnFinish.disabled = true;

  const btnRegen = document.getElementById('btn-regenerate');
  if (btnRegen) {
    btnRegen.disabled = true;
    btnRegen.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      <span>Regenerate</span>
    `;
  }

  autoResize();
}

/**
 * Show inline error state with a retry button
 */
function showErrorState(errorMessage) {
  const container = document.getElementById('steps-container');
  if (container) {
    container.innerHTML = `
      <div class="steps-error-state">
        <div class="state-icon-box error">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <div class="state-title">Couldn't Generate Next Steps</div>
          <div class="state-desc">${errorMessage || 'An error occurred while generating next steps.'}</div>
        </div>
        <button type="button" id="btn-retry-steps" class="btn-action-state" style="background-color: #ffffff; border-color: #fca5a5; color: #b91c1c;">
          <span>🔄 Try Again</span>
        </button>
      </div>
    `;

    const btnRetry = document.getElementById('btn-retry-steps');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        loadNextStepsData();
      });
    }
  }

  const btnFinish = document.getElementById('btn-finish');
  if (btnFinish) btnFinish.disabled = true;

  const btnRegen = document.getElementById('btn-regenerate');
  if (btnRegen) {
    btnRegen.disabled = false;
    btnRegen.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      <span>Regenerate</span>
    `;
  }

  autoResize();
}

/**
 * Coordinate loading and rendering of live AI next steps
 */
async function loadNextStepsData() {
  const improvementData = await getStoredImprovementData();

  if (!improvementData || !improvementData.objective) {
    showMissingState();
    return;
  }

  currentImprovementData = improvementData;
  showLoadingState();

  try {
    const steps = await fetchNextSteps(improvementData, currentCardName);
    nextStepsData = Array.isArray(steps) ? steps : [];

    // Restore buttons
    const btnFinish = document.getElementById('btn-finish');
    if (btnFinish) btnFinish.disabled = false;

    const btnRegen = document.getElementById('btn-regenerate');
    if (btnRegen) {
      btnRegen.disabled = false;
      btnRegen.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>Regenerate</span>
      `;
    }

    renderNextSteps();
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    autoResize();
  } catch (err) {
    console.error('[Next Steps] loadNextStepsData error:', err);
    showErrorState(err.message || 'Failed to generate next steps');
  }
}

/**
 * Render all suggested steps from nextStepsData
 */
function renderNextSteps() {
  const container = document.getElementById('steps-container');
  if (!container) return;

  container.innerHTML = '';

  nextStepsData.forEach((step, index) => {
    // 1. Step Card container
    const cardEl = document.createElement('div');
    cardEl.className = 'step-card';
    cardEl.dataset.stepId = String(step.id);

    // 2. Step Number Circle (Color cycled by index, displays resequenced 1, 2, 3...)
    const numberCircle = document.createElement('div');
    numberCircle.className = 'step-number-circle';
    const color = STEP_COLORS[index % STEP_COLORS.length];
    numberCircle.style.backgroundColor = color;
    numberCircle.textContent = String(index + 1);

    // 3. Step Body Content
    const contentEl = document.createElement('div');
    contentEl.className = 'step-content';

    // Header with Title + Delete button
    const headerRow = document.createElement('div');
    headerRow.className = 'step-card-header';

    const titleEl = document.createElement('h3');
    titleEl.className = 'step-title';
    titleEl.textContent = `${index + 1}. ${step.title}`;
    titleEl.title = 'Click to edit title';

    // Inline edit handler for Step Title
    const startEditingTitle = (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'step-title-input';
      input.value = step.title;

      let isCommitted = false;
      const finishEditing = (save) => {
        if (isCommitted) return;
        isCommitted = true;
        if (save) {
          const trimmed = input.value.trim();
          if (trimmed) {
            step.title = trimmed;
          }
        }
        renderNextSteps();
        autoResize();
      };

      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') {
          ke.preventDefault();
          finishEditing(true);
        } else if (ke.key === 'Escape') {
          ke.preventDefault();
          finishEditing(false);
        }
      });

      input.addEventListener('blur', () => {
        finishEditing(true);
      });

      headerRow.replaceChild(input, titleEl);
      input.focus();
      input.select();
    };

    titleEl.addEventListener('click', startEditingTitle);

    // Small "×" delete icon
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete-step';
    deleteBtn.title = 'Delete step';
    deleteBtn.setAttribute('aria-label', 'Delete step');
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stepIdx = nextStepsData.findIndex((s) => s.id === step.id);
      if (stepIdx !== -1) {
        nextStepsData.splice(stepIdx, 1);
        renderNextSteps();
        autoResize();
      }
    });

    headerRow.appendChild(titleEl);
    headerRow.appendChild(deleteBtn);

    // Description
    const descEl = document.createElement('p');
    descEl.className = 'step-description';
    descEl.textContent = step.description;
    descEl.title = 'Click to edit description';

    // Inline edit handler for Step Description
    const startEditingDesc = (e) => {
      e.stopPropagation();
      const textarea = document.createElement('textarea');
      textarea.className = 'step-desc-input';
      textarea.rows = 2;
      textarea.value = step.description;

      let isCommitted = false;
      const finishEditing = (save) => {
        if (isCommitted) return;
        isCommitted = true;
        if (save) {
          const trimmed = textarea.value.trim();
          if (trimmed) {
            step.description = trimmed;
          }
        }
        renderNextSteps();
        autoResize();
      };

      textarea.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter' && !ke.shiftKey) {
          ke.preventDefault();
          finishEditing(true);
        } else if (ke.key === 'Escape') {
          ke.preventDefault();
          finishEditing(false);
        }
      });

      textarea.addEventListener('blur', () => {
        finishEditing(true);
      });

      contentEl.replaceChild(textarea, descEl);
      textarea.focus();
      textarea.select();
    };

    descEl.addEventListener('click', startEditingDesc);

    contentEl.appendChild(headerRow);
    contentEl.appendChild(descEl);

    // 4. Tags Row (Duration & Priority only — Role is removed)
    const hasDuration = Boolean(step.duration);
    const hasPriority = Boolean(step.priority && PRIORITY_THEMES[step.priority]);

    if (hasDuration || hasPriority) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'step-tags-row';

      // Duration Tag
      if (hasDuration) {
        const durPill = document.createElement('span');
        durPill.className = 'tag-pill tag-duration';
        durPill.innerHTML = `
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>${step.duration}</span>
        `;
        tagsRow.appendChild(durPill);
      }

      // Priority Tag (only rendered if priority is not null)
      if (hasPriority) {
        const priorityConfig = PRIORITY_THEMES[step.priority];
        const priorityPill = document.createElement('span');
        priorityPill.className = `tag-pill ${priorityConfig.className}`;
        priorityPill.innerHTML = `${priorityConfig.iconSvg}<span>${priorityConfig.label}</span>`;
        tagsRow.appendChild(priorityPill);
      }

      contentEl.appendChild(tagsRow);
    }

    cardEl.appendChild(numberCircle);
    cardEl.appendChild(contentEl);
    container.appendChild(cardEl);
  });
}

/**
 * Handle adding a custom step
 */
function setupCustomStepControl() {
  const wrapper = document.getElementById('add-custom-wrapper');
  const trigger = document.getElementById('add-custom-trigger');
  const btnTriggerAdd = document.getElementById('btn-trigger-add');
  const btnCancel = document.getElementById('btn-cancel-custom-step');
  const btnSubmit = document.getElementById('btn-submit-custom-step');
  const inputHeading = document.getElementById('input-custom-heading');
  const inputDesc = document.getElementById('input-custom-desc');

  if (!wrapper || !trigger) return;

  const expandForm = () => {
    wrapper.classList.add('is-expanded');
    if (inputHeading) inputHeading.focus();
    autoResize();
  };

  const collapseForm = () => {
    wrapper.classList.remove('is-expanded');
    if (inputHeading) inputHeading.value = '';
    if (inputDesc) inputDesc.value = '';
    autoResize();
  };

  const submitCustomStep = () => {
    const heading = inputHeading ? inputHeading.value.trim() : '';
    const description = inputDesc ? inputDesc.value.trim() : '';

    if (!heading) {
      if (inputHeading) inputHeading.focus();
      return;
    }

    // Push new step object (omits role)
    nextStepsData.push({
      id: Date.now(),
      title: heading,
      description: description,
      duration: null,
      priority: null
    });

    collapseForm();
    renderNextSteps();
    autoResize();
  };

  trigger.addEventListener('click', expandForm);
  if (btnTriggerAdd) {
    btnTriggerAdd.addEventListener('click', (e) => {
      e.stopPropagation();
      expandForm();
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', collapseForm);
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', submitCustomStep);
  }

  if (inputHeading) {
    inputHeading.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (inputDesc) inputDesc.focus();
      }
    });
  }

  if (inputDesc) {
    inputDesc.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submitCustomStep();
      }
    });
  }
}

/**
 * Fetch live card & list name from Trello using Promise.all
 */
function initCardData() {
  if (t && typeof t.card === 'function' && typeof t.list === 'function') {
    Promise.all([
      t.card('name'),
      t.list('name')
    ])
      .then(function ([card, list]) {
        if (card && card.name) {
          currentCardName = card.name;
          const cardNameEl = document.getElementById('breadcrumb-card-name');
          if (cardNameEl) cardNameEl.textContent = card.name;
        }
        if (list && list.name) {
          currentListName = list.name;
          const listNameEl = document.getElementById('breadcrumb-list-name');
          if (listNameEl) listNameEl.textContent = list.name;
        }
      })
      .catch(function (err) {
        console.warn('[Next Steps] Could not fetch live card/list from Trello:', err);
      });
  }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  // 1. Fetch live Trello metadata
  initCardData();

  // 2. Fetch and render live AI next steps data
  loadNextStepsData();

  // 3. Custom Step expand/add controls
  setupCustomStepControl();

  // 4. Regenerate Button handler
  // Note: Regenerating re-calls fetchNextSteps with stored improvementData and replaces the current list,
  // discarding any manual edits/deletions made so far in this session.
  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', () => {
      loadNextStepsData();
    });
  }

  // 5. Finish & Show Card Button handler
  const btnFinish = document.getElementById('btn-finish');
  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      // TODO: decide what "Finish" actually does — closes popup and returns focus to card
      console.log('finish triggered', nextStepsData);
      closePopupAction();
    });
  }

  // 6. Close Popup Button handler
  const btnClose = document.getElementById('btn-close-popup');
  if (btnClose) {
    btnClose.addEventListener('click', closePopupAction);
  }

  // 7. Initial Size to container
  autoResize();
});
