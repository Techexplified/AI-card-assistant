import { callOpenRouter } from './_lib/openrouter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { desc, cardName, checklists, attachmentsCount, hasAssignee, hasDueDate } = req.body;

  const totalItems = (checklists || []).reduce((s, c) => s + (c.total || 0), 0);
  const completedItems = (checklists || []).reduce((s, c) => s + (c.completed || 0), 0);

  const prompt = `You are grading how "ready to execute" a Trello card is, based on its current state.

Card name: ${cardName || 'Untitled'}
Description:
"""
${desc || '(empty)'}
"""
Checklist: ${totalItems} total items, ${completedItems} completed
Attachments: ${attachmentsCount || 0}
Assignee set: ${hasAssignee ? 'yes' : 'no'}
Due date set: ${hasDueDate ? 'yes' : 'no'}

Respond with ONLY a valid JSON object, no other text, matching exactly this shape:

{
  "categories": [
    { "id": "description", "title": "Description", "score": <0-100>, "description": "<short phrase>" },
    { "id": "checklist", "title": "Checklist", "score": <0-100>, "description": "<short phrase>" },
    { "id": "attachments", "title": "Attachments", "score": <0-100>, "description": "<short phrase>" },
    { "id": "assignee", "title": "Assignee", "score": <0-100>, "description": "<short phrase>" },
    { "id": "due-date", "title": "Due Date", "score": <0-100>, "description": "<short phrase>" },
    { "id": "definition-of-done", "title": "Definition of Done", "score": <0-100>, "description": "<short phrase>" }
  ],
  "overallScore": <0-100 integer>,
  "status": "<one of: Needs Work, Almost Ready, Ready>"
}

Rules:
- Grade description quality and clarity, not just length
- assignee/due-date scores should be 100 if set, 0 if not (binary — these aren't AI judgment calls)
- overallScore should reflect the general average but you may weight description/checklist slightly higher than assignee/due-date
- status: Needs Work if overallScore < 60, Almost Ready if 60-84, Ready if 85+`;

  try {
    const result = await callOpenRouter([{ role: 'user', content: prompt }]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('score-card error:', err);
    return res.status(500).json({ error: 'Failed to score card', details: err.message });
  }
}
