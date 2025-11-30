// ========================================
// MODERN FLOW EDITOR - ENHANCED VERSION
// ========================================

// Global State Management
let isCatalystReady = false;
let canvasNodes = [];
let canvasConnections = [];
let selectedNode = null;
let connectionSource = null;
let nodeIdCounter = 1;
let currentUserId = null;

// DOM Elements
const saveFlowButton = document.getElementById('save-flow-btn');
const canvasContent = document.getElementById('canvas-content');

// ========================================
// 1. CONNECTION STABILITY FIX
// ========================================

// Initialize Catalyst SDK and enable UI elements
async function initializeCatalystSDK() {
    try {
        console.log('🔄 Initializing Catalyst SDK...');
        
        // Initialize Catalyst SDK
        await catalyst.initialize();
        
        // Get current user information
        const currentUser = await catalyst.auth.getCurrentUser();
        currentUserId = currentUser.getUserId();
        
        // Set global readiness flag
        isCatalystReady = true;
        
        // Enable save button
        if (saveFlowButton) {
            saveFlowButton.disabled = false;
            saveFlowButton.textContent = 'Save Flow';
            saveFlowButton.classList.remove('disabled');
        }
        
        console.log('✅ Catalyst SDK initialized successfully');
        console.log('👤 Current User ID:', currentUserId);
        
        // Show success notification
        showNotification('Catalyst connected successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to initialize Catalyst SDK:', error);
        isCatalystReady = false;
        
        // Keep save button disabled
        if (saveFlowButton) {
            saveFlowButton.disabled = true;
            saveFlowButton.textContent = 'Catalyst Error';
            saveFlowButton.classList.add('disabled');
        }
        
        // Show error notification
        showNotification('Failed to connect to Catalyst. Please refresh.', 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Disable save button initially
    if (saveFlowButton) {
        saveFlowButton.disabled = true;
        saveFlowButton.textContent = 'Connecting...';
        saveFlowButton.classList.add('disabled');
    }
    
    // Initialize Catalyst SDK
    initializeCatalystSDK();
    
    // Setup other event listeners
    setupFlowEditorEventListeners();
});

// ========================================
// 2. PERSISTENT SAVE LOGIC FIX
// ========================================

// Robust save function with check-before-write logic
async function saveFlowToCatalyst(flowData, userId) {
    try {
        console.log('💾 Saving flow to Catalyst...');
        console.log('📊 Flow Data:', flowData);
        console.log('👤 User ID:', userId);
        
        // Initialize Catalyst SDK
        const app = catalyst.initialize();
        const dataStore = app.datastore();
        const table = dataStore.table('HandoverRules');
        
        // Check-before-write: Attempt to retrieve existing user rule
        let existingRule = null;
        try {
            const allRules = await table.getAllRows();
            existingRule = allRules.find(rule => rule.user_id === userId);
            console.log('🔍 Existing rule found:', existingRule ? 'Yes' : 'No');
        } catch (searchError) {
            console.warn('⚠️ Error searching for existing rule:', searchError.message);
        }
        
        // Prepare flow data for storage
        const flowJsonString = JSON.stringify(flowData);
        const timestamp = new Date().toISOString();
        
        let result;
        
        if (existingRule) {
            // UPDATE EXISTING RULE
            console.log('📝 Updating existing rule...');
            result = await table.updateRow({
                ROWID: existingRule.ROWID,
                user_id: userId,
                flow_json: flowJsonString,
                updated_at: timestamp
            });
            console.log('✅ Rule updated successfully');
            
        } else {
            // INSERT NEW RULE
            console.log('➕ Creating new rule...');
            result = await table.insertRow({
                user_id: userId,
                flow_json: flowJsonString,
                keyword: 'AI_FLOW',
                delegate_id: 'AI_SYSTEM',
                is_active: true,
                created_at: timestamp,
                updated_at: timestamp
            });
            console.log('✅ New rule created successfully');
        }
        
        console.log('🎉 Save operation result:', result);
        showNotification('Flow saved successfully!', 'success');
        
        return result;
        
    } catch (error) {
        console.error('❌ Error saving flow to Catalyst:', error);
        showNotification(`Save failed: ${error.message}`, 'error');
        throw error;
    }
}

// ========================================
// 3. VISUAL WIRING/CONNECTOR LOGIC
// ========================================

// Setup connection mode event listeners
function setupFlowEditorEventListeners() {
    // Add connection mode toggle
    const connectionModeBtn = document.createElement('button');
    connectionModeBtn.id = 'connection-mode-btn';
    connectionModeBtn.className = 'connection-mode-btn';
    connectionModeBtn.textContent = '🔗 Connect Nodes';
    connectionModeBtn.title = 'Toggle connection mode to link nodes';
    
    // Insert button near save button
    if (saveFlowButton && saveFlowButton.parentNode) {
        saveFlowButton.parentNode.insertBefore(connectionModeBtn, saveFlowButton);
    }
    
    // Connection mode state
    let isConnectionMode = false;
    
    // Toggle connection mode
    connectionModeBtn.addEventListener('click', () => {
        isConnectionMode = !isConnectionMode;
        connectionModeBtn.classList.toggle('active');
        connectionModeBtn.textContent = isConnectionMode ? '🔗 Connecting...' : '🔗 Connect Nodes';
        
        // Clear selection when exiting connection mode
        if (!isConnectionMode) {
            clearConnectionSelection();
        }
        
        console.log(isConnectionMode ? '🔗 Connection mode ON' : '🔗 Connection mode OFF');
    });
    
    // Handle node clicks for connection
    canvasContent.addEventListener('click', (e) => {
        if (!isConnectionMode) return;
        
        const nodeElement = e.target.closest('.canvas-node');
        if (!nodeElement) return;
        
        handleNodeConnectionClick(nodeElement);
    });
}

// Handle node clicks for connection creation
function handleNodeConnectionClick(nodeElement) {
    const nodeId = nodeElement.getAttribute('data-node-id');
    
    if (!connectionSource) {
        // First click: Select source node
        connectionSource = {
            id: nodeId,
            element: nodeElement
        };
        
        // Highlight source node
        nodeElement.classList.add('is-source');
        console.log('🔗 Source node selected:', nodeId);
        
        showNotification('Select target node to connect', 'info');
        
    } else {
        // Second click: Select target node and create connection
        if (connectionSource.id === nodeId) {
            // Can't connect node to itself
            showNotification('Cannot connect node to itself', 'warning');
            return;
        }
        
        // Create connection
        const connection = {
            source: connectionSource.id,
            target: nodeId,
            id: `conn-${connectionSource.id}-${nodeId}`
        };
        
        // Add connection to data structure
        canvasConnections.push(connection);
        
        // Highlight target node
        nodeElement.classList.add('is-target');
        
        // Draw visual connector (placeholder)
        drawVisualConnector(connectionSource.element, nodeElement, connection);
        
        console.log('🔗 Connection created:', connection);
        showNotification('Nodes connected successfully!', 'success');
        
        // Clear selection for next connection
        setTimeout(() => {
            clearConnectionSelection();
        }, 1000);
    }
}

// Clear connection selection state
function clearConnectionSelection() {
    if (connectionSource) {
        connectionSource.element.classList.remove('is-source');
        connectionSource = null;
    }
    
    // Remove target highlights
    document.querySelectorAll('.is-target').forEach(el => {
        el.classList.remove('is-target');
    });
}

// Placeholder visual connector function
function drawVisualConnector(sourceElement, targetElement, connection) {
    try {
        // Get element positions
        const sourceRect = sourceElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const canvasRect = canvasContent.getBoundingClientRect();
        
        // Calculate connection coordinates relative to canvas
        const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
        const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
        const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
        
        // Log connection coordinates (placeholder implementation)
        console.log('📐 Visual Connector Coordinates:');
        console.log(`  Source: (${Math.round(sourceX)}, ${Math.round(sourceY)})`);
        console.log(`  Target: (${Math.round(targetX)}, ${Math.round(targetY)})`);
        console.log(`  Connection ID: ${connection.id}`);
        
        // TODO: Implement actual SVG line drawing here
        // For now, just log the coordinates
        console.log('🎨 Visual connector drawn (placeholder)');
        
    } catch (error) {
        console.error('❌ Error drawing visual connector:', error);
    }
}

// ========================================
// 4. DATA SERIALIZATION
// ========================================

// Collect complete flow data including nodes and connections
function collectFlowData() {
    const flowData = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        userId: currentUserId,
        
        // Nodes data with position, type, and metadata
        nodes: canvasNodes.map(node => ({
            id: node.id,
            type: node.type,
            position: {
                x: Math.round(node.x),
                y: Math.round(node.y)
            },
            label: getNodeLabel(node.type),
            description: getNodeDescription(node.type),
            rules: node.rules || {}
        })),
        
        // Connections data with source and target IDs
        connections: canvasConnections.map(conn => ({
            id: conn.id,
            source: conn.source,
            target: conn.target,
            type: 'flow_connection'
        })),
        
        // Metadata
        metadata: {
            nodeCount: canvasNodes.length,
            connectionCount: canvasConnections.length,
            lastModified: new Date().toISOString()
        }
    };
    
    console.log('📊 Flow data collected:', flowData);
    return flowData;
}

