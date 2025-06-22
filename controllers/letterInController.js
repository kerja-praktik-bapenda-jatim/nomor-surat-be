const path = require('path');
const fs = require('fs');
const LetterIn = require('../models/letterIn');
const Classification = require('../models/classification');
const LetterType = require('../models/letterType');
const { Op } = require('sequelize');
const { StatusCodes } = require('http-status-codes');
const { stringToBoolean } = require('../utils/util');
const Agenda = require('../models/agenda');
const { sequelize } = require('../config/db');
const ExcelJS = require('exceljs');

exports.create = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            noSurat, suratDari, perihal, tglSurat, diterimaTgl,
            langsungKe, ditujukanKe, agenda, classificationId, letterTypeId,
            tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, acara, catatan
        } = req.body;

        const file = req.file;
        if (!file) {
            await transaction.rollback();
            return res.status(400).json({ message: 'File is required' });
        }

        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            await transaction.rollback();
            return res.status(400).json({
                message: `File terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB`
            });
        }

        const newData = await LetterIn.create({
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
            filename: file.originalname,
            filePath: file.filename
        }, { transaction });

        const agendaFlag = stringToBoolean(agenda);

        if (agendaFlag === true) {
            if (!tglMulai || !tglSelesai || !jamMulai || !jamSelesai || !tempat || !acara) {
                await transaction.rollback();
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                return res.status(400).json({
                    message: 'Data agenda tidak lengkap. Field tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, dan acara wajib diisi.'
                });
            }

            const agendaData = {
                tglMulai: new Date(tglMulai),
                tglSelesai: new Date(tglSelesai),
                jamMulai,
                jamSelesai,
                tempat,
                acara,
                catatan: catatan || '',
                letterIn_id: newData.id
            };

            await Agenda.create(agendaData, { transaction });
        }

        await transaction.commit();

        const result = await LetterIn.findByPk(newData.id, {
            include: [
                { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
                { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
                { model: Agenda, as: 'Agenda' }
            ]
        });

        res.status(StatusCodes.CREATED).json(result);

    } catch (err) {
        await transaction.rollback();
        console.error('Create letter error:', err);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
    }
};

