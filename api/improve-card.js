import { callOpenRouter } from './_lib/openrouter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, cardName } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Card description is required' });
  }

  const prompt = `You are an assistant that analyzes Trello card descriptions and rewrites them to be clearer and more actionable.

Card name: ${cardName || 'Untitled'}
Original description:
"""
${description}
"""

Analyze this description and respond with ONLY a valid JSON object matching exactly this shape, no other text:

{
  "issuesDetected": ["short issue phrase", ...],
  "currentScore": { "value": <0-100 integer>, "status": "<one of: Needs Work, Almost Ready, Ready>" },
  "objective": "<one rewritten paragraph stating a clear, measurable objective>",
  "keyTasks": ["task 1", "task 2", ...],
  "definitionOfDone": ["criterion 1", "criterion 2", ...],
  "newScore": { "status": "<one of: Needs Work, Almost Ready, Ready to Execute>", "improvementPercent": <integer, how much better the rewritten version is> }
}

Rules:
- issuesDetected: 3-5 short phrases describing what's vague or missing in the original
- keyTasks: 3-6 concrete, actionable tasks derived from the objective
- definitionOfDone: 3-5 concrete, verifiable completion criteria
- currentScore.value should reflect how complete/clear the ORIGINAL description is
- Keep all text concise and professional`;

  try {
    const result = await callOpenRouter([
      { role: 'user', content: prompt }
    ]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('improve-card error:', err);
    return res.status(500).json({ error: 'Failed to generate improvements', details: err.message });
  }
}
