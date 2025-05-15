const LetterIn = require('../models/letterIn');
const AgendaLetterIn = require('../models/agenda');

exports.create = async (req, res) => {
  try {
    const newData = await LetterIn.create(req.body);
    res.status(201).json(newData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await LetterIn.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'LetterIn not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteById = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'LetterIn not found' });
    await data.destroy();
    res.json({ message: 'letterIn deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAll = async (req, res) => {
  const { truncate } = req.body;

  try {
    await AgendaLetterIn.destroy({ where: {} });
    if (truncate) {
      await LetterIn.destroy({ truncate: true });
      return res.json({ message: 'All LetterIn data truncated.' });
    }

    const deleted = await LetterIn.destroy({ where: {} });
    res.json({ message: `${deleted} LetterIn data deleted.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
