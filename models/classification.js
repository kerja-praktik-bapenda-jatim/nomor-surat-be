const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');

const Classification = sequelize.define('Classification', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(512),
        allowNull: true,
        defaultValue: '-',
    },
});

module.exports = Classification;