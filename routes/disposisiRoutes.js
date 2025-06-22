const express = require('express');
const router = express.Router();
const controller = require('../controllers/disposisiController');

router.get('/next-number', controller.getNextNumber);
router.get('/check-letter/:letterIn_id', controller.checkLetterDisposition);
router.get('/stats', controller.getStats);

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', controller.updateById);
router.delete('/:id', controller.deleteById);

router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Disposisi route not found',
        availableRoutes: [
            'GET /disposisi-letterin',
            'POST /disposisi-letterin',
            'GET /disposisi-letterin/:id',
            'PUT /disposisi-letterin/:id',
            'DELETE /disposisi-letterin/:id',
            'GET /disposisi-letterin/next-number',
            'GET /disposisi-letterin/check-letter/:letterIn_id',
            'GET /disposisi-letterin/stats'
        ]
    });
});

module.exports = router;