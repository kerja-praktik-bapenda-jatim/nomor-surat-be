const express = require('express');
const router = express.Router();
const {
    create,
    getAll,
    getById,
    updateById,
    deleteById,
    deleteAll,
    downloadFile,
    exportLetters // ✅ Tambahkan ini
} = require('../controllers/letterInController');

const upload = require('../middlewares/multer');

// ✅ PENTING: Route /export harus di atas /:id untuk menghindari conflict
router.get('/export', exportLetters); // ✅ Tambah route export
router.get('/download/:id', downloadFile);

// Route definitions lainnya
router.post('/', upload.single('file'), create);
router.get('/', getAll);
router.get('/:id', getById);
router.patch('/:id', upload.single('file'), updateById);
router.delete('/:id', deleteById);
router.delete('/', deleteAll);

module.exports = router;