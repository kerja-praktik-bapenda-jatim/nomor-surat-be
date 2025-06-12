const path = require('path');
const fs = require('fs');
const LetterIn = require('../models/letterIn');
const Classification = require('../models/classification');
const LetterType = require('../models/letterType');
const { Op } = require('sequelize');
const { StatusCodes } = require('http-status-codes');
const { stringToBoolean } = require('../utils/util');
const Agenda = require('../models/agenda');
const { sequelize } = require('../config/db'); 

exports.create = async (req, res) => {
  try {
    const {
      noAgenda, noSurat, suratDari, perihal, tglSurat, diterimaTgl,
      langsungKe, ditujukanKe, agenda, classificationId, letterTypeId
    } = req.body;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ 
        message: `File terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB` 
      });
    }

    // Baca file sebagai buffer
    const fileBuffer = fs.readFileSync(file.path);
    
    console.log(`File info: ${file.originalname}, Size: ${file.size} bytes`);
    
    const newData = await LetterIn.create({
      noAgenda,
      noSurat,
      suratDari,
      perihal,
      tglSurat,
      diterimaTgl,
      langsungKe: stringToBoolean(langsungKe),
      ditujukanKe,
      agenda: stringToBoolean(agenda),
      classificationId,
      letterTypeId,
      
      // ✅ Hanya simpan BLOB dulu, tanpa metadata
      upload: fileBuffer
      
      // ✅ Comment metadata yang belum ada di DB
      // filename: file.originalname,
      // mimetype: file.mimetype,
      // filesize: file.size
    });

    // Hapus temporary file
    fs.unlinkSync(file.path);

    const result = await LetterIn.findByPk(newData.id, {
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] }
      ]
    });

    res.status(StatusCodes.CREATED).json(result);
  } catch (err) {
    console.error('Create letter error:', err);
    
    // Cleanup temporary file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id);

    if (!data || !data.upload) {
      return res.status(404).json({ message: 'File not found' });
    }

    // ✅ Set headers tanpa metadata (gunakan default)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', data.upload.length);
    res.setHeader('Content-Disposition', `inline; filename="surat-${data.noSurat || data.id}.pdf"`);
    
    // Send BLOB data
    res.send(data.upload);
  } catch (err) {
    console.error('Download file error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateById = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      noAgenda, noSurat, suratDari, perihal, tglSurat, diterimaTgl,
      langsungKe, ditujukanKe, agenda, classificationId, letterTypeId,
      // ✅ Tambah agenda fields
      tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, acara, catatan
    } = req.body;

    const file = req.file;
    const data = await LetterIn.findByPk(req.params.id, { transaction });
    
    if (!data) {
      await transaction.rollback();
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
    }

    const updatedData = {
      noAgenda: noAgenda || data.noAgenda,
      noSurat: noSurat || data.noSurat,
      suratDari: suratDari || data.suratDari,
      perihal: perihal || data.perihal,
      tglSurat: tglSurat || data.tglSurat,
      diterimaTgl: diterimaTgl || data.diterimaTgl,
      langsungKe: langsungKe !== undefined ? stringToBoolean(langsungKe) : data.langsungKe,
      ditujukanKe: ditujukanKe || data.ditujukanKe,
      agenda: agenda !== undefined ? stringToBoolean(agenda) : data.agenda,
      classificationId: classificationId || data.classificationId,
      letterTypeId: letterTypeId || data.letterTypeId
    };

    // Handle file update
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        await transaction.rollback();
        return res.status(400).json({ 
          message: `File terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB` 
        });
      }

      const fileBuffer = fs.readFileSync(file.path);
      updatedData.upload = fileBuffer;
      fs.unlinkSync(file.path);
    }

    // ✅ Update letter data
    await data.update(updatedData, { transaction });

    // ✅ HANDLE AGENDA LOGIC
    const agendaFlag = stringToBoolean(agenda);
    
    if (agendaFlag === true) {
      // ✅ Validasi agenda fields
      if (!tglMulai || !tglSelesai || !jamMulai || !jamSelesai || !tempat || !acara) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Data agenda tidak lengkap. Field tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, dan acara wajib diisi.' 
        });
      }

      // ✅ Cari agenda yang sudah ada
      const existingAgenda = await Agenda.findOne({
        where: { letterIn_id: req.params.id },
        transaction
      });

      const agendaData = {
        tglMulai: new Date(tglMulai),
        tglSelesai: new Date(tglSelesai),
        jamMulai,
        jamSelesai,
        tempat,
        acara,
        catatan: catatan || '',
        letterIn_id: req.params.id
      };

      if (existingAgenda) {
        // Update existing agenda
        await existingAgenda.update(agendaData, { transaction });
        console.log('✅ Agenda updated:', agendaData);
      } else {
        // Create new agenda
        await Agenda.create(agendaData, { transaction });
        console.log('✅ Agenda created:', agendaData);
      }
    } else {
      // ✅ Jika agenda = false, hapus agenda yang ada
      const deletedCount = await Agenda.destroy({
        where: { letterIn_id: req.params.id },
        transaction
      });
      console.log(`✅ Agenda deleted: ${deletedCount} records`);
    }

    // ✅ Commit transaction
    await transaction.commit();
    
    // ✅ Fetch updated result dengan agenda
    const result = await LetterIn.findByPk(data.id, {
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' } // ✅ Include agenda
      ]
    });
    
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Update letter error:', err);
    
    // Cleanup temporary file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Gagal mengupdate surat', 
      error: err.message 
    });
  }
};

// Fungsi lainnya tetap sama
exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate, perihal, suratDari } = req.query;
    const filterConditions = {};

    if (startDate) {
      filterConditions.tglSurat = {
        [Op.gte]: new Date(startDate)
      };
    }

    if (endDate) {
      filterConditions.tglSurat = {
        ...filterConditions.tglSurat,
        [Op.lte]: new Date(endDate)
      };
    }

    if (perihal) {
      filterConditions.perihal = {
        [Op.iLike]: `%${perihal}%`
      };
    }

    if (suratDari) {
      filterConditions.suratDari = {
        [Op.iLike]: `%${suratDari}%`
      };
    }

    const data = await LetterIn.findAll({
      where: filterConditions,
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' } // ✅ Include agenda
      ],
      order: [['tglSurat', 'DESC']]
    });

    res.status(StatusCodes.OK).json(data);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id, {
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' } // ✅ Include agenda
      ]
    });

    if (!data) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
    }

    res.status(StatusCodes.OK).json(data);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

exports.deleteById = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const data = await LetterIn.findByPk(req.params.id, { transaction });
    
    if (!data) {
      await transaction.rollback();
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
    }

    // ✅ MANUAL DELETE AGENDA DULU (sebagai backup jika cascade tidak jalan)
    const deletedAgendaCount = await Agenda.destroy({
      where: { letterIn_id: req.params.id },
      transaction
    });
    
    console.log(`🗑️ Deleted ${deletedAgendaCount} agenda records for letter ${req.params.id}`);

    // ✅ DELETE LETTER
    await data.destroy({ transaction });
    
    await transaction.commit();
    console.log(`✅ Letter ${req.params.id} deleted successfully`);
    
    res.status(StatusCodes.OK).json({ 
      message: 'LetterIn deleted successfully',
      deletedAgendaCount 
    });
    
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Delete error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

exports.deleteAll = async (req, res) => {
  const { truncate } = req.query;

  try {
    if (truncate && stringToBoolean(truncate)) {
      await LetterIn.destroy({ truncate: true });
      return res.status(StatusCodes.NO_CONTENT).send();
    }

    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid truncate parameter' });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};