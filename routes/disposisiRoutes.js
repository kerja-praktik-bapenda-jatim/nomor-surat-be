// routes/disposisiRoutes.js
// ✅ PASTIKAN FILE INI ADA DAN ISINYA PERSIS SEPERTI INI:

const express = require('express');
const router = express.Router();
const controller = require('../controllers/disposisiController');

console.log('📋 Loading disposisiRoutes...'); // ✅ DEBUG LOG

// ✅ CRITICAL: Route /next-number HARUS DI ATAS /:id
router.get('/next-number', (req, res, next) => {
  console.log('🔢 Route /next-number accessed'); // ✅ DEBUG LOG
  controller.getNextNumber(req, res, next);
});

// Basic CRUD routes
router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);  // ✅ Ini HARUS di bawah /next-number
router.put('/:id', controller.updateById);
router.delete('/:id', controller.deleteById);

console.log('✅ DisposisiRoutes loaded successfully'); // ✅ DEBUG LOG

module.exports = router;