const AgendaSurat = require('../models/agenda');
const LetterIn = require('../models/letterIn');

// Helper function untuk convert timezone
const convertToLocalTimezone = (dateString, timeString = null) => {
  if (!dateString) return null;
  
  try {
    // Jika ada time, gabungkan dengan date
    if (timeString) {
      const combinedDateTime = `${dateString}T${timeString}`;
      const date = new Date(combinedDateTime);
      
      // Convert ke timezone lokal (WIB)
      const localDate = new Date(date.getTime() + (7 * 60 * 60 * 1000)); // +7 jam untuk WIB
      return localDate.toISOString().split('T')[0]; // Return YYYY-MM-DD
    }
    
    // Untuk date saja
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting timezone:', error);
    return dateString; // Return original jika error
  }
};

exports.create = async (req, res) => {
  try {
    console.log('CREATE - Request body:', req.body);
    
    // Handle timezone conversion untuk date
    const processedData = {
      ...req.body,
      // Convert tanggal dari frontend format ke database format
      tglMulai: req.body.tglMulai ? new Date(req.body.tglMulai).toISOString().split('T')[0] : null,
      tglSelesai: req.body.tglSelesai ? new Date(req.body.tglSelesai).toISOString().split('T')[0] : null,
    };
    
    console.log('CREATE - Processed data:', processedData);
    
    const newData = await AgendaSurat.create(processedData);
    
    // Update field agenda di LetterIn menjadi true jika agenda berhasil dibuat
    if (newData.letterIn_id) {
      try {
        await LetterIn.update(
          { agenda: true },
          { where: { id: newData.letterIn_id } }
        );
        console.log('CREATE - LetterIn updated successfully');
      } catch (updateErr) {
        console.error('CREATE - Error updating LetterIn:', updateErr);
      }
    }
    
    res.status(201).json(newData);
  } catch (err) {
    console.error('CREATE - Error:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    console.log('GETALL - Starting...');
    
    const data = await AgendaSurat.findAll({
      include: [
        {
          model: LetterIn,
          required: false,
          attributes: ['id', 'perihal', 'surat_dari', 'no_surat']
        }
      ]
    });
    
    // Format tanggal untuk frontend
    const formattedData = data.map(item => {
      const plainItem = item.toJSON();
      return {
        ...plainItem,
        // Pastikan tanggal dalam format yang benar untuk frontend
        tglMulai: plainItem.tglMulai ? new Date(plainItem.tglMulai).toISOString().split('T')[0] : null,
        tglSelesai: plainItem.tglSelesai ? new Date(plainItem.tglSelesai).toISOString().split('T')[0] : null,
      };
    });
    
    console.log('GETALL - Found records:', formattedData.length);
    res.json(formattedData);
  } catch (err) {
    console.error('GETALL - Error:', {
      message: err.message,
      name: err.name,
      sql: err.sql || 'No SQL',
      stack: err.stack
    });
    res.status(500).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : 'Internal server error'
    });
  }
};

exports.getById = async (req, res) => {
  try {
    console.log('GETBYID - ID:', req.params.id);
    
    const data = await AgendaSurat.findByPk(req.params.id, {
      include: [
        {
          model: LetterIn,
          required: false,
          attributes: ['id', 'perihal', 'surat_dari', 'no_surat']
        }
      ]
    });
    
    if (!data) {
      console.log('GETBYID - Not found');
      return res.status(404).json({ message: 'AgendaSurat not found' });
    }
    
    // Format tanggal untuk frontend
    const formattedData = {
      ...data.toJSON(),
      tglMulai: data.tglMulai ? new Date(data.tglMulai).toISOString().split('T')[0] : null,
      tglSelesai: data.tglSelesai ? new Date(data.tglSelesai).toISOString().split('T')[0] : null,
    };
    
    console.log('GETBYID - Found:', data.id);
    res.json(formattedData);
  } catch (err) {
    console.error('GETBYID - Error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteById = async (req, res) => {
  try {
    console.log('DELETE - ID:', req.params.id);
    const data = await AgendaSurat.findByPk(req.params.id);
    
    if (!data) {
      console.log('DELETE - Not found');
      return res.status(404).json({ message: 'AgendaSurat not found' });
    }
    
    const letterInId = data.letterIn_id;
    console.log('DELETE - letterIn_id:', letterInId);
    
    // Hapus agenda
    await data.destroy();
    console.log('DELETE - Agenda destroyed');
    
    // Update field agenda di LetterIn menjadi false
    if (letterInId) {
      try {
        const updateResult = await LetterIn.update(
          { agenda: false },
          { where: { id: letterInId } }
        );
        console.log('DELETE - LetterIn update result:', updateResult);
      } catch (updateErr) {
        console.error('DELETE - Error updating LetterIn:', updateErr);
      }
    }
    
    res.json({ message: 'AgendaSurat deleted successfully' });
  } catch (err) {
    console.error('DELETE - Error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAll = async (req, res) => {
  const { truncate } = req.body;

  try {
    console.log('DELETEALL - Truncate:', truncate);
    
    if (truncate) {
      try {
        const updateResult = await LetterIn.update(
          { agenda: false },
          { where: { agenda: true } }
        );
        console.log('DELETEALL - LetterIn update result:', updateResult);
      } catch (updateErr) {
        console.error('DELETEALL - Error updating LetterIn:', updateErr);
      }
      
      await AgendaSurat.destroy({ truncate: true });
      console.log('DELETEALL - Truncated successfully');
      return res.json({ message: 'All AgendaSurat data truncated.' });
    }

    const agendas = await AgendaSurat.findAll({
      attributes: ['letterIn_id'],
      where: {}
    });
    
    const letterInIds = agendas.map(agenda => agenda.letterIn_id).filter(id => id);
    console.log('DELETEALL - letterInIds to update:', letterInIds);
    
    const deleted = await AgendaSurat.destroy({ where: {} });
    console.log('DELETEALL - Deleted count:', deleted);
    
    if (letterInIds.length > 0) {
      try {
        const updateResult = await LetterIn.update(
          { agenda: false },
          { where: { id: letterInIds } }
        );
        console.log('DELETEALL - LetterIn update result:', updateResult);
      } catch (updateErr) {
        console.error('DELETEALL - Error updating LetterIn:', updateErr);
      }
    }
    
    res.json({ message: `${deleted} AgendaSurat data deleted.` });
  } catch (err) {
    console.error('DELETEALL - Error:', err);
    res.status(500).json({ message: err.message });
  }
};