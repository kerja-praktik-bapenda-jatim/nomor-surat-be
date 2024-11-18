const path = require('path');
const fs = require('fs');
const Letter = require('../models/letter');
const {Op, fn, col} = require("sequelize");
const {stringToBoolean} = require('../utils/util');
const {StatusCodes} = require('http-status-codes');
const User = require('../models/user');
const ExcelJS = require('exceljs');
const Department = require('../models/department');

exports.createLetter = async (req, res, next) => {
    const {spareCounts, date, subject, to, departmentId} = req.body;
    const file = req.file;

    try {

        if (spareCounts) {
            if (!req.payload.isAdmin) {
                return res.status(StatusCodes.FORBIDDEN).json({message: 'Access denied. Admin privileges required to access this endpoint.'})
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

            if (!departmentId) {
                return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Bidang harus dipilih' });
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
            const letter = await Letter.create({
                date: date,
                userId: req.payload.userId,
                departmentId: req.payload.departmentId,
                subject: subject,
                to: to,
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
        const {count, rows} = await Letter.findAndCountAll({
            attributes: {exclude: ['filePath']},
            where: filterConditions,
            order: [
                ['number', 'DESC'],
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
            attributes: {exclude: ['filePath']}
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
    const id = req.params.id;
    const {subject, to} = req.body;
    const file = req.file;

    try {
        const letter = await Letter.findByPk(id);

        if (!letter) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Letter not found'});
        }

        const updatedData = {
            subject: subject,
            to: to,
            reserved: true,
            userId: req.payload.userId,
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
                            userId: null,
                            departmentId: req.payload.departmentId,
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
        const { startDate, endDate, departmentId } = req.query;

        // Validasi input
        if (!startDate || !endDate || !departmentId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Tanggal dan Bidang harus diisi.',
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59);

        // Query ke database berdasarkan filter tanggal dan bidang
        const letters = await Letter.findAll({
            where: {
                departmentId,
                date: {
                    [Op.between]: [start, end],
                },
                reserved: 1,
            },
            order: [['number', 'ASC']],
        });

        const department = await Department.findOne({
            where: {
                id: departmentId,
            },
        });

        // Cek jika tidak ada data
        if (letters.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
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
            { header: 'Nomor Surat', key: 'number', width: 11 },
            { header: 'Tanggal Surat', key: 'date', width: 20 },
            { header: 'Kepada', key: 'to', width: 45 },
            { header: 'Perihal', key: 'subject', width: 60 },
            { header: 'Pembuat', key: 'userId', width: 36 },
            { header: 'Bidang', key: 'departmentName', width: 15 },
        ];

        // Tambahkan data ke worksheet
        letters.forEach((letter) => {
            worksheet.addRow({
                // id: letter.id,
                number: letter.number,
                date: formatDate(letter.date),
                userId: letter.userId,
                departmentName: department.name,
                to: letter.to,
                subject: letter.subject,
            });
        });

        // Set header untuk unduh file
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=Surat-Keluar.xlsx'
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