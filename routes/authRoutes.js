const express = require('express');
const apiKeyMiddleware = require('../middlewares/apiKeyMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const {register, login} = require('../controllers/authController');
const router = express.Router();

router.use(apiKeyMiddleware)
router.post('/register', register)
router.post('/login', login)
router.post('/verify', authMiddleware, (req, res, next) => {
    return res.status(200).json({message: 'Authentication success'});
})

module.exports = router;
