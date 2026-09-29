// Heuristic, field-presence based analysis of a Trello card.
// Not AI-driven — this checks whether data exists on the card, not its quality.

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
      hint: 'Assign a member to own this card'
    },
    {
      id: 'due-date',
      title: 'Due Date',
      filled: due !== null,
      filledDescription: due ? `Due ${new Date(due).toLocaleDateString()}` : '',
      missingDescription: 'No due date has been set',
      hint: 'Set a deadline to track timelines'
    },
    {
      id: 'requirements',
      title: 'Requirements',
      filled: hasSection('Key Tasks') || desc.trim().split(/\s+/).filter(Boolean).length > 15,
      filledDescription: 'Requirements are defined',
      missingDescription: 'No clear requirements defined',
      hint: 'Add clear scope and requirements'
    },
    {
      id: 'definition-of-done',
      title: 'Definition of Done',
      filled: hasSection('Definition of Done'),
      filledDescription: 'Completion criteria defined',
      missingDescription: 'Completion criteria not defined',
      hint: "Define what 'done' looks like"
    }
  ];

  const optional = [
    {
      id: 'attachments',
      title: 'Attachments',
      filled: attachments.length > 0,
      filledDescription: `${attachments.length} file${attachments.length === 1 ? '' : 's'} attached`,
      missingDescription: 'No files or links attached',
      hint: 'Attach mockups, briefs or reference files'
    },
    {
      id: 'priority-label',
      title: 'Priority Label',
      filled: labels.length > 0,
      filledDescription: `${labels.length} label${labels.length === 1 ? '' : 's'} applied`,
      missingDescription: 'No priority label applied to card',
      hint: 'Add a label to categorize this card'
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

// Fallback only. Primary scoring comes from api/score-card.js (AI-based).
// Used only if that call fails, so the UI still shows something.
export function scoreCardFallback(card) {
  const c = card || {};
  const desc = c.desc || '';
  const members = Array.isArray(c.members) ? c.members : [];
  const attachments = Array.isArray(c.attachments) ? c.attachments : [];
  const checklists = Array.isArray(c.checklists) ? c.checklists : [];
  const due = c.due !== undefined ? c.due : null;

  const hasSection = (heading) => {
    const re = new RegExp(`##\\s*${heading}\\s*\\n+[^\\n#]+`, 'i');
    return re.test(desc);
  };

  // 1. Description score
  const wordCount = desc.trim().split(/\s+/).filter(Boolean).length;
  let descScore = 0;
  let descText = 'Empty description';
  if (wordCount > 30 || hasSection('Objective')) {
    descScore = 90;
    descText = 'Well-structured content';
  } else if (wordCount > 15) {
    descScore = 65;
    descText = 'Basic description provided';
  } else if (wordCount > 0) {
    descScore = 35;
    descText = 'Very brief description';
  }

  // 2. Checklist score
  let totalCheckItems = 0;
  let completedCheckItems = 0;
  checklists.forEach((cl) => {
    const items = Array.isArray(cl.checkItems) ? cl.checkItems : [];
    totalCheckItems += items.length;
    completedCheckItems += items.filter((i) => i.state === 'complete' || i.checked).length;
  });
  let checklistScore = 0;
  let checklistText = 'No checklist defined';
  if (totalCheckItems > 0) {
    const percentDone = Math.round((completedCheckItems / totalCheckItems) * 100);
    checklistScore = Math.max(50, percentDone);
    checklistText = `${completedCheckItems}/${totalCheckItems} items completed`;
  } else if (hasSection('Key Tasks')) {
    checklistScore = 75;
    checklistText = 'Tasks defined in description';
  }

  // 3. Attachments score
  let attachScore = 0;
  let attachText = 'No files attached';
  if (attachments.length > 0) {
    attachScore = attachments.length >= 2 ? 100 : 70;
    attachText = `${attachments.length} file${attachments.length === 1 ? '' : 's'} attached`;
  }

  // 4. Assignee score (binary: 100 or 0)
  const assigneeScore = members.length > 0 ? 100 : 0;
  const assigneeText = members.length > 0
    ? `Assigned to ${members.map((m) => m.fullName || m.username || 'Member').join(', ')}`
    : 'No member assigned';

  // 5. Due date score (binary: 100 or 0)
  const dueScore = due !== null ? 100 : 0;
  const dueText = due !== null ? `Due ${new Date(due).toLocaleDateString()}` : 'No deadline set';

  // 6. Definition of done score
  const dodScore = hasSection('Definition of Done') ? 100 : 0;
  const dodText = dodScore === 100 ? 'Completion criteria defined' : 'Completion criteria missing';

  const categories = [
    { id: 'description', title: 'Description', score: descScore, description: descText },
    { id: 'checklist', title: 'Checklist', score: checklistScore, description: checklistText },
    { id: 'attachments', title: 'Attachments', score: attachScore, description: attachText },
    { id: 'assignee', title: 'Assignee', score: assigneeScore, description: assigneeText },
    { id: 'due-date', title: 'Due Date', score: dueScore, description: dueText },
    { id: 'definition-of-done', title: 'Definition of Done', score: dodScore, description: dodText },
  ];

  const overallScore = Math.round(
    categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length
  );

  let status = 'Needs Work';
  if (overallScore >= 85) {
    status = 'Ready';
  } else if (overallScore >= 60) {
    status = 'Almost Ready';
  }

  return {
    categories,
    overallScore,
    status,
  };
}
