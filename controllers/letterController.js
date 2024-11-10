const path = require('path');
const fs = require('fs');
const Letter = require('../models/letter');
const {Op, fn, col} = require("sequelize");
const {stringToBoolean} = require('../utils/util');
const {StatusCodes} = require('http-status-codes');

exports.createLetter = async (req, res, next) => {
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
                    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Surat untuk tanggal hari ini sudah ada. Tidak bisa menambah surat untuk tanggal kemarin.' });
                }
            }

            const letters = Array.from({length: spareCounts}, () => ({
                date: date,
                userId: req.payload.userId,
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
    if (reserved) {
        if (!req.payload.isAdmin) {
            delete filterConditions.userId
        }
        filterConditions.reserved = {
            [Op.eq]: stringToBoolean(reserved),
        }
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