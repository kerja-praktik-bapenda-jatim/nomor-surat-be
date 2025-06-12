const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Classification = require('./classification');
const LetterType = require('./letterType');

const letterIn = sequelize.define('letterIn', {
  id: {
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true
  },
  noAgenda: DataTypes.INTEGER,
  noSurat: DataTypes.STRING,
  suratDari: DataTypes.STRING,
  perihal: DataTypes.STRING,
  tglSurat: DataTypes.DATE,
  diterimaTgl: DataTypes.DATE,
  langsungKe: DataTypes.BOOLEAN,
  ditujukanKe: DataTypes.STRING,
  agenda: DataTypes.BOOLEAN,

  // ✅ Hanya field upload dulu, tanpa metadata
  upload: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  }

  // ✅ Comment dulu field yang belum ada di DB
  // filename: DataTypes.STRING,
  // mimetype: DataTypes.STRING,
  // filesize: DataTypes.INTEGER,
}, {
  tableName: 'letter_ins',
  timestamps: false
});

Classification.hasMany(letterIn, {foreignKey: 'classificationId'});
letterIn.belongsTo(Classification, {foreignKey: 'classificationId'});

LetterType.hasMany(letterIn, {foreignKey: 'letterTypeId'});
letterIn.belongsTo(LetterType, {foreignKey: 'letterTypeId'});

module.exports = letterIn;