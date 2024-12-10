const path = require('path');
const fs = require('fs');
const Nota = require('../models/nota');
const {Op, fn, col} = require("sequelize");
const {stringToBoolean} = require('../utils/util');
const {StatusCodes} = require('http-status-codes');
const ExcelJS = require('exceljs');
const Department = require('../models/department');

exports.createNota = async (req, res, next) => {
    const {
        spareCounts,
        date,
        subject,
        to,
        departmentId,
        classificationId,
        levelId,
        attachmentCount,
        description
    } = req.body;
    const file = req.file;

    try {
        if (spareCounts) {
            const date = new Date(req.body.date);

            const startToday = new Date();
            startToday.setHours(0, 0, 0, 0);

            const endToday = new Date();
            endToday.setHours(23, 59, 59, 999999);

            const yesterday = new Date(startToday);
            yesterday.setDate(startToday.getDate() - 1);

            date.setHours(23, 59, 59)
            if (date.toDateString() === yesterday.toDateString()) {
                const notaToday = await Nota.findOne({
                    where: {
                        date: {
                            [Op.and]: {
                                [Op.gte]: startToday,
                                [Op.lte]: endToday,
                            }
                        }
                    }
                });

                if (notaToday) {
                    return res.status(StatusCodes.BAD_REQUEST).json({message: 'Surat untuk tanggal hari ini sudah ada. Tidak bisa menambah surat untuk tanggal kemarin.'});
                }
            }

            const notas = Array.from({length: spareCounts}, () => ({
                date: date,
                userId: req.payload.userId,
            }));

            // Bulk create notas
            const createdNotas = await Nota.bulkCreate(notas);

            // Return response dengan data yang dibuat
            return res.status(StatusCodes.CREATED).json({
                message: 'Spare Surat berhasil ditambahkan.',
                createdNotas
            });
        } else {
            if (!classificationId || !levelId) {
                return res.status(StatusCodes.BAD_REQUEST).json({message: 'Please enter all mandatory field'});
            }

            const nota = await Nota.create({
                date: date,
                userId: req.payload.userId,
                departmentId: departmentId,
                subject: subject,
                to: to,
                classificationId: classificationId,
                levelId: levelId,
                attachmentCount: attachmentCount < 0 ? 0 : attachmentCount,
                description: description,
                filename: file ? file.originalname : null,
                filePath: file ? path.join('uploads', file.filename) : null,
            })
            return res.status(StatusCodes.CREATED).json(nota)
        }
    } catch (error) {
        next(error)
    }
}

exports.getAllNota = async (req, res, next) => {
    const {start, end, subject, to, reserved, recent} = req.query
    const filterConditions = {}

    if (reserved) {
        if (!req.payload.isAdmin) {
            delete filterConditions.userId
        }
        filterConditions.reserved = {
            [Op.eq]: stringToBoolean(reserved),
        }
    }
    if (start) {
        filterConditions.date = {
            [Op.gte]: new Date(start),
        }
    }
    if (end) {
        filterConditions.date = {
            ...filterConditions.date,
            [Op.lte]: new Date(end),
        }
    }

    if (subject) {
        filterConditions.subject = {
            [Op.and]: [
                fn('LOWER', col('subject')), {
                    [Op.like]: `%${subject.toLowerCase()}%`
                }
            ]
        };
    }
    if (to) {
        filterConditions.to = {
            [Op.and]: [
                fn('LOWER', col('to')), {
                    [Op.like]: `%${to.toLowerCase()}%`
                }
            ]
        };
    }
    if (recent) {
        const current = new Date();

        filterConditions.createdAt = {
            [Op.lte]: current,
            [Op.gte]: new Date(current - recent * 24 * 60 * 60 * 1000),
        };
    }
    console.log(filterConditions)

    try {
        const {count, rows} = await Nota.findAndCountAll({
            attributes: {exclude: ['filePath']},
            where: filterConditions,
            order: [
                ['number', 'DESC'],
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Nota not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getNotaById = async (req, res, next) => {
    const id = req.params.id
    try {
        if (!req.payload.isAdmin) {
            return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Hanya bisa di akses oleh ADMIN'})
        }
        const nota = await Nota.findByPk(id, {
            attributes: {exclude: ['filePath']}
        })
        if (!nota) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Not found'})
        }
        return res.json(nota)
    } catch (error) {
        next(error)
    }
}

// Controller untuk mengunduh file surat
exports.downloadNotaFile = async (req, res, next) => {
    const {id} = req.params;

    try {
        if (!req.payload.isAdmin) {
            return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Hanya bisa di akses oleh ADMIN'})
        }

        const nota = await Nota.findByPk(id);

        if (!nota) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Nota not found'});
        }

        // Cek apakah filePath ada
        if (nota.filePath) {
            const filePath = path.join(__dirname, '..', nota.filePath); // Mengambil path file dari database

            // Cek apakah file tersebut ada di filesystem
            if (fs.existsSync(filePath)) {
                // Set header untuk mendownload file dengan nama file dari database
                res.setHeader('Content-Disposition', `attachment; filename="${nota.filename}"`);

                return res.sendFile(filePath); // Menggunakan res.download untuk mengirim file
            } else {
                return res.status(StatusCodes.NOT_FOUND).json({message: 'File not found on server'});
            }
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'No file attached to this nota'});
        }
    } catch (error) {
        next(error);
    }
};

exports.updateNotaById = async (req, res, next) => {
    const MAX_UPDATE_DAYS = 20;

    const id = req.params.id;
    const {subject, to, classificationId, levelId, attachmentCount, description} = req.body;
    const file = req.file;

    try {
        const nota = await Nota.findByPk(id);

        if (!nota) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Nota not found'});
        }

        const createdAt = new Date(nota.createdAt)
        const now = new Date()
        const diff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        if (diff > MAX_UPDATE_DAYS) {
            return res.status(StatusCodes.FORBIDDEN).json({message: `Cannot update nota after ${MAX_UPDATE_DAYS} days of creation`})
        }

        const updatedData = {
            subject: subject,
            to: to,
            reserved: true,
            userId: req.payload.userId,
            classificationId: classificationId,
            levelId: levelId,
            attachmentCount: attachmentCount,
            description: description,
        };

        if (file) {
            if (nota.filePath) {
                fs.unlink(path.join(__dirname, '..', nota.filePath), (err) => {
                    if (err) {
                        console.error("Gagal menghapus file lama:", err);
                    }
                });
            }

            // Update dengan file baru
            updatedData.filename = file.originalname;
            updatedData.filePath = path.join('uploads', file.filename);
        }

        await nota.update(updatedData);
        return res.json(nota);
    } catch (error) {
        next(error);
    }
};

