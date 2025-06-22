const express = require('express');
const controller = require('../controllers/letterTypeController');
const router = express.Router();

const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/', authenticateToken, controller.createLetterType);
router.get('/', controller.getAllLetterTypes);
router.get('/:id', controller.getLetterTypeById);
router.patch('/:id', authenticateToken, controller.updateLetterTypeById);
router.delete('/:id', authenticateToken, controller.deleteLetterTypeById);

module.exports = router;