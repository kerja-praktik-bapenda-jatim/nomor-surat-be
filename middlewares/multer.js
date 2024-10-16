const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tentukan storage di direktori uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads');
        
        // Cek apakah folder 'uploads' ada, jika tidak buat foldernya
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);  // Simpan file ke dalam folder 'uploads'
    },
    filename: function (req, file, cb) {
        // Simpan dengan nama asli file
        const userId = req.payload.userId;
        const uniqueName = `${userId}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

// Middleware untuk menangani file dengan batas ukuran 1MB
const upload = multer({
    storage: storage,
    limits: { fileSize: 1 * 1024 * 1024 },  // Batas file 1MB
});

module.exports = upload;