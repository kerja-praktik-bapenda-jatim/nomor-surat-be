const User = require('../models/user');
const {Op, col, fn} = require("sequelize");

exports.getAllUser = async (req, res, next) => {
    console.log(req.query)
    const {name, email} = req.query;
    const filterConditions = {}

    if (name) {
        filterConditions.username = {
            [Op.and]: [
                fn('LOWER', col('username')), {
                    [Op.like]: `%${name.toLowerCase()}%`
                }
            ]
        };
    }

    try {
        const {count, rows} = await User.findAndCountAll({
            attributes: {
                exclude: ['password']
            },
            where: filterConditions
        })
        if (count === 0) {
            return res.status(404).json({message: 'User not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getMyProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.payload.userId, {
            attributes: {exclude: ['password']}
        })
        if (!user) {
            return res.status(404).json({message: 'User not found'})
        }
        return res.json(user)
    } catch (error) {
        next(error)
    }
}