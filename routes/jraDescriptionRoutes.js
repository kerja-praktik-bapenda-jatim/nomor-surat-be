const express = require('express');
const {
    createJraDescription,
    getAllJraDescription,
    getJraDescriptionById,
    deleteAllJraDescription,
} = require('../controllers/jraDescriptionController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', createJraDescription);
router.get('/', getAllJraDescription);
router.get('/:id', getJraDescriptionById);
router.delete('/', authenticateToken, deleteAllJraDescription);

module.exports = router;
