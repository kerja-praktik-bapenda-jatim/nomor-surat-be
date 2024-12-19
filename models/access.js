const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');

const Access = sequelize.define('Access', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = Access;