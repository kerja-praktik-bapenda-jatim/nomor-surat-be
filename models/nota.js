const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');
const Classification = require("./classification");
const Level = require("./level");
const JraDescription = require("./jraDescription");
const StorageLocation = require("./storageLocation");
const RetentionPeriod = require("./retentionPeriod");

const Nota = sequelize.define('Nota', {
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
            type: DataTypes.DATE,
        },
        documentIndexName: {
            type: DataTypes.STRING,
        }
    },
    {
        hooks: {
            async beforeCreate(record, options) {
                const latestNota = await Nota.findOne({
                    order: [['number', 'DESC']],
                });

                // Jika ditemukan Nota terakhir, tambahkan number, jika tidak, mulai dari 1
                const newNumber = latestNota ? latestNota.number + 1 : 1;

                // Set nilai number baru untuk Nota yang sedang dibuat
                record.number = newNumber;
                record.reserved = true;
                record.lastReserved = Date.now();
            },
            async beforeBulkCreate(record, options) {
                // Cari nilai number tertinggi sebelum bulk insert
                const latestNota = await Nota.findOne({
                    order: [['number', 'DESC']],
                });

                // Mulai dari number tertinggi + 1, atau 1 jika tidak ada data sebelumnya
                let newNumber = latestNota ? latestNota.number + 1 : 1;

                // Iterasi untuk setiap Nota dan assign nilai number
                record.forEach(Nota => {
                    Nota.number = newNumber++;
                });
            },
        }
    },
);

Classification.hasMany(Nota, {foreignKey: 'classificationId'});
Nota.belongsTo(Classification, {foreignKey: 'classificationId'});

Level.hasMany(Nota, {foreignKey: 'levelId'});
Nota.belongsTo(Level, {foreignKey: 'levelId'});

RetentionPeriod.hasMany(Nota, {foreignKey: 'activeRetentionId', as: 'ActiveNotas'});
RetentionPeriod.hasMany(Nota, {foreignKey: 'inactiveRetentionId', as: 'InactiveNotas'});
Nota.belongsTo(RetentionPeriod, {foreignKey: 'activeRetentionId', as: 'ActiveRetentionPeriod'});
Nota.belongsTo(RetentionPeriod, {foreignKey: 'inactiveRetentionId', as: 'InactiveRetentionPeriod'});

JraDescription.hasMany(Nota, {foreignKey: 'jraDescriptionId'})
Nota.belongsTo(JraDescription, {foreignKey: 'jraDescriptionId'});

StorageLocation.hasMany(Nota, {foreignKey: 'storageLocationId'});
Nota.belongsTo(StorageLocation, {foreignKey: 'storageLocationId'});

module.exports = Nota;