const express = require('express');
const {
    createStorageLocation,
    getAllStorageLocation,
    getStorageLocationById,
    deleteAllStorageLocation,
} = require('../controllers/storageLocationController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', createStorageLocation);
router.get('/', getAllStorageLocation);
router.get('/:id', getStorageLocationById);
router.delete('/', authenticateToken, deleteAllStorageLocation);

module.exports = router;
