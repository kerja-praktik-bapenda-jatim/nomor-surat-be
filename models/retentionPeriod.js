const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');

const RetentionPeriod = sequelize.define('RetentionPeriod', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
});

module.exports = RetentionPeriod;