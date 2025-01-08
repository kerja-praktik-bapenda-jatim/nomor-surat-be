const Access = require('../models/access');
const {StatusCodes} = require("http-status-codes");

exports.createAccess = async (req, res, next) => {
    const {id, name} = req.body;

    try {
        const access = await Access.create({id: id, name: name});
        return res.status(StatusCodes.CREATED).json(access);
    } catch (error) {
        next(error)
    }
}

exports.getAllAccess = async (req, res, next) => {
    try {
        const {count, rows} = await Access.findAndCountAll({
            order: [
                ['createdAt', 'ASC'],
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Hak akses tidak ditemukan.'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getAccessById = async (req, res, next) => {
    const id = req.params.id

    try {
        const access = await Access.findByPk(id)
        if (!access) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Hak akses tidak ditemukan.'})
        }
        return res.json(access);
    } catch (error) {
        next(error)
    }
}

exports.deleteAllAccess = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await Access.destroy({
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