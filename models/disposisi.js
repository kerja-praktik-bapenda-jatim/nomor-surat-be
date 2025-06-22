const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const LetterIn = require('./letterIn');

const Disposisi = sequelize.define('Disposisi', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    noDispo: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tglDispo: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dispoKe: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    isiDispo: {
        type: DataTypes.STRING(500),
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
    tableName: 'disposisis',
    timestamps: true
});

LetterIn.hasOne(Disposisi, {
    foreignKey: 'letterIn_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Disposisi.belongsTo(LetterIn, {
    foreignKey: 'letterIn_id',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

module.exports = Disposisi;