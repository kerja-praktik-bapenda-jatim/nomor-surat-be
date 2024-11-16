const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {StatusCodes} = require('http-status-codes');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res, next) => {
    const {username, password, departmentId} = req.body;

    try {
        if (!(username && password && departmentId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({message: 'Username, password, and department id is required'});
        }
        const user = await User.create({
            username: username,
            password: password,
            departmentId: departmentId
        });
        return res.status(StatusCodes.CREATED).json({message: 'User created successfully', user});
    } catch (error) {
        next(error)
    }
};

exports.login = async (req, res, next) => {
    const {username, password} = req.body;

    try {
        if (!(username && password)) {
            return res.status(StatusCodes.BAD_REQUEST).json({message: 'Username and password is required'});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'User not found'});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(StatusCodes.UNAUTHORIZED).json({message: 'Invalid password'});
        }

        const token = jwt.sign({userId: user.id, isAdmin: user.isAdmin, departmentId: user.departmentId}, JWT_SECRET, {
            expiresIn: '7d',
            algorithm: 'HS384'
        });
        return res.json({message: 'Login successful', token});
    } catch (error) {
        next(error)
    }
};