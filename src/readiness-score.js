/* global window, document */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// TODO: replace with real fetch from backend AI scoring endpoint once built
const readinessData = {
  overallScore: 54,
  status: 'Needs Work', // one of: 'Needs Work' | 'Almost Ready' | 'Ready'
  analyzedAt: 'just now',
  passingCount: 2,
  partialCount: 1,
  missingCount: 3,
  categories: [
    {
      id: 'description',
      title: 'Description',
      description: 'Well-structured content',
      score: 85,
      status: 'passing',
    },
    {
      id: 'checklist',
      title: 'Checklist',
      description: 'Tasks defined and structured',
      score: 80,
      status: 'passing',
    },
    {
      id: 'attachments',
      title: 'Attachments',
      description: 'Some files attached',
      score: 55,
      status: 'partial',
    },
    {
      id: 'assignee',
      title: 'Assignee',
      description: 'No member assigned',
      score: 0,
      status: 'missing',
    },
    {
      id: 'due-date',
      title: 'Due Date',
      description: 'No deadline set',
      score: 0,
      status: 'missing',
    },
    {
      id: 'definition-of-done',
      title: 'Definition of Done',
      description: 'Completion criteria missing',
      score: 0,
      status: 'missing',
    },
  ],
};

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
 * Create DOM element for a single category row
 */
function createCategoryCard(cat) {
  const card = document.createElement('div');
  const statusClass = cat.status || 'missing';
  card.className = `category-card ${statusClass}`;

  const badgeSymbol = getStatusBadgeSymbol(cat.status);
  const score = Math.max(0, Math.min(100, Number(cat.score) || 0));

  card.innerHTML = `
    <div class="category-top">
      <div class="category-left">
        <div class="category-icon-box ${statusClass}">
          ${getCategorySvgIcon(cat.id)}
        </div>
        <div class="category-title-group">
          <span class="category-title">${cat.title}</span>
          <span class="category-desc ${statusClass}">${cat.description}</span>
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
 * Render all components from readinessData
 */
function renderReadinessScore(data) {
  const score = Math.max(0, Math.min(100, Number(data.overallScore) || 0));

  // 1. Breadcrumb timestamp
  const analyzedAtEl = document.getElementById('breadcrumb-analyzed-at');
  if (analyzedAtEl) {
    analyzedAtEl.textContent = `Analyzed ${data.analyzedAt || 'just now'}`;
  }

  // 2. Donut Ring Progress
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  const offset = circumference - (score / 100) * circumference;

  const donutProgress = document.getElementById('donut-progress-circle');
  const donutScoreValue = document.getElementById('donut-score-value');

  if (donutProgress) {
    donutProgress.style.strokeDasharray = `${circumference}`;
    donutProgress.style.strokeDashoffset = `${offset}`;
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

  if (currentStatusText) currentStatusText.textContent = data.status;
  if (legendPassing) legendPassing.textContent = `${data.passingCount} categories passing`;
  if (legendPartial) legendPartial.textContent = `${data.partialCount} category partial`;
  if (legendMissing) legendMissing.textContent = `${data.missingCount} categories missing`;

  // 4. Status Scale Bar active state
  const scaleSegments = document.querySelectorAll('.scale-segment');
  scaleSegments.forEach((seg) => {
    const segStatus = seg.getAttribute('data-status');
    if (segStatus === data.status) {
      seg.classList.add('active');
    } else {
      seg.classList.remove('active');
    }
  });

  // 5. Category Breakdown Cards
  const categoryList = document.getElementById('category-list');
  if (categoryList) {
    categoryList.innerHTML = '';
    (data.categories || []).forEach((cat) => {
      categoryList.appendChild(createCategoryCard(cat));
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Render initial readiness data
  renderReadinessScore(readinessData);

  // Close Popup handler
  const btnClose = document.getElementById('btn-close-popup');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      if (window.self !== window.top && t && typeof t.closePopup === 'function') {
        t.closePopup();
      } else {
        console.log('[Card Readiness Score] Close popup triggered (standalone preview)');
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    });
  }

  // "Rescan card" link handler
  const btnRescan = document.getElementById('btn-rescan-card');
  if (btnRescan) {
    btnRescan.addEventListener('click', (event) => {
      event.preventDefault();
      // TODO: re-fetch card data via t.card('all') and re-run AI scoring endpoint once backend exists — this is read-only, no card write-back
      console.log('rescan triggered');
    });
  }

  // "History ↗" link handler
  const linkHistory = document.getElementById('link-history');
  if (linkHistory) {
    linkHistory.addEventListener('click', (event) => {
      event.preventDefault();
      // TODO: decide if this opens another popup or navigates elsewhere once designed
      console.log('history clicked');
    });
  }

  // Auto size popup iframe to content if supported
  if (t && typeof t.sizeTo === 'function') {
    t.sizeTo('#popup-container');
  }
});
