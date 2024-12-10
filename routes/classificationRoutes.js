const express = require('express');
const {
    createClassification,
    getAllClassification,
    getClassificationById,
    deleteAllClassification,
} = require('../controllers/classificationController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', createClassification);
router.get('/', getAllClassification);
router.get('/:id', getClassificationById);
router.delete('/', authenticateToken, deleteAllClassification);

module.exports = router;
