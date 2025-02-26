const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const upload = require('../config/multer');

router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/download', fileController.downloadFile);

module.exports = router;