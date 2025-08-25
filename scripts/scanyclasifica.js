const fs = require('fs').promises;
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const sharp = require('sharp');
const crypto = require('crypto');
const md5File = require('md5-file');
const { logAction } = require('./db');
const logger = require('./logger');
const { log } = require('console');

const inputDir = process.argv[2] || '../archivos';
const outputCsv = process.argv[3] || '../file_inventory.csv';
// const logFile = '../pipeline.log';

/**
 * Genera un hash perceptual simple para imágenes usando Sharp
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string>} - Hash de la imagen
 */
async function generateImageHash(filePath) {
    const buffer = await sharp(filePath)
        .resize(8, 8, { fit: 'fill' })
        .grayscale()
        .toBuffer();
    return crypto.createHash('md5').update(buffer).digest('hex');
}

async function scanAndClassify() {
    try {
        // Verificar si existe el directorio
        try {
            await fs.access(inputDir);
        } catch {
            logger.error(`Directory ${inputDir} does not exist`);
            // await fs.appendFile(logFile, `Directory ${inputDir} does not exist\n`);
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
                            ? await generateImageHash(fullPath)
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
                        client: 'ClientA', // Reemplazar con lógica dinámica
                        project: 'Campaign2025' // Reemplazar con lógica dinámica
                    });
                    await logAction(`Classified file as ${extension}`, fullPath);
                }
            }
        }

        await walkDir(inputDir);
        if (files.length === 0) {
            // await fs.appendFile(logFile, 'No .mp4 or .jpg files found\n');
            logger.info('No .mp4 or .jpg files found');
        }

        const csvData = stringify(files, { header: true });
        await fs.writeFile(outputCsv, csvData);
        // await fs.appendFile(logFile, `Inventory saved to ${outputCsv}\n`);
        logger.info(`Inventory saved to ${outputCsv}`);
    } catch (err) {
        // await fs.appendFile(logFile, `Error in scan_and_classify: ${err}\n`);
        logger.error(`Error in scan_and_classify: ${err}`);
        process.exit(1);
    }
}

scanAndClassify();
