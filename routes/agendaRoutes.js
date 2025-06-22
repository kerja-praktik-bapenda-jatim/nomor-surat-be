const express = require('express');
const router = express.Router();
const controller = require('../controllers/agendaController');

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.delete('/:id', controller.deleteById);
router.delete('/', controller.deleteAll);

module.exports = router;