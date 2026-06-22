// utils/trashCleanup.js
const cron = require('node-cron');
const db = require('../db');
const { logAction } = require('../routes/audit');

// Runs once a day at 3:00 AM server time.
// Permanently deletes any volunteer/admin that has been in the Trash for more than 90 days.
function startTrashCleanupJob() {
    cron.schedule('0 3 * * *', async () => {
        try {
            const [purgedVolunteers] = await db.query(
                `SELECT id, first_name, last_name FROM volunteers
                 WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL 90 DAY)`
            );
            const [purgedAdmins] = await db.query(
                `SELECT id, name FROM admins
                 WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL 90 DAY)`
            );

            if (purgedVolunteers.length > 0) {
                await db.query(
                    `DELETE FROM volunteers WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL 90 DAY)`
                );
                for (const v of purgedVolunteers) {
                    await logAction({
                        adminName: 'System',
                        action: 'PURGE_VOLUNTEER',
                        target: `${v.first_name} ${v.last_name}`,
                        details: 'Auto-purged after 90 days in Trash'
                    });
                }
            }

            if (purgedAdmins.length > 0) {
                await db.query(
                    `DELETE FROM admins WHERE deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL 90 DAY)`
                );
                for (const a of purgedAdmins) {
                    await logAction({
                        adminName: 'System',
                        action: 'PURGE_ADMIN',
                        target: a.name,
                        details: 'Auto-purged after 90 days in Trash'
                    });
                }
            }

            if (purgedVolunteers.length > 0 || purgedAdmins.length > 0) {
                console.log(`Trash cleanup: purged ${purgedVolunteers.length} volunteer(s), ${purgedAdmins.length} admin(s).`);
            }
        } catch (err) {
            console.error('Trash cleanup job failed:', err);
        }
    });

    console.log('Trash auto-cleanup job scheduled (daily at 3:00 AM, 90-day retention).');
}

module.exports = { startTrashCleanupJob };
