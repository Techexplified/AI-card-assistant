/* global window, document */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// TODO: replace with real fetch from backend — AI-generated checklist based on
// the card's description/objective/key tasks from the previous step.
// Expected shape from the API should match this structure exactly so rendering
// logic doesn't need to change, only this initial assignment.
let checklistData = [
  {
    id: 'design',
    name: 'Design',
    color: 'purple',
    items: [
      { id: 'd1', text: 'Review current website analytics and UX audit', completed: true },
      { id: 'd2', text: 'Identify UX issues and opportunities', completed: false },
      { id: 'd3', text: 'Create wireframes for key pages', completed: false },
      { id: 'd4', text: 'Design high-fidelity mockups in Figma', completed: false }
    ]
  },
  {
    id: 'development',
    name: 'Development',
    color: 'green',
    items: [
      { id: 'dev1', text: 'Set up development environment and repo', completed: false },
      { id: 'dev2', text: 'Implement responsive layouts and components', completed: false },
      { id: 'dev3', text: 'Integrate and tracking scripts', completed: false },
      { id: 'dev4', text: 'Implement conversion-focused CTAs', completed: false }
    ]
  },
  {
    id: 'qa-testing',
    name: 'QA & Testing',
    color: 'orange',
    items: [
      { id: 'qa1', text: 'Test on mobile, tablet, and desktop', completed: false },
      { id: 'qa2', text: 'Cross-browser compatibility check', completed: false },
      { id: 'qa3', text: 'Performance and page speed audit', completed: false },
      { id: 'qa4', text: 'Stakeholder sign-off and final launch', completed: false }
    ]
  }
];

// Color theme lookup dictionary for flexible category styling
const CATEGORY_THEMES = {
  purple: {
    bg: '#f5f3ff',
    border: '#ddd6fe',
    iconBg: '#ede9fe',
    iconColor: '#6366f1',
    titleColor: '#1e1b4b',
    badgeBg: '#e0e7ff',
    badgeText: '#4338ca',
    chevronColor: '#6366f1',
    iconSvg: `<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`,
  },
  green: {
    bg: '#ecfdf5',
    border: '#a7f3d0',
    iconBg: '#d1fae5',
    iconColor: '#059669',
    titleColor: '#064e3b',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    chevronColor: '#059669',
    iconSvg: `<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
  },
  orange: {
    bg: '#fff7ed',
    border: '#fed7aa',
    iconBg: '#ffedd5',
    iconColor: '#d97706',
    titleColor: '#7c2d12',
    badgeBg: '#ffedd5',
    badgeText: '#9a3412',
    chevronColor: '#d97706',
    iconSvg: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
  },
  gray: {
    bg: '#f8fafc',
    border: '#cbd5e1',
    iconBg: '#f1f5f9',
    iconColor: '#64748b',
    titleColor: '#1e293b',
    badgeBg: '#f1f5f9',
    badgeText: '#475569',
    chevronColor: '#64748b',
    iconSvg: `<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
  },
};

// Track drag state for HTML5 drag-and-drop reordering within categories
let dragContext = null;

/**
 * Get total item count across all categories
 */
function getTotalItemCount() {
  return checklistData.reduce((acc, cat) => acc + (cat.items ? cat.items.length : 0), 0);
}

/**
 * Get count of completed items across all categories
 */
function getCompletedItemCount() {
  return checklistData.reduce((acc, cat) => {
    if (!cat.items) return acc;
    return acc + cat.items.filter(item => item.completed).length;
  }, 0);
}

/**
 * Update dynamic item count badges and completed text
 */
function updateCountsDisplay() {
  const total = getTotalItemCount();
  const completed = getCompletedItemCount();

  const totalCountPill = document.getElementById('total-count-pill');
  if (totalCountPill) {
    totalCountPill.textContent = total;
  }

  const completedCountDisplay = document.getElementById('completed-count-display');
  if (completedCountDisplay) {
    completedCountDisplay.textContent = `${completed} of ${total} completed`;
  }
}

/**
 * Auto-resize iframe in Trello if supported
 */
function autoResize() {
  if (t && typeof t.sizeTo === 'function') {
    const container = document.getElementById('popup-container') || document.body;
    t.sizeTo(container);
  }
}

/**
 * Close modal / popup helper
 */
function closePopupAction() {
  if (window.self !== window.top && t) {
    if (typeof t.closeModal === 'function') {
      try { t.closeModal(); } catch (e) {}
    }
    if (typeof t.closePopup === 'function') {
      try { t.closePopup(); } catch (e) {}
    }
  } else {
    console.log('[Checklist Generator] Close popup triggered (standalone preview)');
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }
}

/**
 * Render the entire checklist dynamically from checklistData
 */
