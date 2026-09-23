/* global window, document */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// TODO: replace with real fetch from backend — AI-generated next steps based on
// the card's description, checklist, and labels. Expected API response should
// match this array shape so only this initial assignment needs to change.
let nextStepsData = [
  {
    id: 1,
    title: 'Review Current Analytics',
    description: 'Analyze bounce rate, session data, and conversion funnels to understand current performance baselines.',
    role: 'Analyst',
    duration: '1–2 days',
    priority: 'high' // 'high' | 'medium' | 'low' | null
  },
  {
    id: 2,
    title: 'Create Wireframes for Key Pages',
    description: 'Design wireframes for homepage, product page, and checkout flow using Figma. Include mobile and desktop breakpoints.',
    role: 'Designer',
    duration: '3–5 days',
    priority: 'medium'
  },
  {
    id: 3,
    title: 'Get Stakeholder Feedback',
    description: 'Share wireframes with key stakeholders and gather feedback before moving into high-fidelity design.',
    role: 'Team',
    duration: '2 days',
    priority: null
  },
  {
    id: 4,
    title: 'Design & Build the New Site',
    description: 'Move approved wireframes into high-fidelity designs, then develop and QA the new website before launch.',
    role: 'Dev + Design',
    duration: '2–3 weeks',
    priority: null
  }
];

// Color palette cycling for step number badges (indigo, purple, orange, green)
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
    const container = document.getElementById('popup-container') || document.body;
    t.sizeTo(container);
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

    // 2. Step Number Circle (Color cycled by index)
    const numberCircle = document.createElement('div');
    numberCircle.className = 'step-number-circle';
    const color = STEP_COLORS[index % STEP_COLORS.length];
    numberCircle.style.backgroundColor = color;
    numberCircle.textContent = String(index + 1);

    // 3. Step Body Content
    const contentEl = document.createElement('div');
    contentEl.className = 'step-content';

    // Title
    const titleEl = document.createElement('h3');
    titleEl.className = 'step-title';
    titleEl.textContent = `${index + 1}. ${step.title}`;

    // Description
    const descEl = document.createElement('p');
    descEl.className = 'step-description';
    descEl.textContent = step.description;

    contentEl.appendChild(titleEl);
    contentEl.appendChild(descEl);

    // 4. Tags Row (Role, Duration, Priority)
    const hasRole = Boolean(step.role);
    const hasDuration = Boolean(step.duration);
    const hasPriority = Boolean(step.priority && PRIORITY_THEMES[step.priority]);

    if (hasRole || hasDuration || hasPriority) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'step-tags-row';

      // Role Tag
      if (hasRole) {
        const rolePill = document.createElement('span');
        rolePill.className = 'tag-pill tag-role';
        const isTeam = step.role.toLowerCase().includes('team') || step.role.includes('+');
        const roleIconSvg = isTeam
          ? `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
          : `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

        rolePill.innerHTML = `${roleIconSvg}<span>${step.role}</span>`;
        tagsRow.appendChild(rolePill);
      }

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

    // Push new step object (omits role, duration, priority tags)
    nextStepsData.push({
      id: Date.now(),
      title: heading,
      description: description,
      role: null,
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
          const cardNameEl = document.getElementById('breadcrumb-card-name');
          if (cardNameEl) cardNameEl.textContent = card.name;
        }
        if (list && list.name) {
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
  // 1. Initial Render of Steps
  renderNextSteps();

  // 2. Fetch live Trello metadata
  initCardData();

  // 3. Custom Step expand/add controls
  setupCustomStepControl();

  // 4. Regenerate Button handler
  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', () => {
      // TODO: call backend AI endpoint to regenerate nextStepsData based on current card state
      console.log('regenerate next steps triggered');
    });
  }

  // 5. Finish & Show Card Button handler
  const btnFinish = document.getElementById('btn-finish');
  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      // TODO: decide what "Finish" actually does — likely just closes the popup and returns focus to the card, possibly after writing steps somewhere (see note below), then t.closePopup()
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
