const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const LetterIn = require('./letterIn');

const Agenda = sequelize.define('Agenda', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true },
  tglMulai: DataTypes.DATE,
  tglSelesai: DataTypes.DATE,
  jamMulai: DataTypes.TIME,
  jamSelesai: DataTypes.TIME,
  tempat: DataTypes.STRING,
  acara: DataTypes.STRING,
  catatan: DataTypes.STRING,
});

LetterIn.hasOne(Agenda, { foreignKey: 'letterIn_id' });
Agenda.belongsTo(LetterIn, { foreignKey: 'letterIn_id' });

module.exports = Agenda;
