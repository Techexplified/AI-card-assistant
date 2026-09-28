const STOPS = [
  { at: 0,   color: [239, 68, 68] },   // red
  { at: 50,  color: [249, 115, 22] },  // orange
  { at: 75,  color: [234, 179, 8] },   // yellow
  { at: 100, color: [34, 197, 94] }    // green
];

export function getScoreColor(score) {
  const s = Math.max(0, Math.min(100, score));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i], b = STOPS[i + 1];
    if (s <= b.at) {
      const t = (s - a.at) / (b.at - a.at);
      const c = a.color.map((v, j) => Math.round(v + (b.color[j] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1].color.join(', ')})`;
}

// Light tint of the same color, for the ring's background track
export function getScoreTrackColor(score) {
  return getScoreColor(score).replace('rgb(', 'rgba(').replace(')', ', 0.18)');
}

// Single place for status cutoffs so frontend and backend can share them later
export function getScoreStatus(score) {
  if (score >= 85) return 'Ready';
  if (score >= 60) return 'Almost Ready';
  return 'Needs Work';
}

export function getScoreDescription(score) {
  if (score >= 85) return 'Ready to execute';
  if (score >= 60) return 'Almost there';
  return 'Missing critical information';
}
