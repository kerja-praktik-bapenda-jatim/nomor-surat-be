const LetterIn = require('../models/letterIn');
const AgendaLetterIn = require('../models/agenda');
const {StatusCodes} = require('http-status-codes');

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

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const {
        noAgenda,
        noSurat,
        suratDari,
        perihal,
        tglSurat,
        diterimaTgl,
        langsungKe,
        ditujukanKe,
        agenda,
        classificationId,
        letterTypeId
    } = req.body;

    const file = req.file;

    try {
        const letterIn = await LetterIn.findByPk(id);
        if (!letterIn) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Surat masuk tidak ditemukan' });
        }

        const updatedData = {
            noAgenda: noAgenda || letterIn.noAgenda,
            noSurat: noSurat || letterIn.noSurat,
            suratDari: suratDari || letterIn.suratDari,
            perihal: perihal || letterIn.perihal,
            tglSurat: tglSurat || letterIn.tglSurat,
            diterimaTgl: diterimaTgl || letterIn.diterimaTgl,
            langsungKe: parseBoolean(langsungKe, letterIn.langsungKe),
            ditujukanKe: ditujukanKe || letterIn.ditujukanKe,
            agenda: parseBoolean(agenda, letterIn.agenda),
            classificationId: classificationId || letterIn.classificationId,
            letterTypeId: letterTypeId || letterIn.letterTypeId
        };

        if (file) {
            updatedData.upload = file.path;
        }

        await letterIn.update(updatedData);
        await letterIn.reload(); // refresh data

        return res.status(StatusCodes.OK).json({
            message: 'Surat masuk berhasil diperbarui',
            data: letterIn
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

// Helper untuk parsing boolean string (e.g., 'true' / 'false' → true / false)
function parseBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return fallback;
}
