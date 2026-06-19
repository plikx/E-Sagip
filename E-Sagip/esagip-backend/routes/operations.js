// routes/operations.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. DEPLOY NEW OPERATION
router.post('/deploy', async (req, res) => {
    const { title, location, scheduledAt, slots, description, skills, otherSkill, createdBy } = req.body;

    try {
        const adminId = createdBy || 3; // ← was re-declared as "createdBy" then used as "adminId" — now fixed

        const [opResult] = await db.query(
            `INSERT INTO operations (title, location, scheduled_at, volunteer_slots, description, status, created_by)
             VALUES (?, ?, ?, ?, ?, 'active', ?)`,
            [title, location, scheduledAt, slots, description || null, adminId]
        );

        const operationId = opResult.insertId;

        // Link required skills
        if (skills && skills.length > 0) {
            const [dbSkills] = await db.query(
                'SELECT id FROM skills WHERE name IN (?)',
                [skills]
            );
            if (dbSkills.length > 0) {
                const opSkillMappings = dbSkills.map(s => [operationId, s.id]);
                await db.query(
                    'INSERT INTO operation_skills (operation_id, skill_id) VALUES ?',
                    [opSkillMappings]
                );
            }
        }

        // Save "Others" free-text skill if provided
        if (otherSkill) {
            await db.query(
                'INSERT INTO operation_other_skills (operation_id, description) VALUES (?, ?)',
                [operationId, otherSkill]
            );
        }

        res.status(201).json({ success: true, operationId, message: "Operation deployed live!" });

    } catch (err) {
        console.error('Deploy operation error:', err);
        res.status(500).json({ error: "Failed to deploy operation.", detail: err.message });
    }
});

// 2. FETCH ACTIVE OPERATIONS
router.get('/active', async (req, res) => {
    try {
        const [activeOps] = await db.query(
            'SELECT * FROM vw_operation_enrollment WHERE status = "active" ORDER BY scheduled_at ASC'
        );
        res.json(activeOps);
    } catch (err) {
        console.error('Fetch active ops error:', err);
        res.status(500).json({ error: "Could not fetch active operations." });
    }
});

// 3. DASHBOARD STATS
router.get('/dashboard-stats', async (req, res) => {
    try {
        const [[volunteerCounts]] = await db.query(`
            SELECT 
                COUNT(*) AS total_volunteers,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_volunteers
            FROM volunteers
        `);

        const [[operationCounts]] = await db.query(`
            SELECT COUNT(*) AS active_operations 
            FROM operations 
            WHERE status = 'active'
        `);

        const [[enrollmentCounts]] = await db.query(`
            SELECT COUNT(DISTINCT e.volunteer_id) AS total_enrolled
            FROM enrollments e
            JOIN operations o ON e.operation_id = o.id
            WHERE o.status = 'active' AND e.status = 'enrolled'
        `);

        res.json({
            totalVolunteers:   volunteerCounts.total_volunteers   || 0,
            activeVolunteers:  volunteerCounts.active_volunteers  || 0,
            activeOperations:  operationCounts.active_operations  || 0,
            enrolledVolunteers: enrollmentCounts.total_enrolled   || 0
        });

    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: "Could not compile stats." });
    }
});

// 4. SKILLS DISTRIBUTION
router.get('/skills-distribution', async (req, res) => {
    try {
        const [distribution] = await db.query('SELECT * FROM vw_skill_distribution');
        res.json(distribution);
    } catch (err) {
        console.error('Skills distribution error:', err);
        res.status(500).json({ error: "Failed to load skills distribution." });
    }
});

// 5. MARK OPERATION AS COMPLETE
router.patch('/:id/complete', async (req, res) => {
    try {
        await db.query(
            "UPDATE operations SET status = 'completed' WHERE id = ?",
            [req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Complete operation error:', err);
        res.status(500).json({ error: "Could not mark operation as complete." });
    }
});


// 6. ENROLL A VOLUNTEER IN AN OPERATION
router.post('/:id/enroll', async (req, res) => {
    const operationId = req.params.id;
    const { volunteerId } = req.body;

    if (!volunteerId) {
        return res.status(400).json({ success: false, error: "volunteerId is required." });
    }

    try {
        // 1. Confirm operation exists and is active
        const [opRows] = await db.query('SELECT * FROM operations WHERE id = ?', [operationId]);
        if (opRows.length === 0) {
            return res.status(404).json({ success: false, error: "Operation not found." });
        }
        const operation = opRows[0];

        if (operation.status !== 'active') {
            return res.status(400).json({ success: false, error: "This operation is no longer active." });
        }

        // 2. Count current enrollments (status = 'enrolled')
        const [[{ count }]] = await db.query(
            "SELECT COUNT(*) AS count FROM enrollments WHERE operation_id = ? AND status = 'enrolled'",
            [operationId]
        );

        if (count >= operation.volunteer_slots) {
            return res.status(400).json({ success: false, error: "Operation is full." });
        }

        // 3. Prevent duplicate enrollment
        const [existing] = await db.query(
            "SELECT id FROM enrollments WHERE operation_id = ? AND volunteer_id = ? AND status = 'enrolled'",
            [operationId, volunteerId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: "You already joined this operation." });
        }

        // 4. Insert enrollment
        await db.query(
            "INSERT INTO enrollments (operation_id, volunteer_id, status, enrolled_at) VALUES (?, ?, 'enrolled', NOW())",
            [operationId, volunteerId]
        );

        res.json({ success: true });

    } catch (err) {
        console.error('Enrollment error:', err);
        res.status(500).json({ success: false, error: "Server error during enrollment." });
    }
});
module.exports = router;
