// controllers/disposisiController.js - FIXED VERSION

const { Op } = require('sequelize');
const disposisi = require('../models/disposisi');
// const letterIn = require('../models/letterIn'); // Uncomment if available

// ========================== UTILITY FUNCTIONS =============================

const logInfo = (message, data = null) => {
  console.log(`ℹ️ ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logSuccess = (message, data = null) => {
  console.log(`✅ ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logError = (message, error = null) => {
  console.error(`❌ ${message}`, error ? error.message : '');
};

const logWarning = (message, data = null) => {
  console.warn(`⚠️ ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const getCurrentYear = () => new Date().getFullYear();

const validateRequiredFields = (fields, body) => {
  const errors = [];
  fields.forEach(field => {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      errors.push(`Field '${field}' is required`);
    }
  });
  return errors;
};

const formatDisposisiResponse = (disposisi) => {
  try {
    return {
      id: disposisi.id,
      noDispo: disposisi.noDispo,
      tglDispo: disposisi.tglDispo,
      dispoKe: Array.isArray(disposisi.dispoKe) ? disposisi.dispoKe : JSON.parse(disposisi.dispoKe || '[]'),
      isiDispo: disposisi.isiDispo,
      letterIn_id: disposisi.letterIn_id,
      createdAt: disposisi.createdAt,
      updatedAt: disposisi.updatedAt,
      LetterIn: disposisi.LetterIn || null
    };
  } catch (error) {
    logError('Error formatting disposisi response:', error);
    return disposisi;
  }
};

// ========================== MAIN CONTROLLER FUNCTIONS =============================

/**
 * CREATE NEW DISPOSISI
 * Fixed: Add duplicate letter check and proper validation
 */
exports.create = async (req, res) => {
  try {
    const { letterIn_id, noDispo, tglDispo, dispoKe, isiDispo } = req.body;
    
    logInfo('Creating disposisi:', { letterIn_id, noDispo, tglDispo, dispoKe, isiDispo });
    
    // ✅ STEP 1: Validate required fields
    const requiredFields = ['letterIn_id', 'noDispo', 'tglDispo', 'dispoKe', 'isiDispo'];
    const fieldErrors = validateRequiredFields(requiredFields, req.body);
    
    if (fieldErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Semua field disposisi harus diisi.',
        errors: fieldErrors
      });
    }
    
    // ✅ STEP 2: Validate dispoKe array
    if (!Array.isArray(dispoKe) || dispoKe.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Tujuan disposisi harus dipilih minimal satu.' 
      });
    }
    
    // ✅ STEP 3: Check if letter has already been disposed
    const existingLetterDisposition = await disposisi.findOne({
      where: { letterIn_id: letterIn_id }
    });
    
    if (existingLetterDisposition) {
      logWarning('Letter already disposed:', { 
        letterIn_id, 
        existingDispositionId: existingLetterDisposition.id,
        existingNoDispo: existingLetterDisposition.noDispo 
      });
      
      return res.status(409).json({ // 409 = Conflict
        success: false,
        message: 'Surat sudah didisposisikan',
        details: {
          existingDisposition: {
            id: existingLetterDisposition.id,
            noDispo: existingLetterDisposition.noDispo,
            tglDispo: existingLetterDisposition.tglDispo,
            createdAt: existingLetterDisposition.createdAt
          }
        },
        errorType: 'LETTER_ALREADY_DISPOSED'
      });
    }
    
    // ✅ STEP 4: Check if disposisi number is already used
    const existingDisposisi = await disposisi.findOne({
      where: { noDispo: noDispo }
    });
    
    if (existingDisposisi) {
      logWarning('Disposisi number already exists:', noDispo);
      return res.status(409).json({ 
        success: false,
        message: `Nomor disposisi ${noDispo} sudah digunakan. Silakan ambil nomor baru.`,
        errorType: 'DISPOSISI_NUMBER_EXISTS'
      });
    }
    
    // ✅ STEP 5: Create new disposisi
    const newDisposisi = await disposisi.create({
      letterIn_id,
      noDispo,
      tglDispo: new Date(tglDispo),
      dispoKe: Array.isArray(dispoKe) ? dispoKe : [dispoKe], // Ensure array
      isiDispo: isiDispo.trim(),
      userId: req.user?.id || null, // Add user ID if available
      updateUserId: req.user?.id || null
    });
    
    logSuccess('Disposisi created successfully:', { 
      id: newDisposisi.id,
      noDispo: newDisposisi.noDispo, 
      letterIn_id: newDisposisi.letterIn_id 
    });
    
    res.status(201).json({
      success: true,
      message: `Disposisi berhasil dibuat dengan nomor ${newDisposisi.noDispo}`,
      data: formatDisposisiResponse(newDisposisi)
    });
    
  } catch (error) {
    logError('Create disposisi error:', error);
    
    // ✅ Handle specific Sequelize errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const constraintName = error.errors[0]?.path;
      
      if (constraintName === 'noDispo') {
        return res.status(409).json({ 
          success: false,
          message: 'Nomor disposisi sudah digunakan. Silakan ambil nomor baru.',
          errorType: 'DISPOSISI_NUMBER_EXISTS'
        });
      }
      
      if (constraintName === 'letterIn_id') {
        return res.status(409).json({ 
          success: false,
          message: 'Surat sudah didisposisikan',
          errorType: 'LETTER_ALREADY_DISPOSED'
        });
      }
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Data tidak valid: ' + error.errors.map(e => e.message).join(', '),
        errorType: 'VALIDATION_ERROR'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat disposisi.',
      error: error.message,
      errorType: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * GET ALL DISPOSISI
 * Enhanced with pagination and filtering
 */
exports.getAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      letterIn_id, 
      year,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};
    
    // Filter by letterIn_id if provided
    if (letterIn_id) {
      whereClause.letterIn_id = letterIn_id;
    }
    
    // Filter by year if provided
    if (year) {
      whereClause.tglDispo = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`]
      };
    }
    
    const { count, rows } = await disposisi.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      // include: [
      //   {
      //     model: letterIn,
      //     as: 'LetterIn',
      //     required: false
      //   }
      // ]
    });
    
    logInfo('Retrieved disposisi list:', {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      returned: rows.length
    });
    
    res.json({
      success: true,
      data: rows.map(formatDisposisiResponse),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalRows: count,
        rowsPerPage: parseInt(limit),
        hasNextPage: offset + parseInt(limit) < count,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    logError('Get all disposisi error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data disposisi.',
      error: error.message 
    });
  }
};

