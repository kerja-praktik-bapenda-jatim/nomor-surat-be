const express = require('express');
const router = express.Router();
const controller = require('../controllers/agendaController');

// Base route: /api/agenda-surat
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.delete('/:id', controller.deleteById); // Ganti dari `remove` ke `delete` sesuai controller
router.delete('/', controller.deleteAll); // Hapus semua (opsional dengan body { truncate: true })

module.exports = router;

