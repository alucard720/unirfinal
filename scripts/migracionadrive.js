const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { parse } = require('csv-parse/sync');
const { logAction } = require('./db');

const csvPath = process.argv[2] || 'file_inventory.csv';
const logFile = 'pipeline.log';

async function authenticate() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'credenciales.json',
            scopes: ['https://www.googleapis.com/auth/drive']
        });
        return await auth.getClient();
    } catch (err) {
        console.error('Error authenticating with Google Drive:', err);
        await fs.appendFile(logFile, `Error authenticating with Google Drive: ${err}\n`);
        process.exit(1);
    }
}

async function getFolderId(drive, name, parentId) {
    try {
        const query = `name='${name}' and mimeType='application/vnd.google-apps.folder'${parentId ? ` and '${parentId}' in parents` : ''}`;
        const res = await drive.files.list({ q: query, fields: 'files(id)' });

        if (res.data.files.length > 0) {
            return res.data.files[0].id;
        }

        const fileMetadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : ["1Ixs4-ngCBSU12SsQd7_i_DJqhuNoSj8j"]
        };
        const folder = await drive.files.create({ resource: fileMetadata, fields: 'id' });
        return folder.data.id;
    } catch (err) {
        console.error(`Error creating folder ${name}:`, err);
        await fs.appendFile(logFile, `Error creating folder ${name}: ${err}\n`);
        throw err;
    }
}

async function createRootFolder(drive) {
    const now = new Date();
    const rootFolderName = `Migration_4_${now.toISOString().replace(/:/g, '-')}`;
    const fileData = {
        name: rootFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        // parents: ["1Ixs4-ngCBSU12SsQd7_i_DJqhuNoSj8j"]
    };
    try {
        const folder = await drive.files.create({ resource: fileData, fields: 'id' });
        await fs.appendFile(logFile, `Root folder created: ${rootFolderName}\n`);
        return folder.data.id;
    } catch (error) {
        console.error('Error creating root folder:', error);
        await fs.appendFile(logFile, `Error creating root folder: ${error}\n`);
        throw error;
    }
}

async function checkExistingFile(drive, name, parentId) {
    try {
        const query = `name='${name}' and '${parentId}' in parents`;
        const res = await drive.files.list({ q: query, fields: 'files(id, md5Checksum)' });
        return res.data.files;
    } catch (err) {
        console.error(`Error checking file ${name}:`, err);
        await fs.appendFile(logFile, `Error checking file ${name}: ${err}\n`);
        return [];
    }
}

async function uploadFile(drive, filePath, folderId, localPath) {
    const fileName = path.basename(filePath);
    try {
        const existingFiles = await checkExistingFile(drive, fileName, folderId);
        if (existingFiles.length > 0) {
            await logAction(`Skipped upload (file exists): ${fileName}`, localPath);
            await fs.appendFile(logFile, `Skipped upload: ${fileName}\n`);
            console.log(`Skipped upload: ${fileName}`);
            return;
        }

        const fileMetadata = { name: fileName, parents: [folderId] };
        const media = { body: require('fs').createReadStream(filePath) };
        await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
        await logAction(`Uploaded file: ${fileName}`, localPath);
        await fs.appendFile(logFile, `Uploaded file: ${fileName}\n`);
        console.log(`Uploaded file: ${fileName}`);
    } catch (err) {
        console.error(`Error uploading ${filePath}:`, err);
        await fs.appendFile(logFile, `Error uploading ${filePath}: ${err}\n`);
        throw err;
    }
}

async function migrateToDrive() {
    try {
        if (!await fs.access(csvPath).then(() => true).catch(() => false)) {
            console.error(`CSV file ${csvPath} does not exist`);
            await fs.appendFile(logFile, `CSV file ${csvPath} does not exist\n`);
            process.exit(1);
        }

        const auth = await authenticate();
        const drive = google.drive({ version: 'v3', auth });
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const files = parse(csvContent, { columns: true });

        if (files.length === 0) {
            console.error('No files to migrate');
            await fs.appendFile(logFile, 'No files to migrate\n');
            return;
        }

        const rootFolderId = await createRootFolder(drive);
        const folderCache = {};

        for (const row of files) {
            if (!['.mp4', '.jpg'].includes(row.extension)) continue;

            const client = row.client;
            const project = row.project;
            const typeDir = row.extension === '.mp4' ? 'Videos' : 'Designs';
            const localPath = path.join('archivos_organizados', client, project, typeDir, path.basename(row.path));

            if (!await fs.access(localPath).then(() => true).catch(() => false)) {
                console.error(`File not found: ${localPath}`);
                await fs.appendFile(logFile, `File not found: ${localPath}\n`);
                continue;
            }

            const clientKey = `${client}_${rootFolderId}`;
            const projectKey = `${project}_${clientKey}`;
            const typeKey = `${typeDir}_${projectKey}`;

            if (!folderCache[clientKey]) {
                folderCache[clientKey] = await getFolderId(drive, client, rootFolderId);
            }
            if (!folderCache[projectKey]) {
                folderCache[projectKey] = await getFolderId(drive, project, folderCache[clientKey]);
            }
            if (!folderCache[typeKey]) {
                folderCache[typeKey] = await getFolderId(drive, typeDir, folderCache[projectKey]);
            }

            await uploadFile(drive, localPath, folderCache[typeKey], localPath);
        }

        console.log('Migration completed');
        await fs.appendFile(logFile, 'Migration completed\n');
    } catch (err) {
        console.error('Error in migrate_to_drive:', err);
        await fs.appendFile(logFile, `Error in migrate_to_drive: ${err}\n`);
        process.exit(1);
    }

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        fs.appendFile(logFile, `Unhandled Rejection at: ${promise}\n`);
        process.exit(1);
    });

    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        fs.appendFile(logFile, `Uncaught Exception: ${err}\n`);
        process.exit(1);
    });
}

migrateToDrive();
