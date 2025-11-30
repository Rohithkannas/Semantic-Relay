// API Configuration
const API_BASE_URL = '/server/relay_core';

// View Management
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const flowEditorView = document.getElementById('flow-editor-view');
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

// Flow Editor Elements
const backToDashboardBtn = document.getElementById('back-to-dashboard');
const saveFlowBtn = document.getElementById('save-flow-btn');
const flowCanvas = document.getElementById('flow-canvas');
const canvasContent = document.getElementById('canvas-content');

// Flow Editor State
let draggedNodeType = null;
let canvasNodes = [];
let selectedNode = null;
let nodeIdCounter = 1;

// Catalyst SDK State
let isCatalystReady = false;
let currentUserId = null;

// Notification System
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Catalyst SDK Initialization
async function initializeCatalystSDK() {
    try {
        console.log(' Initializing Catalyst SDK...');
        
        // Check if catalyst is available
        if (typeof catalyst === 'undefined') {
            console.log(' Catalyst SDK not yet loaded, waiting...');
            // Wait for SDK to load
            await waitForCatalystSDK();
        }
        
        // Initialize Catalyst SDK
        await catalyst.initialize();
        
        // Get current user information
        const currentUser = await catalyst.auth.getCurrentUser();
        currentUserId = currentUser.getUserId();
        
        // Set global readiness flag
        isCatalystReady = true;
        
        // Enable save button
        if (saveFlowBtn) {
            saveFlowBtn.disabled = false;
            saveFlowBtn.textContent = 'Save Flow';
            saveFlowBtn.classList.remove('disabled');
        }
        
        console.log(' Catalyst SDK initialized successfully');
        console.log(' Current User ID:', currentUserId);
        
        // Show success notification
        showNotification('Catalyst connected successfully!', 'success');
        
    } catch (error) {
        console.error(' Failed to initialize Catalyst SDK:', error);
        isCatalystReady = false;
        
        // Keep save button disabled
        if (saveFlowBtn) {
            saveFlowBtn.disabled = true;
            saveFlowBtn.textContent = 'Catalyst Error';
            saveFlowBtn.classList.add('disabled');
        }
        
        // Show error notification
        showNotification('Failed to connect to Catalyst. Please refresh.', 'error');
        
        // Retry initialization after 3 seconds
        setTimeout(() => {
            console.log(' Retrying Catalyst SDK initialization...');
            initializeCatalystSDK();
        }, 3000);
    }
}

// Wait for Catalyst SDK to load
function waitForCatalystSDK() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkCatalyst = () => {
            attempts++;
            
            if (typeof catalyst !== 'undefined') {
                console.log(' Catalyst SDK detected');
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Catalyst SDK failed to load after multiple attempts'));
            } else {
                console.log(` Waiting for Catalyst SDK... (${attempts}/${maxAttempts})`);
                setTimeout(checkCatalyst, 500);
            }
        };
        
        checkCatalyst();
    });
}

// Initialize Catalyst SDK when window loads
window.onload = function() {
    console.log(' Window loaded, starting initialization...');
    
    // Initialize theme and other existing setup
    initTheme();
    
    // Add flow editor button
    setTimeout(() => {
        addFlowEditorButton();
    }, 500);
    
    // Initialize Catalyst SDK with a small delay to ensure SDK is loaded
    setTimeout(() => {
        initializeCatalystSDK();
    }, 1000);
};

// Safe Save Flow Handler with Catalyst readiness check
function handleSaveClick(flowData) {
    // Guard clause - Check if Catalyst is ready
    if (!isCatalystReady) {
        alert('Please wait, Catalyst is still loading the connection.');
        return;
    }
    
    // If we reach here, Catalyst is ready - proceed with save
    console.log('Catalyst ready, proceeding with save flow...');
    saveFlowToCatalyst(flowData);
}

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
    flowEditorView.classList.remove('active');
}

function showDashboard() {
    loginView.classList.remove('active');
    dashboardView.classList.add('active');
    flowEditorView.classList.remove('active');
    fetchData();
}

function showFlowEditor() {
    loginView.classList.remove('active');
    dashboardView.classList.remove('active');
    flowEditorView.classList.add('active');
    initializeFlowEditor();
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
    
    // Delete key to remove selected node in flow editor
    if (e.key === 'Delete' && selectedNode && flowEditorView.classList.contains('active')) {
        e.preventDefault();
        deleteSelectedNode();
    }
});

// Flow Editor Functions
function initializeFlowEditor() {
    setupDragAndDrop();
    setupCanvasEvents();
    setupNavigationButtons();
}

function setupNavigationButtons() {
    // Back to dashboard button
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', showDashboard);
    }
    
    // Save flow button
    if (saveFlowBtn) {
        saveFlowBtn.addEventListener('click', saveFlow);
    }
}

function setupDragAndDrop() {
    // Setup palette nodes dragging
    const paletteNodes = document.querySelectorAll('.palette-node');
    paletteNodes.forEach(node => {
        node.addEventListener('dragstart', handleDragStart);
        node.addEventListener('dragend', handleDragEnd);
    });
    
    // Setup canvas drop zone
    if (flowCanvas) {
        flowCanvas.addEventListener('dragover', handleDragOver);
        flowCanvas.addEventListener('drop', handleDrop);
        flowCanvas.addEventListener('dragleave', handleDragLeave);
    }
}

