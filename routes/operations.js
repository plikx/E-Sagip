const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. DEPLOY NEW OPERATION ENDPOINT
router.post('/deploy', async (req, res) => {
    const { title, location, scheduledAt, slots, description, skills, createdBy } = req.body;

    try {
        const adminId = createdBy || 1; // Fallback to Admin ID 1

        // Save operation data to 'operations' table
        const [opResult] = await db.query(
            `INSERT INTO operations (title, location, scheduled_at, volunteer_slots, description, status, created_by)
             VALUES (?, ?, ?, ?, ?, 'active', ?)`,
            [title, location, scheduledAt, slots, description, adminId]
        );

        const operationId = opResult.insertId;

        // Link the required skills to this operation
        if (skills && skills.length > 0) {
            const [dbSkills] = await db.query('SELECT id FROM skills WHERE name IN (?)', [skills]);
            if (dbSkills.length > 0) {
                const opSkillMappings = dbSkills.map(s => [operationId, s.id]);
                await db.query('INSERT INTO operation_skills (operation_id, skill_id) VALUES ?', [opSkillMappings]);
            }
        }

        res.status(201).json({ success: true, message: "Operation deployed live!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to deploy operation." });
    }
});

// 2. FETCH ACTIVE OPERATIONS (Feeds data to your frontend dashboards)
router.get('/active', async (req, res) => {
    try {
        // This utilizes the view 'vw_operation_enrollment' from your esagip_schema.sql!
        const [activeOps] = await db.query('SELECT * FROM vw_operation_enrollment WHERE status = "active"');
        res.json(activeOps);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch active operations." });
    }
});

module.exports = router;