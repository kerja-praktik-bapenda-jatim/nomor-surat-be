const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const LetterIn = require('./letterIn');

const Agenda = sequelize.define('Agenda', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tglMulai: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    tglSelesai: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    jamMulai: {
        type: DataTypes.TIME,
        allowNull: false
    },
    jamSelesai: {
        type: DataTypes.TIME,
        allowNull: true
    },
    tempat: {
        type: DataTypes.STRING,
        allowNull: true
    },
    acara: {
        type: DataTypes.STRING,
        allowNull: false
    },
    catatan: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    letterIn_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'LetterIns',
            key: 'id'
        }
    }
}, {
    tableName: 'agendas',
    timestamps: true,
    hooks: {
        beforeCreate: (agenda, options) => {
            if (agenda.tglSelesai && agenda.tglMulai && agenda.tglSelesai < agenda.tglMulai) {
                throw new Error('Tanggal selesai tidak boleh lebih kecil dari tanggal mulai');
            }

            if (agenda.tglSelesai && agenda.jamSelesai &&
                agenda.tglMulai === agenda.tglSelesai &&
                agenda.jamSelesai < agenda.jamMulai) {
                throw new Error('Jam selesai tidak boleh lebih kecil dari jam mulai pada hari yang sama');
            }
        },
        beforeUpdate: (agenda, options) => {
            if (agenda.tglSelesai && agenda.tglMulai && agenda.tglSelesai < agenda.tglMulai) {
                throw new Error('Tanggal selesai tidak boleh lebih kecil dari tanggal mulai');
            }

            if (agenda.tglSelesai && agenda.jamSelesai &&
                agenda.tglMulai === agenda.tglSelesai &&
                agenda.jamSelesai < agenda.jamMulai) {
                throw new Error('Jam selesai tidak boleh lebih kecil dari jam mulai pada hari yang sama');
            }
        }
    }
});

LetterIn.hasOne(Agenda, {
    foreignKey: 'letterIn_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Agenda.belongsTo(LetterIn, {
    foreignKey: 'letterIn_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

module.exports = Agenda;