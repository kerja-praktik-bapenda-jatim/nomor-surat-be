const express = require('express');
const { exportToExcel } = require('../controllers/exportController');
const router = express.Router();

// Tambahkan route untuk eksport data
router.get('/', exportToExcel);

module.exports = router;
