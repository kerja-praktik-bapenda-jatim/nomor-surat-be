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
    type: DataTypes.DATEONLY, // Gunakan DATEONLY untuk tanggal saja (YYYY-MM-DD)
    allowNull: false,
    comment: 'Tanggal mulai agenda'
  },
  tglSelesai: {
    type: DataTypes.DATEONLY, // Gunakan DATEONLY untuk tanggal saja (YYYY-MM-DD)
    allowNull: true,
    comment: 'Tanggal selesai agenda'
  },
  jamMulai: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: 'Jam mulai agenda (HH:MM:SS)'
  },
  jamSelesai: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Jam selesai agenda (HH:MM:SS)'
  },
  tempat: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Tempat pelaksanaan agenda'
  },
  acara: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nama acara/kegiatan'
  },
  catatan: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Catatan tambahan'
  },
  letterIn_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'LetterIns', // Pastikan nama tabel sesuai
      key: 'id'
    },
    comment: 'Foreign key ke tabel LetterIn'
  }
}, {
  // Opsi tambahan untuk model
  tableName: 'agendas', // Nama tabel eksplisit
  timestamps: true, // Akan menambahkan createdAt dan updatedAt
  
  // Hooks untuk memastikan konsistensi data
  hooks: {
    beforeCreate: (agenda, options) => {
      // Validasi tanggal
      if (agenda.tglSelesai && agenda.tglMulai && agenda.tglSelesai < agenda.tglMulai) {
        throw new Error('Tanggal selesai tidak boleh lebih kecil dari tanggal mulai');
      }
      
      // Validasi jam jika tanggal sama
      if (agenda.tglSelesai && agenda.jamSelesai && 
          agenda.tglMulai === agenda.tglSelesai && 
          agenda.jamSelesai < agenda.jamMulai) {
        throw new Error('Jam selesai tidak boleh lebih kecil dari jam mulai pada hari yang sama');
      }
    },
    
    beforeUpdate: (agenda, options) => {
      // Validasi yang sama untuk update
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

// Definisi relasi
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