const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const {
    findPersonalInfoMatch,
    isPasswordReused,
    recordPasswordHistory,
    isPasswordExpired
} = require('../utils/passwordRules');
const { isValidTransition, verifyAdmin } = require('../utils/adminActions');
const {
    normalizeEmail,
    isValidName,
    isValidEmailFormat,
    isValidPhone,
    isValidPassword,
    isWithinLength,
    LIMITS
} = require('../utils/validators');
const { logAction } = require('./audit');

// 1. VOLUNTEER REGISTRATION ENDPOINT
router.post('/register', async (req, res) => {
    let { 
        firstName, lastName, birthdate, gender, isResident, 
        address, contactNumber, email, ecName, ecNumber,
        secQuestion, secAnswer, password, skills, otherSkill 
    } = req.body;

    email = normalizeEmail(email);

    // ---- Server-side whitelist + threshold validation ----
    const errors = [];

    if (!isValidName(firstName)) errors.push("First name must be 2-60 letters (hyphens/apostrophes allowed).");
    if (!isValidName(lastName)) errors.push("Last name must be 2-60 letters (hyphens/apostrophes allowed).");
    if (!isValidEmailFormat(email)) errors.push("Email must be a valid @gmail.com address.");
    if (!isValidPhone(contactNumber)) errors.push("Contact number must be exactly 11 digits.");
    if (!isWithinLength(address, LIMITS.address)) errors.push(`Address must be ${LIMITS.address.min}-${LIMITS.address.max} characters.`);
    if (!isValidPassword(password)) errors.push(`Password must be ${LIMITS.password.min}-${LIMITS.password.max} characters.`);
    if (!isWithinLength(secQuestion, LIMITS.securityQuestion)) errors.push("Please select a valid security question.");
    if (!isWithinLength(secAnswer, LIMITS.securityAnswer)) errors.push("Security answer is required.");
    if (ecNumber && !isValidPhone(ecNumber)) errors.push("Emergency contact number must be exactly 11 digits.");
    if (ecName && !isValidName(ecName)) errors.push("Emergency contact name must be 2-60 letters.");

    if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], errors });
    }

    try {
        const [existing] = await db.query('SELECT id FROM volunteers WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Email is already registered with an account." });
        }

        const personalInfoMatch = findPersonalInfoMatch(password, { email, firstName, lastName });
        if (personalInfoMatch) {
            return res.status(400).json({ error: "Password cannot contain your name or email address." });
        }

        const hashedPw = await bcrypt.hash(password, 10);

        const [volResult] = await db.query(
          `INSERT INTO volunteers 
            (first_name, last_name, birthdate, gender, is_resident, address, 
             contact_number, email, ec_name, ec_number, security_question, 
             security_answer, password_hash, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [firstName, lastName, birthdate, gender, isResident ? 1 : 0, address,
           contactNumber, email, ecName, ecNumber, secQuestion, secAnswer, hashedPw]
        );
        const volunteerId = volResult.insertId;

        if (skills && skills.length > 0) {
            const [dbSkills] = await db.query('SELECT id FROM skills WHERE name IN (?)', [skills]);
            if (dbSkills.length > 0) {
                const skillMappings = dbSkills.map(s => [volunteerId, s.id]);
                await db.query('INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES ?', [skillMappings]);
            }
        }

        if (otherSkill) {
            await db.query('INSERT INTO volunteer_other_skills (volunteer_id, description) VALUES (?, ?)', [volunteerId, otherSkill]);
        }

        res.status(201).json({ success: true, message: "Volunteer registered successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error processing registration records." });
    }
});

// 2. SIGN IN ENDPOINT (Works for both Volunteers and Admins)
// NOTE: soft-deleted accounts are excluded so they can't log in while in the trash.
router.post('/login', async (req, res) => {
    const { password, role } = req.body;
    const email = normalizeEmail(req.body.email);

    try {
        if (role === 'admin') {
            const [admin] = await db.query('SELECT * FROM admins WHERE email = ? AND deleted_at IS NULL', [email]);
            if (admin.length === 0) return res.status(401).json({ error: "Invalid admin credentials." });

            const valid = await bcrypt.compare(password, admin[0].password_hash);
            if (!valid) return res.status(401).json({ error: "Incorrect password." });

            const passwordExpired = isPasswordExpired(admin[0].password_changed_at);

            return res.json({
                success: true,
                user: { id: admin[0].id, name: admin[0].name, role: admin[0].role },
                passwordExpired
            });
        } else {
            const [volunteer] = await db.query('SELECT * FROM volunteers WHERE email = ? AND deleted_at IS NULL', [email]);
            if (volunteer.length === 0) return res.status(401).json({ error: "Invalid credentials." });

            const valid = await bcrypt.compare(password, volunteer[0].password_hash);
            if (!valid) return res.status(401).json({ error: "Incorrect password." });

            const passwordExpired = isPasswordExpired(volunteer[0].password_changed_at);

            return res.json({ 
                success: true, 
                user: { 
                    id: volunteer[0].id, 
                    name: `${volunteer[0].first_name} ${volunteer[0].last_name}`, 
                    role: 'volunteer',
                    status: volunteer[0].status
                },
                passwordExpired
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login." });
    }
});

// 3. CHANGE PASSWORD ENDPOINT (Volunteers and Admins)
router.put('/change-password', async (req, res) => {
    const { userType, userId, currentPassword, newPassword } = req.body;

    if (!['admin', 'volunteer'].includes(userType)) {
        return res.status(400).json({ error: "Invalid user type." });
    }
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required." });
    }
    if (!isValidPassword(newPassword)) {
        return res.status(400).json({ error: `New password must be ${LIMITS.password.min}-${LIMITS.password.max} characters.` });
    }

    try {
        const table = userType === 'admin' ? 'admins' : 'volunteers';
        const [rows] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        const user = rows[0];

        const validCurrent = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validCurrent) {
            return res.status(401).json({ error: "Current password is incorrect." });
        }

        const personalInfoFields = userType === 'admin'
            ? { email: user.email, fullName: user.name }
            : { email: user.email, firstName: user.first_name, lastName: user.last_name };

        const personalInfoMatch = findPersonalInfoMatch(newPassword, personalInfoFields);
        if (personalInfoMatch) {
            return res.status(400).json({ error: "Password cannot contain your name or email address." });
        }

        const reused = await isPasswordReused(newPassword, userType, userId, user.password_hash);
        if (reused) {
            return res.status(400).json({ error: "You cannot reuse any of your last 5 passwords." });
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await db.query(
            `UPDATE ${table} SET password_hash = ?, password_changed_at = NOW() WHERE id = ?`,
            [newHash, userId]
        );

        await recordPasswordHistory(userType, userId, user.password_hash);

        res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error updating password." });
    }
});

// 4. FETCH ALL VOLUNTEERS WITH THEIR RESPECTIVE SKILLS (for Admin Dashboard)
// NOTE: excludes soft-deleted volunteers — they only appear in the Trash view.
router.get('/volunteers', async (req, res) => {
    try {
        const [volunteers] = await db.query(`
            SELECT 
                v.id, 
                v.first_name, 
                v.last_name, 
                v.address, 
                v.contact_number, 
                v.email, 
                v.status,
                v.is_online,
                GROUP_CONCAT(s.name) AS skills_list
            FROM volunteers v
            LEFT JOIN volunteer_skills vs ON v.id = vs.volunteer_id
            LEFT JOIN skills s ON vs.skill_id = s.id
            WHERE v.deleted_at IS NULL
            GROUP BY v.id
        `);

        const formattedVolunteers = volunteers.map(v => ({
            ...v,
            skills: v.skills_list ? v.skills_list.split(',') : []
        }));

        res.json(formattedVolunteers);
    } catch (err) {
        console.error("Failed compiling relational volunteer directory logs:", err);
        res.status(500).json({ error: "Could not fetch volunteers." });
    }
});

// 5. APPROVE A VOLUNTEER  (pending -> active, guarded + logged)
router.put('/volunteers/:id/approve', async (req, res) => {
    const { adminId } = req.body;
    const volunteerId = req.params.id;

    try {
        const admin = await verifyAdmin(adminId);
        if (!admin) {
            return res.status(403).json({ error: "Invalid or unrecognized admin account." });
        }

        const [volRows] = await db.query('SELECT first_name, last_name, status FROM volunteers WHERE id = ? AND deleted_at IS NULL', [volunteerId]);
        if (volRows.length === 0) {
            return res.status(404).json({ error: "Volunteer not found." });
        }
        const currentStatus = volRows[0].status;
        const volunteerName = `${volRows[0].first_name} ${volRows[0].last_name}`;

        if (!isValidTransition(currentStatus, 'active')) {
            return res.status(409).json({
                error: `Cannot approve a volunteer with status "${currentStatus}".`
            });
        }

        await db.query('UPDATE volunteers SET status = ? WHERE id = ?', ['active', volunteerId]);

        await logAction({
            adminId: admin.id,
            adminName: admin.name,
            action: 'APPROVE_VOLUNTEER',
            target: volunteerName,
            details: `${currentStatus} -> active`
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not approve volunteer." });
    }
});

// 6. REJECT A VOLUNTEER  (pending -> rejected, guarded + logged)
router.put('/volunteers/:id/reject', async (req, res) => {
    const { adminId } = req.body;
    const volunteerId = req.params.id;

    try {
        const admin = await verifyAdmin(adminId);
        if (!admin) {
            return res.status(403).json({ error: "Invalid or unrecognized admin account." });
        }

        const [volRows] = await db.query('SELECT first_name, last_name, status FROM volunteers WHERE id = ? AND deleted_at IS NULL', [volunteerId]);
        if (volRows.length === 0) {
            return res.status(404).json({ error: "Volunteer not found." });
        }
        const currentStatus = volRows[0].status;
        const volunteerName = `${volRows[0].first_name} ${volRows[0].last_name}`;

        if (!isValidTransition(currentStatus, 'rejected')) {
            return res.status(409).json({
                error: `Cannot reject a volunteer with status "${currentStatus}".`
            });
        }

        await db.query('UPDATE volunteers SET status = ? WHERE id = ?', ['rejected', volunteerId]);

        await logAction({
            adminId: admin.id,
            adminName: admin.name,
            action: 'REJECT_VOLUNTEER',
            target: volunteerName,
            details: `${currentStatus} -> rejected`
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not reject volunteer." });
    }
});

// 7. REMOVE A VOLUNTEER  (SOFT DELETE — moves to Trash, recoverable for 90 days)
router.delete('/volunteers/:id', async (req, res) => {
    const { adminId, adminName } = req.query;
    const volunteerId = req.params.id;

    try {
        const [volRows] = await db.query('SELECT first_name, last_name FROM volunteers WHERE id = ? AND deleted_at IS NULL', [volunteerId]);
        if (volRows.length === 0) {
            return res.status(404).json({ error: "Volunteer not found or already removed." });
        }
        const volunteerName = `${volRows[0].first_name} ${volRows[0].last_name}`;

        await db.query('UPDATE volunteers SET deleted_at = NOW() WHERE id = ?', [volunteerId]);

        await logAction({
            adminId: adminId || null,
            adminName: adminName || 'Admin',
            action: 'REMOVE_VOLUNTEER',
            target: volunteerName,
            details: 'Moved to Trash (recoverable for 90 days)'
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not remove volunteer." });
    }
});

// 8. FIND ACCOUNT BY EMAIL (Step 1 of password recovery)
router.post('/recovery/find', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    try {
        const [volunteer] = await db.query('SELECT security_question FROM volunteers WHERE email = ? AND deleted_at IS NULL', [email]);
        if (volunteer.length === 0) {
            return res.status(404).json({ error: "No account found with that email address." });
        }
        res.json({ securityQuestion: volunteer[0].security_question });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during account lookup." });
    }
});

// 9. VERIFY SECURITY ANSWER (Step 2 of password recovery)
router.post('/recovery/verify', async (req, res) => {
    const { answer } = req.body;
    const email = normalizeEmail(req.body.email);
    try {
        const [volunteer] = await db.query('SELECT security_answer FROM volunteers WHERE email = ? AND deleted_at IS NULL', [email]);
        const [admin] = await db.query('SELECT security_answer FROM admins WHERE email = ? AND deleted_at IS NULL', [email]);

        const record = volunteer.length > 0 ? volunteer[0] : (admin.length > 0 ? admin[0] : null);

        if (!record) {
            return res.status(404).json({ error: "Account not found." });
        }

        const isMatch = record.security_answer.trim().toLowerCase() === answer.trim().toLowerCase();
        if (!isMatch) {
            return res.status(401).json({ error: "That answer doesn't match our records." });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during verification." });
    }
});

// 10. RESET PASSWORD (Step 3 of password recovery)
router.post('/recovery/reset', async (req, res) => {
    const { answer, newPassword } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!isValidPassword(newPassword)) {
        return res.status(400).json({ error: `New password must be ${LIMITS.password.min}-${LIMITS.password.max} characters.` });
    }

    try {
        const [volunteer] = await db.query('SELECT * FROM volunteers WHERE email = ? AND deleted_at IS NULL', [email]);

        if (volunteer.length === 0) {
            return res.status(404).json({ error: "Account not found." });
        }

        const user = volunteer[0];

        const isMatch = user.security_answer.trim().toLowerCase() === answer.trim().toLowerCase();
        if (!isMatch) {
            return res.status(401).json({ error: "Security verification failed." });
        }

        const personalInfoMatch = findPersonalInfoMatch(newPassword, {
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name
        });
        if (personalInfoMatch) {
            return res.status(400).json({ error: "Password cannot contain your name or email address." });
        }

        const reused = await isPasswordReused(newPassword, 'volunteer', user.id, user.password_hash);
        if (reused) {
            return res.status(400).json({ error: "You cannot reuse any of your last 5 passwords." });
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        await db.query(
            'UPDATE volunteers SET password_hash = ?, password_changed_at = NOW() WHERE id = ?',
            [newHash, user.id]
        );

        await recordPasswordHistory('volunteer', user.id, user.password_hash);

        res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during password reset." });
    }
});

// 11. FETCH ALL ADMINS  (excludes soft-deleted — they only appear in Trash)
router.get('/admins', async (req, res) => {
    try {
        // Auto-mark anyone not seen in 2 minutes as offline
        await db.query(
            `UPDATE admins SET is_online = 0 
             WHERE is_online = 1 AND last_seen < (NOW() - INTERVAL 2 MINUTE)`
        );
        await db.query(
            `UPDATE volunteers SET is_online = 0 
             WHERE is_online = 1 AND last_seen < (NOW() - INTERVAL 2 MINUTE)`
        );

        const [admins] = await db.query(
            'SELECT id, name, email, role, is_online, last_seen, created_at FROM admins ORDER BY created_at DESC'
        );
        res.json(admins);
    } catch (err) {
        console.error('Failed to fetch admins:', err);
        res.status(500).json({ error: 'Could not fetch admins.' });
    }
});

// 12. REMOVE AN ADMIN  (SOFT DELETE — moves to Trash, recoverable for 90 days)
router.delete('/admins/:id', async (req, res) => {
    const { adminId, adminName } = req.query;
    const targetAdminId = req.params.id;

    try {
        const [rows] = await db.query('SELECT name FROM admins WHERE id = ? AND deleted_at IS NULL', [targetAdminId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Admin not found or already removed." });
        }
        const targetName = rows[0].name;

        await db.query('UPDATE admins SET deleted_at = NOW() WHERE id = ?', [targetAdminId]);

        await logAction({
            adminId: adminId || null,
            adminName: adminName || 'Admin',
            action: 'DELETE_ADMIN',
            target: targetName,
            details: 'Moved to Trash (recoverable for 90 days)'
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not remove admin." });
    }
});

// 13. TRASH — list all soft-deleted volunteers AND admins together
router.get('/trash', async (req, res) => {
    try {
        const [deletedVolunteers] = await db.query(`
            SELECT id, first_name, last_name, email, deleted_at,
                   'volunteer' AS accountType
            FROM volunteers
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
        `);

        const [deletedAdmins] = await db.query(`
            SELECT id, name, email, deleted_at,
                   'admin' AS accountType
            FROM admins
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
        `);

        // Normalize both into a single consistent shape for the frontend
        const trashItems = [
            ...deletedVolunteers.map(v => ({
                id: v.id,
                accountType: 'volunteer',
                name: `${v.first_name} ${v.last_name}`,
                email: v.email,
                deletedAt: v.deleted_at
            })),
            ...deletedAdmins.map(a => ({
                id: a.id,
                accountType: 'admin',
                name: a.name,
                email: a.email,
                deletedAt: a.deleted_at
            }))
        ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

        res.json(trashItems);
    } catch (err) {
        console.error('Failed to fetch trash:', err);
        res.status(500).json({ error: 'Could not fetch trash.' });
    }
});

// 14. RESTORE A VOLUNTEER FROM TRASH
router.put('/volunteers/:id/restore', async (req, res) => {
    const { adminId, adminName } = req.body;
    const volunteerId = req.params.id;

    try {
        const [rows] = await db.query('SELECT first_name, last_name FROM volunteers WHERE id = ? AND deleted_at IS NOT NULL', [volunteerId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "This volunteer is not in the trash." });
        }
        const volunteerName = `${rows[0].first_name} ${rows[0].last_name}`;

        await db.query('UPDATE volunteers SET deleted_at = NULL WHERE id = ?', [volunteerId]);

        await logAction({
            adminId: adminId || null,
            adminName: adminName || 'Admin',
            action: 'RESTORE_VOLUNTEER',
            target: volunteerName
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not restore volunteer." });
    }
});

// 15. RESTORE AN ADMIN FROM TRASH
router.put('/admins/:id/restore', async (req, res) => {
    const { adminId, adminName } = req.body;
    const targetAdminId = req.params.id;

    try {
        const [rows] = await db.query('SELECT name FROM admins WHERE id = ? AND deleted_at IS NOT NULL', [targetAdminId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "This admin is not in the trash." });
        }
        const targetName = rows[0].name;

        await db.query('UPDATE admins SET deleted_at = NULL WHERE id = ?', [targetAdminId]);

        await logAction({
            adminId: adminId || null,
            adminName: adminName || 'Admin',
            action: 'RESTORE_ADMIN',
            target: targetName
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not restore admin." });
    }
});

// 16. PERMANENTLY DELETE FROM TRASH (manual purge, bypasses the 90-day wait)
router.delete('/trash/:accountType/:id', async (req, res) => {
    const { accountType, id } = req.params;
    const { adminId, adminName } = req.query;

    if (!['volunteer', 'admin'].includes(accountType)) {
        return res.status(400).json({ error: "Invalid account type." });
    }

    try {
        const table = accountType === 'admin' ? 'admins' : 'volunteers';
        const nameQuery = accountType === 'admin'
            ? 'SELECT name FROM admins WHERE id = ? AND deleted_at IS NOT NULL'
            : 'SELECT first_name, last_name FROM volunteers WHERE id = ? AND deleted_at IS NOT NULL';

        const [rows] = await db.query(nameQuery, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Item not found in trash." });
        }
        const targetName = accountType === 'admin' ? rows[0].name : `${rows[0].first_name} ${rows[0].last_name}`;

        await db.query(`DELETE FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`, [id]);

        await logAction({
            adminId: adminId || null,
            adminName: adminName || 'Admin',
            action: accountType === 'admin' ? 'PURGE_ADMIN' : 'PURGE_VOLUNTEER',
            target: targetName,
            details: 'Permanently deleted from Trash'
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not permanently delete item." });
    }
});
// HEARTBEAT — called every 30s from the frontend to mark user as online
router.post('/ping', async (req, res) => {
    const { userId, userType } = req.body;
    if (!userId || !userType) return res.status(400).json({ error: 'Missing userId or userType.' });

    const table = userType === 'admin' ? 'admins' : 'volunteers';
    try {
        await db.query(
            `UPDATE ${table} SET is_online = 1, last_seen = NOW() WHERE id = ?`,
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Heartbeat error:', err);
        res.status(500).json({ error: 'Heartbeat failed.' });
    }
});

// OFFLINE — called on logout or page unload
router.post('/status',  async (req, res) => {
    const { userId, userType } = req.body;
    if (!userId || !userType) return res.status(400).json({ error: 'Missing userId or userType.' });

    const table = userType === 'admin' ? 'admins' : 'volunteers';
    try {
        await db.query(
            `UPDATE ${table} SET is_online = 0, last_seen = NOW() WHERE id = ?`,
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Offline error:', err);
        res.status(500).json({ error: 'Could not mark offline.' });
    }
});
module.exports = router;
