const express = require('express');
const {
    createLevel,
    getAllLevel,
    getLevelById,
    deleteAllLevel,
} = require('../controllers/levelController');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', createLevel);
router.get('/', getAllLevel);
router.get('/:id', getLevelById);
router.delete('/', authMiddleware, deleteAllLevel);

module.exports = router;
