const express = require('express');
const router = express.Router();
const controller = require('../controllers/letterInController');
const upload = require('../middlewares/multer'); 

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById); 
router.delete('/:id', controller.deleteById);
router.delete('/', controller.deleteAll);
router.patch('/:id', upload.single('upload'), controller.updateById);

module.exports = router;

