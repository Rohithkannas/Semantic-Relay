'use strict';
const express = require('express');
const app = express();
app.use(express.json());

// Health Check
app.get('/', (req, res) => res.send("Relay Core is ONLINE!"));

// Mock List for testing
app.get('/rules/list', (req, res) => {
    res.json({
        rules: [
            { ROWID: "1", keyword: "Test", delegate_id: "Admin", is_active: true }
        ],
        global_status: true
    });
});

// Mock Add
app.post('/rules/add', (req, res) => res.json({ success: true }));

// Mock Delete
app.delete('/rules/:id', (req, res) => res.json({ success: true }));

module.exports = app;