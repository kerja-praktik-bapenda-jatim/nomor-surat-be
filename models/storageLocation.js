const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');

const StorageLocation = sequelize.define('StorageLocation', {
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

module.exports = StorageLocation;