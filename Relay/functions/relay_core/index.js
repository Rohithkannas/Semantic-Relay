'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();

// 1. UNIVERSAL PARSING (Prevents Bot Crashes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); 

// 2. HEALTH CHECK
app.get('/', (req, res) => res.send("Relay Core: DATABASE MODE"));

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

// 6. BOT HANDLER (REAL LOGIC)
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