const express = require('express');
const apiKeyMiddleware = require('../middlewares/apiKeyMiddleware');
const {
    createLetter,
    getAllLetter,
    getLetterById,
    updateLetterById,
    deleteLetterById,
    deleteAllLetter,
} = require('../controllers/letterController');
const router = express.Router();

router.use(apiKeyMiddleware)

router.post('/', createLetter);
router.get('/', getAllLetter);
router.get('/:id', getLetterById);
router.patch('/:id', updateLetterById);
router.delete('/:id', deleteLetterById);
router.delete('/', deleteAllLetter);

module.exports = router;