function renderChecklist() {
  const container = document.getElementById('categories-container');
  if (!container) return;

  container.innerHTML = '';

  checklistData.forEach((category) => {
    const theme = CATEGORY_THEMES[category.color] || CATEGORY_THEMES.gray;
    const itemCount = category.items ? category.items.length : 0;
    const isCollapsed = Boolean(category.collapsed);

    // Create Category Card
    const cardEl = document.createElement('div');
    cardEl.className = `category-card ${isCollapsed ? 'is-collapsed' : ''}`;
    cardEl.dataset.categoryId = category.id;
    cardEl.style.borderColor = theme.border;

    // Header Bar
    const headerEl = document.createElement('div');
    headerEl.className = 'category-header';
    headerEl.style.backgroundColor = theme.bg;

    // Header Left: Icon + Title
    const headerLeft = document.createElement('div');
    headerLeft.className = 'category-header-left';

    const iconBox = document.createElement('div');
    iconBox.className = 'category-icon-box';
    iconBox.style.backgroundColor = theme.iconBg;
    iconBox.style.color = theme.iconColor;
    iconBox.innerHTML = theme.iconSvg;

    const title = document.createElement('span');
    title.className = 'category-title';
    title.style.color = theme.titleColor;
    title.textContent = category.name;

    headerLeft.appendChild(iconBox);
    headerLeft.appendChild(title);

    // Header Right: Count Badge + Chevron
    const headerRight = document.createElement('div');
    headerRight.className = 'category-header-right';

    const badge = document.createElement('span');
    badge.className = 'category-count-badge';
    badge.style.backgroundColor = theme.badgeBg;
    badge.style.color = theme.badgeText;
    badge.textContent = `${itemCount} item${itemCount === 1 ? '' : 's'}`;

    const chevron = document.createElement('div');
    chevron.className = 'category-chevron';
    chevron.style.color = theme.chevronColor;
    chevron.innerHTML = `
      <svg viewBox="0 0 24 24">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;

    headerRight.appendChild(badge);
    headerRight.appendChild(chevron);

    headerEl.appendChild(headerLeft);
    headerEl.appendChild(headerRight);

    // Header click toggles collapse
    headerEl.addEventListener('click', () => {
      category.collapsed = !category.collapsed;
      renderChecklist();
      autoResize();
    });

    cardEl.appendChild(headerEl);

    // Item List
    const listEl = document.createElement('div');
    listEl.className = 'category-items-list';

    if (category.items && category.items.length > 0) {
      category.items.forEach((item, itemIndex) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.draggable = true;
        itemRow.dataset.categoryId = category.id;
        itemRow.dataset.itemId = item.id;
        itemRow.dataset.itemIndex = String(itemIndex);

        // Item Left: Checkbox + Text
        const itemLeft = document.createElement('div');
        itemLeft.className = 'item-left';

        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = `checkbox-wrapper ${item.completed ? 'is-checked' : ''}`;
        checkboxWrapper.setAttribute('role', 'checkbox');
        checkboxWrapper.setAttribute('aria-checked', item.completed ? 'true' : 'false');
        checkboxWrapper.setAttribute('tabindex', '0');
        checkboxWrapper.innerHTML = `
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;

        const itemText = document.createElement('span');
        itemText.className = 'item-text';
        itemText.textContent = item.text;

        // Toggle completed handler
        const toggleItem = (e) => {
          e.stopPropagation();
          item.completed = !item.completed;
          checkboxWrapper.classList.toggle('is-checked', item.completed);
          checkboxWrapper.setAttribute('aria-checked', item.completed ? 'true' : 'false');
          updateCountsDisplay();
        };

        checkboxWrapper.addEventListener('click', toggleItem);
        itemText.addEventListener('click', toggleItem);
        checkboxWrapper.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleItem(e);
          }
        });

        itemLeft.appendChild(checkboxWrapper);
        itemLeft.appendChild(itemText);

        // Item Right: Drag Handle
        const itemRight = document.createElement('div');
        itemRight.className = 'item-right';

        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.title = 'Drag to reorder';
        dragHandle.innerHTML = `
          <svg viewBox="0 0 24 24">
            <circle cx="9" cy="6" r="1.5"></circle>
            <circle cx="15" cy="6" r="1.5"></circle>
            <circle cx="9" cy="12" r="1.5"></circle>
            <circle cx="15" cy="12" r="1.5"></circle>
            <circle cx="9" cy="18" r="1.5"></circle>
            <circle cx="15" cy="18" r="1.5"></circle>
          </svg>
        `;

        itemRight.appendChild(dragHandle);

        itemRow.appendChild(itemLeft);
        itemRow.appendChild(itemRight);

        // HTML5 Drag-and-Drop wiring
        itemRow.addEventListener('dragstart', (e) => {
          dragContext = {
            categoryId: category.id,
            itemIndex: itemIndex,
            itemId: item.id,
          };
          itemRow.classList.add('is-dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.id);
          }
        });

        itemRow.addEventListener('dragend', () => {
          itemRow.classList.remove('is-dragging');
          document.querySelectorAll('.item-row').forEach((el) => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
          });
          dragContext = null;
        });

        itemRow.addEventListener('dragover', (e) => {
          if (!dragContext || dragContext.categoryId !== category.id) return;
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
          }

          const rect = itemRow.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            itemRow.classList.add('drag-over-top');
            itemRow.classList.remove('drag-over-bottom');
          } else {
            itemRow.classList.add('drag-over-bottom');
            itemRow.classList.remove('drag-over-top');
          }
        });

        itemRow.addEventListener('dragleave', () => {
          itemRow.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        itemRow.addEventListener('drop', (e) => {
          e.preventDefault();
          itemRow.classList.remove('drag-over-top', 'drag-over-bottom');

          // Basic reorder support — refine later if cross-category drag is needed
          if (!dragContext || dragContext.categoryId !== category.id) return;

          const fromIndex = dragContext.itemIndex;
          let toIndex = itemIndex;

          const rect = itemRow.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY > midY && fromIndex < toIndex) {
            toIndex = itemIndex;
          }

          if (fromIndex !== toIndex) {
            const [movedItem] = category.items.splice(fromIndex, 1);
            category.items.splice(toIndex, 0, movedItem);
            renderChecklist();
            autoResize();
          }
          dragContext = null;
        });

        listEl.appendChild(itemRow);
      });
    }

    cardEl.appendChild(listEl);
    container.appendChild(cardEl);
  });

  updateCountsDisplay();
}

