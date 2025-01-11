const express = require('express');
const {getAllUser, getMyProfile, updateUser} = require('../controllers/userController');
const router = express.Router();

router.get('/', getAllUser);
router.patch('/', updateUser);
router.get('/me', getMyProfile)

module.exports = router;
