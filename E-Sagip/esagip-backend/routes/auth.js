const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

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

            return res.json({ success: true, user: { id: admin[0].id, name: admin[0].name, role: admin[0].role } });
        } else {
            const [volunteer] = await db.query('SELECT * FROM volunteers WHERE email = ?', [email]);
            if (volunteer.length === 0) return res.status(401).json({ error: "Invalid credentials." });

            const valid = await bcrypt.compare(password, volunteer[0].password_hash);
            if (!valid) return res.status(401).json({ error: "Incorrect password." });

            return res.json({ 
                success: true, 
                user: { id: volunteer[0].id, name: `${volunteer[0].first_name} ${volunteer[0].last_name}`, role: 'volunteer' } 
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login." });
    }
});

// 3. FETCH ALL VOLUNTEERS WITH THEIR RESPECTIVE SKILLS (for Admin Dashboard)
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

        // Format the grouped text string back into a clean array for your frontend mapping rules
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

// 4. APPROVE A VOLUNTEER
router.put('/volunteers/:id/approve', async (req, res) => {
    try {
        await db.query('UPDATE volunteers SET status = ? WHERE id = ?', ['active', req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not approve volunteer." });
    }
});

// 5. REMOVE A VOLUNTEER
router.delete('/volunteers/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM volunteers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not remove volunteer." });
    }
});

module.exports = router;
