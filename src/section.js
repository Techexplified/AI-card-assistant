/* global window, document */

// TODO: replace with real fetch from backend AI scoring endpoint once built
const cardReadinessData = {
  score: 54,
  status: 'Needs Work',
  statusColor: '#ea580c',
  trackColor: '#fde8e8',
  description: 'Missing critical information.',
};

// Initialize Trello Power-Up iframe interface
const t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

/**
 * Determine theme colors based on score value
 */
function getScoreColors(score, customStatusColor, customTrackColor) {
  if (customStatusColor && customTrackColor) {
    return { statusColor: customStatusColor, trackColor: customTrackColor };
  }

  if (score >= 80) {
    return {
      statusColor: '#16a34a', // green
      trackColor: '#dcfce7',  // soft light green
    };
  } else if (score >= 60) {
    return {
      statusColor: '#d97706', // amber/orange
      trackColor: '#fef3c7',  // soft light amber
    };
  } else {
    return {
      statusColor: customStatusColor || '#ea580c', // orange/coral
      trackColor: customTrackColor || '#fde8e8',   // soft pink/cream
    };
  }
}

/**
 * Renders the readiness data into the DOM
 */
function renderCardReadiness(data) {
  const score = Math.max(0, Math.min(100, Number(data.score) || 0));
  const colors = getScoreColors(score, data.statusColor, data.trackColor);

  const radius = 32;
  const circumference = 2 * Math.PI * radius; // ~201.06
  const offset = circumference - (score / 100) * circumference;

  const progressCircle = document.getElementById('progress-circle');
  const trackCircle = document.getElementById('track-circle');
  const scoreValue = document.getElementById('score-value');
  const statusDot = document.getElementById('status-dot');
  const statusTitle = document.getElementById('status-title');
  const statusDescription = document.getElementById('status-description');

  if (progressCircle) {
    progressCircle.style.strokeDasharray = `${circumference}`;
    progressCircle.style.strokeDashoffset = `${offset}`;
    progressCircle.style.stroke = colors.statusColor;
  }

  if (trackCircle) {
    trackCircle.style.stroke = colors.trackColor;
  }

  if (scoreValue) {
    scoreValue.textContent = `${score}%`;
    scoreValue.style.color = colors.statusColor;
  }

  if (statusDot) {
    statusDot.style.backgroundColor = colors.statusColor;
  }

  if (statusTitle) {
    statusTitle.textContent = data.status;
    statusTitle.style.color = colors.statusColor;
  }

  if (statusDescription) {
    statusDescription.textContent = data.description;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Render initial card readiness
  renderCardReadiness(cardReadinessData);

  // Wire up "View Details" button click handler
  const btnViewDetails = document.getElementById('btn-view-details');
  if (btnViewDetails) {
    btnViewDetails.addEventListener('click', (event) => {
      if (t && typeof t.popup === 'function') {
        return t.popup({
          title: 'Missing Info Detector',
          url: t.signUrl ? t.signUrl('./missing-info.html') : './missing-info.html',
          height: 400,
        });
      } else {
        console.log('[AI Assistant] View Details clicked -> Missing Info Detector popup');
      }
    });
  }

  // Wire up Ring Eye Icon click handler
  const ringOverlay = document.getElementById('ring-overlay');
  const ringWrapper = document.getElementById('ring-wrapper');
  const handleScoreDetails = (event) => {
    if (t && typeof t.popup === 'function') {
      return t.popup({
        title: 'Card Readiness Score',
        url: t.signUrl ? t.signUrl('./readiness-score.html') : './readiness-score.html',
        height: 400,
      });
    } else {
      console.log('[AI Assistant] Ring clicked -> Card Readiness Score popup');
    }
  };

  if (ringOverlay) {
    ringOverlay.addEventListener('click', handleScoreDetails);
  }

  // Auto size iframe to content in Trello if supported
  if (t && typeof t.sizeTo === 'function') {
    t.sizeTo('#section-container');
  }
});
