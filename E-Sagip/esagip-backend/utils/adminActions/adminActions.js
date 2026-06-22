const db = require('../db');

// Defines every status a volunteer can legally move TO, from a given current status.
// Anything not listed here is treated as an invalid jump and rejected.
const ALLOWED_TRANSITIONS = {
    pending:  ['active', 'rejected'],
    active:   [],
    rejected: [],
    inactive: []
};

function isValidTransition(currentStatus, newStatus) {
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
}

// Re-checks adminId against the admins table and returns the REAL name on file —
// this is what gets written to the audit log, not whatever name the frontend sends,
// since adminName in a request body can't be trusted on its own.
async function verifyAdmin(adminId) {
    if (!adminId) return null;
    const [rows] = await db.query('SELECT id, name, role FROM admins WHERE id = ?', [adminId]);
    return rows[0] || null;
}

module.exports = { ALLOWED_TRANSITIONS, isValidTransition, verifyAdmin };
