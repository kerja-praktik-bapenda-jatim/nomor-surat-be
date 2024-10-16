const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res, next) => {
    const {username, password} = req.body;

    try {
        if (!(username && password)) {
            return res.status(400).json({message: 'Username and password is required'});
        }
        const user = await User.create({username, password});
        return res.status(201).json({message: 'User created successfully', user});
    } catch (error) {
        next(error)
    }
};

exports.login = async (req, res, next) => {
    const {username, password} = req.body;

    try {
        if (!(username && password)) {
            return res.status(400).json({message: 'Username and password is required'});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({message: 'Invalid password'});
        }

        const token = jwt.sign({userId: user.id, isAdmin: user.isAdmin}, JWT_SECRET, {
            expiresIn: '7d',
            algorithm: 'HS384'
        });
        return res.status(200).json({message: 'Login successful', token});
    } catch (error) {
        next(error)
    }
};