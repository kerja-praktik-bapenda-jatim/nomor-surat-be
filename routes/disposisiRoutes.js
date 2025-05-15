const express = require('express');
const router = express.Router();
const controller = require('../controllers/disposisiController');

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', controller.updateById);
router.delete('/:id', controller.deleteById);

module.exports = router;
