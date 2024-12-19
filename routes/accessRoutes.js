const express = require('express');
const {
    createAccess,
    getAllAccess,
    getAccessById,
    deleteAllAccess,
} = require('../controllers/accessController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', createAccess);
router.get('/', getAllAccess);
router.get('/:id', getAccessById);
router.delete('/', authenticateToken, deleteAllAccess);

module.exports = router;
