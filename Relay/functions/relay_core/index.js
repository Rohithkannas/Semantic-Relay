'use strict';
const express = require('express');
const app = express();

app.use(express.json());

// 1. HEALTH CHECK
app.get('/', (req, res) => {
    res.send("Relay Core is ONLINE and READY!");
});

// 2. LIST RULES (Returning Fake Data to test the Dashboard)
app.get('/rules/list', (req, res) => {
    console.log("Fetching mock rules...");
    res.json({
        rules: [
            { ROWID: "1", keyword: "Billing", delegate_id: "Jane (Sales)", is_active: true },
            { ROWID: "2", keyword: "Server", delegate_id: "Steve (DevOps)", is_active: true },
            { ROWID: "3", keyword: "Help", delegate_id: "Admin", is_active: true }
        ],
        global_status: true
    });
});

// 3. ADD RULE (Mock Success)
app.post('/rules/add', (req, res) => {
    res.json({ success: true });
});

// 4. DELETE RULE (Mock Success)
app.delete('/rules/:id', (req, res) => {
    res.json({ success: true });
});

// 5. BOT HANDLER (Simple Logic)
app.post('/bot-handler', (req, res) => {
    const text = (req.body.text || "").toLowerCase();
    
    if (text.includes("server")) {
        res.json({ text: "⚠️ **Relay Active:** User is OOO. Routing 'Server' issue to Steve." });
    } else {
        res.json({ text: "I am listening. Try typing 'Server'." });
    }
});

module.exports = app;