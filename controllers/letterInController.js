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
  const transaction = await sequelize.transaction();
  
  try {
    const {
      noSurat, suratDari, perihal, tglSurat, diterimaTgl,
      langsungKe, ditujukanKe, agenda, classificationId, letterTypeId,
      // ✅ AGENDA FIELDS
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

    // ✅ Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      await transaction.rollback();
      return res.status(400).json({ 
        message: `File terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB` 
      });
    }

    console.log(`File info: ${file.originalname}, Size: ${file.size} bytes, Path: ${file.filename}`);
    
    // ✅ FINAL: CREATE LETTER dengan filename dan filePath
    const newData = await LetterIn.create({
      // noAgenda TIDAK perlu dikirim karena auto-generate di hook beforeCreate
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
      filename: file.originalname, // ✅ Simpan nama file asli
      filePath: file.filename       // ✅ Simpan nama file yang di-generate multer
    }, { transaction });

    // ✅ HANDLE AGENDA CREATION
    const agendaFlag = stringToBoolean(agenda);
    console.log('✅ Agenda flag after conversion:', agendaFlag);
    
    if (agendaFlag === true) {
      console.log('✅ Creating agenda record...');
      
      // ✅ Validasi agenda fields
      if (!tglMulai || !tglSelesai || !jamMulai || !jamSelesai || !tempat || !acara) {
        await transaction.rollback();
        // ✅ Hapus file jika validasi agenda gagal
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
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
    
    // ✅ JANGAN HAPUS FILE - biarkan tersimpan di folder uploads
    console.log('✅ File saved to uploads folder:', file.filename);

    // ✅ Fetch result dengan agenda
    const result = await LetterIn.findByPk(newData.id, {
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' }
      ]
    });

    console.log('🎉 Final result with agenda:', !!result.Agenda);
    console.log('📋 Generated noAgenda:', result.noAgenda, 'tahun:', result.tahun);
    
    res.status(StatusCodes.CREATED).json(result);
    
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Create letter error:', err);
    
    // ✅ Cleanup temporary file jika terjadi error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
  }
};

// ✅ FUNGSI BARU: Get nomor agenda selanjutnya untuk preview
exports.getNextAgendaNumber = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Cari nomor agenda terakhir untuk tahun ini
    const lastLetter = await LetterIn.findOne({
      where: { tahun: currentYear },
      order: [['noAgenda', 'DESC']]
    });
    
    const nextAgendaNumber = lastLetter ? lastLetter.noAgenda + 1 : 1;
    
    // ✅ FORMAT TANPA ZERO PADDING
    const formattedAgenda = `${currentYear}/${nextAgendaNumber}`;
    
    res.status(StatusCodes.OK).json({
      tahun: currentYear,
      noAgenda: nextAgendaNumber,
      formatted: formattedAgenda
    });
    
  } catch (err) {
    console.error('❌ Get next agenda error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Gagal mendapatkan nomor agenda', 
      error: err.message 
    });
  }
};

// ✅ FINAL: downloadFile menggunakan filePath (bukan BLOB)
exports.downloadFile = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id);

    if (!data) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
    }

    // ✅ Cek apakah filePath ada
    if (data.filePath) {
      const filePath = path.join(process.env.UPLOAD_DIR, data.filePath); // Mengambil path file dari database

      // ✅ Cek apakah file tersebut ada di filesystem
      if (fs.existsSync(filePath)) {
        // ✅ Set header untuk mendownload file dengan nama file dari database
        res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);

        return res.sendFile(filePath); // ✅ Menggunakan res.sendFile untuk mengirim file
      } else {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'File tidak ditemukan.' });
      }
    } else {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Tidak ada file pada surat ini.' });
    }
  } catch (err) {
    console.error('Download file error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

exports.updateById = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      noSurat, suratDari, perihal, tglSurat, diterimaTgl,
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
      // ✅ HAPUS noAgenda dari update karena readonly
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

    // ✅ FINAL: Handle file update menggunakan filePath (bukan BLOB)
    if (file) {
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        await transaction.rollback();
        return res.status(400).json({ 
          message: `File terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB` 
        });
      }

      // ✅ Hapus file lama jika ada
      if (data.filePath) {
        const oldFilePath = path.join(process.env.UPLOAD_DIR, data.filePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('✅ Old file deleted:', oldFilePath);
        }
      }

      // ✅ Update dengan file baru
      updatedData.filename = file.originalname;
      updatedData.filePath = file.filename;
      console.log('✅ New file saved:', file.filename);
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
        { model: Agenda, as: 'Agenda' }
      ]
    });
    
    res.status(StatusCodes.OK).json(result);
  } catch (err) {
    await transaction.rollback();
    console.error('Update letter error:', err);
    
    // ✅ Cleanup temporary file jika error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Gagal mengupdate surat', 
      error: err.message 
    });
  }
};

