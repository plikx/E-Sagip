// routes/audit.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Helper other route files can call directly to log an action ──────────
// Usage example (inside operations.js or auth.js):
//   const { logAction } = require('./audit');
//   await logAction({ adminId: 3, adminName: 'Juan Dela Cruz', action: 'DEPLOY_OPERATION', target: title });
async function logAction({ adminId = null, adminName, action, target = null, details = null }) {
    try {
        await db.query(
            'INSERT INTO audit_log (admin_id, admin_name, action, target, details) VALUES (?, ?, ?, ?, ?)',
            [adminId, adminName, action, target, details]
        );
    } catch (err) {
        // Logging failures should never break the actual operation that triggered them
        console.error('Failed to write audit log entry:', err);
    }
}

// 1. FETCH AUDIT LOG ENTRIES (optionally filtered by action type, search term)
router.get('/', async (req, res) => {
    const { action, search } = req.query;

    try {
        let query = 'SELECT * FROM audit_log WHERE 1=1';
        const params = [];

        if (action && action !== 'all') {
            query += ' AND action = ?';
            params.push(action);
        }

        if (search) {
            query += ' AND (admin_name LIKE ? OR action LIKE ? OR target LIKE ?)';
            const likeTerm = `%${search}%`;
            params.push(likeTerm, likeTerm, likeTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT 500';

        const [entries] = await db.query(query, params);
        res.json(entries);
    } catch (err) {
        console.error('Fetch audit log error:', err);
        res.status(500).json({ error: "Could not fetch audit log." });
    }
});

// 2. CREATE A LOG ENTRY DIRECTLY VIA API (useful if frontend logs an action itself)
router.post('/', async (req, res) => {
    const { adminId, adminName, action, target, details } = req.body;

    if (!adminName || !action) {
        return res.status(400).json({ error: "adminName and action are required." });
    }

    try {
        await logAction({ adminId, adminName, action, target, details });
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Create audit log entry error:', err);
        res.status(500).json({ error: "Could not create audit log entry." });
    }
});

// 3. CLEAR ALL AUDIT LOG ENTRIES
router.delete('/', async (req, res) => {
    try {
        await db.query('DELETE FROM audit_log');
        res.json({ success: true });
    } catch (err) {
        console.error('Clear audit log error:', err);
        res.status(500).json({ error: "Could not clear audit log." });
    }
});

module.exports = router;
module.exports.logAction = logAction;
