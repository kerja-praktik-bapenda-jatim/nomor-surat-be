const Department = require('../models/department');
const {StatusCodes} = require("http-status-codes");

exports.createDepartment = async (req, res, next) => {
    const {name} = req.body;

    try {
        const department = await Department.create({name})
        return res.status(StatusCodes.CREATED).json(department);
    } catch (error) {
        next(error)
    }
}

exports.getAllDepartment = async (req, res, next) => {
    try {
        const {count, rows} = await Department.findAndCountAll({
            order: [
                ['createdAt', 'ASC'],
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Department not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getDepartmentById = async (req, res, next) => {
    const id = req.params.id

    try {
        const department = await Department.findByPk(id)
        if (!department) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Not found'})
        }
        return res.json(department);
    } catch (error) {
        next(error)
    }
}

exports.deleteAllDepartment = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await Department.destroy({
                truncate: truncate,
            })
            return res.status(StatusCodes.NO_CONTENT).send();
        } else {
            return res.json({message: 'Do Nothing'})
        }
    } catch (error) {
        next(error)
    }
}