function handleDragStart(e) {
    draggedNodeType = e.target.getAttribute('data-node-type');
    e.target.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedNodeType = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    flowCanvas.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (e.target === flowCanvas) {
        flowCanvas.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    flowCanvas.classList.remove('drag-over');
    
    if (!draggedNodeType) return;
    
    const canvasRect = canvasContent.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    createCanvasNode(draggedNodeType, x, y);
}

function createCanvasNode(nodeType, x, y) {
    const nodeData = getNodeData(nodeType);
    const nodeId = `node-${nodeIdCounter++}`;
    
    const nodeElement = document.createElement('div');
    nodeElement.className = 'canvas-node';
    nodeElement.setAttribute('data-node-type', nodeType);
    nodeElement.setAttribute('data-node-id', nodeId);
    nodeElement.style.left = `${x - 70}px`; // Center the node
    nodeElement.style.top = `${y - 30}px`;
    
    nodeElement.innerHTML = `
        <div class="node-icon">${nodeData.icon}</div>
        <div class="node-label">${nodeData.label}</div>
        <div class="node-description">${nodeData.description}</div>
    `;
    
    canvasContent.appendChild(nodeElement);
    
    // Add to nodes array
    const nodeInfo = {
        id: nodeId,
        type: nodeType,
        x: x - 70,
        y: y - 30,
        element: nodeElement
    };
    canvasNodes.push(nodeInfo);
    
    // Make node draggable within canvas
    makeNodeDraggable(nodeElement, nodeInfo);
    
    // Add click handler for selection
    nodeElement.addEventListener('click', () => selectNode(nodeInfo));
}

function getNodeData(nodeType) {
    const nodeTypes = {
        'intent-classifier': {
            icon: '🎯',
            label: 'Intent Classifier',
            description: 'Condition setting'
        },
        'action-handler': {
            icon: '⚡',
            label: 'Action Handler',
            description: 'Routing/Ghost/Swarm'
        },
        'end-node': {
            icon: '🔚',
            label: 'End Node',
            description: 'Flow terminator'
        }
    };
    
    return nodeTypes[nodeType] || { icon: '📦', label: 'Unknown', description: 'Unknown node type' };
}

function makeNodeDraggable(element, nodeInfo) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', startDrag);
    
    function startDrag(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = nodeInfo.x;
        initialY = nodeInfo.y;
        
        element.classList.add('dragging');
        element.style.zIndex = '1000';
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        
        e.preventDefault();
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        nodeInfo.x = initialX + dx;
        nodeInfo.y = initialY + dy;
        
        element.style.left = `${nodeInfo.x}px`;
        element.style.top = `${nodeInfo.y}px`;
    }
    
    function stopDrag() {
        isDragging = false;
        element.classList.remove('dragging');
        element.style.zIndex = '';
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }
}

function selectNode(nodeInfo) {
    // Deselect previous node
    if (selectedNode) {
        selectedNode.element.classList.remove('selected');
    }
    
    // Select new node
    selectedNode = nodeInfo;
    nodeInfo.element.classList.add('selected');
}

function deleteSelectedNode() {
    if (!selectedNode) return;
    
    const index = canvasNodes.findIndex(n => n.id === selectedNode.id);
    if (index > -1) {
        canvasNodes.splice(index, 1);
        selectedNode.element.remove();
        selectedNode = null;
    }
}

function setupCanvasEvents() {
    // Click on empty canvas to deselect
    canvasContent.addEventListener('click', (e) => {
        if (e.target === canvasContent) {
            if (selectedNode) {
                selectedNode.element.classList.remove('selected');
                selectedNode = null;
            }
        }
    });
}

function saveFlow() {
    const flowData = {
        timestamp: new Date().toISOString(),
        nodes: canvasNodes.map(node => ({
            id: node.id,
            type: node.type,
            position: {
                x: Math.round(node.x),
                y: Math.round(node.y)
            }
        }))
    };

    console.log('Flow Data:', JSON.stringify(flowData, null, 2));

    // Use safe save handler with Catalyst readiness check
    handleSaveClick(flowData);

    // Visual feedback
    const originalText = saveFlowBtn.innerText;
    saveFlowBtn.innerText = 'Saving...';
    saveFlowBtn.disabled = true;

    setTimeout(() => {
        saveFlowBtn.innerText = originalText;
        saveFlowBtn.disabled = false;
    }, 2000);
}

async function saveFlowToCatalyst(flowData) {
    try {
        // Initialize Catalyst SDK
        const catalyst = await catalyst.initialize();

        // Get current user ID
        const currentUser = await catalyst.auth.getCurrentUser();
        const userId = currentUser.getUserId();

        // Get Data Store instance
        const dataStore = catalyst.datastore();

        // Get the HandoverRules table
        const table = dataStore.table('HandoverRules');

        // Update the flow_json column for current user
        const updateResult = await table.updateRow({
            user_id: userId,
            flow_json: JSON.stringify(flowData)
        });

        console.log('Catalyst update result:', updateResult);
        alert('Relay Flow Saved Successfully!');

    } catch (error) {
        console.error('Error saving flow to Catalyst:', error);
        alert(`Error Saving Flow: ${error.message || error}`);
    }
}

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

// Add Flow Editor button to dashboard
function addFlowEditorButton() {
    const headerControls = document.querySelector('.header-controls');
    if (headerControls && !document.getElementById('flow-editor-btn')) {
        const flowEditorBtn = document.createElement('button');
        flowEditorBtn.id = 'flow-editor-btn';
        flowEditorBtn.className = 'theme-toggle-btn';
        flowEditorBtn.title = 'Flow Editor';
        flowEditorBtn.innerHTML = '<span style="font-size: 16px;">🔄</span>';
        flowEditorBtn.addEventListener('click', showFlowEditor);
        headerControls.insertBefore(flowEditorBtn, headerControls.firstChild);
    }
}

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
    
    // Add flow editor button
    setTimeout(() => {
        addFlowEditorButton();
    }, 500);
});

// Remove token expiry check since we're not using persistent login