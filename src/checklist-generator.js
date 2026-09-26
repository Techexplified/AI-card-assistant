/* global window, document, sessionStorage */

// Initialize Trello Power-Up iframe interface
var t = window.TrelloPowerUp && typeof window.TrelloPowerUp.iframe === 'function'
  ? window.TrelloPowerUp.iframe()
  : null;

// Live checklist data structure
let checklistData = [];
let currentImprovementData = null;
let currentCardName = 'Untitled';
let currentListName = 'In Progress';

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
  blue: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    titleColor: '#1e3a8a',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
    chevronColor: '#2563eb',
    iconSvg: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
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
    try {
      t.sizeTo('body');
    } catch (e) {
      try {
        const container = document.getElementById('popup-container') || document.body;
        t.sizeTo(container);
      } catch (err) {
        console.warn('[Checklist Generator] autoResize error:', err);
      }
    }
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
 * Read persisted improvement data from Trello card storage or fallback session
 */
async function getStoredImprovementData() {
  let data = null;
  if (t && typeof t.get === 'function') {
    try {
      data = await t.get('card', 'shared', 'improvementData');
    } catch (e) {
      console.warn('[Checklist Generator] Could not read improvementData from Trello card storage:', e);
    }
  }

  if (!data) {
    try {
      const sessionData = sessionStorage.getItem('trello_improvementData');
      if (sessionData) {
        data = JSON.parse(sessionData);
      }
    } catch (e) {}
  }

  return data;
}

/**
 * Call serverless endpoint to generate categorized checklist
 */
async function fetchChecklist(improvementData, cardName) {
  const response = await fetch('/api/generate-checklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...improvementData, cardName })
  });

  if (!response.ok) {
    let errorMsg = `Server returned ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMsg = errData.details ? `${errData.error} (${errData.details})` : errData.error;
      }
    } catch (e) {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.categories;
}

/**
 * Show loading spinner while AI generates checklist
 */
function showLoadingState() {
  const container = document.getElementById('categories-container');
  if (container) {
    container.innerHTML = `
      <div class="checklist-loading-box">
        <div class="checklist-spinner"></div>
        <div>
          <div class="checklist-loading-title">Generating Smart Checklist...</div>
          <div class="checklist-loading-sub">Breaking down objective into categorized, actionable steps</div>
        </div>
      </div>
    `;
  }

  const btnSave = document.getElementById('btn-save-checklist');
  if (btnSave) {
    btnSave.disabled = true;
  }

  const btnRegen = document.getElementById('btn-regenerate');
  if (btnRegen) {
    btnRegen.disabled = true;
    btnRegen.innerHTML = `<span>⏳ Generating...</span>`;
  }

  const totalCountPill = document.getElementById('total-count-pill');
  if (totalCountPill) totalCountPill.textContent = '...';

  autoResize();
}

/**
 * Show missing improvement data state with navigation link back to improve step
 */
function showMissingState() {
  const container = document.getElementById('categories-container');
  if (container) {
    container.innerHTML = `
      <div class="checklist-empty-state">
        <div class="state-icon-box warning">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <div class="state-title">No Card Analysis Found</div>
          <div class="state-desc">No card analysis found — go back and generate improvements first.</div>
        </div>
        <button type="button" id="btn-go-improve" class="btn-action-state" style="background-color: var(--color-primary); color: #ffffff;">
          <span>← Go to Improve Card</span>
        </button>
      </div>
    `;

    const btnGo = document.getElementById('btn-go-improve');
    if (btnGo) {
      btnGo.addEventListener('click', () => {
        const search = window.location.search || '';
        const targetUrl = (t && typeof t.signUrl === 'function')
          ? t.signUrl('./improve-card.html')
          : ('./improve-card.html' + search);
        window.location.href = targetUrl;
      });
    }
  }

  const btnSave = document.getElementById('btn-save-checklist');
  if (btnSave) btnSave.disabled = true;

  const btnRegen = document.getElementById('btn-regenerate');
  if (btnRegen) {
    btnRegen.disabled = true;
    btnRegen.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      <span>Regenerate</span>
    `;
  }

  updateCountsDisplay();
  autoResize();
}

/**
 * Show inline error state with a retry button
 */
