const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. DEPLOY NEW OPERATION ENDPOINT
router.post('/deploy', async (req, res) => {
    const { title, location, scheduledAt, slots, description, skills, createdBy } = req.body;

    try {
        const createdBy = req.body.createdBy || 3;

        //const adminId = createdBy || 1; // Fallback to Admin ID 1

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

// 3. FETCH DASHBOARD SUMMARY STATISTICS (Total Volunteers & Active Operations)
router.get('/dashboard-stats', async (req, res) => {
    try {
        // Query 1: Get Total Volunteers count AND how many are currently 'active' status
        const [[volunteerCounts]] = await db.query(`
            SELECT 
                COUNT(*) AS total_volunteers,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_volunteers
            FROM volunteers
        `);

        // Query 2: Get Active Operations count
        const [[operationCounts]] = await db.query(`
            SELECT COUNT(*) AS active_operations 
            FROM operations 
            WHERE status = 'active'
        `);

        // Query 3: Get how many total unique volunteers are actively enrolled in those active operations
        const [[enrollmentCounts]] = await db.query(`
            SELECT COUNT(DISTINCT e.volunteer_id) AS total_enrolled
            FROM enrollments e
            JOIN operations o ON e.operation_id = o.id
            WHERE o.status = 'active' AND e.status = 'enrolled'
        `);

        // Combine everything into a single structured response object
        res.json({
            totalVolunteers: volunteerCounts.total_volunteers || 0,
            activeVolunteers: volunteerCounts.active_volunteers || 0,
            activeOperations: operationCounts.active_operations || 0,
            enrolledVolunteers: enrollmentCounts.total_enrolled || 0
        });

    } catch (err) {
        console.error("Error fetching dashboard statistics summary:", err);
        res.status(500).json({ error: "Could not compile stats summary metrics from database." });
    }
});

// 4. FETCH LIVE SKILLS DISTRIBUTION DATA FOR GRAPH VISUALIZATION
router.get('/skills-distribution', async (req, res) => {
    try {
        // Query the pre-calculated view view from esagip_schema.sql
        const [distribution] = await db.query('SELECT * FROM vw_skill_distribution');
        res.json(distribution);
    } catch (err) {
        console.error("Error fetching skill distribution views:", err);
        res.status(500).json({ error: "Failed to load skills distribution analytics." });
    }
});

module.exports = router;
