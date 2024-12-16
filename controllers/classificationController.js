const Classification = require('../models/classification');
const {StatusCodes} = require("http-status-codes");
const {Op} = require("sequelize");
const {stringToBoolean} = require("../utils/util");

exports.createClassification = async (req, res, next) => {
    const {id, name} = req.body;

    try {
        const classification = await Classification.create({id: id, name: name});
        return res.status(StatusCodes.CREATED).json(classification);
    } catch (error) {
        next(error)
    }
}

exports.getAllClassification = async (req, res, next) => {
    const {parentId, recursive} = req.query;
    const filterConditions = {}

    if (parentId) {
        if (recursive && stringToBoolean(recursive)) {
            filterConditions.id = {
                [Op.or]: [
                    {[Op.like]: `${parentId}.%`},
                    {[Op.eq]: parentId},
                ]
            }
        } else {
            filterConditions.id = parentId
        }
    }

    try {
        const {count, rows} = await Classification.findAndCountAll({
            order: [
                ['createdAt', 'ASC'],
            ],
            where: filterConditions
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Classification not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getClassificationById = async (req, res, next) => {
    const id = req.params.id

    try {
        const classification = await Classification.findByPk(id)
        if (!classification) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Classification not found'})
        }
        return res.json(classification);
    } catch (error) {
        next(error)
    }
}

exports.deleteAllClassification = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await Classification.destroy({
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