// ✅ UPDATE getAll - hapus exclude 'upload' karena sekarang tidak ada field upload
// ✅ UBAH fungsi getAll di letterInController.js

exports.getAll = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      perihal, 
      suratDari, 
      classificationId,
      page = 1, 
      limit = 10,
      order  // ✅ TAMBAH parameter order seperti di letterController
    } = req.query;
    
    const filterConditions = {};

    // Date filters
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

    // Text search filters
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

    // Classification filter
    if (classificationId) {
      filterConditions.classificationId = classificationId;
    }

    // ✅ PAGINATION CALCULATION
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * limitNumber;

    // ✅ SAMA SEPERTI letterController: Default DESC untuk surat terbaru di atas
    let _order = "DESC";  // ✅ DEFAULT DESC (bukan ASC)
    if (order === "asc") {
      _order = "ASC";
    }

    // ✅ UBAH ORDER: Gunakan pattern yang sama dengan letterController
    const { count, rows } = await LetterIn.findAndCountAll({
      where: filterConditions,
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' }
      ],
      order: [
        ['noAgenda', _order]  // ✅ ORDER BY noAgenda DESC (seperti number di letterController)
      ],
      limit: limitNumber,
      offset: offset
    });

    // ✅ PAGINATION METADATA
    const totalPages = Math.ceil(count / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    const paginationInfo = {
      currentPage: pageNumber,
      totalPages,
      totalRows: count,
      rowsPerPage: limitNumber,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? pageNumber + 1 : null,
      prevPage: hasPrevPage ? pageNumber - 1 : null
    };

    console.log(`📋 Found ${count} total letters, showing page ${pageNumber}/${totalPages} in ${_order} order`);

    // ✅ RESPONSE dengan pagination info
    res.status(StatusCodes.OK).json({
      data: rows,
      pagination: paginationInfo,
      success: true
    });

  } catch (err) {
    console.error('❌ Get letters error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Gagal mengambil data surat masuk',
      error: err.message 
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id, {
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' }
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

    let fileDeleted = false;

    // ✅ FINAL: Hapus file dari filesystem jika ada
    if (data.filePath) {
      const filePath = path.join(process.env.UPLOAD_DIR, data.filePath);

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          fileDeleted = true;
          console.log('✅ File deleted:', filePath);
        } catch (err) {
          console.error('❌ Failed to delete file:', err);
          await transaction.rollback();
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Gagal menghapus file.',
            error: err.message,
          });
        }
      } else {
        console.warn(`File tidak ditemukan: ${filePath}`);
      }
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
      message: fileDeleted 
        ? 'File dan surat berhasil dihapus.' 
        : 'Surat berhasil dihapus, file tidak ditemukan.',
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
      classificationId
    } = req.query;

    // Build filter conditions
    const filterConditions = {};

    // Validasi input tanggal
    if (!startDate || !endDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Tanggal mulai dan tanggal akhir harus diisi.',
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    filterConditions.tglSurat = {
      [Op.between]: [start, end]
    };

    if (classificationId && classificationId.trim() !== '') {
      filterConditions.classificationId = classificationId;
    }

    console.log('🔍 Final filter conditions:', JSON.stringify(filterConditions, null, 2));

    // ✅ FINAL: FETCH DATA tanpa exclude karena tidak ada field upload
    const letters = await LetterIn.findAll({
      where: filterConditions,
      include: [
        { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
        { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
        { model: Agenda, as: 'Agenda' }
      ],
      order: [['tahun', 'ASC'], ['noAgenda', 'ASC']] // ✅ Order by tahun dan noAgenda ascending
    });

    console.log(`📋 Found ${letters.length} letters with filter`);

    // Cek jika tidak ada data
    if (letters.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Tidak ada data ditemukan untuk filter yang diberikan.',
      });
    }

    // CREATE EXCEL WORKBOOK
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Surat Masuk');

    // ✅ ADD HEADERS sesuai permintaan
    worksheet.columns = [
      { header: 'Tahun', key: 'tahun', width: 10 },
      { header: 'Nomor Agenda', key: 'nomorAgenda', width: 15 },
      { header: 'Nomor Surat', key: 'noSurat', width: 20 },
      { header: 'Klasifikasi Surat', key: 'klasifikasiSurat', width: 30 },
      { header: 'Jenis Surat', key: 'jenisSurat', width: 20 },
      { header: 'Surat Dari', key: 'suratDari', width: 25 },
      { header: 'Perihal', key: 'perihal', width: 30 },
      { header: 'Tanggal Surat', key: 'tglSurat', width: 15 },
      { header: 'Tanggal Diterima', key: 'tglDiterima', width: 15 },
      { header: 'Langsung Ke', key: 'langsungKe', width: 15 },
      { header: 'Ditujukan Ke', key: 'ditujukanKe', width: 25 },
      { header: 'Agenda', key: 'agenda', width: 10 },
      { header: 'Ada File', key: 'adaFile', width: 12 },
      { header: 'Acara', key: 'acara', width: 25 },
      { header: 'Tempat', key: 'tempat', width: 20 },
      { header: 'Tanggal Acara', key: 'tglAcara', width: 15 },
      { header: 'Jam', key: 'jam', width: 15 }
    ];

    // ✅ ADD DATA ROWS 
    letters.forEach((letter, index) => {
      console.log(`📄 Processing letter ${index + 1}:`, {
        tahun: letter.tahun,
        noAgenda: letter.noAgenda,
        noSurat: letter.noSurat
      });
      
      worksheet.addRow({
        tahun: letter.tahun || new Date().getFullYear(),
        nomorAgenda: letter.noAgenda || '',
        noSurat: letter.noSurat || '',
        klasifikasiSurat: letter.Classification ? letter.Classification.name : '',
        jenisSurat: letter.LetterType ? letter.LetterType.name : '',
        suratDari: letter.suratDari || '',
        perihal: letter.perihal || '',
        tglSurat: letter.tglSurat ? new Date(letter.tglSurat).toLocaleDateString('id-ID') : '',
        tglDiterima: letter.diterimaTgl ? new Date(letter.diterimaTgl).toLocaleDateString('id-ID') : '',
        langsungKe: letter.langsungKe ? 'Ya' : 'Tidak',
        ditujukanKe: letter.ditujukanKe || '',
        agenda: letter.agenda ? 'Ya' : 'Tidak',
        adaFile: letter.filename ? 'Ya' : 'Tidak', // ✅ FINAL: Check berdasarkan filename
        acara: letter.Agenda ? letter.Agenda.acara || '' : '',
        tempat: letter.Agenda ? letter.Agenda.tempat || '' : '',
        tglAcara: letter.Agenda && letter.Agenda.tglMulai ? 
          new Date(letter.Agenda.tglMulai).toLocaleDateString('id-ID') : '',
        jam: letter.Agenda && letter.Agenda.jamMulai && letter.Agenda.jamSelesai ? 
          `${letter.Agenda.jamMulai} - ${letter.Agenda.jamSelesai}` : ''
      });
    });

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