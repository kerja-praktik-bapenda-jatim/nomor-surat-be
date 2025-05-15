const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LetterType = sequelize.define('LetterType', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    }
});

module.exports = LetterType;