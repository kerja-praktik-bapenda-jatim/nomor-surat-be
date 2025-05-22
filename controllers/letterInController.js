const path = require('path');
const fs = require('fs');
const LetterIn = require('../models/letterIn');
const Classification = require('../models/classification');
const LetterType = require('../models/letterType');
const AgendaLetterIn = require('../models/agenda');
const { Op } = require('sequelize');
const { StatusCodes } = require('http-status-codes');
const { stringToBoolean } = require('../utils/util');

exports.create = async (req, res) => {
  try {
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
      filePath: file ? file.path : null,
      filename: file ? file.originalname : null
    });

    res.status(StatusCodes.CREATED).json(newData);
  } catch (err) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
  }
};

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
        {
          model: Classification,
          as: 'Classification',
          attributes: ['id', 'name']
        },
        {
          model: LetterType,
          as: 'LetterType',
          attributes: ['id', 'name']
        }
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
        {
          model: Classification,
          as: 'Classification',
          attributes: ['id', 'name']
        },
        {
          model: LetterType,
          as: 'LetterType',
          attributes: ['id', 'name']
        }
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

exports.downloadFile = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id);

    if (!data) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
    }

    if (!data.filePath) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'File not found' });
    }

    if (!fs.existsSync(data.filePath)) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
    res.sendFile(path.resolve(data.filePath));
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

exports.updateById = async (req, res) => {
  try {
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

    const data = await LetterIn.findByPk(req.params.id);
    if (!data) {
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

    if (file) {
      // Delete old file if exists
      if (data.filePath && fs.existsSync(data.filePath)) {
        fs.unlinkSync(data.filePath);
      }
      updatedData.filePath = file.path;
      updatedData.filename = file.originalname;
    }

    await data.update(updatedData);
    res.status(StatusCodes.OK).json(data);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

exports.deleteById = async (req, res) => {
  try {
    const data = await LetterIn.findByPk(req.params.id);
    if (!data) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
    }

    // Delete associated file if exists
    if (data.filePath && fs.existsSync(data.filePath)) {
      fs.unlinkSync(data.filePath);
    }

    await data.destroy();
    res.status(StatusCodes.OK).json({ message: 'LetterIn deleted successfully' });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

exports.deleteAll = async (req, res) => {
  const { truncate } = req.query;

  try {
    if (truncate && stringToBoolean(truncate)) {
      // Delete all files first
      const allLetters = await LetterIn.findAll();
      for (const letter of allLetters) {
        if (letter.filePath && fs.existsSync(letter.filePath)) {
          fs.unlinkSync(letter.filePath);
        }
      }

      await LetterIn.destroy({ truncate: true });
      return res.status(StatusCodes.NO_CONTENT).send();
    }

    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid truncate parameter' });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};