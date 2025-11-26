// Use relative path so it works on Localhost AND Cloud automatically
const API_BASE_URL = '/server/relay_core';

// DOM Elements
const statusToggle = document.getElementById('status-toggle');
const statusText = document.getElementById('status-text');
const rulesContainer = document.getElementById('rules-container');
const addRuleBtn = document.getElementById('add-rule-btn');

// 1. Fetch Data on Load
window.addEventListener('load', fetchData);

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

// 2. Render Rules List
function renderRules(rules) {
    rulesContainer.innerHTML = '';
    if (rules.length === 0) {
        rulesContainer.innerHTML = '<p style="padding:20px; text-align:center; color:#666;">No rules set yet. Add one below!</p>';
        return;
    }

    rules.forEach(rule => {
        const card = document.createElement('div');
        card.className = 'rule-card'; // Ensure you have CSS for this
        card.style = "background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center;";
        
        card.innerHTML = `
            <div>
                <strong style="color:#2C7BE5; font-size: 16px;">${rule.keyword}</strong>
                <div style="color:#666; font-size: 14px;">Delegate: ${rule.delegate_id}</div>
            </div>
            <button onclick="deleteRule('${rule.ROWID}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
        `;
        rulesContainer.appendChild(card);
    });
}

// 3. Add Rule
addRuleBtn.addEventListener('click', async () => {
    const keyword = document.getElementById('keyword-input').value;
    const delegate = document.getElementById('delegate-select').value;

    if (!keyword) return alert("Please enter a keyword");

    addRuleBtn.innerText = "Saving...";
    
    try {
        await fetch(`${API_BASE_URL}/rules/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword, delegate_id: delegate })
        });
        
        // Clear input and reload
        document.getElementById('keyword-input').value = '';
        fetchData(); 
    } catch (e) {
        alert("Failed to save rule");
    } finally {
        addRuleBtn.innerText = "+ Add Rule";
    }
});

// 4. Delete Rule Function (Needs to be global)
window.deleteRule = async (id) => {
    if(!confirm("Delete this rule?")) return;
    await fetch(`${API_BASE_URL}/rules/${id}`, { method: 'DELETE' });
    fetchData();
};