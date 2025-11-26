// API Configuration
const API_BASE_URL = '/server/relay_core';

// View Management
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.querySelector('.theme-icon');

// Dashboard Elements
const statusToggle = document.getElementById('status-toggle');
const statusText = document.getElementById('status-text');
const rulesContainer = document.getElementById('rules-container');
const addRuleBtn = document.getElementById('add-rule-btn');
const keywordInput = document.getElementById('keyword-input');
const delegateSelect = document.getElementById('delegate-select');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
    }
}

// Authentication
function checkAuth() {
    // Always require login - no auto-login
    return false;
}

function showLogin() {
    loginView.classList.add('active');
    dashboardView.classList.remove('active');
}

function showDashboard() {
    loginView.classList.remove('active');
    dashboardView.classList.add('active');
    fetchData();
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Simple authentication check
    if (email === 'kidroh10@gmail.com' && password === 'blackandwhite@10') {
        // Store token and switch to dashboard
        localStorage.setItem('relay_token', 'authenticated');
        loginError.style.display = 'none';
        showDashboard();
    } else {
        // Show error message
        loginError.style.display = 'block';
        // Shake animation for error feedback
        loginForm.style.animation = 'shake 0.5s';
        setTimeout(() => {
            loginForm.style.animation = '';
        }, 500);
    }
});

// Logout functionality (optional - can be triggered by token expiry)
function logout() {
    localStorage.removeItem('relay_token');
    showLogin();
}

// Fetch Data from API
async function fetchData() {
    try {
        console.log("Fetching rules from:", API_BASE_URL + '/rules/list');
        const response = await fetch(`${API_BASE_URL}/rules/list`);
        
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        renderRules(data.rules || []);
        
        // Update Status Toggle
        if (data.global_status) {
            statusToggle.checked = true;
            statusText.innerText = "Current Status: Relay Active ✅";
        } else {
            statusToggle.checked = false;
            statusText.innerText = "Current Status: Monitoring (Inactive)";
        }

    } catch (error) {
        console.error("Error loading rules:", error);
        statusText.innerText = "Error: " + error.message;
    }
}

// Render Rules List
function renderRules(rules) {
    rulesContainer.innerHTML = '';
    if (rules.length === 0) {
        rulesContainer.innerHTML = '<div class="no-rules">No rules set yet. Add one below!</div>';
        return;
    }

    rules.forEach(rule => {
        const card = document.createElement('div');
        card.className = 'rule-card';
        
        card.innerHTML = `
            <div class="rule-content">
                <div class="rule-keyword">${rule.keyword}</div>
                <div class="rule-delegate">Delegate: ${rule.delegate_id}</div>
            </div>
            <div class="rule-actions">
                <button class="delete-btn" onclick="deleteRule('${rule.ROWID}')">Delete</button>
            </div>
        `;
        rulesContainer.appendChild(card);
    });
}

// Add Rule
addRuleBtn.addEventListener('click', async () => {
    const keyword = keywordInput.value.trim();
    const delegate = delegateSelect.value;

    if (!keyword) {
        keywordInput.focus();
        keywordInput.style.animation = 'pulse 0.5s';
        setTimeout(() => {
            keywordInput.style.animation = '';
        }, 500);
        return;
    }

    const originalText = addRuleBtn.innerText;
    addRuleBtn.innerText = "Saving...";
    addRuleBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/rules/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword, delegate_id: delegate })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to add rule: ${response.status}`);
        }
        
        // Clear input and reload
        keywordInput.value = '';
        fetchData(); 
        
    } catch (error) {
        console.error("Error adding rule:", error);
        alert("Failed to save rule. Please try again.");
    } finally {
        addRuleBtn.innerText = originalText;
        addRuleBtn.disabled = false;
    }
});

// Delete Rule Function (global for onclick)
window.deleteRule = async (id) => {
    if(!confirm("Delete this rule?")) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/rules/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`Failed to delete rule: ${response.status}`);
        }
        fetchData();
    } catch (error) {
        console.error("Error deleting rule:", error);
        alert("Failed to delete rule. Please try again.");
    }
};

// Status Toggle Handler
statusToggle.addEventListener('change', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: statusToggle.checked })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update status: ${response.status}`);
        }
        
        fetchData(); // Refresh data to show updated status
    } catch (error) {
        console.error("Error updating status:", error);
        // Revert toggle on error
        statusToggle.checked = !statusToggle.checked;
        alert("Failed to update status. Please try again.");
    }
});

// Theme Toggle Handler
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + L to logout
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        logout();
    }
    
    // Ctrl/Cmd + T to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        toggleTheme();
    }
    
    // Enter to submit rule when keyword input is focused
    if (e.key === 'Enter' && document.activeElement === keywordInput) {
        e.preventDefault();
        addRuleBtn.click();
    }
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    .no-rules {
        padding: 40px;
        text-align: center;
        color: var(--text-muted);
        font-style: italic;
        background: var(--bg-card);
        border-radius: 12px;
        border: 1px dashed var(--border-color);
    }
`;
document.head.appendChild(style);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();
    
    // Always show login page - no auto-login
    showLogin();
    
    // Focus on password field since email is pre-filled
    setTimeout(() => {
        document.getElementById('password').focus();
    }, 100);
});

// Remove token expiry check since we're not using persistent login