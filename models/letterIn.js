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
  tahun: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: () => new Date().getFullYear(),
    field: 'tahun' // Kolom tahun di database
  },
  noAgenda: {
    type: DataTypes.INTEGER,
    field: 'no_agenda' // Map ke kolom no_agenda di database
  },
  noSurat: {
    type: DataTypes.STRING,
    field: 'no_surat' // Kemungkinan juga snake_case
  },
  suratDari: {
    type: DataTypes.STRING,
    field: 'surat_dari'
  },
  perihal: DataTypes.STRING,
  tglSurat: {
    type: DataTypes.DATE,
    field: 'tgl_surat'
  },
  diterimaTgl: {
    type: DataTypes.DATE,
    field: 'diterima_tgl'
  },
  langsungKe: {
    type: DataTypes.BOOLEAN,
    field: 'langsung_ke'
  },
  ditujukanKe: {
    type: DataTypes.STRING,
    field: 'ditujukan_ke'
  },
  agenda: DataTypes.BOOLEAN,

  // ✅ FINAL: Gunakan filename dan filePath (kolom sudah ada di database)
  filename: {
    type: DataTypes.STRING,
  },
  filePath: {
    type: DataTypes.STRING,
    field: 'filepath'  // Map ke kolom file_path di database
  }

  // ✅ HAPUS upload BLOB karena tidak digunakan lagi
  // upload: {
  //   type: DataTypes.BLOB('long'),
  //   allowNull: true
  // }

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

// Hook untuk auto-generate no_agenda
letterIn.addHook('beforeCreate', async (letter) => {
  if (!letter.noAgenda) {
    const currentYear = new Date().getFullYear();
    letter.tahun = currentYear;
    
    // Cari nomor agenda terakhir untuk tahun ini
    const lastLetter = await letterIn.findOne({
      where: { tahun: currentYear },
      order: [['noAgenda', 'DESC']] // Sequelize akan otomatis map ke no_agenda
    });
    
    letter.noAgenda = lastLetter ? lastLetter.noAgenda + 1 : 1;
  }
});

Classification.hasMany(letterIn, {foreignKey: 'classificationId'});
letterIn.belongsTo(Classification, {foreignKey: 'classificationId'});

LetterType.hasMany(letterIn, {foreignKey: 'letterTypeId'});
letterIn.belongsTo(LetterType, {foreignKey: 'letterTypeId'});

module.exports = letterIn;