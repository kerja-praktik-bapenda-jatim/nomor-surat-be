const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LetterType = sequelize.define('LetterType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
}, {
  tableName: 'letter_types',
  timestamps: true,  // ← Ubah dari false ke true
  createdAt: 'created_at',  // ← Map ke nama kolom database
  updatedAt: 'updated_at'   // ← Map ke nama kolom database (jika ada)
});

module.exports = LetterType;