const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Classification = require('./classification');
const LetterType = require('./letterType');

const LetterIn = sequelize.define('LetterIn', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: () => new Date().getFullYear(),
        field: 'tahun'
    },
    noAgenda: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'no_agenda'
    },
    noSurat: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'no_surat'
    },
    suratDari: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'surat_dari'
    },
    perihal: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tglSurat: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'tgl_surat'
    },
    diterimaTgl: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'diterima_tgl'
    },
    langsungKe: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'langsung_ke'
    },
    ditujukanKe: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ditujukan_ke'
    },
    agenda: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: true
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'filepath'
    },
    classificationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Classifications',
            key: 'id'
        },
        field: 'classification_id'
    },
    letterTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'LetterTypes',
            key: 'id'
        },
        field: 'letter_type_id'
    }
}, {
    tableName: 'letter_ins',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['no_agenda', 'tahun']
        }
    ]
});

LetterIn.addHook('beforeCreate', async (letter) => {
    if (!letter.noAgenda) {
        const currentYear = new Date().getFullYear();
        letter.tahun = currentYear;

        const lastLetter = await LetterIn.findOne({
            where: { tahun: currentYear },
            order: [['noAgenda', 'DESC']]
        });

        letter.noAgenda = lastLetter ? lastLetter.noAgenda + 1 : 1;
    }
});

Classification.hasMany(LetterIn, { foreignKey: 'classificationId' });
LetterIn.belongsTo(Classification, { foreignKey: 'classificationId' });

LetterType.hasMany(LetterIn, { foreignKey: 'letterTypeId' });
LetterIn.belongsTo(LetterType, { foreignKey: 'letterTypeId' });

module.exports = LetterIn;