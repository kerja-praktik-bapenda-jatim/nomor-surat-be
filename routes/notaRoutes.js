const express = require('express')
const {
    createNota,
    getAllNota,
    getNotaById,
    downloadNotaFile,
    updateNotaById,
    deleteNotaById,
    deleteAllNota
} = require('../controllers/notaController');
const router = express.Router();
const upload = require('../middlewares/multer');

router.post('/', upload.single('file'), createNota);
router.get('/', getAllNota);
router.get('/:id', getNotaById);
router.get('/download/:id', downloadNotaFile);
router.patch('/:id', upload.single('file'), updateNotaById);
router.delete('/:id', deleteNotaById);
router.delete('/', deleteAllNota);

module.exports = router