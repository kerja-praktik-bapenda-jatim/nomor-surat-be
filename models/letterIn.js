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
  // klasifikasi: DataTypes.STRING,
  suratDari: DataTypes.STRING,
  perihal: DataTypes.STRING,
  tglSurat: DataTypes.DATE,
  diterimaTgl: DataTypes.DATE,
  // jenisSurat: DataTypes.STRING,
  langsungKe: DataTypes.BOOLEAN,
  ditujukanKe: DataTypes.STRING,
  agenda: DataTypes.BOOLEAN,
  upload: DataTypes.BLOB,
}, {
  tableName: 'letter_ins',
  timestamps: false
});

Classification.hasMany(letterIn, {foreignKey: 'classificationId'});
letterIn.belongsTo(Classification, {foreignKey: 'classificationId'});

LetterType.hasMany(letterIn, {foreignKey: 'letterTypeId'});
letterIn.belongsTo(LetterType, {foreignKey: 'letterTypeId'});

module.exports = letterIn;
