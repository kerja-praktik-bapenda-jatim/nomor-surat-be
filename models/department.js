const {sequelize} = require("../config/db");
const {DataTypes} = require("sequelize");

const Department = sequelize.define('Department', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
})

module.exports = Department;