const express = require('express');
const controller = require('../controllers/letterTypeController');
const router = express.Router();

const { authenticateToken } = require('../middlewares/authMiddleware');

// ✅ CREATE - Tambah jenis surat baru
router.post('/', authenticateToken, controller.createLetterType);

// ✅ READ - Get semua jenis surat
router.get('/', controller.getAllLetterTypes);

// ✅ READ - Get jenis surat by ID
router.get('/:id', controller.getLetterTypeById);

// ✅ UPDATE - Update jenis surat
router.patch('/:id', authenticateToken, controller.updateLetterTypeById);

// ✅ DELETE - Hapus jenis surat (TAMBAHAN BARU)
router.delete('/:id', authenticateToken, controller.deleteLetterTypeById);

module.exports = router;