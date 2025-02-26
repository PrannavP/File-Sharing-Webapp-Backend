const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./files.db")

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            fileName TEXT,
            b2FileId TEXT,
            password TEXT,
            expiresAt DATETIME,
            downloadCount INTEGER DEFAULT 0
        )
    `);
});

module.exports = db;