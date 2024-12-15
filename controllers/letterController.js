const path = require('path');
const fs = require('fs');
const Letter = require('../models/letter');
const {Op, fn, col} = require("sequelize");
const {stringToBoolean, formatDate, currentTimestamp} = require('../utils/util');
const {StatusCodes} = require('http-status-codes');
const User = require('../models/user');
const ExcelJS = require('exceljs');
const Department = require('../models/department');
const Level = require('../models/level');
const Classification = require('../models/classification');

exports.createLetter = async (req, res, next) => {
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
    const file = req.file

    const isAdmin = req.payload.isAdmin

    try {
        if (spareCounts) {
            if (!isAdmin) {
                return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Admin privileges required to create bulk letter.'})
            }

            const date = new Date(req.body.date);

            const startToday = new Date();
            startToday.setHours(0, 0, 0, 0);

            const endToday = new Date();
            endToday.setHours(23, 59, 59, 999999);

            const yesterday = new Date(startToday);
            yesterday.setDate(startToday.getDate() - 1);

            date.setHours(23, 59, 59)
            if (date.toDateString() === yesterday.toDateString()) {
                const letterToday = await Letter.findOne({
                    where: {
                        date: {
                            [Op.and]: {
                                [Op.gte]: startToday,
                                [Op.lte]: endToday,
                            }
                        }
                    }
                });

                if (letterToday) {
                    return res.status(StatusCodes.BAD_REQUEST).json({message: 'Surat untuk tanggal hari ini sudah ada. Tidak bisa menambah surat untuk tanggal kemarin.'});
                }
            }

            const letters = Array.from({length: spareCounts}, () => ({
                date: date,
                userId: req.payload.userId,
                departmentId: departmentId,
            }));

            // Bulk create letters
            const createdLetters = await Letter.bulkCreate(letters);

            // Return response dengan data yang dibuat
            return res.status(StatusCodes.CREATED).json({
                message: 'Spare Surat berhasil ditambahkan.',
                createdLetters
            });
        } else {
            if (!classificationId || !levelId) {
                return res.status(StatusCodes.BAD_REQUEST).json({message: 'Please enter all mandatory field'});
            }

            const letter = await Letter.create({
                date: date,
                userId: req.payload.userId,
                departmentId: isAdmin ? departmentId : req.payload.departmentId,
                subject: subject,
                to: to,
                classificationId: classificationId,
                levelId: levelId,
                attachmentCount: attachmentCount < 0 ? 0 : attachmentCount,
                description: description,
                filename: file ? file.originalname : null,
                filePath: file ? path.join('uploads', file.filename) : null,
            })
            return res.status(StatusCodes.CREATED).json(letter)
        }
    } catch (error) {
        next(error)
    }
}

exports.getAllLetter = async (req, res, next) => {
    const {start, end, subject, to, reserved, recent} = req.query
    const filterConditions = {}

    if (!req.payload.isAdmin) {
        filterConditions.userId = req.payload.userId
    }
    if (reserved) {
        if (!req.payload.isAdmin) {
            delete filterConditions.userId
            filterConditions.departmentId = {
                [Op.or]: [
                    req.payload.departmentId,
                    null
                ]
            };
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
        const {count, rows} = await Letter.findAndCountAll({
            attributes: {exclude: ['filePath']},
            where: filterConditions,
            order: [
                ['number', 'DESC'],
            ],
            include: [
                {
                    model: Level,
                    attributes: ['name']
                },
                {
                    model: Classification,
                    attributes: ['name']
                }
            ]
        })
        if (count === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Letter not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getLetterById = async (req, res, next) => {
    const id = req.params.id
    try {
        const letter = await Letter.findByPk(id, {
            attributes: {exclude: ['filePath']},
            include: [
                {
                    model: Level,
                    attributes: ['name']
                },
                {
                    model: Classification,
                    attributes: ['name']
                }
            ]
        })
        if (!letter) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Not found'})
        }
        return res.json(letter)
    } catch (error) {
        next(error)
    }
}

// Controller untuk mengunduh file surat
exports.downloadLetterFile = async (req, res, next) => {
    const {id} = req.params;

    try {
        // Cari surat berdasarkan id
        const letter = await Letter.findByPk(id);

        if (!letter) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Letter not found'});
        }

        // Cek apakah filePath ada
        if (letter.filePath) {
            const filePath = path.join(__dirname, '..', letter.filePath); // Mengambil path file dari database

            // Cek apakah file tersebut ada di filesystem
            if (fs.existsSync(filePath)) {
                // Set header untuk mendownload file dengan nama file dari database
                res.setHeader('Content-Disposition', `attachment; filename="${letter.filename}"`);

                return res.sendFile(filePath); // Menggunakan res.download untuk mengirim file
            } else {
                return res.status(StatusCodes.NOT_FOUND).json({message: 'File not found on server'});
            }
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'No file attached to this letter'});
        }
    } catch (error) {
        next(error);
    }
};

