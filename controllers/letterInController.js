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
const ExcelJS = require('exceljs'); 

exports.create = async (req, res) => {
  const transaction = await sequelize.transaction(); // ✅ Tambah transaction
  
  try {
    const {
      noAgenda, noSurat, suratDari, perihal, tglSurat, diterimaTgl,
      langsungKe, ditujukanKe, agenda, classificationId, letterTypeId,
      // ✅ TAMBAH AGENDA FIELDS
      tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, acara, catatan
    } = req.body;

    // ✅ DEBUG LOG
    console.log('=== CREATE LETTER DEBUG ===');
    console.log('agenda value:', agenda, 'type:', typeof agenda);
    console.log('agenda fields:', { tglMulai, jamMulai, tempat, acara });

    const file = req.file;
    if (!file) {
      await transaction.rollback();
      return res.status(400).json({ message: 'File is required' });
    }

    // Check file size (max 10MB)
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

    // Baca file sebagai buffer
    const fileBuffer = fs.readFileSync(file.path);
    
    console.log(`File info: ${file.originalname}, Size: ${file.size} bytes`);
    
    // ✅ CREATE LETTER dengan transaction
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
      upload: fileBuffer
    }, { transaction });

    // ✅ HANDLE AGENDA CREATION - LOGIC BARU INI!
    const agendaFlag = stringToBoolean(agenda);
    console.log('✅ Agenda flag after conversion:', agendaFlag);
    
    if (agendaFlag === true) {
      console.log('✅ Creating agenda record...');
      
      // ✅ Validasi agenda fields
      if (!tglMulai || !tglSelesai || !jamMulai || !jamSelesai || !tempat || !acara) {
        await transaction.rollback();
        fs.unlinkSync(file.path);
        return res.status(400).json({ 
          message: 'Data agenda tidak lengkap. Field tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, dan acara wajib diisi.' 
        });
      }

      const agendaData = {
        tglMulai: new Date(tglMulai),
        tglSelesai: new Date(tglSelesai),
        jamMulai,
        jamSelesai,
        tempat,
        acara,
        catatan: catatan || '',
        letterIn_id: newData.id
      };

      console.log('✅ Creating agenda with data:', agendaData);
      
      await Agenda.create(agendaData, { transaction });
      console.log('🎉 Agenda created successfully!');
    } else {
      console.log('❌ Agenda false, skipping agenda creation');
    }

    // ✅ Commit transaction
    await transaction.commit();
    
    // Hapus temporary file
    fs.unlinkSync(file.path);

    // ✅ Fetch result dengan agenda
    const result = await LetterIn.findByPk(newData.id, {
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' } // ✅ TAMBAH INCLUDE AGENDA
      ]
    });

    console.log('🎉 Final result with agenda:', !!result.Agenda);
    res.status(StatusCodes.CREATED).json(result);
    
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Create letter error:', err);
    
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

