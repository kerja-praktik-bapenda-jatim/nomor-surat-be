const express = require('express');
const {
    createLetter,
    getAllLetter,
    getLetterById,
    updateLetterById,
    deleteLetterById,
    deleteAllLetter,
    downloadLetterFile,
    exportLetter,
} = require('../controllers/letterController');
const router = express.Router();
const upload = require('../middlewares/multer');  // Middleware multer

router.post('/', upload.single('file'), createLetter);
router.get('/', getAllLetter);
router.get('/export', exportLetter);
router.get('/:id', getLetterById);
router.get('/download/:id', downloadLetterFile);
router.patch('/:id', upload.single('file'), updateLetterById);
router.delete('/:id', deleteLetterById);
router.delete('/', deleteAllLetter);

module.exports = router;
