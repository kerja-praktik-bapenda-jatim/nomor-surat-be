const disposisi = require('../models/disposisi');

exports.create = async (req, res) => {
  try {
    const { letterIn_id, noDispo, tglDispo, dispoKe, isiDispo } = req.body;
    
    console.log('📝 Creating disposisi:', { letterIn_id, noDispo, tglDispo, dispoKe, isiDispo });
    
    // ✅ VALIDASI: Cek apakah nomor disposisi sudah digunakan
    const existingDisposisi = await disposisi.findOne({
      where: { noDispo: noDispo }
    });
    
    if (existingDisposisi) {
      console.log('❌ Disposisi number already exists:', noDispo);
      return res.status(400).json({ 
        message: `Nomor disposisi ${noDispo} sudah digunakan. Silakan ambil nomor baru.` 
      });
    }
    
    // ✅ VALIDASI: Data required
    if (!letterIn_id || !noDispo || !tglDispo || !dispoKe || !isiDispo) {
      return res.status(400).json({ 
        message: 'Semua field disposisi harus diisi.' 
      });
    }
    
    // ✅ VALIDASI: Array dispoKe
    if (!Array.isArray(dispoKe) || dispoKe.length === 0) {
      return res.status(400).json({ 
        message: 'Tujuan disposisi harus dipilih minimal satu.' 
      });
    }
    
    // ✅ CREATE: Buat disposisi baru
    const newDisposisi = await disposisi.create({
      letterIn_id,
      noDispo,
      tglDispo: new Date(tglDispo),
      dispoKe, // Array akan di-stringify oleh Sequelize
      isiDispo: isiDispo.trim()
    });
    
    console.log('✅ Disposisi created successfully:', newDisposisi.id);
    console.log('📋 Details:', { 
      noDispo: newDisposisi.noDispo, 
      letterIn_id: newDisposisi.letterIn_id 
    });
    
    res.status(201).json(newDisposisi);
    
  } catch (error) {
    console.error('❌ Create disposisi error:', error);
    
    // ✅ Handle specific errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Nomor disposisi sudah digunakan. Silakan ambil nomor baru.' 
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Data tidak valid: ' + error.errors.map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ 
      message: 'Gagal membuat disposisi.',
      error: error.message 
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const disposisis = await disposisi.findAll();
    res.json(disposisis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const disposisi = await disposisi.findByPk(id);

    if (!disposisi) {
      return res.status(404).json({ message: 'disposisi not found' });
    }

    res.json(disposisi);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateById = async (req, res) => {
  try {
    const { id } = req.params;
    const disposisi = await disposisi.findByPk(id);

    if (!disposisi) {
      return res.status(404).json({ message: 'disposisi not found' });
    }

    await disposisi.update(req.body);
    res.json(disposisi);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteById = async (req, res) => {
  try {
    const { id } = req.params;
    const disposisi = await disposisi.findByPk(id);

    if (!disposisi) {
      return res.status(404).json({ message: 'disposisi not found' });
    }

    await disposisi.destroy();
    res.json({ message: 'disposisi deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ PERBAIKAN: Function getNextNumber di disposisiController.js

// ✅ PERBAIKAN: Function getNextNumber di disposisiController.js
exports.getNextNumber = async (req, res) => {
  try {
    console.log('🔢 Getting next disposisi number...');
    
    // ✅ UBAH: Hitung total count disposisi, bukan nomor terbesar
    const totalCount = await disposisi.count();
    
    // ✅ Next number = total count + 1 (auto increment)
    const nextNumber = totalCount + 1;
    
    console.log('📊 Total disposisi count:', totalCount);
    console.log('🎯 Next number will be:', nextNumber);
    
    res.json({ 
      success: true,
      noDispo: nextNumber,
      totalCount: totalCount,
      message: `Nomor disposisi selanjutnya: ${nextNumber}`
    });
    
  } catch (error) {
    console.error('❌ Error getting next disposisi number:', error);
    
    // ✅ Fallback: return a safe number based on timestamp
    const fallbackNumber = Date.now() % 100000;
    
    console.log('🔄 Using fallback number:', fallbackNumber);
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil nomor disposisi otomatis',
      error: error.message,
      fallback: {
        noDispo: fallbackNumber,
        note: 'Nomor fallback berdasarkan timestamp - harap verifikasi manual'
      }
    });
  }
};

// ✅ CHECK LETTER DISPOSITION STATUS
exports.checkLetterDisposition = async (req, res) => {
  try {
    const { letterIn_id } = req.params;
    
    console.log('🔍 Checking letter disposition for:', letterIn_id);
    
    if (!letterIn_id || letterIn_id.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Letter ID is required' 
      });
    }
    
    // ✅ Check if letter exists (optional, might not work if letterIn model not configured)
    let letterInfo = null;
    try {
      letterInfo = await letterIn.findByPk(letterIn_id, {
        attributes: ['id', 'noSurat', 'suratDari', 'perihal', 'noAgenda', 'tahun']
      });
      
      if (!letterInfo) {
        return res.status(404).json({
          success: false,
          message: `Surat dengan ID ${letterIn_id} tidak ditemukan`
        });
      }
    } catch (letterError) {
      console.log('⚠️ Could not verify letter existence:', letterError.message);
      // Continue anyway
    }
    
    // ✅ Get all dispositions for this letter
    const existingDispositions = await disposisi.findAll({
      where: { letterIn_id: letterIn_id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: letterIn,
          as: 'LetterIn',
          required: false,
          attributes: ['id', 'noSurat', 'suratDari', 'perihal']
        }
      ]
    });
    
    const isDisposed = existingDispositions.length > 0;
    const formattedDispositions = existingDispositions.map(formatDisposisiResponse);
    
    console.log(`📊 Letter ${letterIn_id} disposition status:`, {
      isDisposed,
      count: existingDispositions.length
    });
    
    res.json({
      success: true,
      isDisposed,
      letterIn_id,
      letter: letterInfo,
      dispositions: formattedDispositions,
      count: existingDispositions.length,
      message: isDisposed ? 
        `Surat sudah didisposisi ${existingDispositions.length} kali` : 
        'Surat belum pernah didisposisi'
    });
    
  } catch (error) {
    console.error('❌ Check letter disposition error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memeriksa status disposisi: ' + error.message
    });
  }
};