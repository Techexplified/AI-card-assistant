/* global window, document */
import { TRELLO_APP_KEY, TRELLO_APP_NAME, TRELLO_APP_AUTHOR } from './config.js';
import { analyzeCard } from './card-analysis.js';

// Initialize Trello Power-Up iframe interface with app credentials
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe({
      appKey: TRELLO_APP_KEY,
      appName: TRELLO_APP_NAME,
      appAuthor: TRELLO_APP_AUTHOR,
    })
  : null;

// Fallback card data for standalone browser testing or bridge timeout
const FALLBACK_CARD = {
  name: 'Website Redesign',
  desc: "We need to redesign the marketing website. It's not working well and users are complaining. Need to make it better and improve conversions somehow.",
  members: [],
  due: null,
  attachments: [],
  labels: [],
};
const FALLBACK_LIST_NAME = 'In Progress';

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
 * Resize Trello iframe to content height
 */
function resizePopup() {
  if (t && typeof t.sizeTo === 'function') {
    const popupContainer = document.getElementById('popup-container') || document.body;
    try {
      t.sizeTo(popupContainer);
    } catch (e) {
      console.warn('[Missing Info Detector] t.sizeTo error:', e);
    }
  }
}

/**
 * Show a brief loading state while card heuristics are analyzed
 */
function showLoadingState() {
  const percentageEl = document.getElementById('summary-percentage');
  const progressFillEl = document.getElementById('progress-bar-fill');
  const missingPillEl = document.getElementById('pill-missing-count');
  const optionalPillEl = document.getElementById('pill-optional-count');

  if (percentageEl) percentageEl.textContent = '--%';
  if (progressFillEl) progressFillEl.style.width = '0%';
  if (missingPillEl) missingPillEl.textContent = '● Scanning...';
  if (optionalPillEl) optionalPillEl.textContent = '● Scanning...';

  const criticalList = document.getElementById('critical-items-list');
  if (criticalList) {
    criticalList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--color-text-muted); font-size: 12px;">Scanning card items...</div>';
  }

  const optionalList = document.getElementById('optional-items-list');
  if (optionalList) {
    optionalList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--color-text-muted); font-size: 12px;">Scanning card items...</div>';
  }

  resizePopup();
}

/**
 * Create DOM element for a single item card
 * - If filled: green theme (light green background/border, green icon square, "● Complete" pill, filledDescription, no hint/button)
 * - If missing critical: red theme, missingDescription, hint, and action button
 * - If missing optional: orange theme, missingDescription, hint, and action button
 */
