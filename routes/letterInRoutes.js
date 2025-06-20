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
    exportLetters,
    getNextAgendaNumber,
    searchByAgenda // ✅ TAMBAH IMPORT INI
} = require('../controllers/letterInController');

const upload = require('../middlewares/multer');

// ✅ PENTING: Route khusus harus di atas /:id untuk menghindari conflict
router.get('/next-agenda', getNextAgendaNumber);
router.get('/export', exportLetters);
router.get('/download/:id', downloadFile);
router.get('/search/:agendaNumber', searchByAgenda); // ✅ TAMBAH ROUTE INI

// Route definitions lainnya
router.post('/', upload.single('file'), create);
router.get('/', getAll);
router.get('/:id', getById); // Route dengan parameter harus paling bawah
router.patch('/:id', upload.single('file'), updateById);
router.delete('/:id', deleteById);
router.delete('/', deleteAll);

module.exports = router;