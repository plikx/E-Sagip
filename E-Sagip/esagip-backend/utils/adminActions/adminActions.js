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

// Re-checks the admin_id against the admins table — protects against a
// spoofed/stale id being sent from the frontend, since there's no session
// token to verify identity against.
async function verifyAdmin(adminId) {
    if (!adminId) return null;
    const [rows] = await db.query('SELECT id, name, role FROM admins WHERE id = ?', [adminId]);
    return rows[0] || null;
}

async function logAdminAction({ adminId, action, targetType, targetId, previousStatus = null, newStatus = null }) {
    await db.query(
        `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, previous_status, new_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, action, targetType, targetId, previousStatus, newStatus]
    );
}

module.exports = { ALLOWED_TRANSITIONS, isValidTransition, verifyAdmin, logAdminAction };
