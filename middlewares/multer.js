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
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

// Filter file untuk memastikan hanya PDF yang diunggah
const fileFilter = (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
        cb(new Error('Silahkan mengupload file dengan format PDF!'), false);
    } else {
        cb(null, true);
    }
};

// Middleware untuk menangani file dengan batas ukuran 2MB
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },  // Batas file 1MB
    fileFilter: fileFilter  // Filter untuk tipe file PDF
});

module.exports = upload;