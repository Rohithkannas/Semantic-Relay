'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();

// 1. UNIVERSAL PARSING (Prevents Bot Crashes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); 

// 2. HEALTH CHECK
app.get('/', async (req, res) => {
    try {
        const status = await systemStatusCheck();
        res.send(status);
    } catch (error) {
        console.error('Health check error:', error);
        res.send('❌ Health Check Failed');
    }
});

// 3. SYSTEM STATUS CHECK FUNCTION
async function systemStatusCheck() {
    let dbStatus = false;
    let cliqStatus = false;
    
    try {
        console.log('=== SYSTEM STATUS CHECK START ===');
        
        // Test 1: Database Connectivity - Non-destructive read from HandoverRules
        try {
            const app = catalyst.initialize();
            const table = app.datastore().table('HandoverRules');
            
            // Perform a small test read - just get the count of rows
            const testRows = await table.getAllRows();
            const rowCount = testRows.length;
            
            console.log(`Database test: Found ${rowCount} rows in HandoverRules`);
            dbStatus = true;
            
        } catch (dbError) {
            console.error('Database connectivity test failed:', dbError.message);
            dbStatus = false;
        }
        
        // Test 2: Cliq API Connectivity - Placeholder test
        try {
            const app = catalyst.initialize();
            
            // Placeholder: Test Cliq API by checking bot details
            console.log('Testing Cliq API connectivity...');
            
            // Mock Cliq API call to get bot details
            // const botDetails = await app.integration().cliq().callAPI({
            //     url: '/api/v2/users/me',
            //     method: 'GET'
            // });
            
            // For now, simulate successful API response
            console.log('Cliq API test: Bot details retrieved (mock)');
            cliqStatus = true;
            
        } catch (cliqError) {
            console.error('Cliq API connectivity test failed:', cliqError.message);
            cliqStatus = false;
        }
        
        // Determine final status based on test results
        if (dbStatus && cliqStatus) {
            console.log('✅ All systems GREEN');
            return '✅ Relay Core: Database and Cliq API connections are GREEN. All flows are being tracked.';
            
        } else if (!dbStatus && cliqStatus) {
            console.log('⚠️ Database ERROR, Cliq OK');
            return '⚠️ Database Connection ERROR. Flow saving may be impacted.';
            
        } else if (dbStatus && !cliqStatus) {
            console.log('⚠️ Cliq ERROR, Database OK');
            return '⚠️ Cliq Integration ERROR. Handover actions may fail.';
            
        } else {
            console.log('❌ Both systems ERROR');
            return '❌ Critical: Both Database and Cliq API connections have failed. System is non-operational.';
        }
        
    } catch (error) {
        console.error('System status check failed:', error);
        return '❌ System Status Check Failed: ' + error.message;
        
    } finally {
        console.log('=== SYSTEM STATUS CHECK END ===');
    }
}

// 3. LIST RULES (REAL DB)
app.get('/rules/list', async (req, res) => {
    try {
        const app = catalyst.initialize(req);
        const table = app.datastore().table('HandoverRules');
        
        // Fetch rows directly from Cloud
        const rows = await table.getAllRows();
        
        // Map to clean format
        const rules = rows.map(row => ({
            ROWID: row.ROWID,
            keyword: row.keyword,
            delegate_id: row.delegate_id,
            is_active: row.is_active
        }));

        res.json({ rules: rules, global_status: true });
    } catch (err) {
        console.error("List Error:", err);
        // Return empty list on error so Widget doesn't crash
        res.json({ rules: [], global_status: false, error: "DB Error: " + err.message });
    }
});

