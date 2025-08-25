const sqlite3 = require('sqlite3').verbose();
const logger = require('./logger');

let dbInstance = null;

async function initializeDb() {
    if (dbInstance) return dbInstance;

    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('db/file_activity.db', (err) => {
            if (err) {
                logger.error(`DB Connection Error: ${err}`);
                return reject(err);
            }
            db.serialize(() => {
                db.run(
                    `CREATE TABLE IF NOT EXISTS activity (
                        timestamp TEXT,
                        user TEXT,
                        action TEXT,
                        file_path TEXT
                    )`,
                    (tableErr) => {
                        if (tableErr) {
                            logger.error(`Table Creation Error: ${tableErr}`);
                            return reject(tableErr);
                        }
                        dbInstance = db;
                        logger.info('Database initialized');
                        resolve(db);
                    }
                );
            });
        });
    });
}

async function logAction(action, filePath) {
    const db = await initializeDb();
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO activity (timestamp, user, action, file_path) VALUES (?, ?, ?, ?)`,
            [new Date().toISOString(), 'system', action, filePath],
            (err) => {
                if (err) {
                    logger.error(`DB Insert Error: ${err}`);
                    return reject(err);
                }
                logger.info(`Action logged: ${action} -> ${filePath}`);
                resolve();
            }
        );
    });
}

module.exports = { initializeDb, logAction };
