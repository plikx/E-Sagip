const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// 1. VOLUNTEER REGISTRATION ENDPOINT
router.post('/register', async (req, res) => {
    const { 
        firstName, lastName, birthdate, gender, isResident, 
        address, contactNumber, email, secQuestion, secAnswer, 
        password, skills, otherSkill 
    } = req.body;

    try {
        // Check if email already exists in the database
        const [existing] = await db.query('SELECT id FROM volunteers WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Email is already registered with an account." });
        }

        // Encrypt the password before saving!
        const hashedPw = await bcrypt.hash(password, 10);

        // Insert volunteer into the 'volunteers' table
        const [volResult] = await db.query(
            `INSERT INTO volunteers (first_name, last_name, birthdate, gender, is_resident, address, contact_number, email, security_question, security_answer, password_hash, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [firstName, lastName, birthdate, gender, isResident ? 1 : 0, address, contactNumber, email, secQuestion, secAnswer, hashedPw]
        );

        const volunteerId = volResult.insertId;

        // Link the selected skills to this volunteer
        if (skills && skills.length > 0) {
            const [dbSkills] = await db.query('SELECT id FROM skills WHERE name IN (?)', [skills]);
            
            if (dbSkills.length > 0) {
                const skillMappings = dbSkills.map(s => [volunteerId, s.id]);
                await db.query('INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES ?', [skillMappings]);
            }
        }

        // If they typed something under "Others: Please Specify"
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
            // Check 'admins' table
            const [admin] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
            if (admin.length === 0) return res.status(401).json({ error: "Invalid admin credentials." });

            const valid = await bcrypt.compare(password, admin[0].password_hash);
            if (!valid) return res.status(401).json({ error: "Incorrect password." });

            return res.json({ success: true, user: { id: admin[0].id, name: admin[0].name, role: 'admin' } });
        } else {
            // Check 'volunteers' table
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

module.exports = router;