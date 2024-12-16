const express = require('express');
const {
    createRetentionPeriod,
    getAllRetentionPeriod,
    getRetentionPeriodById,
    deleteAllRetentionPeriod,
} = require('../controllers/retentionPeriodController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', createRetentionPeriod);
router.get('/', getAllRetentionPeriod);
router.get('/:id', getRetentionPeriodById);
router.delete('/', authenticateToken, deleteAllRetentionPeriod);

module.exports = router;
