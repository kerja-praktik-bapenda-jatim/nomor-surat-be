const AgendaSurat = require('../models/agenda');

exports.create = async (req, res) => {
  try {
    const newData = await AgendaSurat.create(req.body);
    res.status(201).json(newData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await AgendaSurat.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await AgendaSurat.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'AgendaSurat not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteById = async (req, res) => {
  try {
    const data = await AgendaSurat.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'AgendaSurat not found' });
    await data.destroy();
    res.json({ message: 'AgendaSurat deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAll = async (req, res) => {
  const { truncate } = req.body;

  try {
    if (truncate) {
      await AgendaSurat.destroy({ truncate: true });
      return res.json({ message: 'All AgendaSurat data truncated.' });
    }

    const deleted = await AgendaSurat.destroy({ where: {} });
    res.json({ message: `${deleted} AgendaSurat data deleted.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
