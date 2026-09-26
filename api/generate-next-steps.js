import { callOpenRouter } from './_lib/openrouter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { objective, keyTasks, definitionOfDone, cardName } = req.body || {};

  if (!objective) {
    return res.status(400).json({ error: 'objective is required' });
  }

  const prompt = `You are an assistant that suggests the next high-level phases of work for a Trello card, after its checklist has already been generated.

Card name: ${cardName || 'Untitled'}
Objective: ${objective}
Key tasks: ${JSON.stringify(keyTasks || [])}
Definition of done: ${JSON.stringify(definitionOfDone || [])}

Respond with ONLY a valid JSON object, no other text, matching exactly this shape:

{
  "steps": [
    {
      "id": <integer, sequential starting at 1>,
      "title": "<short phase title>",
      "description": "<1-2 sentence explanation of what this phase involves>",
      "duration": "<rough estimate, e.g. '1-2 days', '1 week'>",
      "priority": "<one of: high, medium, low, or null>"
    }
  ]
}

Rules:
- Generate 3-5 sequential, high-level next steps/phases (not granular tasks — those already exist in the checklist)
- Steps should logically follow from the objective and definition of done, moving the work toward completion
- Only the first 1-2 steps should typically have priority "high"; later steps can be "medium", "low", or null
- Do NOT include any assignee, role, or "who does this" field — omit that entirely
- Keep descriptions concise, one to two sentences`;

  try {
    const result = await callOpenRouter([{ role: 'user', content: prompt }]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('generate-next-steps error:', err);
    return res.status(500).json({ error: 'Failed to generate next steps', details: err.message });
  }
}