/**
 * GET DISPOSISI BY ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const foundDisposisi = await disposisi.findByPk(id, {
      // include: [
      //   {
      //     model: letterIn,
      //     as: 'LetterIn',
      //     required: false
      //   }
      // ]
    });

    if (!foundDisposisi) {
      return res.status(404).json({ 
        success: false,
        message: 'Disposisi tidak ditemukan' 
      });
    }

    logInfo('Retrieved disposisi by ID:', { id, noDispo: foundDisposisi.noDispo });
    
    res.json({
      success: true,
      data: formatDisposisiResponse(foundDisposisi)
    });
    
  } catch (error) {
    logError('Get disposisi by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data disposisi.',
      error: error.message 
    });
  }
};

/**
 * UPDATE DISPOSISI BY ID
 */
exports.updateById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Add update user ID if available
    if (req.user?.id) {
      updateData.updateUserId = req.user.id;
    }
    
    const foundDisposisi = await disposisi.findByPk(id);

    if (!foundDisposisi) {
      return res.status(404).json({ 
        success: false,
        message: 'Disposisi tidak ditemukan' 
      });
    }

    // ✅ Check if updating noDispo and it conflicts
    if (updateData.noDispo && updateData.noDispo !== foundDisposisi.noDispo) {
      const existingDisposisi = await disposisi.findOne({
        where: { 
          noDispo: updateData.noDispo,
          id: { [Op.ne]: id } // Exclude current record
        }
      });
      
      if (existingDisposisi) {
        return res.status(409).json({
          success: false,
          message: `Nomor disposisi ${updateData.noDispo} sudah digunakan.`,
          errorType: 'DISPOSISI_NUMBER_EXISTS'
        });
      }
    }

    await foundDisposisi.update(updateData);
    
    logSuccess('Disposisi updated:', { id, noDispo: foundDisposisi.noDispo });
    
    res.json({
      success: true,
      message: 'Disposisi berhasil diperbarui',
      data: formatDisposisiResponse(foundDisposisi)
    });
    
  } catch (error) {
    logError('Update disposisi error:', error);
    res.status(400).json({ 
      success: false,
      message: 'Gagal memperbarui disposisi.',
      error: error.message 
    });
  }
};

/**
 * DELETE DISPOSISI BY ID
 */
