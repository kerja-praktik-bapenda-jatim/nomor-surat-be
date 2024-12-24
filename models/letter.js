const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');
const Classification = require("./classification");
const Level = require("./level");
const JraDescription = require("./jraDescription");
const StorageLocation = require("./storageLocation");
const RetentionPeriod = require("./retentionPeriod");
const Access = require("./access");

const Letter = sequelize.define('Letter', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    number: {
        type: DataTypes.INTEGER,
    },
    subject: {
        type: DataTypes.STRING,
    },
    to: {
        type: DataTypes.STRING,
    },
    filename: {
        type: DataTypes.STRING,
    },
    filePath: {
        type: DataTypes.STRING,
    },
    reserved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    attachmentCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    description: {
        type: DataTypes.STRING,
    },
    departmentId: {
        type: DataTypes.UUID,
    },
    lastReserved: {
        type: DataTypes.DATE
    },
    documentIndexName: {
        type: DataTypes.STRING,
    }
},
{
    hooks:{
        async beforeCreate (record, options) {
            const latestLetter = await Letter.findOne({
                order: [['number', 'DESC']],
            });

            // Jika ditemukan letter terakhir, tambahkan number, jika tidak, mulai dari 1
            const newNumber = latestLetter ? latestLetter.number + 1 : 1;

            // Set nilai number baru untuk letter yang sedang dibuat
            record.number = newNumber;
            record.reserved = true;
            record.lastReserved = Date.now();
        },
        async beforeBulkCreate (record, options) {
            // Cari nilai number tertinggi sebelum bulk insert
            const latestLetter = await Letter.findOne({
                order: [['number', 'DESC']],
            });

            // Mulai dari number tertinggi + 1, atau 1 jika tidak ada data sebelumnya
            let newNumber = latestLetter ? latestLetter.number + 1 : 1;

            // Iterasi untuk setiap letter dan assign nilai number
            record.forEach(letter => {
                letter.number = newNumber++;
            });
        },
    }
},
);

Classification.hasMany(Letter, {foreignKey: 'classificationId'});
Letter.belongsTo(Classification, {foreignKey: 'classificationId'});

Level.hasMany(Letter, {foreignKey: 'levelId'});
Letter.belongsTo(Level, {foreignKey: 'levelId'});

RetentionPeriod.hasMany(Letter, {foreignKey: 'activeRetentionPeriodId', as: 'ActiveLetters'});
RetentionPeriod.hasMany(Letter, {foreignKey: 'inactiveRetentionPeriodId', as: 'InactiveLetters'});
Letter.belongsTo(RetentionPeriod, {foreignKey: 'activeRetentionPeriodId', as: 'ActiveRetentionPeriod'});
Letter.belongsTo(RetentionPeriod, {foreignKey: 'inactiveRetentionPeriodId', as: 'InactiveRetentionPeriod'});

JraDescription.hasMany(Letter, {foreignKey: 'jraDescriptionId'})
Letter.belongsTo(JraDescription, {foreignKey: 'jraDescriptionId'});

StorageLocation.hasMany(Letter, {foreignKey: 'storageLocationId'});
Letter.belongsTo(StorageLocation, {foreignKey: 'storageLocationId'});

Access.hasMany(Letter, {foreignKey: 'accessId'});
Letter.belongsTo(Access, {foreignKey: 'accessId'});

module.exports = Letter;