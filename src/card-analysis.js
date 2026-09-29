// Heuristic, field-presence based analysis of a Trello card.
// Not AI-driven — this checks whether data exists on the card, not its quality.
// TODO: once api/score-card.js exists, consider blending this with an AI
// qualitative score instead of relying on presence-only checks.

export function analyzeCard(card) {
  const c = card || {};
  const desc = c.desc || '';
  const members = Array.isArray(c.members) ? c.members : [];
  const attachments = Array.isArray(c.attachments) ? c.attachments : [];
  const labels = Array.isArray(c.labels) ? c.labels : [];
  const due = c.due !== undefined ? c.due : null;

  // "Requirements" and "Definition of Done" are treated as present if the
  // Improve flow has already written those markdown sections into the
  // description (see improve-card.js), OR the user wrote them manually
  // using the same heading text.
  const hasSection = (heading) => {
    const re = new RegExp(`##\\s*${heading}\\s*\\n+[^\\n#]+`, 'i');
    return re.test(desc);
  };

  const critical = [
    {
      id: 'assignee',
      title: 'Assignee',
      filled: members.length > 0,
      filledDescription: `Assigned to ${members.map(m => m.fullName || m.username || 'Member').join(', ')}`,
      missingDescription: 'No one is assigned to this card',
      hint: 'Assign a member to own this card',
      actionLabel: 'Assign',
      actionType: 'assign-member'
    },
    {
      id: 'due-date',
      title: 'Due Date',
      filled: due !== null,
      filledDescription: due ? `Due ${new Date(due).toLocaleDateString()}` : '',
      missingDescription: 'No due date has been set',
      hint: 'Set a deadline to track timelines',
      actionLabel: 'Set Date',
      actionType: 'set-due-date'
    },
    {
      id: 'requirements',
      title: 'Requirements',
      filled: hasSection('Key Tasks') || desc.trim().split(/\s+/).filter(Boolean).length > 15,
      filledDescription: 'Requirements are defined',
      missingDescription: 'No clear requirements defined',
      hint: 'Add clear scope and requirements',
      actionLabel: 'Add',
      actionType: 'add-requirements'
    },
    {
      id: 'definition-of-done',
      title: 'Definition of Done',
      filled: hasSection('Definition of Done'),
      filledDescription: 'Completion criteria defined',
      missingDescription: 'Completion criteria not defined',
      hint: "Define what 'done' looks like",
      actionLabel: 'Define',
      actionType: 'define-dod'
    }
  ];

  const optional = [
    {
      id: 'attachments',
      title: 'Attachments',
      filled: attachments.length > 0,
      filledDescription: `${attachments.length} file${attachments.length === 1 ? '' : 's'} attached`,
      missingDescription: 'No files or links attached',
      hint: 'Attach mockups, briefs or reference files',
      actionLabel: 'Attach',
      actionType: 'add-attachment'
    },
    {
      id: 'priority-label',
      title: 'Priority Label',
      filled: labels.length > 0,
      filledDescription: `${labels.length} label${labels.length === 1 ? '' : 's'} applied`,
      missingDescription: 'No priority label applied to card',
      hint: 'Add a label to categorize this card',
      actionLabel: 'Label',
      actionType: 'add-label'
    }
  ];

  const total = critical.length + optional.length;
  const filledCount = [...critical, ...optional].filter(i => i.filled).length;
  const completeness = Math.round((filledCount / total) * 100);

  return {
    completeness,
    missingCount: [...critical, ...optional].filter(i => !i.filled).length,
    optionalMissingCount: optional.filter(i => !i.filled).length,
    critical,
    optional
  };
}
