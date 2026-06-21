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

// 1. VOLUNTEER REGISTRATION ENDPOINT
router.post('/register', async (req, res) => {
    const { 
        firstName, lastName, birthdate, gender, isResident, 
        address, contactNumber, email, ecName, ecNumber,
        secQuestion, secAnswer, password, skills, otherSkill 
    } = req.body;

    try {
        const [existing] = await db.query('SELECT id FROM volunteers WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Email is already registered with an account." });
        }

        // Rule: password cannot contain email or full name
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
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        if (role === 'admin') {
            const [admin] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
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
            const [volunteer] = await db.query('SELECT * FROM volunteers WHERE email = ?', [email]);
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
    if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters." });
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

        // Rule: cannot contain email or full name
        const personalInfoFields = userType === 'admin'
            ? { email: user.email, fullName: user.name }
            : { email: user.email, firstName: user.first_name, lastName: user.last_name };

        const personalInfoMatch = findPersonalInfoMatch(newPassword, personalInfoFields);
        if (personalInfoMatch) {
            return res.status(400).json({ error: "Password cannot contain your name or email address." });
        }

        // Rule: block reuse of last 5 passwords
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
                GROUP_CONCAT(s.name) AS skills_list
            FROM volunteers v
            LEFT JOIN volunteer_skills vs ON v.id = vs.volunteer_id
            LEFT JOIN skills s ON vs.skill_id = s.id
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

// 5. APPROVE A VOLUNTEER
router.put('/volunteers/:id/approve', async (req, res) => {
    try {
        await db.query('UPDATE volunteers SET status = ? WHERE id = ?', ['active', req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not approve volunteer." });
    }
});

// 6. REMOVE A VOLUNTEER
router.delete('/volunteers/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM volunteers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not remove volunteer." });
    }
});
// 7. FIND ACCOUNT BY EMAIL (Step 1 of password recovery)
router.post('/recovery/find', async (req, res) => {
    const { email } = req.body;
    try {
        const [volunteer] = await db.query('SELECT security_question FROM volunteers WHERE email = ?', [email]);
        if (volunteer.length === 0) {
            return res.status(404).json({ error: "No account found with that email address." });
        }
        res.json({ securityQuestion: volunteer[0].security_question });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during account lookup." });
    }
});

// 8. VERIFY SECURITY ANSWER (Step 2 of password recovery)
router.post('/recovery/verify', async (req, res) => {
    const { email, answer } = req.body;
    try {
        const [volunteer] = await db.query('SELECT security_answer FROM volunteers WHERE email = ?', [email]);
        const [admin] = await db.query('SELECT security_answer FROM admins WHERE email = ?', [email]);

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

// 9. RESET PASSWORD (Step 3 of password recovery)
router.post('/recovery/verify', async (req, res) => {
    const { email, answer } = req.body;
    try {
        const [volunteer] = await db.query('SELECT security_answer FROM volunteers WHERE email = ?', [email]);

        if (volunteer.length === 0) {
            return res.status(404).json({ error: "Account not found." });
        }

        const isMatch = volunteer[0].security_answer.trim().toLowerCase() === answer.trim().toLowerCase();
        if (!isMatch) {
            return res.status(401).json({ error: "That answer doesn't match our records." });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during verification." });
    }
});

router.post('/recovery/reset', async (req, res) => {
    const { email, answer, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters." });
    }

    try {
        const [volunteer] = await db.query('SELECT * FROM volunteers WHERE email = ?', [email]);

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
// 6. UPDATE VOLUNTEER DETAILS (for Edit Volunteer modal)
router.put('/volunteers/:id', async (req, res) => {
    const { firstName, lastName, contactNumber, address, status } = req.body;
    const volunteerId = req.params.id;

    if (!firstName || !lastName || !contactNumber || !address || !status) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        await db.query(
            `UPDATE volunteers 
             SET first_name = ?, last_name = ?, contact_number = ?, address = ?, status = ?
             WHERE id = ?`,
            [firstName, lastName, contactNumber, address, status, volunteerId]
        );
        res.json({ success: true, message: "Volunteer updated successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error updating volunteer details." });
    }
});

module.exports = router;

