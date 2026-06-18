router.get('/volunteers', async (req, res) => {
    try {
        const [volunteers] = await db.query(`
            SELECT v.id, v.first_name, v.last_name, v.address, v.contact_number, v.email, v.status,
                   GROUP_CONCAT(s.name) AS skills
            FROM volunteers v
            LEFT JOIN volunteer_skills vs ON v.id = vs.volunteer_id
            LEFT JOIN skills s ON vs.skill_id = s.id
            GROUP BY v.id
        `);

        const formatted = volunteers.map(v => ({
            ...v,
            skills: v.skills ? v.skills.split(',') : []
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not fetch volunteers." });
    }
});