exports.exportLetters = async (req, res) => {
  try {
    console.log('📊 Export request received:', req.query);
    
    const { 
      startDate, 
      endDate, 
      classificationId, 
      letterTypeId, 
      suratDari, 
      perihal 
    } = req.query;

    // Build filter conditions (sama seperti sebelumnya)
    const filterConditions = {};

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filterConditions.tglSurat = {
        [Op.gte]: start
      };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filterConditions.tglSurat = {
        ...filterConditions.tglSurat,
        [Op.lte]: end
      };
    }

    if (!startDate && !endDate) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      filterConditions.tglSurat = {
        [Op.gte]: oneYearAgo,
        [Op.lte]: today
      };
    }

    if (classificationId && classificationId.trim() !== '') {
      filterConditions.classificationId = classificationId;
    }

    if (letterTypeId && letterTypeId.trim() !== '') {
      filterConditions.letterTypeId = letterTypeId;
    }

    if (suratDari && suratDari.trim() !== '') {
      filterConditions.suratDari = {
        [Op.iLike]: `%${suratDari}%`
      };
    }

    if (perihal && perihal.trim() !== '') {
      filterConditions.perihal = {
        [Op.iLike]: `%${perihal}%`
      };
    }

    console.log('🔍 Final filter conditions:', JSON.stringify(filterConditions, null, 2));

    // ✅ FETCH DATA tanpa field upload (BLOB)
    const letters = await LetterIn.findAll({
      where: filterConditions,
      attributes: { 
        exclude: ['upload'] // ✅ EXCLUDE BLOB field dari query
      },
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' }
      ],
      order: [['tglSurat', 'DESC']]
    });

    console.log(`📋 Found ${letters.length} letters with filter`);

    // CREATE EXCEL WORKBOOK
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Surat Masuk');

    // ✅ ADD HEADERS tanpa kolom upload
    worksheet.columns = [
      { header: 'No Agenda', key: 'noAgenda', width: 15 },
      { header: 'No Surat', key: 'noSurat', width: 20 },
      { header: 'Tanggal Surat', key: 'tglSurat', width: 15 },
      { header: 'Tanggal Diterima', key: 'diterimaTgl', width: 15 },
      { header: 'Surat Dari', key: 'suratDari', width: 25 },
      { header: 'Perihal', key: 'perihal', width: 30 },
      { header: 'Klasifikasi', key: 'classification', width: 25 },
      { header: 'Jenis Surat', key: 'letterType', width: 20 },
      { header: 'Langsung Ke', key: 'langsungKe', width: 15 },
      { header: 'Ditujukan Ke', key: 'ditujukanKe', width: 25 },
      { header: 'Agenda', key: 'agenda', width: 10 },
      { header: 'Ada File', key: 'hasFile', width: 12 }, // ✅ Status file tanpa BLOB
      { header: 'Acara', key: 'acara', width: 25 },
      { header: 'Tempat', key: 'tempat', width: 20 },
      { header: 'Tanggal Acara', key: 'tglAcara', width: 15 },
      { header: 'Jam', key: 'jam', width: 15 }
    ];

    // ✅ ADD DATA ROWS tanpa BLOB
    letters.forEach((letter, index) => {
      console.log(`📄 Processing letter ${index + 1}:`, {
        noAgenda: letter.noAgenda,
        noSurat: letter.noSurat,
        tglSurat: letter.tglSurat
      });
      
      worksheet.addRow({
        noAgenda: letter.noAgenda || '',
        noSurat: letter.noSurat || '',
        tglSurat: letter.tglSurat ? new Date(letter.tglSurat).toLocaleDateString('id-ID') : '',
        diterimaTgl: letter.diterimaTgl ? new Date(letter.diterimaTgl).toLocaleDateString('id-ID') : '',
        suratDari: letter.suratDari || '',
        perihal: letter.perihal || '',
        classification: letter.Classification ? `${letter.Classification.id} - ${letter.Classification.name}` : '',
        letterType: letter.LetterType ? letter.LetterType.name : '',
        langsungKe: letter.langsungKe ? 'Ya' : 'Tidak',
        ditujukanKe: letter.ditujukanKe || '',
        agenda: letter.agenda ? 'Ya' : 'Tidak',
        hasFile: 'Ya', // ✅ Semua record pasti ada file (required)
        acara: letter.Agenda ? letter.Agenda.acara || '' : '',
        tempat: letter.Agenda ? letter.Agenda.tempat || '' : '',
        tglAcara: letter.Agenda && letter.Agenda.tglMulai ? 
          new Date(letter.Agenda.tglMulai).toLocaleDateString('id-ID') : '',
        jam: letter.Agenda && letter.Agenda.jamMulai && letter.Agenda.jamSelesai ? 
          `${letter.Agenda.jamMulai} - ${letter.Agenda.jamSelesai}` : ''
      });
    });

    // Jika tidak ada data
    if (letters.length === 0) {
      worksheet.addRow({
        noAgenda: 'Tidak ada data',
        noSurat: 'dengan filter yang dipilih',
        tglSurat: '',
        diterimaTgl: '',
        suratDari: '',
        perihal: '',
        classification: '',
        letterType: '',
        langsungKe: '',
        ditujukanKe: '',
        agenda: '',
        hasFile: '',
        acara: '',
        tempat: '',
        tglAcara: '',
        jam: ''
      });
    }

    // STYLE HEADERS
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // SET RESPONSE HEADERS
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Surat-Masuk-${timestamp}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // WRITE EXCEL FILE
    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ Export completed: ${letters.length} records exported as ${filename}`);

  } catch (error) {
    console.error('❌ Export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Gagal mengekspor data', 
        error: error.message 
      });
    }
  }
};