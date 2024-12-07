const Classification = require('../models/classification');
const {StatusCodes} = require("http-status-codes");

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
    try {
        const {count, rows} = await Classification.findAndCountAll({
            order: [
                ['createdAt', 'ASC'],
            ]
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