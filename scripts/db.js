const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;

const logFile = 'pipeline.log';

async function initializeDb() {
    const db = new sqlite3.Database('file_activity.db', (err) => {
        if (err) {
            fs.appendFile(logFile, `DB Connection Error: ${err}\n`);
            throw err;
        }
    });

    // Synchronous table creation
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS activity (
            timestamp TEXT,
            user TEXT,
            action TEXT,
            file_path TEXT
        )`, (err) => {
            if (err) {
                fs.appendFile(logFile, `Table Creation Error: ${err}\n`);
                throw err;
            }
        });
    });

    return db;
}

async function logAction(action, filePath) {
    const db = await initializeDb();
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO activity (timestamp, user, action, file_path) VALUES (?, ?, ?, ?)`,
            [new Date().toISOString(), 'system', action, filePath],
            (err) => {
                db.close();
                if (err) {
                    fs.appendFile(logFile, `DB Insert Error: ${err}\n`);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

module.exports = { initializeDb, logAction };