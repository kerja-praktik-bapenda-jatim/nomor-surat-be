const express = require('express');
const {
    createLevel,
    getAllLevel,
    getLevelById,
    deleteAllLevel,
} = require('../controllers/levelController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', createLevel);
router.get('/', getAllLevel);
router.get('/:id', getLevelById);
router.delete('/', authenticateToken, deleteAllLevel);

module.exports = router;