exports.deleteNotaById = async (req, res, next) => {
    const id = req.params.id;

    try {
        if (!req.payload.isAdmin) {
            return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Hanya bisa di akses oleh ADMIN'})
        }
        const nota = await Nota.findByPk(id);

        if (!nota) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Nota not found'})
        }

        // Cek apakah filePath ada
        if (nota.filePath) {
            const filePath = path.join(__dirname, '..', nota.filePath);


            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, async (err) => {
                    if (err) {
                        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                            message: 'Failed to delete file',
                            error: err
                        });
                    }
                    await nota.update(
                        {
                            subject: null,
                            to: null,
                            filename: null,
                            filePath: null,
                            reserved: false,
                            userId: null,
                        },
                    );

                    return res.json({message: 'File and record deleted successfully'});
                });
            } else {
                return res.status(StatusCodes.NOT_FOUND).json({message: 'File not found on server'});
            }
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'No file attached to this nota'});
        }
    } catch (error) {
        next(error)
    }
}

exports.deleteAllNota = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (!req.payload.isAdmin) {
            return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Hanya bisa di akses oleh ADMIN'})
        }
        if (truncate) {
            const count = await Nota.destroy({
                truncate: truncate,
            })
            return res.status(StatusCodes.NO_CONTENT).send();
        } else {
            return res.json({message: 'Do Nothing'})
        }
    } catch (error) {
        next(error)
    }
}

exports.exportNota = async (req, res) => {
    try {
        const {startDate, endDate} = req.query;

        // Validasi input
        if (!startDate || !endDate) {
            return res.status(400).json({
                message: 'Tanggal harus diisi.',
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59);

        // Query ke database berdasarkan filter tanggal dan bidang
        const nota = await Nota.findAll({
            where: {
                date: {
                    [Op.between]: [start, end],
                },
                reserved: 1,
            },
            order: [['number', 'ASC']],
        });

        // Cek jika tidak ada data
        if (nota.length === 0) {
            return res.status(404).json({
                message: 'Tidak ada data ditemukan untuk filter yang diberikan.',
            });
        }

        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        };

        // Buat workbook dan worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Surat');

        // Tambahkan header
        worksheet.columns = [
            // { header: 'ID', key: 'id', width: 36 },
            {header: 'Nomor Surat', key: 'number', width: 11},
            {header: 'Tanggal Surat', key: 'date', width: 20},
            {header: 'Kepada', key: 'to', width: 45},
            {header: 'Perihal', key: 'subject', width: 60},
        ];

        // Tambahkan data ke worksheet
        nota.forEach((data) => {
            worksheet.addRow({
                // id: letter.id,
                number: data.number,
                date: formatDate(data.date),
                to: data.to,
                subject: data.subject,
            });
        });

        // Set header untuk unduh file
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=Nota_Dinas.xlsx'
        );

        // Kirim file Excel ke response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error saat mengekspor data:', error);
        res.status(500).json({
            message: 'Terjadi kesalahan saat mengekspor data.',
        });
    }
};