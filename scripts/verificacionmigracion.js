const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { parse } = require('csv-parse/sync');
const { logAction } = require('./db');

const csvPath = process.argv[2] || 'file_inventory.csv';
const logFile = 'pipeline.log';

async function authenticate() {
    try {
        const credentials = JSON.parse(await fs.readFile('credentials.json'));
        const auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/drive']
        });
        return await auth.getClient();
    } catch (err) {
        await fs.appendFile(logFile, `Error authenticating with Google Drive: ${err}\n`);
        process.exit(1);
    }
}

async function verifyMigration() {
    try {
        if (!await fs.access(csvPath).then(() => true).catch(() => false)) {
            await fs.appendFile(logFile, `CSV file ${csvPath} does not exist\n`);
            process.exit(1);
        }

        const auth = await authenticate();
        const drive = google.drive({ version: 'v3', auth });
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const files = parse(csvContent, { columns: true });

        if (files.length === 0) {
            await fs.appendFile(logFile, 'No files to verify\n');
            return;
        }

        const missingFiles = [];
        for (const row of files) {
            if (!['.mp4', '.jpg'].includes(row.extension)) continue;
            const client = row.client;
            const project = row.project;
            const typeDir = row.extension === '.mp4' ? 'Videos' : 'Designs';
            const fileName = path.basename(row.path);

            try {
                const clientRes = await drive.files.list({
                    q: `name='${client}' and mimeType='application/vnd.google-apps.folder'`,
                    fields: 'files(id)'
                });
                if (!clientRes.data.files.length) {
                    missingFiles.push(row.path);
                    await logAction(`Migration verification failed: ${client} not found`, row.path);
                    continue;
                }
                const clientId = clientRes.data.files[0].id;

                const projectRes = await drive.files.list({
                    q: `name='${project}' and '${clientId}' in parents`,
                    fields: 'files(id)'
                });
                if (!projectRes.data.files.length) {
                    missingFiles.push(row.path);
                    await logAction(`Migration verification failed: ${project} not found`, row.path);
                    continue;
                }
                const projectId = projectRes.data.files[0].id;

                const typeRes = await drive.files.list({
                    q: `name='${typeDir}' and '${projectId}' in parents`,
                    fields: 'files(id)'
                });
                if (!typeRes.data.files.length) {
                    missingFiles.push(row.path);
                    await logAction(`Migration verification failed: ${typeDir} not found`, row.path);
                    continue;
                }
                const typeId = typeRes.data.files[0].id;

                const fileRes = await drive.files.list({
                    q: `name='${fileName}' and '${typeId}' in parents`,
                    fields: 'files(id)'
                });
                if (!fileRes.data.files.length) {
                    missingFiles.push(row.path);
                    await logAction(`Migration verification failed: ${fileName} not found`, row.path);
                } else {
                    await logAction(`Migration verified: ${fileName}`, row.path);
                }
            } catch (err) {
                await fs.appendFile(logFile, `Error verifying ${fileName}: ${err}\n`);
                missingFiles.push(row.path);
            }
        }

        await fs.writeFile('migration_verification_report.txt',
            missingFiles.length ? `Missing files:\n${missingFiles.join('\n')}` : 'All files successfully migrated.');
        await fs.appendFile(logFile, `Verification completed: ${missingFiles.length} files missing\n`);
    } catch (err) {
        await fs.appendFile(logFile, `Error in verify_migration: ${err}\n`);
        process.exit(1);
    }
}

verifyMigration();