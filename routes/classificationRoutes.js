const express = require('express');
const {
    createClassification,
    getAllClassification,
    getClassificationById,
    deleteAllClassification,
} = require('../controllers/classificationController');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', createClassification);
router.get('/', getAllClassification);
router.get('/:id', getClassificationById);
router.delete('/', authMiddleware, deleteAllClassification);

module.exports = router;