/**
 * Handle adding a custom item to the checklist
 */
function handleAddCustomItem() {
  const input = document.getElementById('input-custom-item');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // Find or create 'custom' category
  let customCat = checklistData.find((cat) => cat.id === 'custom');
  if (!customCat) {
    customCat = {
      id: 'custom',
      name: 'Custom',
      color: 'gray',
      items: [],
      collapsed: false,
    };
    checklistData.push(customCat);
  }

  // Add new item
  customCat.items.push({
    id: 'custom-' + Date.now(),
    text: text,
    completed: false,
  });

  input.value = '';
  renderChecklist();
  autoResize();
}

/**
 * Fetch live card & list name from Trello using Promise.all
 */
function initCardData() {
  if (t && typeof t.card === 'function' && typeof t.list === 'function') {
    Promise.all([
      t.card('name'),
      t.list('name')
    ])
      .then(function ([card, list]) {
        if (card && card.name) {
          const cardNameEl = document.getElementById('breadcrumb-card-name');
          if (cardNameEl) cardNameEl.textContent = card.name;
        }
        if (list && list.name) {
          const listNameEl = document.getElementById('breadcrumb-list-name');
          if (listNameEl) listNameEl.textContent = list.name;
        }
      })
      .catch(function (err) {
        console.warn('[Checklist Generator] Could not fetch live card/list from Trello:', err);
      });
  }
}

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Render
  renderChecklist();

  // 2. Fetch live Trello metadata
  initCardData();

  // 3. Add Custom Item wiring
  const btnAddCustom = document.getElementById('btn-add-custom-item');
  const inputCustom = document.getElementById('input-custom-item');

  if (btnAddCustom) {
    btnAddCustom.addEventListener('click', handleAddCustomItem);
  }
  if (inputCustom) {
    inputCustom.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustomItem();
      }
    });
  }

  // 4. Regenerate Button handler
  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', () => {
      // TODO: call backend AI endpoint to regenerate checklistData based on card description
      console.log('regenerate checklist triggered');
    });
  }

  // 5. Save & Get Next Steps Button handler
  const btnSaveChecklist = document.getElementById('btn-save-checklist');
  if (btnSaveChecklist) {
    btnSaveChecklist.addEventListener('click', () => {
      // TODO: write checklist to the actual Trello card via REST API (create checklist + items per category, or flatten into one checklist) — requires OAuth token
      console.log('save checklist triggered', checklistData);
      const search = window.location.search || '';
      const targetUrl = (t && typeof t.signUrl === 'function')
        ? t.signUrl('./next-steps.html')
        : ('./next-steps.html' + search);

      console.log('[Checklist Generator] Redirecting to next-steps.html');
      window.location.href = targetUrl;
    });
  }

  // 6. Close Popup Button handler
  const btnClose = document.getElementById('btn-close-popup');
  if (btnClose) {
    btnClose.addEventListener('click', closePopupAction);
  }

  // 7. Initial Size to container
  autoResize();
});
