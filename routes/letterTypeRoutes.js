const express = require('express');
const controller = require('../controllers/letterTypeController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', controller.createLetterType);
// router.post('/', controller.createManyLetterTypes);
router.get('/', controller.getAllLetterTypes);
router.get('/:id', controller.getLetterTypeById);
// router.delete('/:id', authenticateToken, controller.deleteLetterTypeById);
router.patch('/:id', controller.updateLetterTypeById);
module.exports = router;