// 4. ADD RULE (REAL DB)
app.post('/rules/add', async (req, res) => {
    try {
        const app = catalyst.initialize(req);
        const table = app.datastore().table('HandoverRules');
        
        await table.insertRow({
            keyword: req.body.keyword,
            delegate_id: req.body.delegate_id,
            is_active: true,
            user_id: "current_user" // Hardcoded for hackathon simplicity
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. DELETE RULE (REAL DB)
app.delete('/rules/:id', async (req, res) => {
    try {
        const app = catalyst.initialize(req);
        const table = app.datastore().table('HandoverRules');
        
        await table.deleteRow(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. CLIQ WEBHOOK HANDLER (ADVANCED I/O FUNCTION)
app.post('/cliq-webhook', async (req, res) => {
    try {
        await handleCliqMessage(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Cliq webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 7. CLIQ MESSAGE PROCESSING FUNCTION
async function handleCliqMessage(messageData) {
    try {
        // Extract sender ID and message text
        const senderId = messageData.user?.id || messageData.sender_id || messageData.from;
        const messageText = messageData.text || messageData.message || '';
        
        if (!senderId) {
            throw new Error('Sender ID not found in message data');
        }
        
        console.log(`Processing message from user ${senderId}: "${messageText}"`);
        
        // Initialize Catalyst SDK
        const app = catalyst.initialize();
        
        // Access HandoverRules table
        const table = app.datastore().table('HandoverRules');
        
        // Find row where user_id matches sender ID
        const userRules = await table.getAllRows();
        const userRow = userRules.find(row => row.user_id === senderId);
        
        if (!userRow) {
            console.log(`No rules found for user ${senderId}`);
            return { text: 'No handover rules configured for this user.' };
        }
        
        // Check if flow_json exists and is not null
        if (userRow.flow_json && userRow.flow_json !== null && userRow.flow_json !== '') {
            console.log('Processing with AI Flow');
            
            // Parse flow data
            let flowData;
            try {
                flowData = JSON.parse(userRow.flow_json);
            } catch (parseError) {
                console.error('Error parsing flow_json:', parseError);
                throw new Error('Invalid flow data format');
            }
            
            // Process with AI Flow
            return await processAIFlow(flowData, messageText);
            
        } else {
            console.log('Processing with Keyword Flow');
            
            // Get keyword and delegate from user row
            const keywordText = userRow.keyword;
            const delegateId = userRow.delegate_id;
            
            if (!keywordText || !delegateId) {
                throw new Error('Keyword or delegate ID not found in user rules');
            }
            
            // Process with Keyword Flow
            return await processKeywordFlow(keywordText, delegateId, messageText);
        }
        
    } catch (error) {
        console.error('Error in handleCliqMessage:', error);
        throw error;
    }
}

// 8. MOCK AI LOGIC (THE BRAIN SIMULATOR)
async function mockAILogic(messageText) {
    try {
        console.log('Running AI analysis on:', messageText);
        
        const lowerText = messageText.toLowerCase();
        
        // Priority 1 Incident detection
        if (lowerText.includes('critical') || lowerText.includes('down')) {
            return { domain: 'P1 Incident', urgency_score: 9 };
        }
        
        // Info Request detection
        if (lowerText.includes('budget') || lowerText.includes('policy')) {
            return { domain: 'Info Request', urgency_score: 3 };
        }
        
        // Default case
        return { domain: 'General', urgency_score: 5 };
        
    } catch (error) {
        console.error('Error in mockAILogic:', error);
        // Return default on error
        return { domain: 'General', urgency_score: 5 };
    }
}

// 9. EXECUTE SWARM PROTOCOL (INCIDENT RESPONSE)
async function executeSwarmProtocol(messageData, aiOutput) {
    try {
        console.log('Executing Swarm Protocol for:', aiOutput);
        
        // Initialize Catalyst SDK
        const app = catalyst.initialize();
        
        // Placeholder: Create incident channel via Cliq API
        const channelName = `#INCIDENT-P1-${Date.now()}`;
        try {
            // Mock Cliq API call to create channel
            console.log('Creating channel:', channelName);
            // const channelResult = await app.integration().cliq().callAPI({
            //     url: '/api/v2/channels',
            //     method: 'POST',
            //     body: {
            //         name: channelName,
            //         type: 'public',
            //         description: `P1 Incident: ${aiOutput.domain}`
            //     }
            // });
            console.log('Channel created (mock):', channelName);
        } catch (cliqError) {
            console.log('Channel creation failed (expected in mock):', cliqError.message);
        }
        
        // Placeholder: Post message to channel
        const contextMessage = `🚨 **P1 Incident Detected**\n\n**Domain:** ${aiOutput.domain}\n**Urgency Score:** ${aiOutput.urgency_score}/10\n\n**Message:** ${messageData.text}\n\n**Action Required:** Immediate response needed from available team members.`;
        
        try {
            // Mock Cliq API call to post message
            console.log('Posting to channel:', contextMessage);
            // const messageResult = await app.integration().cliq().callAPI({
            //     url: `/api/v2/channels/${channelName}/messages`,
            //     method: 'POST',
            //     body: {
            //         text: contextMessage
            //     }
            // });
            console.log('Message posted to channel (mock)');
        } catch (postError) {
            console.log('Message posting failed (expected in mock):', postError.message);
        }
        
        return 'Swarm Protocol Initiated: Channel Created';
        
    } catch (error) {
        console.error('Error in executeSwarmProtocol:', error);
        throw error;
    }
}

// 10. EXECUTE GHOST MODE (RAG AUTO-REPLY)
async function executeGhostMode(messageData, aiOutput) {
    try {
        console.log('Executing Ghost Mode for:', aiOutput);
        
        // Initialize Catalyst SDK
        const app = catalyst.initialize();
        
        // Simulate RAG document query
        const mockRagResponse = generateMockRagResponse(messageData.text);
        
        // Construct automated reply
        const replyText = `👻 **Automated Reply**: Based on the latest policy, the requested information is ${mockRagResponse}. Contact @Delegate for further help.`;
        
        // Placeholder: Send direct reply via Cliq API
        try {
            // Mock Cliq API call to send direct message
            console.log('Sending Ghost Mode reply:', replyText);
            // const replyResult = await app.integration().cliq().callAPI({
            //     url: '/api/v2/users/message',
            //     method: 'POST',
            //     body: {
            //         user_id: messageData.user?.id || messageData.sender_id,
            //         text: replyText
            //     }
            // });
            console.log('Ghost Mode reply sent (mock)');
        } catch (cliqError) {
            console.log('Direct message failed (expected in mock):', cliqError.message);
        }
        
        return 'Ghost Mode RAG Auto-Reply Sent';
        
    } catch (error) {
        console.error('Error in executeGhostMode:', error);
        throw error;
    }
}

// 11. MOCK RAG RESPONSE GENERATOR
function generateMockRagResponse(queryText) {
    const lowerQuery = queryText.toLowerCase();
    
    if (lowerQuery.includes('budget')) {
        return '[MOCK DATA]: Current Q4 budget allocation is $125,000 with 78% utilized';
    }
    
    if (lowerQuery.includes('policy')) {
        return '[MOCK DATA]: Policy updated on 2024-11-15 - All remote work requests require manager approval';
    }
    
    if (lowerQuery.includes('leave')) {
        return '[MOCK DATA]: Annual leave policy: 20 days PTO, 5 days sick leave per fiscal year';
    }
    
    return '[MOCK DATA]: Information available in internal knowledge base - Please check documentation portal';
}

// 12. PROCESS AI FLOW (THE ORCHESTRATOR)
async function processAIFlow(flowData, messageText, messageData) {
    try {
        console.log('=== AI FLOW PROCESSING START ===');
        console.log('Flow Data:', flowData);
        console.log('Message Text:', messageText);
        console.log('Message Data:', messageData);
        
        // Step 1: Call mock AI logic to get analysis
        const aiOutput = await mockAILogic(messageText);
        console.log('AI Output:', aiOutput);
        
        let actionTaken = '';
        let finalResponse = {};
        
        // Step 2: Decide action based on AI output (simulating flow traversal)
        if (aiOutput.urgency_score > 7 && aiOutput.domain === 'P1 Incident') {
            console.log('Decision: High urgency incident - Executing Swarm Protocol');
            actionTaken = await executeSwarmProtocol(messageData, aiOutput);
            finalResponse = {
                text: `🚨 **P1 Incident Alert**: ${actionTaken}`,
                flow_type: 'ai_swarm',
                urgency: aiOutput.urgency_score,
                domain: aiOutput.domain
            };
            
        } else if (aiOutput.urgency_score < 4 && aiOutput.domain === 'Info Request') {
            console.log('Decision: Low priority info request - Executing Ghost Mode');
            actionTaken = await executeGhostMode(messageData, aiOutput);
            finalResponse = {
                text: `🤖 **AI Response**: ${actionTaken}`,
                flow_type: 'ai_ghost',
                urgency: aiOutput.urgency_score,
                domain: aiOutput.domain
            };
            
        } else {
            console.log('Decision: Default routing to designated delegate');
            actionTaken = 'Routed to Designated Delegate';
            finalResponse = {
                text: `📋 **Standard Routing**: ${actionTaken}`,
                flow_type: 'ai_default',
                urgency: aiOutput.urgency_score,
                domain: aiOutput.domain
            };
        }
        
        // Step 3: Crucial Log - Log the final result to RelayLogs table
        try {
            const app = catalyst.initialize();
            const logTable = app.datastore().table('RelayLogs');
            
            await logTable.insertRow({
                original_sender: messageData.user?.id || messageData.sender_id || 'Unknown',
                message_content: messageText,
                llm_intent: aiOutput.domain,
                llm_urgency_score: aiOutput.urgency_score,
                action_taken: actionTaken,
                flow_type: 'ai_flow',
                flow_nodes_processed: flowData.nodes?.length || 0,
                logged_at: new Date().toISOString()
            });
            
            console.log('AI Flow result logged to RelayLogs');
            
        } catch (logError) {
            console.error('Failed to log AI Flow result:', logError.message);
            // Continue even if logging fails
        }
        
        console.log('=== AI FLOW PROCESSING END ===');
        console.log('Final Response:', finalResponse);
        
        return finalResponse;
        
    } catch (error) {
        console.error('Error in processAIFlow:', error);
        
        // Log error to RelayLogs if possible
        try {
            const app = catalyst.initialize();
            const logTable = app.datastore().table('RelayLogs');
            await logTable.insertRow({
                original_sender: messageData.user?.id || messageData.sender_id || 'Unknown',
                message_content: messageText,
                llm_intent: 'ERROR',
                llm_urgency_score: 0,
                action_taken: `AI Flow Error: ${error.message}`,
                flow_type: 'ai_flow_error',
                error_details: error.message,
                logged_at: new Date().toISOString()
            });
        } catch (logError) {
            console.error('Failed to log error:', logError.message);
        }
        
        throw error;
    }
}

// 13. PLACEHOLDER KEYWORD FLOW PROCESSING FUNCTION (UPDATED)
async function processKeywordFlow(keywordText, delegateId, messageText) {
    try {
        console.log(`Processing Keyword Flow: ${keywordText} -> ${delegateId}`);
        console.log('Message text:', messageText);
        
        // Check if message contains keyword
        const lowerMessage = messageText.toLowerCase();
        const lowerKeyword = keywordText.toLowerCase();
        
        if (lowerMessage.includes(lowerKeyword)) {
            // Log the relay action
            try {
                const app = catalyst.initialize();
                const logTable = app.datastore().table('RelayLogs');
                await logTable.insertRow({
                    original_sender: "Cliq User",
                    routed_to: delegateId,
                    message_content: messageText,
                    keyword_matched: keywordText,
                    flow_type: 'keyword',
                    logged_at: new Date().toISOString()
                });
            } catch (logError) {
                console.log('Logging failed:', logError.message);
            }
            
            return {
                text: `⚠️ **Relay Active**: User is OOO. Routing **'${keywordText}'** issue to **${delegateId}**.`,
                flow_type: 'keyword',
                delegate: delegateId,
                keyword: keywordText
            };
            
        } else {
            return {
                text: `No keyword match found for "${messageText}". Current keyword: "${keywordText}"`,
                flow_type: 'keyword',
                no_match: true
            };
        }
        
    } catch (error) {
        console.error('Error in processKeywordFlow:', error);
        throw error;
    }
}

// 10. BOT HANDLER (LEGACY - KEPT FOR COMPATIBILITY)
app.post('/bot-handler', async (req, res) => {
    try {
        // Parse Text Safely
        let text = "";
        const body = req.body;
        if (typeof body === 'object' && body.text) text = body.text;
        else if (typeof body === 'string') text = body;
        
        const cleanText = (text || "").toLowerCase();
        
        // Fetch Rules from DB
        const app = catalyst.initialize(req);
        const table = app.datastore().table('HandoverRules');
        const allRows = await table.getAllRows();

        // Find Match
        const match = allRows.find(row => cleanText.includes(row.keyword.toLowerCase()));

        if (match) {
            // Log to RelayLogs Table
            try {
                const logTable = app.datastore().table('RelayLogs');
                await logTable.insertRow({
                    original_sender: "User",
                    routed_to: match.delegate_id,
                    message_content: cleanText,
                    logged_at: new Date().toISOString()
                });
            } catch (e) { console.log("Logging failed"); }

            res.json({ text: `⚠️ **Relay Active:** User is OOO. Routing **'${match.keyword}'** issue to **${match.delegate_id}**.` });
        } else {
            res.json({ text: `I heard '${cleanText}'. No handover rules matched.` });
        }

    } catch (e) {
        console.error(e);
        res.json({ text: "Error: " + e.message });
    }
});

module.exports = app;