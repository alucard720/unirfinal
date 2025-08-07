const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { parse } = require('csv-parse/sync');
const { logAction } = require('./db');
const logger = require('./logger');

const csvPath = process.argv[2] || 'file_inventory.csv';

async function authenticate() {
    try {
        const credentials = JSON.parse(await fs.readFile('credenciales.json'));
        const auth = new google.auth.GoogleAuth({
            keyFile: 'credenciales.json',
            scopes: ['https://www.googleapis.com/auth/drive']
        });
        return await auth.getClient();
    } catch (err) {
        logger.error(`Error authenticating with Google Drive: ${err}`);
        process.exit(1);
    }
}

async function getFolderId(drive, name, parentId) {
    try {
        const query = `name='${name}' and mimeType='application/vnd.google-apps.folder'${parentId ? ` and '${parentId}' in parents` : ''}`;
        const res = await drive.files.list({ q: query, fields: 'files(id)' });
        if (res.data.files.length > 0) return res.data.files[0].id;

        const fileMetadata = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] };
        const folder = await drive.files.create({ resource: fileMetadata, fields: 'id' });
        return folder.data.id;
    } catch (err) {
        logger.error(`Error creating folder ${name}: ${err}`);
        throw err;
    }
}

async function checkExistingFile(drive, name, parentId) {
    try {
        const query = `name='${name}' and '${parentId}' in parents`;
        const res = await drive.files.list({ q: query, fields: 'files(id, md5Checksum)' });
        return res.data.files;
    } catch (err) {
        logger.error(`Error checking file ${name}: ${err}`);
        return [];
    }
}

async function uploadFile(drive, filePath, folderId, localPath) {
    const fileName = path.basename(filePath);
    try {
        const existingFiles = await checkExistingFile(drive, fileName, folderId);
        if (existingFiles.length > 0) {
            await logAction(`Skipped upload (file exists): ${fileName}`, localPath);
            logger.warn(`Skipped upload: ${fileName}`);
            return;
        }
        const fileMetadata = { name: fileName, parents: [folderId] };
        const media = { body: require('fs').createReadStream(filePath) };
        await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
        await logAction(`Uploaded file: ${fileName}`, localPath);
        logger.info(`Uploaded file: ${fileName}`);
    } catch (err) {
        logger.error(`Error uploading ${filePath}: ${err}`);
        throw err;
    }
}

async function migrateToDrive() {
    try {
        try {
            await fs.access(csvPath);
        } catch {
            logger.error(`CSV file ${csvPath} does not exist`);
            process.exit(1);
        }

        const auth = await authenticate();
        const drive = google.drive({ version: 'v3', auth });
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const files = parse(csvContent, { columns: true });

        if (files.length === 0) {
            logger.warn('No files to migrate');
            return;
        }

        for (const row of files) {
            if (!['.mp4', '.jpg'].includes(row.extension)) continue;
            const client = row.client;
            const project = row.project;
            const typeDir = row.extension === '.mp4' ? 'Videos' : 'Designs';
            const localPath = row.path;

            const clientId = await getFolderId(drive, client);
            const projectId = await getFolderId(drive, project, clientId);
            const typeId = await getFolderId(drive, typeDir, projectId);

            await uploadFile(drive, localPath, typeId, localPath);
        }

        logger.info('Migration completed');
    } catch (err) {
        logger.error(`Error in migrate_to_drive: ${err}`);
        process.exit(1);
    }
}

migrateToDrive();
