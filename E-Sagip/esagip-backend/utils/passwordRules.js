const bcrypt = require('bcryptjs');
const db = require('../db');

const PASSWORD_HISTORY_LIMIT = 5;   // total "last N passwords" window (current + history)
const PASSWORD_EXPIRY_DAYS   = 90;
const MIN_FRAGMENT_LENGTH    = 3;   // ignore 1-2 char fragments to avoid false positives

/**
 * Checks whether a password contains the user's email, email's local
 * part, or any piece of their full name (case-insensitive substring).
 * Returns the matched fragment, or null if clean.
 */
function findPersonalInfoMatch(password, { email, firstName, lastName, fullName } = {}) {
    const pwLower = password.toLowerCase();
    const candidates = [];

    if (email) {
        candidates.push(email);
        candidates.push(email.split('@')[0]);
    }
    if (firstName) candidates.push(firstName);
    if (lastName) candidates.push(lastName);
    if (firstName && lastName) {
        candidates.push(`${firstName}${lastName}`);
        candidates.push(`${firstName} ${lastName}`);
    }
    if (fullName) {
        candidates.push(fullName);
        fullName.split(/\s+/).forEach(part => candidates.push(part));
    }

    for (const raw of candidates) {
        if (!raw) continue;
        const val = String(raw).trim().toLowerCase();
        if (val.length >= MIN_FRAGMENT_LENGTH && pwLower.includes(val)) {
            return val;
        }
    }
    return null;
}

/**
 * True if `password` matches the user's current hash OR any of their
 * stored history hashes (current + history together cover the last
 * PASSWORD_HISTORY_LIMIT passwords).
 */
async function isPasswordReused(password, userType, userId, currentHash, limit = PASSWORD_HISTORY_LIMIT) {
    if (currentHash) {
        const matchesCurrent = await bcrypt.compare(password, currentHash);
        if (matchesCurrent) return true;
    }

    const [rows] = await db.query(
        `SELECT password_hash FROM password_history
         WHERE user_type = ? AND user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [userType, userId, Math.max(limit - 1, 0)]
    );

    for (const row of rows) {
        const matches = await bcrypt.compare(password, row.password_hash);
        if (matches) return true;
    }
    return false;
}

/**
 * Pushes the password that's about to be replaced into history, then
 * trims old rows so only the most recent (limit - 1) remain — the
 * current password itself fills the remaining slot of the "last 5".
 */
async function recordPasswordHistory(userType, userId, oldHash, limit = PASSWORD_HISTORY_LIMIT) {
    await db.query(
        `INSERT INTO password_history (user_type, user_id, password_hash) VALUES (?, ?, ?)`,
        [userType, userId, oldHash]
    );

    await db.query(
        `DELETE FROM password_history
         WHERE user_type = ? AND user_id = ?
         AND id NOT IN (
             SELECT id FROM (
                 SELECT id FROM password_history
                 WHERE user_type = ? AND user_id = ?
                 ORDER BY created_at DESC
                 LIMIT ?
             ) AS keep_rows
         )`,
        [userType, userId, userType, userId, Math.max(limit - 1, 0)]
    );
}

function isPasswordExpired(passwordChangedAt) {
    if (!passwordChangedAt) return false;
    const ageInDays = (Date.now() - new Date(passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays >= PASSWORD_EXPIRY_DAYS;
}

module.exports = {
    PASSWORD_HISTORY_LIMIT,
    PASSWORD_EXPIRY_DAYS,
    findPersonalInfoMatch,
    isPasswordReused,
    recordPasswordHistory,
    isPasswordExpired
};
