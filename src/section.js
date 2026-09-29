/* global window, document, sessionStorage */
import { getScoreColor, getScoreTrackColor, getScoreStatus, getScoreDescription } from './score-utils.js';

// Initialize Trello Power-Up iframe interface
const t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

/**
 * Renders the card readiness score and AI Next Steps block into the DOM
 */
export function renderSection(readiness, nextSteps) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius; // ~201.06

  const progressCircle = document.getElementById('progress-circle');
  const trackCircle = document.getElementById('track-circle');
  const scoreValue = document.getElementById('score-value');
  const statusDot = document.getElementById('status-dot');
  const statusTitle = document.getElementById('status-title');
  const statusDescription = document.getElementById('status-description');

  // 1. Render Readiness Score & Status
  const rawScore = readiness && (typeof readiness.overallScore === 'number' ? readiness.overallScore : (typeof readiness.score === 'number' ? readiness.score : null));

  if (rawScore !== null && rawScore !== undefined) {
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const scoreColor = getScoreColor(score);
    const trackColor = getScoreTrackColor(score);
    const status = readiness.status || getScoreStatus(score);
    const description = getScoreDescription(score);
    const offset = circumference - (score / 100) * circumference;

    if (progressCircle) {
      progressCircle.style.strokeDasharray = `${circumference}`;
      progressCircle.style.strokeDashoffset = `${offset.toFixed(2)}`;
      progressCircle.style.stroke = scoreColor;
      progressCircle.style.opacity = '1';
    }
    if (trackCircle) {
      trackCircle.style.stroke = trackColor;
    }
    if (scoreValue) {
      scoreValue.textContent = `${score}%`;
      scoreValue.style.color = scoreColor;
    }
    if (statusDot) {
      statusDot.style.backgroundColor = scoreColor;
    }
    if (statusTitle) {
      statusTitle.textContent = status;
      statusTitle.style.color = scoreColor;
    }
    if (statusDescription) {
      statusDescription.textContent = description;
    }
  } else {
    // Empty state: neutral gray ring track with no arc, "—" in center, gray dot with "Not analyzed yet", description "Run an analysis to see your score"
    if (progressCircle) {
      progressCircle.style.strokeDasharray = `${circumference}`;
      progressCircle.style.strokeDashoffset = `${circumference.toFixed(2)}`;
      progressCircle.style.stroke = 'transparent';
      progressCircle.style.opacity = '0';
    }
    if (trackCircle) {
      trackCircle.style.stroke = '#e2e8f0';
    }
    if (scoreValue) {
      scoreValue.textContent = '—';
      scoreValue.style.color = '#94a3b8';
    }
    if (statusDot) {
      statusDot.style.backgroundColor = '#94a3b8';
    }
    if (statusTitle) {
      statusTitle.textContent = 'Not analyzed yet';
      statusTitle.style.color = '#64748b';
    }
    if (statusDescription) {
      statusDescription.textContent = 'Run an analysis to see your score';
    }
  }

  // 2. Render Next Steps Block
  const nextStepsBlock = document.getElementById('next-steps-block');
  const nextStepsList = document.getElementById('next-steps-list');
  const countPill = document.getElementById('next-steps-count-pill');
  const viewAllText = document.getElementById('view-all-steps-text');

  if (nextSteps && Array.isArray(nextSteps) && nextSteps.length > 0) {
    if (countPill) {
      countPill.textContent = String(nextSteps.length);
    }
    if (viewAllText) {
      viewAllText.textContent = `View all ${nextSteps.length} step${nextSteps.length === 1 ? '' : 's'}`;
    }

    if (nextStepsList) {
      nextStepsList.innerHTML = '';
      const displaySteps = nextSteps.slice(0, 3);
      displaySteps.forEach((step, index) => {
        const row = document.createElement('div');
        row.className = 'next-step-row';

        const badge = document.createElement('div');
        badge.className = `next-step-badge ${index === 0 ? 'step-badge-primary' : 'step-badge-secondary'}`;
        badge.textContent = String(index + 1);

        const text = document.createElement('span');
        text.className = 'next-step-text';
        text.textContent = step.title || step.description || `Step ${index + 1}`;
        text.title = text.textContent;

        row.appendChild(badge);
        row.appendChild(text);
        nextStepsList.appendChild(row);
      });
    }

    if (nextStepsBlock) {
      nextStepsBlock.style.display = 'flex';
    }
  } else {
    if (nextStepsBlock) {
      nextStepsBlock.style.display = 'none';
    }
  }
}

