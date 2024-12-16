const StorageLocation = require('../models/StorageLocation');
const {StatusCodes} = require("http-status-codes");

exports.createStorageLocation = async (req, res, next) => {
    const {id, name} = req.body;

    try {
        const storageLocation = await StorageLocation.create({id: id, name: name});
        return res.status(StatusCodes.CREATED).json(storageLocation);
    } catch (error) {
        next(error)
    }
}

exports.getAllStorageLocation = async (req, res, next) => {
    try {
        const {count, rows} = await StorageLocation.findAndCountAll({
            order: [
                ['createdAt', 'ASC'],
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'StorageLocation not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getStorageLocationById = async (req, res, next) => {
    const id = req.params.id

    try {
        const storageLocation = await StorageLocation.findByPk(id)
        if (!storageLocation) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'StorageLocation not found'})
        }
        return res.json(storageLocation);
    } catch (error) {
        next(error)
    }
}

exports.deleteAllStorageLocation = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await StorageLocation.destroy({
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