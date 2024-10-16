const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    hooks: {
        async beforeCreate(record, options) {
            record.password = await bcrypt.hash(record.password, 10);
        }
    }
});

module.exports = User;