exports.updateLetterById = async (req, res, next) => {
    const MAX_UPDATE_DAYS = 20;

    const id = req.params.id;
    const {subject, to, classificationId, levelId, attachmentCount, description} = req.body;
    const file = req.file;
    const isAdmin = req.payload.isAdmin

    try {
        const letter = await Letter.findByPk(id);

        if (!letter) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Letter not found'});
        }

        const now = new Date()
        if (letter.reserved) {
            const reservedAt = new Date(letter.lastReserved)
            const diff = Math.floor((now - reservedAt) / (1000 * 60 * 60 * 24));

            if (diff > MAX_UPDATE_DAYS) {
                return res.status(StatusCodes.FORBIDDEN).json({message: `Cannot update letter after ${MAX_UPDATE_DAYS} days of creation`})
            }
        }

        const updatedData = {
            subject: subject,
            to: to,
            reserved: true,
            departmentId: (letter.reserved && isAdmin) ? letter.departmentId : req.payload.departmentId,
            lastReserved: letter.reserved ? new Date(letter.lastReserved) : now,
            userId: (letter.reserved && isAdmin) ? letter.userId : req.payload.userId,
            classificationId: classificationId,
            levelId: levelId,
            attachmentCount: attachmentCount,
            description: description,
        };

        if (file) {
            if (letter.filePath) {
                fs.unlink(path.join(__dirname, '..', letter.filePath), (err) => {
                    if (err) {
                        console.error("Gagal menghapus file lama:", err);
                    }
                });
            }

            // Update dengan file baru
            updatedData.filename = file.originalname;
            updatedData.filePath = path.join('uploads', file.filename);
        }

        await letter.update(updatedData);
        return res.json(letter);
    } catch (error) {
        next(error);
    }
};

exports.deleteLetterById = async (req, res, next) => {
    const id = req.params.id;

    try {
        const letter = await Letter.findByPk(id);

        if (!letter) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Letter not found'})
        }

        // Cek apakah filePath ada
        if (letter.filePath) {
            const filePath = path.join(__dirname, '..', letter.filePath);


            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, async (err) => {
                    if (err) {
                        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                            message: 'Failed to delete file',
                            error: err
                        });
                    }
                    await letter.update(
                        {
                            subject: null,
                            to: null,
                            filename: null,
                            filePath: null,
                            reserved: false,
                            lastReserved: null,
                            userId: null,
                            departmentId: null,
                            classificationId: null,
                            levelId: null,
                            attachmentCount: null,
                            description: null,
                        },
                    );

                    return res.json({message: 'File and record deleted successfully'});
                });
            } else {
                return res.status(StatusCodes.NOT_FOUND).json({message: 'File not found on server'});
            }
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'No file attached to this letter'});
        }
    } catch (error) {
        next(error)
    }
}

exports.deleteAllLetter = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate) {
            const count = await Letter.destroy({
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

exports.exportLetter = async (req, res) => {
    try {
        const {startDate, endDate, departmentId, classificationId, recursive} = req.query;
        const isAdmin = req.payload.isAdmin
        const filterConditions = {}

        if (classificationId) {
            if (recursive && stringToBoolean(recursive)) {
                filterConditions.classificationId = {
                    [Op.like]: `${classificationId}%`
                }
            } else {
                filterConditions.classificationId = classificationId
            }
        }

        // Validasi input
        if (!startDate || !endDate) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Tanggal harus diisi.',
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59);

        filterConditions.date = {
            [Op.between]: [start, end],
        }
        filterConditions.reserved = 1

        if (isAdmin) {
            if (departmentId) {
                filterConditions.departmentId = departmentId;
            }
        } else {
            if (departmentId) {
                return res.status(StatusCodes.FORBIDDEN).json({message: 'User role can only export own department letter'})
            }
            filterConditions.departmentId = req.payload.departmentId;
        }

        // Query ke database berdasarkan filter tanggal dan bidang
        const letters = await Letter.findAll({
            where: filterConditions,
            order: [['number', 'ASC']],
            include: [
                {
                    model: User,
                    attributes: ['username'],
                    include: [
                        {
                            model: Department,
                            attributes: ['id', 'name'],
                        },
                    ],
                },
                {
                    model: Classification,
                    attributes: ['id', 'name'],
                },
                {
                    model: Level,
                    attributes: ['name']
                }
            ],
        });

        const filename = `Surat-Keluar_${currentTimestamp()}.xlsx`

        // Cek jika tidak ada data
        if (letters.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Tidak ada data ditemukan untuk filter yang diberikan.',
            });
        }

        // Buat workbook dan worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Surat');

        // Tambahkan header
        worksheet.columns = [
            // { header: 'ID', key: 'id', width: 36 },
            {header: 'Kode Klasifikasi', key: 'classificationId', width: 15},
            {header: 'Nama Klasifikasi', key: 'classificationName', width: 35},
            {header: 'Nomor Surat', key: 'number', width: 13},
            {header: 'Tanggal Surat', key: 'date', width: 18},
            {header: 'Kepada', key: 'to', width: 40},
            {header: 'Perihal', key: 'subject', width: 40},
            {header: 'Sifat', key: 'levelName', width: 15},
            {header: 'Kode Bidang', key: 'departmentId', width: 12},
            {header: 'Bidang', key: 'departmentName', width: 25},
            {header: 'Pembuat', key: 'userName', width: 36},
        ];

        // Tambahkan data ke worksheet
        letters.forEach((data) => {
            worksheet.addRow({
                // id: letter.id,
                number: data.number,
                date: formatDate(data.date),
                userName: data.User.username,
                departmentId: data.departmentId,
                departmentName: data.User.Department.name,
                to: data.to,
                subject: data.subject,
                levelName: data.Level.name,
                classificationId: data.Classification.id,
                classificationName: data.Classification.name
            });
        });

        // Set header untuk unduh file
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=${filename}`
        );

        // Kirim file Excel ke response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error saat mengekspor data:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Terjadi kesalahan saat mengekspor data.',
        });
    }
};
