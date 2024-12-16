const JraDescription = require('../models/jraDescription');
const {StatusCodes} = require("http-status-codes");

exports.createJraDescription = async (req, res, next) => {
    const {id, name} = req.body;

    try {
        const jraDescription = await JraDescription.create({id: id, name: name});
        return res.status(StatusCodes.CREATED).json(jraDescription);
    } catch (error) {
        next(error)
    }
}

exports.getAllJraDescription = async (req, res, next) => {
    try {
        const {count, rows} = await JraDescription.findAndCountAll({
            order: [
                ['createdAt', 'ASC'],
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'JraDescription not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getJraDescriptionById = async (req, res, next) => {
    const id = req.params.id

    try {
        const jraDescription = await JraDescription.findByPk(id)
        if (!jraDescription) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'JraDescription not found'})
        }
        return res.json(JraDescription);
    } catch (error) {
        next(error)
    }
}

exports.deleteAllJraDescription = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await JraDescription.destroy({
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