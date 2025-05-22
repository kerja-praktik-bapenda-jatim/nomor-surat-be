const express = require('express');
const router = express.Router();
const {
    create,
    getAll,
    getById,
    updateById,
    deleteById,
    deleteAll,
    downloadFile
} = require('../controllers/letterInController'); // Gunakan nama controller yang sesuai

const upload = require('../middlewares/multer');  // Pastikan middleware multer sudah disiapkan

// Route definitions
router.post('/', upload.single('file'), create); // Form field name 'file'
router.get('/', getAll);
router.get('/:id', getById);
router.get('/download/:id', downloadFile);
router.patch('/:id', upload.single('file'), updateById);
router.delete('/:id', deleteById);
router.delete('/', deleteAll);

module.exports = router;