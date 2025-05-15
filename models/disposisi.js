const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const LetterIn = require('./letterIn');

const Disposisi = sequelize.define('Disposisi', {
  id: {
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true },
  noDispo: DataTypes.INTEGER,
  tglDispo: DataTypes.DATE,
  dispoKe: DataTypes.BOOLEAN,
  isiDispo: DataTypes.STRING(500),
});

LetterIn.hasOne(Disposisi, { foreignKey: 'letterIn_id' });
Disposisi.belongsTo(LetterIn, { foreignKey: 'letterIn_id' });

module.exports = Disposisi;
