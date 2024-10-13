const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    hooks: {
        async beforeCreate(record, options) {
            record.password = await bcrypt.hash(record.password, 10);
        }
    }
});

module.exports = User;