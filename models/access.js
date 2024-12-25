const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');

const Access = sequelize.define('Access', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = Access;