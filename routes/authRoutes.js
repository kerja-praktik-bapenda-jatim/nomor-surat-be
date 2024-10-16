const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {register, login} = require('../controllers/authController');
const router = express.Router();

router.post('/register', register)
router.post('/login', login)
router.post('/verify', authMiddleware, (req, res, next) => {
    return res.json({message: 'Verification success', payload: req.payload});
})

module.exports = router;
