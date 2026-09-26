import { callOpenRouter } from './_lib/openrouter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { objective, keyTasks, definitionOfDone, cardName } = req.body || {};

  if (!objective) {
    return res.status(400).json({ error: 'objective is required' });
  }

  const prompt = `You are an assistant that breaks down a project objective into a categorized, actionable checklist for Trello.

Card name: ${cardName || 'Untitled'}
Objective: ${objective}
Key tasks already identified: ${JSON.stringify(keyTasks || [])}
Definition of done: ${JSON.stringify(definitionOfDone || [])}

Respond with ONLY a valid JSON object, no other text, matching exactly this shape:

{
  "categories": [
    {
      "id": "<kebab-case-id>",
      "name": "<category name, e.g. Design, Development, QA & Testing>",
      "color": "<one of: purple, green, orange, blue>",
      "items": [
        { "id": "<unique-id>", "text": "<specific actionable task>", "completed": false }
      ]
    }
  ]
}

Rules:
- Group tasks into 2-4 logical categories based on the objective and key tasks (e.g. Design, Development, QA & Testing, Research — choose whatever categories genuinely fit this specific card, don't force a fixed set)
- Each category should have 2-6 items
- Items should be specific and actionable, derived from the key tasks and definition of done, not generic filler
- Assign colors from the allowed list only, don't repeat the same color for adjacent categories if avoidable
- All "completed" values must be false`;

  try {
    const result = await callOpenRouter([{ role: 'user', content: prompt }]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('generate-checklist error:', err);
    return res.status(500).json({ error: 'Failed to generate checklist', details: err.message });
  }
}
