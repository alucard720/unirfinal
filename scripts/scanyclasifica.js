const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify/sync');
const { imageHash } = require('image-hash');
const md5File = require('md5-file');
const { logAction } = require('./db');
const util = require('util');

const inputDir = process.argv[2] || 'archivos';
const outputCsv = process.argv[3] || 'file_inventory.csv';
const logFile = 'pipeline.log';

async function scanAndClassify() {
    try {
        if (!await fs.access(inputDir).then(() => true).catch(() => false)) {
            await fs.appendFile(logFile, `Directory ${inputDir} does not exist\n`);
            process.exit(1);
        }

        const files = [];
        async function walkDir(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walkDir(fullPath);
                } else if (['.mp4', '.jpg'].includes(path.extname(entry.name).toLowerCase())) {
                    const stats = await fs.stat(fullPath);
                    const extension = path.extname(entry.name).toLowerCase();
                    let hash;
                    try {
                        hash = extension === '.jpg'
                            ? await util.promisify(imageHash)(fullPath, 8, true)
                            : await md5File(fullPath);
                    } catch (err) {
                        await fs.appendFile(logFile, `Error hashing ${fullPath}: ${err}\n`);
                        continue;
                    }
                    files.push({
                        path: fullPath,
                        size_mb: stats.size / (1024 * 1024),
                        extension,
                        hash,
                        client: 'ClientA', // Replace with dynamic logic
                        project: 'Campaign2025' // Replace with dynamic logic
                    });
                    await logAction(`Classified file as ${extension}`, fullPath);
                }
            }
        }

        await walkDir(inputDir);
        if (files.length === 0) {
            await fs.appendFile(logFile, 'No .mp4 or .jpg files found\n');
        }

        const csvData = stringify(files, { header: true });
        await fs.writeFile(outputCsv, csvData);
        await fs.appendFile(logFile, `Inventory saved to ${outputCsv}\n`);
    } catch (err) {
        await fs.appendFile(logFile, `Error in scan_and_classify: ${err}\n`);
        process.exit(1);
    }
}

scanAndClassify();