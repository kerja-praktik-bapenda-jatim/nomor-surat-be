const LetterType = require('../models/letterType');
const { StatusCodes } = require('http-status-codes');

exports.createLetterType = async (req, res, next) => {
    const { name } = req.body;

    try {
        if (!name || name.trim().length < 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                message: 'Nama jenis surat minimal 3 karakter.' 
            });
        }

        const existing = await LetterType.findOne({ where: { name: name.trim() } });
        if (existing) {
            return res.status(StatusCodes.CONFLICT).json({ 
                message: 'Jenis surat sudah ada.' 
            });
        }

        const letterType = await LetterType.create({ name: name.trim() });
        return res.status(StatusCodes.CREATED).json(letterType);
    } catch (error) {
        next(error);
    }
};

exports.getAllLetterTypes = async (req, res, next) => {
    try {
        const types = await LetterType.findAll({ 
            order: [['id', 'ASC']] 
        });
        return res.json(types);
    } catch (error) {
        next(error);
    }
};

exports.getLetterTypeById = async (req, res, next) => {
    const { id } = req.params;

    try {
        const letterType = await LetterType.findOne({ where: { id } });

        if (!letterType) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                message: 'Jenis surat tidak ditemukan.' 
            });
        }

        return res.status(StatusCodes.OK).json(letterType);
    } catch (error) {
        next(error);
    }
};

exports.updateLetterTypeById = async (req, res, next) => {
    const { id, oldName, newName } = req.body;

    try {
        if (!newName || newName.trim().length < 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                message: 'Nama jenis surat minimal 3 karakter.' 
            });
        }

        const letterType = await LetterType.findOne({ where: { id } });

        if (!letterType) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                message: 'Jenis surat tidak ditemukan.' 
            });
        }

        if (letterType.name !== oldName) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                message: 'Nama lama tidak cocok dengan data.' 
            });
        }

        const existing = await LetterType.findOne({ where: { name: newName.trim() } });
        if (existing && existing.id !== Number(id)) {
            return res.status(StatusCodes.CONFLICT).json({ 
                message: 'Jenis surat dengan nama ini sudah ada.' 
            });
        }

        await letterType.update({ name: newName.trim() });

        return res.status(StatusCodes.OK).json({
            message: 'Jenis surat berhasil diperbarui.',
            data: letterType
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteLetterTypeById = async (req, res, next) => {
    const { id } = req.params;

    try {
        const letterType = await LetterType.findOne({ where: { id } });

        if (!letterType) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                message: 'Jenis surat tidak ditemukan.' 
            });
        }

        await LetterType.destroy({ where: { id } });

        return res.status(StatusCodes.OK).json({
            message: `Jenis surat "${letterType.name}" berhasil dihapus.`
        });
    } catch (error) {
        next(error);
    }
};