exports.getNextAgendaNumber = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        const lastLetter = await LetterIn.findOne({
            where: { tahun: currentYear },
            order: [['noAgenda', 'DESC']]
        });

        const nextAgendaNumber = lastLetter ? lastLetter.noAgenda + 1 : 1;
        const formattedAgenda = `${currentYear}/${nextAgendaNumber}`;

        res.status(StatusCodes.OK).json({
            tahun: currentYear,
            noAgenda: nextAgendaNumber,
            formatted: formattedAgenda
        });

    } catch (err) {
        console.error('Get next agenda error:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Gagal mendapatkan nomor agenda',
            error: err.message
        });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const data = await LetterIn.findByPk(req.params.id);

        if (!data) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
        }

        if (data.filePath) {
            const filePath = path.join(process.env.UPLOAD_DIR, data.filePath);

            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
                return res.sendFile(filePath);
            } else {
                return res.status(StatusCodes.NOT_FOUND).json({ message: 'File tidak ditemukan.' });
            }
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Tidak ada file pada surat ini.' });
        }
    } catch (err) {
        console.error('Download file error:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
};

exports.updateById = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            noSurat, suratDari, perihal, tglSurat, diterimaTgl,
            langsungKe, ditujukanKe, agenda, classificationId, letterTypeId,
            tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, acara, catatan
        } = req.body;

        const file = req.file;
        const data = await LetterIn.findByPk(req.params.id, { transaction });

        if (!data) {
            await transaction.rollback();
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
        }

        const updatedData = {
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
            const maxSize = 2 * 1024 * 1024;
            if (file.size > maxSize) {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                await transaction.rollback();
                return res.status(400).json({
                    message: `File terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB`
                });
            }

            if (data.filePath) {
                const oldFilePath = path.join(process.env.UPLOAD_DIR, data.filePath);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            updatedData.filename = file.originalname;
            updatedData.filePath = file.filename;
        }

        await data.update(updatedData, { transaction });

        const agendaFlag = stringToBoolean(agenda);

        if (agendaFlag === true) {
            if (!tglMulai || !tglSelesai || !jamMulai || !jamSelesai || !tempat || !acara) {
                await transaction.rollback();
                return res.status(400).json({
                    message: 'Data agenda tidak lengkap. Field tglMulai, tglSelesai, jamMulai, jamSelesai, tempat, dan acara wajib diisi.'
                });
            }

            const existingAgenda = await Agenda.findOne({
                where: { letterIn_id: req.params.id },
                transaction
            });

            const agendaData = {
                tglMulai: new Date(tglMulai),
                tglSelesai: new Date(tglSelesai),
                jamMulai,
                jamSelesai,
                tempat,
                acara,
                catatan: catatan || '',
                letterIn_id: req.params.id
            };

            if (existingAgenda) {
                await existingAgenda.update(agendaData, { transaction });
            } else {
                await Agenda.create(agendaData, { transaction });
            }
        } else {
            await Agenda.destroy({
                where: { letterIn_id: req.params.id },
                transaction
            });
        }

        await transaction.commit();

        const result = await LetterIn.findByPk(data.id, {
            include: [
                { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
                { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
                { model: Agenda, as: 'Agenda' }
            ]
        });

        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        await transaction.rollback();
        console.error('Update letter error:', err);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Gagal mengupdate surat',
            error: err.message
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            perihal,
            suratDari,
            classificationId,
            page = 1,
            limit = 10,
            order
        } = req.query;

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

        if (classificationId) {
            filterConditions.classificationId = classificationId;
        }

        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        let _order = "DESC";
        if (order === "asc") {
            _order = "ASC";
        }

        const { count, rows } = await LetterIn.findAndCountAll({
            where: filterConditions,
            include: [
                { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
                { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
                { model: Agenda, as: 'Agenda' }
            ],
            order: [
                ['noAgenda', _order]
            ],
            limit: limitNumber,
            offset: offset
        });

        const totalPages = Math.ceil(count / limitNumber);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        const paginationInfo = {
            currentPage: pageNumber,
            totalPages,
            totalRows: count,
            rowsPerPage: limitNumber,
            hasNextPage,
            hasPrevPage,
            nextPage: hasNextPage ? pageNumber + 1 : null,
            prevPage: hasPrevPage ? pageNumber - 1 : null
        };

        res.status(StatusCodes.OK).json({
            data: rows,
            pagination: paginationInfo,
            success: true
        });

    } catch (err) {
        console.error('Get letters error:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Gagal mengambil data surat masuk',
            error: err.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const data = await LetterIn.findByPk(req.params.id, {
            include: [
                { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
                { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
                { model: Agenda, as: 'Agenda' }
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

exports.deleteById = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const data = await LetterIn.findByPk(req.params.id, { transaction });

        if (!data) {
            await transaction.rollback();
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'LetterIn not found' });
        }

        let fileDeleted = false;

        if (data.filePath) {
            const filePath = path.join(process.env.UPLOAD_DIR, data.filePath);

            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    fileDeleted = true;
                } catch (err) {
                    console.error('Failed to delete file:', err);
                    await transaction.rollback();
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                        message: 'Gagal menghapus file.',
                        error: err.message,
                    });
                }
            }
        }

        const deletedAgendaCount = await Agenda.destroy({
            where: { letterIn_id: req.params.id },
            transaction
        });

        await data.destroy({ transaction });

        await transaction.commit();

        res.status(StatusCodes.OK).json({
            message: fileDeleted
                ? 'File dan surat berhasil dihapus.'
                : 'Surat berhasil dihapus, file tidak ditemukan.',
            deletedAgendaCount
        });

    } catch (err) {
        await transaction.rollback();
        console.error('Delete error:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
};

exports.deleteAll = async (req, res) => {
    const { truncate } = req.query;

    try {
        if (truncate && stringToBoolean(truncate)) {
            await LetterIn.destroy({ truncate: true });
            return res.status(StatusCodes.NO_CONTENT).send();
        }

        res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid truncate parameter' });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
};

exports.exportLetters = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            classificationId
        } = req.query;

        const filterConditions = {};

        if (!startDate || !endDate) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Tanggal mulai dan tanggal akhir harus diisi.',
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        filterConditions.tglSurat = {
            [Op.between]: [start, end]
        };

        if (classificationId && classificationId.trim() !== '') {
            filterConditions.classificationId = classificationId;
        }

        const letters = await LetterIn.findAll({
            where: filterConditions,
            include: [
                { model: Classification, as: 'Classification', attributes: ['id', 'name'] },
                { model: LetterType, as: 'LetterType', attributes: ['id', 'name'] },
                { model: Agenda, as: 'Agenda' }
            ],
            order: [['tahun', 'ASC'], ['noAgenda', 'ASC']]
        });

        if (letters.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Tidak ada data ditemukan untuk filter yang diberikan.',
            });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Surat Masuk');

        worksheet.columns = [
            { header: 'Tahun', key: 'tahun', width: 10 },
            { header: 'Nomor Agenda', key: 'nomorAgenda', width: 15 },
            { header: 'Nomor Surat', key: 'noSurat', width: 20 },
            { header: 'Klasifikasi Surat', key: 'klasifikasiSurat', width: 30 },
            { header: 'Jenis Surat', key: 'jenisSurat', width: 20 },
            { header: 'Surat Dari', key: 'suratDari', width: 25 },
            { header: 'Perihal', key: 'perihal', width: 30 },
            { header: 'Tanggal Surat', key: 'tglSurat', width: 15 },
            { header: 'Tanggal Diterima', key: 'tglDiterima', width: 15 },
            { header: 'Langsung Ke', key: 'langsungKe', width: 15 },
            { header: 'Ditujukan Ke', key: 'ditujukanKe', width: 25 },
            { header: 'Agenda', key: 'agenda', width: 10 },
            { header: 'Ada File', key: 'adaFile', width: 12 },
            { header: 'Acara', key: 'acara', width: 25 },
            { header: 'Tempat', key: 'tempat', width: 20 },
            { header: 'Tanggal Acara', key: 'tglAcara', width: 15 },
            { header: 'Jam', key: 'jam', width: 15 }
        ];

        letters.forEach((letter) => {
            worksheet.addRow({
                tahun: letter.tahun || new Date().getFullYear(),
                nomorAgenda: letter.noAgenda || '',
                noSurat: letter.noSurat || '',
                klasifikasiSurat: letter.Classification ? letter.Classification.name : '',
                jenisSurat: letter.LetterType ? letter.LetterType.name : '',
                suratDari: letter.suratDari || '',
                perihal: letter.perihal || '',
                tglSurat: letter.tglSurat ? new Date(letter.tglSurat).toLocaleDateString('id-ID') : '',
                tglDiterima: letter.diterimaTgl ? new Date(letter.diterimaTgl).toLocaleDateString('id-ID') : '',
                langsungKe: letter.langsungKe ? 'Ya' : 'Tidak',
                ditujukanKe: letter.ditujukanKe || '',
                agenda: letter.agenda ? 'Ya' : 'Tidak',
                adaFile: letter.filename ? 'Ya' : 'Tidak',
                acara: letter.Agenda ? letter.Agenda.acara || '' : '',
                tempat: letter.Agenda ? letter.Agenda.tempat || '' : '',
                tglAcara: letter.Agenda && letter.Agenda.tglMulai ?
                    new Date(letter.Agenda.tglMulai).toLocaleDateString('id-ID') : '',
                jam: letter.Agenda && letter.Agenda.jamMulai && letter.Agenda.jamSelesai ?
                    `${letter.Agenda.jamMulai} - ${letter.Agenda.jamSelesai}` : ''
            });
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Surat-Masuk-${timestamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                message: 'Gagal mengekspor data',
                error: error.message
            });
        }
    }
};

exports.searchByAgenda = async (req, res) => {
    try {
        const { agendaNumber } = req.params;

        let tahun, noAgenda;

        if (agendaNumber.includes('/')) {
            [tahun, noAgenda] = agendaNumber.split('/');
        } else {
            tahun = new Date().getFullYear();
            noAgenda = agendaNumber;
        }

        const letter = await LetterIn.findOne({
            where: {
                tahun: parseInt(tahun),
                noAgenda: parseInt(noAgenda)
            },
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
                },
                {
                    model: Agenda,
                    as: 'Agenda'
                }
            ]
        });

        if (!letter) {
            return res.status(404).json({
                message: `Surat dengan nomor agenda ${tahun}/${noAgenda} tidak ditemukan`
            });
        }

        res.json(letter);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: error.message });
    }
};