function showErrorState(errorMessage) {
  const container = document.getElementById('categories-container');
  if (container) {
    container.innerHTML = `
      <div class="checklist-error-state">
        <div class="state-icon-box error">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <div class="state-title">Couldn't Generate Checklist</div>
          <div class="state-desc">${errorMessage || 'An error occurred while generating the checklist.'}</div>
        </div>
        <button type="button" id="btn-retry-checklist" class="btn-action-state" style="background-color: #ffffff; border-color: #fca5a5; color: #b91c1c;">
          <span>🔄 Try Again</span>
        </button>
      </div>
    `;

    const btnRetry = document.getElementById('btn-retry-checklist');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        loadChecklistData();
      });
    }
  }

  const btnSave = document.getElementById('btn-save-checklist');
  if (btnSave) btnSave.disabled = true;

  const btnRegen = document.getElementById('btn-regenerate');
  if (btnRegen) {
    btnRegen.disabled = false;
    btnRegen.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      <span>Regenerate</span>
    `;
  }

  updateCountsDisplay();
  autoResize();
}

/**
 * Coordinate loading and rendering of live AI checklist
 */
async function loadChecklistData() {
  const improvementData = await getStoredImprovementData();

  if (!improvementData || !improvementData.objective) {
    showMissingState();
    return;
  }

  currentImprovementData = improvementData;
  showLoadingState();

  try {
    const categories = await fetchChecklist(improvementData, currentCardName);
    checklistData = Array.isArray(categories) ? categories : [];

    // Restore buttons
    const btnSave = document.getElementById('btn-save-checklist');
    if (btnSave) btnSave.disabled = false;

    const btnRegen = document.getElementById('btn-regenerate');
    if (btnRegen) {
      btnRegen.disabled = false;
      btnRegen.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>Regenerate</span>
      `;
    }

    renderChecklist();
    autoResize();
  } catch (err) {
    console.error('[Checklist Generator] loadChecklistData error:', err);
    showErrorState(err.message || 'Failed to generate checklist');
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
        itemText.title = 'Click to edit item';

        // Toggle completed handler
        const toggleItem = (e) => {
          e.stopPropagation();
          item.completed = !item.completed;
          checkboxWrapper.classList.toggle('is-checked', item.completed);
          checkboxWrapper.setAttribute('aria-checked', item.completed ? 'true' : 'false');
          updateCountsDisplay();
        };

        checkboxWrapper.addEventListener('click', toggleItem);
        checkboxWrapper.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleItem(e);
          }
        });

        // Inline edit handler for item text
        const startEditing = (e) => {
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'item-edit-input';
          input.value = item.text;

          let isCommitted = false;

          const finishEditing = (save) => {
            if (isCommitted) return;
            isCommitted = true;
            if (save) {
              const trimmed = input.value.trim();
              if (trimmed) {
                item.text = trimmed;
              }
            }
            renderChecklist();
          };

          input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
              ke.preventDefault();
              finishEditing(true);
            } else if (ke.key === 'Escape') {
              ke.preventDefault();
              finishEditing(false);
            }
          });

          input.addEventListener('blur', () => {
            finishEditing(true);
          });

          itemLeft.replaceChild(input, itemText);
          input.focus();
          input.select();
        };

        itemText.addEventListener('click', startEditing);

        itemLeft.appendChild(checkboxWrapper);
        itemLeft.appendChild(itemText);

        // Item Right: Delete Button + Drag Handle
        const itemRight = document.createElement('div');
        itemRight.className = 'item-right';

        // Small "×" delete icon
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete-item';
        deleteBtn.title = 'Delete item';
        deleteBtn.setAttribute('aria-label', 'Delete item');
        deleteBtn.innerHTML = `
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;

        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cat = checklistData.find((c) => c.id === category.id);
          if (cat && Array.isArray(cat.items)) {
            const idx = cat.items.findIndex((it) => it.id === item.id);
            if (idx !== -1) {
              cat.items.splice(idx, 1);
            }
            // If a category ends up with zero items after a delete, remove the empty category card entirely
            if (cat.items.length === 0) {
              checklistData = checklistData.filter((c) => c.id !== category.id);
            }
            renderChecklist();
            autoResize();
          }
        });

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

        itemRight.appendChild(deleteBtn);
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
          currentCardName = card.name;
          const cardNameEl = document.getElementById('breadcrumb-card-name');
          if (cardNameEl) cardNameEl.textContent = card.name;
        }
        if (list && list.name) {
          currentListName = list.name;
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
  // 1. Fetch live Trello metadata
  initCardData();

  // 2. Fetch and render live AI checklist data
  loadChecklistData();

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
  // Note: Regenerating re-calls fetchChecklist with the stored improvementData and replaces the current list,
  // discarding any manual edits/deletions made so far in this session.
  const btnRegenerate = document.getElementById('btn-regenerate');
  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', () => {
      loadChecklistData();
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
