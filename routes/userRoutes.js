const express = require('express');
const {getAllUser, getMyProfile, updateUser} = require('../controllers/userController');
const {authenticateToken} = require("../middlewares/authMiddleware");
const router = express.Router();

router.get('/', authenticateToken, getAllUser);
router.patch('/', updateUser);
router.get('/me', authenticateToken, getMyProfile)

module.exports = router;
