const express = require('express');
const {getAllUser, getMyProfile} = require('../controllers/userController');
const router = express.Router();

router.get('/', getAllUser);
router.get('/me', getMyProfile)

module.exports = router;
