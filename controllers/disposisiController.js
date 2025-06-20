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

exports.getNextNumber = async (req, res) => {
  try {
    console.log('🔢 Getting next disposisi number...');
    
    // Cari nomor disposisi terbesar saat ini
    const lastDisposisi = await disposisi.findOne({
      order: [['noDispo', 'DESC']],
      attributes: ['noDispo']
    });

    // ✅ Increment dari nomor terakhir, atau mulai dari 1 jika belum ada
    const nextNumber = lastDisposisi ? lastDisposisi.noDispo + 1 : 1;
    
    console.log('📊 Last disposisi number:', lastDisposisi?.noDispo || 'none');
    console.log('🎯 Next number will be:', nextNumber);
    
    res.json({ noDispo: nextNumber });
  } catch (error) {
    console.error('❌ Error getting next disposisi number:', error);
    res.status(500).json({ 
      message: 'Failed to get next disposisi number',
      error: error.message 
    });
  }
};