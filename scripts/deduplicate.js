const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { logAction } = require('./db');

const csvPath = process.argv[2] || 'file_inventory.csv';
const deleteDuplicates = process.argv.includes('--delete');
const logFile = 'pipeline.log';

async function deduplicateFiles() {
    try {
        if (!await fs.access(csvPath).then(() => true).catch(() => false)) {
            await fs.appendFile(logFile, `CSV file ${csvPath} does not exist\n`);
            process.exit(1);
        }

        // Read and parse CSV file
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const files = parse(csvContent, { columns: true });

        if (files.length === 0) {
            await fs.appendFile(logFile, 'No files in CSV\n');
            return;
        }

        const duplicates = files.filter((file, index, self) =>
            self.findIndex(f => f.hash === file.hash) !== index
        );
        if (duplicates.length === 0) {
            await fs.appendFile(logFile, 'No duplicates found\n');
            return;
        }

        // Get modification times asynchronously
        const sortedDuplicates = await Promise.all(
            duplicates.map(async (file) => ({
                ...file,
                mtime: (await fs.stat(file.path)).mtime.getTime()
            }))
        ).then(results => results.sort((a, b) => b.mtime - a.mtime));

        const toDelete = [];
        const seenHashes = new Set();
        for (const file of sortedDuplicates) {
            if (seenHashes.has(file.hash)) {
                toDelete.push(file);
            } else {
                seenHashes.add(file.hash);
            }
        }

        await fs.writeFile('duplicates_report.csv', stringify(toDelete, { header: true }));

        if (deleteDuplicates) {
            for (const file of toDelete) {
                try {
                    await fs.unlink(file.path);
                    await logAction('Deleted duplicate file', file.path);
                    await fs.appendFile(logFile, `Deleted duplicate: ${file.path}\n`);
                } catch (err) {
                    await logAction(`Error deleting ${file.path}: ${err}`, file.path);
                    await fs.appendFile(logFile, `Error deleting ${file.path}: ${err}\n`);
                }
            }
        }

        await fs.appendFile(logFile, 'Deduplication completed\n');
    } catch (err) {
        await fs.appendFile(logFile, `Error in deduplicate_files: ${err}\n`);
        process.exit(1);
    }
}

deduplicateFiles();