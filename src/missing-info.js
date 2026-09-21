/* global window, document */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// TODO: replace with real fetch from backend AI scoring endpoint once built
const missingInfoData = {
  cardCompleteness: 54,
  missingCount: 4,
  optionalCount: 2,
  critical: [
    {
      id: 'assignee',
      title: 'Assignee',
      description: 'No one is assigned to this card',
      hint: 'Assign a member to own this card',
      actionLabel: 'Assign',
      actionIcon: '👤',
      actionType: 'assign-member',
    },
    {
      id: 'due-date',
      title: 'Due Date',
      description: 'No due date has been set',
      hint: 'Set a deadline to track timelines',
      actionLabel: 'Set Date',
      actionIcon: '📅',
      actionType: 'set-due-date',
    },
    {
      id: 'requirements',
      title: 'Requirements',
      description: 'No clear requirements defined',
      hint: 'Add clear scope and requirements',
      actionLabel: 'Add',
      actionIcon: '✏️',
      actionType: 'add-requirements',
    },
    {
      id: 'definition-of-done',
      title: 'Definition of Done',
      description: 'Completion criteria not defined',
      hint: "Define what 'done' looks like",
      actionLabel: 'Define',
      actionIcon: '✏️',
      actionType: 'define-dod',
    },
  ],
  optional: [
    {
      id: 'attachments',
      title: 'Attachments',
      description: 'No files or links attached',
      hint: 'Attach mockups, briefs or reference files',
      actionLabel: 'Attach',
      actionIcon: '📎',
      actionType: 'add-attachment',
    },
    {
      id: 'priority-label',
      title: 'Priority Label',
      description: 'No priority label applied to card',
      hint: 'Add a label to categorize this card',
      actionLabel: 'Label',
      actionIcon: '🏷️',
      actionType: 'add-label',
    },
  ],
};

/**
 * Get an SVG icon string for an item id
 */
function getItemSvgIcon(id) {
  switch (id) {
    case 'assignee':
      return `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    case 'due-date':
      return `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    case 'requirements':
      return `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    case 'definition-of-done':
      return `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    case 'attachments':
      return `<svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;
    case 'priority-label':
      return `<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
    default:
      return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>`;
  }
}

/**
 * Create DOM element for a single missing info card
 */
function createItemCard(item, category) {
  const card = document.createElement('div');
  card.className = 'item-card';

  const isCritical = category === 'critical';
  const badgeClass = isCritical ? 'critical' : 'optional';
  const badgeText = isCritical ? '● Missing' : '● Optional';
  const actionIcon = item.actionIcon ? `${item.actionIcon} ` : '';

  card.innerHTML = `
    <div class="item-top">
      <div class="item-left">
        <div class="item-icon-box ${badgeClass}">
          ${getItemSvgIcon(item.id)}
        </div>
        <div class="item-title-group">
          <span class="item-title">${item.title}</span>
          <span class="item-description">${item.description}</span>
        </div>
      </div>
      <span class="item-badge-pill ${badgeClass}">${badgeText}</span>
    </div>
    <div class="item-bottom">
      <span class="item-hint">${item.hint}</span>
      <button class="btn-item-action ${badgeClass}" data-action="${item.actionType}">
        ${actionIcon}${item.actionLabel}
      </button>
    </div>
  `;

  // Attach click listener to action button
  const actionBtn = card.querySelector('.btn-item-action');
  if (actionBtn) {
    actionBtn.addEventListener('click', () => {
      // TODO: wire to real Trello REST API write-back (requires OAuth token) once backend is built
      console.log('action triggered:', item.actionType);
    });
  }

  return card;
}

/**
 * Render all components from missingInfoData
 */
function renderMissingInfo(data) {
  // 1. Summary Card
  const percentageEl = document.getElementById('summary-percentage');
  const progressFillEl = document.getElementById('progress-bar-fill');
  const missingPillEl = document.getElementById('pill-missing-count');
  const optionalPillEl = document.getElementById('pill-optional-count');

  if (percentageEl) percentageEl.textContent = `${data.cardCompleteness}%`;
  if (progressFillEl) progressFillEl.style.width = `${data.cardCompleteness}%`;
  if (missingPillEl) missingPillEl.textContent = `● ${data.missingCount} Missing`;
  if (optionalPillEl) optionalPillEl.textContent = `● ${data.optionalCount} Optional`;

  // 2. Critical Items
  const criticalList = document.getElementById('critical-items-list');
  if (criticalList) {
    criticalList.innerHTML = '';
    (data.critical || []).forEach((item) => {
      criticalList.appendChild(createItemCard(item, 'critical'));
    });
  }

  // 3. Optional Items
  const optionalList = document.getElementById('optional-items-list');
  if (optionalList) {
    optionalList.innerHTML = '';
    (data.optional || []).forEach((item) => {
      optionalList.appendChild(createItemCard(item, 'optional'));
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Render initial data
  renderMissingInfo(missingInfoData);

  // Close Popup handler
  const btnClose = document.getElementById('btn-close-popup');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if (window.self !== window.top && t && typeof t.closePopup === 'function') {
        t.closePopup();
      } else {
        console.log('[Missing Info Detector] Close popup triggered (standalone preview)');
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    });
  }

  // "Let AI Complete This Card" button handler
  const btnAiComplete = document.getElementById('btn-ai-complete');
  if (btnAiComplete) {
    btnAiComplete.addEventListener('click', () => {
      // TODO: wire to real Trello REST API write-back (requires OAuth token) once backend is built
      console.log('action triggered: ai-auto-complete');
    });
  }

  // Auto size popup iframe to content if supported
  if (t && typeof t.sizeTo === 'function') {
    const container = document.getElementById('popup-container') || document.body;
    t.sizeTo(container);
  }
});