/**
 * Setup navigation and modal triggers
 */
function setupEventHandlers() {
  // Wire up "View Details" button click handler
  const btnViewDetails = document.getElementById('btn-view-details');
  if (btnViewDetails) {
    btnViewDetails.addEventListener('click', (event) => {
      window.scrollTo(0, 0);
      if (window.self !== window.top && t && typeof t.modal === 'function') {
        return t.modal({
          title: 'Missing Info Detector',
          url: t.signUrl ? t.signUrl('./missing-info.html') : './missing-info.html',
          height: 580,
          fullscreen: false,
          accentColor: '#5b4fe9',
        });
      } else if (window.self !== window.top && t && typeof t.popup === 'function') {
        return t.popup({
          title: 'Missing Info Detector',
          url: t.signUrl ? t.signUrl('./missing-info.html') : './missing-info.html',
          height: 520,
          mouseEvent: event,
        });
      } else {
        console.log('[AI Assistant] Opening missing-info.html (standalone preview)');
        window.scrollTo(0, 0);
        window.location.href = './missing-info.html';
      }
    });
  }

  // Wire up Ring Eye Icon and Wrapper click handler
  const handleScoreDetails = (event) => {
    if (window.self !== window.top && t && typeof t.modal === 'function') {
      return t.modal({
        title: 'Card Readiness Score',
        url: t.signUrl ? t.signUrl('./readiness-score.html') : './readiness-score.html',
        height: 580,
        fullscreen: false,
        accentColor: '#5b4fe9',
      });
    } else if (window.self !== window.top && t && typeof t.popup === 'function') {
      return t.popup({
        title: 'Card Readiness Score',
        url: t.signUrl ? t.signUrl('./readiness-score.html') : './readiness-score.html',
        height: 520,
        mouseEvent: event,
      });
    } else {
      console.log('[AI Assistant] Ring clicked (standalone preview)');
      window.location.href = './readiness-score.html';
    }
  };

  const ringOverlay = document.getElementById('ring-overlay');
  if (ringOverlay) {
    ringOverlay.addEventListener('click', handleScoreDetails);
  }

  const ringWrapper = document.getElementById('ring-wrapper');
  if (ringWrapper) {
    ringWrapper.addEventListener('click', handleScoreDetails);
  }

  // Wire up "View all steps" button in Next Steps block
  const btnViewAllSteps = document.getElementById('btn-view-all-steps');
  if (btnViewAllSteps) {
    btnViewAllSteps.addEventListener('click', (event) => {
      window.scrollTo(0, 0);
      if (window.self !== window.top && t && typeof t.modal === 'function') {
        return t.modal({
          title: 'Suggested Next Steps',
          url: t.signUrl ? t.signUrl('./next-steps.html') : './next-steps.html',
          height: 600,
          fullscreen: false,
          accentColor: '#5b4fe9',
        });
      } else if (window.self !== window.top && t && typeof t.popup === 'function') {
        return t.popup({
          title: 'Suggested Next Steps',
          url: t.signUrl ? t.signUrl('./next-steps.html') : './next-steps.html',
          height: 540,
          mouseEvent: event,
        });
      } else {
        console.log('[AI Assistant] Opening next-steps.html (standalone preview)');
        window.scrollTo(0, 0);
        window.location.href = './next-steps.html';
      }
    });
  }
}

// Subscribe to Trello render lifecycle
if (t && typeof t.render === 'function') {
  t.render(function () {
    return Promise.all([
      t.get('card', 'shared', 'readiness'),
      t.get('card', 'shared', 'nextSteps'),
    ]).then(function ([readiness, nextSteps]) {
      renderSection(readiness, nextSteps);
      return t.sizeTo('body');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupEventHandlers();

  // If in standalone preview or before t.render runs
  if (!t || typeof t.render !== 'function') {
    let fallbackReadiness = null;
    let fallbackNextSteps = null;
    try {
      const stored = sessionStorage.getItem('trello_readiness');
      if (stored) fallbackReadiness = JSON.parse(stored);
      const storedSteps = sessionStorage.getItem('trello_nextSteps');
      if (storedSteps) fallbackNextSteps = JSON.parse(storedSteps);
    } catch (e) {}
    renderSection(fallbackReadiness, fallbackNextSteps);
  }
});
