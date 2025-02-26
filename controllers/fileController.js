const db = require('../database/db');
const b2 = require('../config/b2');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');

const encryptFile = (fileBuffer, password) => {
    return CryptoJS.AES.encrypt(
        fileBuffer.toString('base64'),
        password
    ).toString();
};

const decryptFile = (encryptedData, password) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, password);
        return Buffer.from(bytes.toString(CryptoJS.enc.Utf8), 'base64');
    } catch (err) {
        throw new Error('Decryption failed: Invalid password');
    }
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { password } = req.body;
        const file = req.file;
        const fileId = uuidv4();

        // Encrypt file
        const encryptedData = encryptFile(file.buffer, password);

        // Upload to Backblaze
        await b2.authorize();
        const uploadUrl = await b2.getUploadUrl({
            bucketId: process.env.B2_BUCKET_ID
        });
        
        const b2File = await b2.uploadFile({
            uploadUrl: uploadUrl.data.uploadUrl,
            uploadAuthToken: uploadUrl.data.authorizationToken,
            fileName: fileId,
            data: Buffer.from(encryptedData.toString())
        });

        // Store metadata
        db.run(
            `INSERT INTO files (id, fileName, b2FileId, password, expiresAt)
             VALUES (?, ?, ?, ?, datetime('now', '+7 days'))`,
            [fileId, file.originalname, b2File.data.fileId, password],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ fileId });
            }
        );

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const { fileId, password } = req.body;
        
        db.get(
            `SELECT * FROM files WHERE id = ?`,
            [fileId],
            async (err, row) => {
                if (err || !row) return res.status(404).send('File not found');

                // Download from Backblaze
                await b2.authorize();
                const file = await b2.downloadFileById({
                    fileId: row.b2FileId,
                    responseType: 'arraybuffer'
                });

                // Decrypt file
                const decrypted = decryptFile(
                    Buffer.from(file.data).toString(),
                    password
                );

                res.set({
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename=${row.fileName}`
                });
                res.send(decrypted);
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};