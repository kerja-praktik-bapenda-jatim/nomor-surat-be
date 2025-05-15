const disposisi = require('../models/disposisi');

exports.create = async (req, res) => {
  try {
    const newdisposisi = await disposisi.create(req.body);
    res.status(201).json(newdisposisi);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
