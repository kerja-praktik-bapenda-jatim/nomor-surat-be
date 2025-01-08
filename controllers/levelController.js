const Level = require('../models/level');
const {StatusCodes} = require("http-status-codes");

exports.createLevel = async (req, res, next) => {
    const {id, name} = req.body;

    try {
        const level = await Level.create({id: id, name: name});
        return res.status(StatusCodes.CREATED).json(level);
    } catch (error) {
        next(error)
    }
}

exports.getAllLevel = async (req, res, next) => {
    try {
        const {count, rows} = await Level.findAndCountAll({
            order: [
                ['createdAt', 'ASC'],
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Sifat surat tidak ditemukan.'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getLevelById = async (req, res, next) => {
    const id = req.params.id

    try {
        const level = await Level.findByPk(id)
        if (!level) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Sifat surat tidak ditemukan.'})
        }
        return res.json(level);
    } catch (error) {
        next(error)
    }
}

exports.deleteAllLevel = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await Level.destroy({
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