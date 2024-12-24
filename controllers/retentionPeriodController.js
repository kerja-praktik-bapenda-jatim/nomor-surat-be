const RetentionPeriod = require('../models/retentionPeriod');
const {StatusCodes} = require("http-status-codes");

exports.createRetentionPeriod = async (req, res, next) => {
    const {id, name, active} = req.body;

    try {
        const retentionPeriod = await RetentionPeriod.create({id: id, name: name, active: active});
        return res.status(StatusCodes.CREATED).json(retentionPeriod);
    } catch (error) {
        next(error)
    }
}

exports.getAllRetentionPeriod = async (req, res, next) => {
    const { active } = req.query;
    try {
        const whereCondition = active !== undefined ? { active } : {};
        const {count, rows} = await RetentionPeriod.findAndCountAll({
            where: whereCondition,
            order: [
                ['id', 'ASC'],
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'RetentionPeriod not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getRetentionPeriodById = async (req, res, next) => {
    const id = req.params.id

    try {
        const retentionPeriod = await RetentionPeriod.findByPk(id)
        if (!retentionPeriod) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'RetentionPeriod not found'})
        }
        return res.json(RetentionPeriod);
    } catch (error) {
        next(error)
    }
}

exports.deleteAllRetentionPeriod = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await RetentionPeriod.destroy({
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