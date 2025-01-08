const User = require('../models/user');
const {Op, col, fn} = require("sequelize");
const {StatusCodes} = require('http-status-codes');
const {hashPassword} = require("../utils/util");
const bcrypt = require("bcrypt");

exports.getAllUser = async (req, res, next) => {
    const {name, email} = req.query;
    const filterConditions = {}

    if (name) {
        filterConditions.username = {
            [Op.and]: [fn('LOWER', col('username')), {
                [Op.like]: `%${name.toLowerCase()}%`
            }]
        };
    }

    try {
        if (!req.payload.isAdmin) {
            return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Admin privileges required to access this endpoint.'})
        }
        const {count, rows} = await User.findAndCountAll({
            attributes: {
                exclude: ['password']
            }, where: filterConditions
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'User not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.updateUser = async (req, res, next) => {
    const {oldPassword, newPassword, userId} = req.body;

    let _userId = req.payload.userId;
    const isAdmin = req.payload.isAdmin;

    if (isAdmin && userId) {
        _userId = userId
    }

    try {
        const user = await User.findByPk(_userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'User not found'})
        }

        if (!isAdmin) {
            const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
            if (!isPasswordValid) {
                return res.status(StatusCodes.UNAUTHORIZED).json({message: 'Password salah'});
            }
        }

        const updatedData = {
            username: user.username,
            password: await hashPassword(newPassword),
            isAdmin: user.isAdmin,
        }

        await user.update(updatedData)
        return res.json({message: 'Berhasil update user'});
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
            return res.status(StatusCodes.NOT_FOUND).json({message: 'User not found'})
        }
        return res.json(user)
    } catch (error) {
        next(error)
    }
}