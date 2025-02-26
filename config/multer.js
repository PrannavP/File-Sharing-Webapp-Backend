const multer = require("multer");

module.exports = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    }
});