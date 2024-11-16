const path = require('path');
const fs = require('fs');
const Nota = require('../models/nota');
const {Op, fn, col} = require("sequelize");
const {stringToBoolean} = require('../utils/util');
const {StatusCodes} = require('http-status-codes');
const User = require('../models/user');

exports.createNota = async (req, res, next) => {
    const {spareCounts, date, subject, to} = req.body;
    const file = req.file;

    try {

        if (spareCounts) {
            if (!req.payload.isAdmin) {
                return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Admin privileges required to access this endpoint.'})
            }

            // Konversi date dari request body menjadi objek Date
            const date = new Date(req.body.date); // Pastikan ini adalah objek Date

            // Buat tanggal hari ini dan kemarin
            const startToday = new Date();
            startToday.setHours(0, 0, 0, 0);  // Set awal hari ini ke 00:00:00

            const endToday = new Date();
            endToday.setHours(23, 59, 59, 999999); // Hari berikutnya untuk batas akhir hari ini

            const yesterday = new Date(startToday);
            yesterday.setDate(startToday.getDate() - 1);
            // Jika `date` adalah kemarin, cek apakah ada surat yang dibuat hari ini
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
                departmentId: null,
            }));

            // Bulk create notas
            const createdNotas = await Nota.bulkCreate(notas);

            // Return response dengan data yang dibuat
            return res.status(StatusCodes.CREATED).json({
                message: 'Spare Surat berhasil ditambahkan.',
                createdNotas
            });
        } else {
            const nota = await Nota.create({
                date: date,
                userId: req.payload.userId,
                subject: subject,
                to: to,
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
    console.log(req.query)
    const {start, end, subject, to, reserved, recent} = req.query
    const filterConditions = {}

    if (!req.payload.isAdmin) {
        filterConditions.userId = req.payload.userId
    }
    if (reserved) {
        if (!req.payload.isAdmin) {
            delete filterConditions.userId
            filterConditions.departmentId = req.payload.departmentId
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
        // Cari surat berdasarkan id
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
    const id = req.params.id;
    const {subject, to} = req.body;
    const file = req.file;

    try {
        const nota = await Nota.findByPk(id);

        if (!nota) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Nota not found'});
        }

        const updatedData = {
            subject: subject,
            to: to,
            reserved: true,
            userId: req.payload.userId,
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
                            departmentId: req.payload.departmentId
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