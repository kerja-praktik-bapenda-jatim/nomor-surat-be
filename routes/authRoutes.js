const express = require('express');
const {authenticateToken} = require('../middlewares/authMiddleware');
const {register, login} = require('../controllers/authController');
const router = express.Router();

router.post('/register', register)
router.post('/login', login)
router.post('/verify', authenticateToken, (req, res, next) => {
    return res.json({message: 'Verification success', payload: req.payload});
})

module.exports = router;
