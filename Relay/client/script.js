const API_BASE_URL = '/server/relay_brain';

const toggleEl = document.getElementById('relay-toggle');
const statusTextEl = document.getElementById('status-text');
const rulesContainerEl = document.getElementById('rules-container');
const keywordInputEl = document.getElementById('rule-keyword');
const delegateSelectEl = document.getElementById('rule-delegate');
const addRuleBtnEl = document.getElementById('add-rule-btn');

async function fetchData() {
  try {
    const res = await fetch(`${API_BASE_URL}/rules/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch rules');
    }

    const data = await res.json();

    const globalStatus = data.global_status || 'inactive';
    const rules = Array.isArray(data.rules) ? data.rules : [];

    const isActive = globalStatus.toLowerCase() === 'active';
    if (toggleEl) {
      toggleEl.checked = isActive;
    }
    if (statusTextEl) {
      statusTextEl.textContent = isActive
        ? 'Current Status: Monitoring'
        : 'Current Status: Inactive';
    }

    if (rulesContainerEl) {
      rulesContainerEl.innerHTML = '';
      rules.forEach((rule) => {
        const card = createRuleCard(rule);
        rulesContainerEl.appendChild(card);
      });
    }
  } catch (err) {
    // Basic fallback UI in case of error
    if (statusTextEl) {
      statusTextEl.textContent = 'Current Status: Unable to load rules';
    }
  }
}

function createRuleCard(rule) {
  const card = document.createElement('div');
  card.className = 'rc-rule-card';
  card.dataset.id = rule.id || rule.rule_id || '';

  const keywordEl = document.createElement('p');
  keywordEl.className = 'rc-rule-keyword';
  keywordEl.textContent = rule.keyword || '(no keyword)';

  const delegateRow = document.createElement('div');
  delegateRow.style.display = 'flex';
  delegateRow.style.alignItems = 'center';
  delegateRow.style.justifyContent = 'space-between';

  const delegateEl = document.createElement('p');
  delegateEl.className = 'rc-rule-delegate';
  delegateEl.textContent = rule.delegate || rule.delegate_name || rule.delegate_id || '(no delegate)';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = '🗑';
  deleteBtn.style.border = 'none';
  deleteBtn.style.background = 'transparent';
  deleteBtn.style.cursor = 'pointer';
  deleteBtn.style.fontSize = '0.9rem';
  deleteBtn.setAttribute('aria-label', 'Delete rule');

  const id = card.dataset.id;
  if (id) {
    deleteBtn.addEventListener('click', () => deleteRule(id, card));
  } else {
    deleteBtn.disabled = true;
    deleteBtn.style.opacity = '0.4';
  }

  delegateRow.appendChild(delegateEl);
  delegateRow.appendChild(deleteBtn);

  card.appendChild(keywordEl);
  card.appendChild(delegateRow);

  return card;
}

async function toggleStatus() {
  if (!toggleEl) return;

  const isNowActive = toggleEl.checked;
  const path = isNowActive ? '/status/on' : '/status/off';

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error('Failed to toggle status');
    }

    if (!isNowActive) {
      alert('Welcome back! Your return briefing has been sent to the bot.');
    }

    // Refresh data to reflect new status and any server-side changes
    await fetchData();
  } catch (err) {
    // Revert toggle on error
    toggleEl.checked = !isNowActive;
  }
}

async function addRule(event) {
  if (event) {
    event.preventDefault();
  }

  if (!keywordInputEl || !delegateSelectEl) return;

  const keyword = keywordInputEl.value.trim();
  const delegate = delegateSelectEl.value;

  if (!keyword || !delegate) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/rules/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword, delegate }),
    });

    if (!res.ok) {
      throw new Error('Failed to add rule');
    }

    keywordInputEl.value = '';
    delegateSelectEl.value = '';

    await fetchData();
  } catch (err) {
    // No-op on error for now
  }
}

async function deleteRule(id, cardElement) {
  if (!id) return;

  try {
    const res = await fetch(`${API_BASE_URL}/rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Failed to delete rule');
    }

    if (cardElement && cardElement.parentNode) {
      cardElement.parentNode.removeChild(cardElement);
    }
  } catch (err) {
    // No-op on error for now
  }
}

function init() {
  if (toggleEl) {
    toggleEl.addEventListener('change', toggleStatus);
  }

  if (addRuleBtnEl) {
    addRuleBtnEl.addEventListener('click', addRule);
  }

  fetchData();
}

window.addEventListener('load', init);

