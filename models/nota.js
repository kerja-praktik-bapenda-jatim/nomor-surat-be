const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/db');

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
    departmentId: {
        type: DataTypes.UUID,
    }
},
{
    hooks:{
        async beforeCreate (record, options) {
            const latestNota = await Nota.findOne({
                order: [['number', 'DESC']],
            });

            // Jika ditemukan Nota terakhir, tambahkan number, jika tidak, mulai dari 1
            const newNumber = latestNota ? latestNota.number + 1 : 1;

            // Set nilai number baru untuk Nota yang sedang dibuat
            record.number = newNumber;
            record.reserved = true;
        },
        async beforeBulkCreate (record, options) {
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

module.exports = Nota;