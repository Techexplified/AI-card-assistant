/* global window, document, sessionStorage */
import { TRELLO_APP_KEY, TRELLO_APP_NAME, TRELLO_APP_AUTHOR } from './config.js';
import { runReadinessScan } from './score-service.js';

// Initialize Trello Power-Up iframe interface with credentials
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe({
      appKey: TRELLO_APP_KEY,
      appName: TRELLO_APP_NAME,
      appAuthor: TRELLO_APP_AUTHOR,
    })
  : null;

let isScanning = false;

/**
 * Get SVG icon string for category card
 */
function getCategorySvgIcon(id) {
  switch (id) {
    case 'description':
      return `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    case 'checklist':
      return `<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
    case 'attachments':
      return `<svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;
    case 'assignee':
      return `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    case 'due-date':
      return `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
    case 'definition-of-done':
      return `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    default:
      return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>`;
  }
}

/**
 * Get status badge symbol for category card
 */
function getStatusBadgeSymbol(status) {
  switch (status) {
    case 'passing':
      return '✓';
    case 'partial':
      return '−';
    case 'missing':
      return '×';
    default:
      return '';
  }
}

/**
 * Format relative time (e.g. "just now", "2m ago", "1h ago")
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return 'just now';
  const diffMs = Date.now() - Number(timestamp);
  if (diffMs < 0) return 'just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Create DOM element for a single category row
 */
function createCategoryCard(cat) {
  const card = document.createElement('div');
  let statusClass = cat.status;
  if (!statusClass) {
    if (cat.score >= 75) statusClass = 'passing';
    else if (cat.score >= 40) statusClass = 'partial';
    else statusClass = 'missing';
  }
  card.className = `category-card ${statusClass}`;

  const badgeSymbol = getStatusBadgeSymbol(statusClass);
  const score = Math.max(0, Math.min(100, Number(cat.score) || 0));

  card.innerHTML = `
    <div class="category-top">
      <div class="category-left">
        <div class="category-icon-box ${statusClass}">
          ${getCategorySvgIcon(cat.id)}
        </div>
        <div class="category-title-group">
          <span class="category-title">${cat.title}</span>
          <span class="category-desc ${statusClass}">${cat.description || ''}</span>
        </div>
      </div>
      <div class="category-right">
        <span class="category-score-text">${score}/100</span>
        <span class="category-badge-circle ${statusClass}">${badgeSymbol}</span>
      </div>
    </div>
    <div class="category-bar-track">
      <div class="category-bar-fill ${statusClass}" style="width: ${score}%;"></div>
    </div>
  `;

  return card;
}

/**
 * Render all components from analyzed readiness scan
 */
function renderReadinessScore(data) {
  if (!data) return;
  const rawScore = typeof data.overallScore === 'number'
    ? data.overallScore
    : (typeof data.score === 'number' ? data.score : 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // 1. Breadcrumb timestamp
  const analyzedAtEl = document.getElementById('breadcrumb-analyzed-at');
  if (analyzedAtEl) {
    const timeStr = typeof data.scannedAt === 'number'
      ? formatRelativeTime(data.scannedAt)
      : (data.analyzedAt || 'just now');
    analyzedAtEl.textContent = `Analyzed ${timeStr}`;
  }

  // 2. Donut Ring Progress (radius 38 matches SVG cx=50, cy=50, r=38)
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  const offset = circumference - (score / 100) * circumference;

  const donutProgress = document.getElementById('donut-progress-circle');
  const donutScoreValue = document.getElementById('donut-score-value');

  if (donutProgress) {
    donutProgress.style.strokeDasharray = `${circumference}`;
    donutProgress.style.strokeDashoffset = `${offset.toFixed(2)}`;
    if (score >= 85) {
      donutProgress.style.stroke = '#16a34a';
    } else if (score >= 60) {
      donutProgress.style.stroke = '#d97706';
    } else {
      donutProgress.style.stroke = '#dc2626';
    }
  }
  if (donutScoreValue) {
    donutScoreValue.textContent = `${score}%`;
  }

  // 3. Current Status Pill & Counts
  const currentStatusText = document.getElementById('current-status-text');
  const currentStatusPill = document.getElementById('current-status-pill');
  const legendPassing = document.getElementById('legend-passing-text');
  const legendPartial = document.getElementById('legend-partial-text');
  const legendMissing = document.getElementById('legend-missing-text');

  let status = data.status;
  if (!status) {
    if (score >= 85) status = 'Ready';
    else if (score >= 60) status = 'Almost Ready';
    else status = 'Needs Work';
  }

  if (currentStatusText) currentStatusText.textContent = status;

  if (currentStatusPill) {
    currentStatusPill.className = 'current-status-pill';
    const statusNormalized = status.toLowerCase().replace(/\s+/g, '-');
    if (statusNormalized === 'ready') {
      currentStatusPill.classList.add('ready');
    } else if (statusNormalized === 'almost-ready') {
      currentStatusPill.classList.add('almost-ready');
    } else {
      currentStatusPill.classList.add('needs-work');
    }
  }

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const passingCount = typeof data.passingCount === 'number'
    ? data.passingCount
    : categories.filter((c) => c.score >= 75).length;
  const partialCount = typeof data.partialCount === 'number'
    ? data.partialCount
    : categories.filter((c) => c.score >= 40 && c.score < 75).length;
  const missingCount = typeof data.missingCount === 'number'
    ? data.missingCount
    : categories.filter((c) => c.score < 40).length;

  if (legendPassing) legendPassing.textContent = `${passingCount} categories passing`;
  if (legendPartial) legendPartial.textContent = `${partialCount} category partial`;
  if (legendMissing) legendMissing.textContent = `${missingCount} categories missing`;

  // 4. Status Scale Bar active state
  const scaleSegments = document.querySelectorAll('.scale-segment');
  scaleSegments.forEach((seg) => {
    const segStatus = seg.getAttribute('data-status');
    if (segStatus === status) {
      seg.classList.add('active');
    } else {
      seg.classList.remove('active');
    }
  });

  // 5. Category Breakdown Cards
  const categoryList = document.getElementById('category-list');
  if (categoryList) {
    categoryList.innerHTML = '';
    categories.forEach((cat) => {
      categoryList.appendChild(createCategoryCard(cat));
    });
  }

  // Adjust popup size cleanly after render
  if (t && typeof t.sizeTo === 'function') {
    const container = document.getElementById('popup-container') || document.body;
    t.sizeTo(container);
  }
}

/**
 * Execute card scan and re-render UI
 */
async function triggerRescan() {
  if (isScanning) return;
  isScanning = true;

  const btnRescan = document.getElementById('btn-rescan-card');
  if (btnRescan) {
    btnRescan.innerHTML = '<span>⏳ Scanning card...</span>';
    btnRescan.style.pointerEvents = 'none';
  }

  try {
    const scanResult = await runReadinessScan(t);
    renderReadinessScore(scanResult);
  } catch (err) {
    console.error('[Readiness Score] Scan failed:', err);
  } finally {
    isScanning = false;
    if (btnRescan) {
      btnRescan.innerHTML = '<span>🔄 Rescan card</span>';
      btnRescan.style.pointerEvents = 'auto';
    }
  }
}

/**
 * Initial load: check stored scan or run fresh scan
 */
async function loadReadinessScore() {
  const isInsideTrello = window.self !== window.top && Boolean(t);

  // 1. Fetch breadcrumb metadata
  if (isInsideTrello && typeof t.card === 'function') {
    Promise.all([
      t.card('name'),
      typeof t.list === 'function' ? t.list('name') : Promise.resolve(null),
    ])
      .then(([card, list]) => {
        if (card && card.name) {
          const cardNameEl = document.getElementById('breadcrumb-card-name');
          if (cardNameEl) cardNameEl.textContent = card.name;
        }
        if (list && list.name) {
          const listNameEl = document.getElementById('breadcrumb-list-name');
          if (listNameEl) listNameEl.textContent = list.name;
        }
      })
      .catch((e) => console.warn('[Readiness Score] Breadcrumbs error:', e));
  }

  // 2. Check stored readiness data first
  let stored = null;
  if (isInsideTrello && typeof t.get === 'function') {
    try {
      stored = await t.get('card', 'shared', 'readiness');
    } catch (e) {}
  }

  if (!stored) {
    try {
      const sessionStored = sessionStorage.getItem('trello_readiness');
      if (sessionStored) stored = JSON.parse(sessionStored);
    } catch (e) {}
  }

  if (stored && Array.isArray(stored.categories) && stored.categories.length > 0) {
    renderReadinessScore(stored);
  } else {
    // Run initial scan if no stored scan exists
    await triggerRescan();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Load stored scan or run scan
  loadReadinessScore();

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
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    });
  }

  // "Rescan card" button handler
  const btnRescan = document.getElementById('btn-rescan-card');
  if (btnRescan) {
    btnRescan.addEventListener('click', (event) => {
      event.preventDefault();
      triggerRescan();
    });
  }

  // "History ↗" link handler
  const linkHistory = document.getElementById('link-history');
  if (linkHistory) {
    linkHistory.addEventListener('click', (event) => {
      event.preventDefault();
    });
  }

  // Auto size popup iframe to content if supported
  if (t && typeof t.sizeTo === 'function') {
    const container = document.getElementById('popup-container') || document.body;
    t.sizeTo(container);
  }
});
