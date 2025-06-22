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
    searchByAgenda
} = require('../controllers/letterInController');

const upload = require('../middlewares/multer');

router.get('/next-agenda', getNextAgendaNumber);
router.get('/export', exportLetters);
router.get('/download/:id', downloadFile);
router.get('/search/:agendaNumber', searchByAgenda);
router.post('/', upload.single('file'), create);
router.get('/', getAll);
router.get('/:id', getById);
router.patch('/:id', upload.single('file'), updateById);
router.delete('/:id', deleteById);
router.delete('/', deleteAll);

module.exports = router;