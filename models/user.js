const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');
const bcrypt = require('bcrypt');
const Department = require("./department");
const Letter = require("./letter");

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

Department.hasMany(User, {foreignKey: 'departmentId',});
User.belongsTo(Department, {foreignKey: 'departmentId'});

User.hasMany(Letter, {foreignKey: 'userId',});
Letter.belongsTo(User, {foreignKey: 'userId'});

module.exports = User;