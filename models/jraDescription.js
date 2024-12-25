const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');

const JraDescription = sequelize.define('JraDescription', {
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

module.exports = JraDescription;