function createItemCard(item, category) {
  const card = document.createElement('div');
  const isCritical = category === 'critical';

  if (item.filled) {
    card.className = 'item-card filled';
    card.innerHTML = `
      <div class="item-top">
        <div class="item-left">
          <div class="item-icon-box complete">
            ${getItemSvgIcon(item.id)}
          </div>
          <div class="item-title-group">
            <span class="item-title">${item.title}</span>
            <span class="item-description">${item.filledDescription || ''}</span>
          </div>
        </div>
        <span class="item-badge-pill complete">● Complete</span>
      </div>
    `;
  } else {
    card.className = 'item-card';
    const badgeClass = isCritical ? 'critical' : 'optional';
    const badgeText = isCritical ? '● Missing' : '● Optional';
    const actionLabel = item.actionLabel || (isCritical ? 'Fix' : 'Add');

    card.innerHTML = `
      <div class="item-top">
        <div class="item-left">
          <div class="item-icon-box ${badgeClass}">
            ${getItemSvgIcon(item.id)}
          </div>
          <div class="item-title-group">
            <span class="item-title">${item.title}</span>
            <span class="item-description">${item.missingDescription || ''}</span>
          </div>
        </div>
        <span class="item-badge-pill ${badgeClass}">${badgeText}</span>
      </div>
      <div class="item-bottom">
        <span class="item-hint">${item.hint || ''}</span>
        <button class="btn-item-action ${badgeClass}" data-action="${item.actionType || ''}">
          ${actionLabel}
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
  }

  return card;
}

/**
 * Render all components from analyzed card data
 */
function renderMissingInfo(analysis) {
  // 1. Summary Card
  const percentageEl = document.getElementById('summary-percentage');
  const progressFillEl = document.getElementById('progress-bar-fill');
  const missingPillEl = document.getElementById('pill-missing-count');
  const optionalPillEl = document.getElementById('pill-optional-count');

  if (percentageEl) percentageEl.textContent = `${analysis.completeness}%`;
  if (progressFillEl) progressFillEl.style.width = `${analysis.completeness}%`;
  if (missingPillEl) missingPillEl.textContent = `● ${analysis.missingCount} Missing`;
  if (optionalPillEl) optionalPillEl.textContent = `● ${analysis.optionalMissingCount} Optional`;

  // 2. Critical Items
  const criticalList = document.getElementById('critical-items-list');
  if (criticalList) {
    criticalList.innerHTML = '';
    (analysis.critical || []).forEach((item) => {
      criticalList.appendChild(createItemCard(item, 'critical'));
    });
  }

  // 3. Optional Items
  const optionalList = document.getElementById('optional-items-list');
  if (optionalList) {
    optionalList.innerHTML = '';
    (analysis.optional || []).forEach((item) => {
      optionalList.appendChild(createItemCard(item, 'optional'));
    });
  }

  resizePopup();
}

/**
 * Fetch live card & list metadata from Trello and run analysis
 */
function initMissingInfo() {
  const isInsideTrello = window.self !== window.top && Boolean(t);

  showLoadingState();

  if (isInsideTrello && typeof t.card === 'function') {
    const fetchTrelloData = Promise.all([
      t.card('members', 'due', 'attachments', 'labels', 'desc', 'name'),
      typeof t.list === 'function' ? t.list('name') : Promise.resolve(null),
    ]);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Trello bridge timed out')), 2500);
    });

    Promise.race([fetchTrelloData, timeoutPromise])
      .then(([card, list]) => {
        if (card && card.name) {
          const cardNameEl = document.getElementById('breadcrumb-card-name');
          if (cardNameEl) cardNameEl.textContent = card.name;
        }
        if (list && list.name) {
          const listNameEl = document.getElementById('breadcrumb-list-name');
          if (listNameEl) listNameEl.textContent = list.name;
        }

        const analysis = analyzeCard(card || FALLBACK_CARD);
        renderMissingInfo(analysis);
      })
      .catch((err) => {
        console.warn('[Missing Info Detector] Using fallback card data:', err);
        const cardNameEl = document.getElementById('breadcrumb-card-name');
        if (cardNameEl) cardNameEl.textContent = FALLBACK_CARD.name;
        const listNameEl = document.getElementById('breadcrumb-list-name');
        if (listNameEl) listNameEl.textContent = FALLBACK_LIST_NAME;

        const analysis = analyzeCard(FALLBACK_CARD);
        renderMissingInfo(analysis);
      });
  } else {
    // Standalone browser preview
    const cardNameEl = document.getElementById('breadcrumb-card-name');
    if (cardNameEl) cardNameEl.textContent = FALLBACK_CARD.name;
    const listNameEl = document.getElementById('breadcrumb-list-name');
    if (listNameEl) listNameEl.textContent = FALLBACK_LIST_NAME;

    const analysis = analyzeCard(FALLBACK_CARD);
    renderMissingInfo(analysis);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;

  // Initialize and render live card analysis
  initMissingInfo();

  // Close Popup / Modal handler
  const btnClose = document.getElementById('btn-close-popup');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if (window.self !== window.top && t) {
        if (typeof t.closeModal === 'function') {
          try { t.closeModal(); } catch (e) {}
        }
        if (typeof t.closePopup === 'function') {
          try { t.closePopup(); } catch (e) {}
        }
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

  // "Let AI Complete This Card" button handler - redirects to improve-card page
  const btnAiComplete = document.getElementById('btn-ai-complete');
  if (btnAiComplete) {
    btnAiComplete.addEventListener('click', () => {
      const search = window.location.search || '';
      const targetUrl = (t && typeof t.signUrl === 'function')
        ? t.signUrl('./improve-card.html')
        : ('./improve-card.html' + search);
      window.location.href = targetUrl;
    });
  }

  // Auto size popup iframe to content if supported
  resizePopup();
});