// Get node label by type
function getNodeLabel(nodeType) {
    const labels = {
        'intent-classifier': 'Intent Classifier',
        'action-handler': 'Action Handler',
        'end-node': 'End Node'
    };
    return labels[nodeType] || 'Unknown Node';
}

// Get node description by type
function getNodeDescription(nodeType) {
    const descriptions = {
        'intent-classifier': 'Condition setting and intent analysis',
        'action-handler': 'Routing, Ghost Mode, or Swarm Protocol execution',
        'end-node': 'Flow terminator and completion handler'
    };
    return descriptions[nodeType] || 'Unknown node type';
}

// ========================================
// SAVE FLOW HANDLER (Enhanced)
// ========================================

// Enhanced save flow handler
async function handleSaveFlow() {
    // Guard clause - Check if Catalyst is ready
    if (!isCatalystReady) {
        showNotification('Please wait, Catalyst is still loading...', 'warning');
        return;
    }
    
    // Guard clause - Check if user is authenticated
    if (!currentUserId) {
        showNotification('User not authenticated. Please refresh.', 'error');
        return;
    }
    
    try {
        // Collect complete flow data
        const flowData = collectFlowData();
        
        // Validate flow data
        if (flowData.nodes.length === 0) {
            showNotification('Please add at least one node to the flow', 'warning');
            return;
        }
        
        // Update button state
        const originalText = saveFlowButton.textContent;
        saveFlowButton.textContent = 'Saving...';
        saveFlowButton.disabled = true;
        
        // Save to Catalyst with persistent logic
        await saveFlowToCatalyst(flowData, currentUserId);
        
        // Restore button state
        saveFlowButton.textContent = originalText;
        saveFlowButton.disabled = false;
        
        console.log('🎉 Flow saved successfully!');
        
    } catch (error) {
        console.error('❌ Save flow failed:', error);
        
        // Restore button state
        saveFlowButton.textContent = 'Save Flow';
        saveFlowButton.disabled = false;
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Show notification to user
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

// Add CSS for notification system
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    }
    
    .notification-success {
        background: #00d084;
        color: white;
    }
    
    .notification-error {
        background: #ef4444;
        color: white;
    }
    
    .notification-warning {
        background: #f59e0b;
        color: white;
    }
    
    .notification-info {
        background: #0091ff;
        color: white;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .connection-mode-btn {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 10px 20px;
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        font-weight: 600;
        margin-right: 10px;
    }
    
    .connection-mode-btn:hover {
        background: var(--accent-blue);
        transform: translateY(-2px);
    }
    
    .connection-mode-btn.active {
        background: var(--accent-blue);
        box-shadow: 0 0 0 3px rgba(0, 145, 255, 0.2);
    }
    
    .canvas-node.is-source {
        border-color: #00ff88 !important;
        box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.3);
        transform: scale(1.05);
    }
    
    .canvas-node.is-target {
        border-color: #ff6b35 !important;
        box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.3);
        transform: scale(1.05);
    }
    
    .save-flow-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: var(--text-muted) !important;
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// ========================================
// EVENT LISTENERS SETUP
// ========================================

// Setup save button listener
if (saveFlowButton) {
    saveFlowButton.addEventListener('click', handleSaveFlow);
}

// Export functions for global access
window.FlowEditor = {
    initializeCatalystSDK,
    saveFlowToCatalyst,
    handleSaveFlow,
    collectFlowData,
    isCatalystReady: () => isCatalystReady,
    currentUserId: () => currentUserId
};

console.log('🚀 Enhanced Flow Editor loaded successfully!');