exports.deleteById = async (req, res) => {
  try {
    const { id } = req.params;
    const foundDisposisi = await disposisi.findByPk(id);

    if (!foundDisposisi) {
      return res.status(404).json({ 
        success: false,
        message: 'Disposisi tidak ditemukan' 
      });
    }

    const deletedData = {
      id: foundDisposisi.id,
      noDispo: foundDisposisi.noDispo,
      letterIn_id: foundDisposisi.letterIn_id
    };

    await foundDisposisi.destroy();
    
    logSuccess('Disposisi deleted:', deletedData);
    
    res.json({ 
      success: true,
      message: `Disposisi nomor ${deletedData.noDispo} berhasil dihapus`,
      deletedData
    });
    
  } catch (error) {
    logError('Delete disposisi error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menghapus disposisi.',
      error: error.message 
    });
  }
};

/**
 * GET NEXT DISPOSISI NUMBER
 * ✅ FIXED: Always use MAX + 1 (sequential, no gap filling)
 */
exports.getNextNumber = async (req, res) => {
  try {
    logInfo('Getting next disposisi number...');
    
    // ✅ STRATEGY: Always get MAX + 1 (sequential numbering)
    const maxDisposisi = await disposisi.findOne({
      attributes: ['noDispo'],
      order: [['noDispo', 'DESC']],
      limit: 1
    });
    
    const maxNumber = maxDisposisi ? maxDisposisi.noDispo : 0;
    const nextNumber = maxNumber + 1;
    
    logSuccess('Next disposisi number calculated:', {
      maxExisting: maxNumber,
      nextNumber: nextNumber,
      strategy: 'sequential (max + 1)'
    });
    
    res.json({ 
      success: true,
      noDispo: nextNumber,
      maxExisting: maxNumber,
      strategy: 'sequential',
      message: `Nomor disposisi selanjutnya: ${nextNumber}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logError('Error getting next disposisi number:', error);
    
    // ✅ Fallback: Use timestamp-based number
    const currentYear = getCurrentYear();
    const fallbackNumber = parseInt(`${currentYear}${String(Date.now()).slice(-4)}`);
    
    logWarning('Using fallback number:', fallbackNumber);
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil nomor disposisi otomatis',
      error: error.message,
      fallback: {
        noDispo: fallbackNumber,
        note: 'Nomor fallback berdasarkan timestamp - harap verifikasi manual',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * CHECK LETTER DISPOSITION STATUS
 * ✅ FIXED: Better error handling and response format
 */
exports.checkLetterDisposition = async (req, res) => {
  try {
    const { letterIn_id } = req.params;
    
    logInfo('Checking letter disposition for:', letterIn_id);
    
    if (!letterIn_id || letterIn_id.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Letter ID is required',
        errorType: 'MISSING_LETTER_ID'
      });
    }
    
    // ✅ Get all dispositions for this letter
    const existingDispositions = await disposisi.findAll({
      where: { letterIn_id: letterIn_id.trim() },
      order: [['createdAt', 'DESC']],
      // include: [
      //   {
      //     model: letterIn,
      //     as: 'LetterIn',
      //     required: false,
      //     attributes: ['id', 'noSurat', 'suratDari', 'perihal', 'noAgenda', 'tahun']
      //   }
      // ]
    });
    
    const isDisposed = existingDispositions.length > 0;
    const formattedDispositions = existingDispositions.map(formatDisposisiResponse);
    
    logInfo(`Letter ${letterIn_id} disposition status:`, {
      isDisposed,
      count: existingDispositions.length,
      dispositionIds: existingDispositions.map(d => d.id)
    });
    
    res.json({
      success: true,
      isDisposed,
      letterIn_id: letterIn_id.trim(),
      dispositions: formattedDispositions,
      count: existingDispositions.length,
      message: isDisposed ? 
        `Surat sudah didisposisi ${existingDispositions.length} kali` : 
        'Surat belum pernah didisposisi',
      lastDisposition: isDisposed ? formattedDispositions[0] : null
    });
    
  } catch (error) {
    logError('Check letter disposition error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memeriksa status disposisi: ' + error.message,
      errorType: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * GET DISPOSISI STATISTICS
 * New function for analytics
 */
exports.getStats = async (req, res) => {
  try {
    const { year = getCurrentYear() } = req.query;
    
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const [
      totalCount,
      yearlyCount,
      monthlyCount,
      todayCount
    ] = await Promise.all([
      disposisi.count(),
      disposisi.count({
        where: {
          tglDispo: {
            [Op.between]: [startDate, endDate]
          }
        }
      }),
      disposisi.count({
        where: {
          tglDispo: {
            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      disposisi.count({
        where: {
          tglDispo: {
            [Op.gte]: new Date().toDateString()
          }
        }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalCount,
        yearly: yearlyCount,
        monthly: monthlyCount,
        today: todayCount,
        year: parseInt(year)
      }
    });
    
  } catch (error) {
    logError('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik disposisi',
      error: error.message
    });
  }
};