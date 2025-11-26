'use strict';
const express = require('express');
const app = express();

// 1. UNIVERSAL PARSING (Prevents "Unexpected Token" crashes)
// Order matters: Try JSON, then URL-encoded, then Raw Text.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text()); 

// 2. ERROR HANDLER (Catches JSON parse errors silently)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON received:', err.message);
        // Don't crash! Just pretend body is empty.
        req.body = {}; 
        return next();
    }
    next();
});

// Health Check
app.get('/', (req, res) => res.send("Relay Core is ONLINE!"));

// List Rules (Mock)
app.get('/rules/list', (req, res) => {
    res.json({
        rules: [
            { ROWID: "1", keyword: "Billing", delegate_id: "Jane (Sales)", is_active: true },
            { ROWID: "2", keyword: "Server", delegate_id: "Steve (DevOps)", is_active: true },
            { ROWID: "3", keyword: "Help", delegate_id: "Admin", is_active: true }
        ],
        global_status: true
    });
});

// Add/Delete (Mock)
app.post('/rules/add', (req, res) => res.json({ success: true }));
app.delete('/rules/:id', (req, res) => res.json({ success: true }));

// 5. BOT HANDLER (Robust)
app.post('/bot-handler', (req, res) => {
    try {
        let text = "";
        const body = req.body;

        // Smart Extraction: Find the text no matter how it was sent
        if (typeof body === 'object' && body.text) {
            text = body.text;
        } else if (typeof body === 'object' && body.message) {
            text = typeof body.message === 'string' ? body.message : body.message.text;
        } else if (typeof body === 'string') {
            text = body; // It came as raw text
        }

        console.log("Processing Text:", text);
        const cleanText = (text || "").toLowerCase();

        if (cleanText.includes("server")) {
            res.json({ text: "⚠️ **Relay Active:** User is OOO. Routing 'Server' issue to Steve." });
        } else {
            res.json({ text: "I heard: '" + cleanText + "'. Try typing 'The Server is down'." });
        }

    } catch (e) {
        console.error("Bot Logic Error:", e);
        res.json({ text: "Error processing request." });
    }
});

module.exports = app;