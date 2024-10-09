const multer = require('multer');

// Set up storage for uploaded files (memory storage to handle buffer)
const storage = multer.memoryStorage();

// Set up file filter and size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 1 * 1024 * 1024 },  // Set limit file size to 1MB
    fileFilter: (req, file, cb) => {
        // Allow all file types
        cb(null, true);
    }
});

module.exports = upload;