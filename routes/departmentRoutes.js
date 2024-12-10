const express = require('express');
const {
    createDepartment,
    getAllDepartment,
    getDepartmentById,
    deleteAllDepartment,
} = require('../controllers/departmentController');
const router = express.Router();

const {authenticateToken} = require('../middlewares/authMiddleware');

router.post('/', createDepartment);
router.get('/', getAllDepartment);
router.get('/:id', getDepartmentById);
router.delete('/', authenticateToken, deleteAllDepartment);

module.exports = router;
