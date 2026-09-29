/* global window, sessionStorage, fetch */
import { scoreCardFallback } from './card-analysis.js';

const FALLBACK_SAMPLE_CARD = {
  name: 'Website Redesign',
  desc: "We need to redesign the marketing website. It's not working well and users are complaining. Need to make it better and improve conversions somehow.\n\nShould look modern and work on mobile. Jane said stakeholders want it done soon. Maybe add new landing pages too? Not sure about timeline or who's doing it.",
  checklists: [],
  attachments: [],
  members: [],
  due: null,
};

export async function runReadinessScan(t) {
  let card = null;
  const isInsideTrello = typeof window !== 'undefined' && window.self !== window.top && Boolean(t);

  if (isInsideTrello && typeof t.card === 'function') {
    try {
      card = await t.card('desc', 'name', 'checklists', 'attachments', 'members', 'due');
    } catch (e) {
      console.warn('[Score Service] Could not fetch card from Trello:', e);
    }
  }

  const c = card || FALLBACK_SAMPLE_CARD;
  const rawChecklists = Array.isArray(c.checklists) ? c.checklists : [];
  const attachments = Array.isArray(c.attachments) ? c.attachments : [];
  const members = Array.isArray(c.members) ? c.members : [];
  const due = c.due !== undefined ? c.due : null;

  const checklists = rawChecklists.map((cl) => {
    const items = Array.isArray(cl.checkItems) ? cl.checkItems : [];
    return {
      total: items.length,
      completed: items.filter((i) => i.state === 'complete' || i.checked).length,
    };
  });

  let result;
  try {
    const response = await fetch('/api/score-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        desc: c.desc || '',
        cardName: c.name || 'Untitled',
        checklists,
        attachmentsCount: attachments.length,
        hasAssignee: members.length > 0,
        hasDueDate: due !== null,
      }),
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    result = await response.json();
  } catch (err) {
    console.error('AI scoring failed, using fallback:', err);
    result = scoreCardFallback(c);
    result.degraded = true; // UI can show a subtle "estimated" indicator if desired
  }

  const categories = Array.isArray(result.categories) ? result.categories : [];
  const passingCount = categories.filter((cat) => cat.score >= 75).length;
  const partialCount = categories.filter((cat) => cat.score >= 40 && cat.score < 75).length;
  const missingCount = categories.filter((cat) => cat.score < 40).length;

  const scan = {
    ...result,
    score: result.overallScore, // Ensures compatibility with any consumer checking .score
    passingCount,
    partialCount,
    missingCount,
    scannedAt: Date.now(),
  };

  if (isInsideTrello && t && typeof t.set === 'function') {
    try {
      await t.set('card', 'shared', 'readiness', scan);
    } catch (e) {
      console.warn('[Score Service] Could not write readiness to Trello card storage:', e);
    }
  }

  try {
    sessionStorage.setItem('trello_readiness', JSON.stringify(scan));
  } catch (e) {}

  return scan;
}
