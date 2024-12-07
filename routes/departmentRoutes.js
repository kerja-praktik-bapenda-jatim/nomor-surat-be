const express = require('express');
const {
    createDepartment,
    getAllDepartment,
    getDepartmentById,
    deleteAllDepartment,
} = require('../controllers/departmentController');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', createDepartment);
router.get('/', getAllDepartment);
router.get('/:id', getDepartmentById);
router.delete('/', authMiddleware, deleteAllDepartment);

module.exports = router;
