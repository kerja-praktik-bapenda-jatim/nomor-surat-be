const path = require('path');
const fs = require('fs');
const Nota = require('../models/nota');
const {Op, fn, col} = require("sequelize");
const {
    stringToBoolean,
    formatDate,
    currentTimestamp,
    NULL_PLACEHOLDER,
    getEndTime,
    getStartDayInWIBAsUTC
} = require('../utils/util');
const {StatusCodes} = require('http-status-codes');
const ExcelJS = require('exceljs');
const Department = require('../models/department');
const Level = require("../models/level");
const Classification = require("../models/classification");
const User = require("../models/user");
const StorageLocation = require("../models/storageLocation");
const JraDescription = require("../models/jraDescription");
const RetentionPeriod = require("../models/retentionPeriod");
const Access = require("../models/access");

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
        description,
        documentIndexName,
        activeRetentionPeriodId,
        inactiveRetentionPeriodId,
        jraDescriptionId,
        storageLocationId,
        accessId
    } = req.body;
    const file = req.file;

    const isAdmin = req.payload.isAdmin

    try {
        if (spareCounts) {
            if (!isAdmin) {
                return res.status(StatusCodes.FORBIDDEN).json({message: 'Akses ditolak. Hanya dapat dibuat oleh admin.'})
            }

            let date = new Date(req.body.date);
            const startToday = getStartDayInWIBAsUTC();
            const endToday = getEndTime(startToday);
            const yesterday = new Date(startToday);
            yesterday.setDate(startToday.getDate() - 1);

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
                date: getEndTime(date),
                userId: req.payload.userId,
                departmentId: departmentId,
            }));

            // Bulk create notas
            const createdNotas = await Nota.bulkCreate(notas);

            // Return response dengan data yang dibuat
            return res.status(StatusCodes.CREATED).json({
                message: 'Spare nota dinas berhasil ditambahkan.',
                createdNotas
            });
        } else {
            if (!classificationId || !levelId) {
                return res.status(StatusCodes.BAD_REQUEST).json({message: 'Mohon isi semua kolom wajib!'});
            }

            let deptId = req.payload.departmentId
            if (isAdmin && departmentId) {
                deptId = departmentId
            }

            const nota = await Nota.create({
                date: date,
                userId: req.payload.userId,
                departmentId: deptId,
                subject: subject,
                to: to,
                classificationId: classificationId,
                levelId: levelId,
                attachmentCount: attachmentCount < 0 ? 0 : attachmentCount,
                description: description,
                filename: file ? file.originalname : null,
                filePath: file ? file.filename : null,
                documentIndexName: documentIndexName,
                activeRetentionPeriodId: activeRetentionPeriodId,
                inactiveRetentionPeriodId: inactiveRetentionPeriodId,
                jraDescriptionId: jraDescriptionId,
                storageLocationId: storageLocationId,
                accessId: accessId,
                updateUserId: req.payload.userId,
            })
            return res.status(StatusCodes.CREATED).json(nota)
        }
    } catch (error) {
        next(error)
    }
}

exports.getAllNota = async (req, res, next) => {
    const {start, end, subject, to, reserved, recent, order} = req.query
    const filterConditions = {}

    if (!req.payload.isAdmin) {
        filterConditions.departmentId = req.payload.departmentId
    }
    if (reserved) {
        if (!req.payload.isAdmin) {
            filterConditions.departmentId = {
                [Op.or]: [
                    req.payload.departmentId,
                    null,
                    ""
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

    let _order = "ASC"
    if (order === "desc") {
        _order = "DESC"
    }

    try {
        const {count, rows} = await Nota.findAndCountAll({
            attributes: {exclude: ['filePath']},
            where: filterConditions,
            order: [
                ['number', _order],
            ],
            include: [
                {
                    model: Level,
                    attributes: ['name']
                },
                {
                    model: Classification,
                    attributes: ['name']
                },
                {
                    model: StorageLocation,
                    attributes: ['name']
                },
                {
                    model: JraDescription,
                    attributes: ['name']
                },
                {
                    model: RetentionPeriod,
                    attributes: ['name'],
                    as: 'ActiveRetentionPeriod'
                },
                {
                    model: RetentionPeriod,
                    attributes: ['name'],
                    as: 'InactiveRetentionPeriod'
                },
                {
                    model: Access,
                    attributes: ['name'],
                },
                {
                    model: User,
                    attributes: ['username'],
                    as: 'CreateUser',
                },
                {
                    model: User,
                    attributes: ['username'],
                    as: 'UpdateUser',
                }
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
            attributes: {exclude: ['filePath']},
            include: [
                {
                    model: Level,
                    attributes: ['name']
                },
                {
                    model: Classification,
                    attributes: ['name']
                },
                {
                    model: StorageLocation,
                    attributes: ['name']
                },
                {
                    model: JraDescription,
                    attributes: ['name']
                },
                {
                    model: RetentionPeriod,
                    attributes: ['name'],
                    as: 'ActiveRetentionPeriod'
                },
                {
                    model: RetentionPeriod,
                    attributes: ['name'],
                    as: 'InactiveRetentionPeriod'
                },
                {
                    model: Access,
                    attributes: ['name'],
                },
                {
                    model: User,
                    attributes: ['username'],
                    as: 'CreateUser',
                },
                {
                    model: User,
                    attributes: ['username'],
                    as: 'UpdateUser',
                }
            ]
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
        const nota = await Nota.findByPk(id);

        if (!nota) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Nota not found'});
        }

        // Cek apakah filePath ada
        if (nota.filePath) {
            const filePath = path.join(process.env.UPLOAD_DIR, nota.filePath); // Mengambil path file dari database

            // Cek apakah file tersebut ada di filesystem
            if (fs.existsSync(filePath)) {
                // Set header untuk mendownload file dengan nama file dari database
                res.setHeader('Content-Disposition', `attachment; filename="${nota.filename}"`);

                return res.sendFile(filePath); // Menggunakan res.download untuk mengirim file
            } else {
                return res.status(StatusCodes.NOT_FOUND).json({message: 'File tidak ditemukan.'});
            }
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Tidak ada file pada nota dinas ini.'});
        }
    } catch (error) {
        next(error);
    }
};

exports.updateNotaById = async (req, res, next) => {
    const MAX_UPDATE_DAYS = 20;

    const id = req.params.id;
    const {
        subject,
        to,
        classificationId,
        levelId,
        attachmentCount,
        description,
        departmentId,
        documentIndexName,
        activeRetentionPeriodId,
        inactiveRetentionPeriodId,
        jraDescriptionId,
        storageLocationId,
        accessId,
    } = req.body;
    const file = req.file;
    const isAdmin = req.payload.isAdmin

    try {
        const nota = await Nota.findByPk(id);

        if (!nota) {
            return res.status(StatusCodes.NOT_FOUND).json({message: 'Nota not found'});
        }

        const now = new Date()
        if (nota.reserved) {
            const reservedAt = new Date(nota.lastReserved)
            const diff = Math.floor((now - reservedAt) / (1000 * 60 * 60 * 24));

            if (diff > MAX_UPDATE_DAYS) {
                return res.status(StatusCodes.FORBIDDEN).json({message: `Tidak dapat mengubah nota dinas setelah ${MAX_UPDATE_DAYS} hari.`})
            }
        }

        let deptId = null
        if (req.payload.isAdmin) {
            if (!nota.reserved) {
                deptId = departmentId
            } else {
                deptId = nota.departmentId
            }
        } else {
            deptId = (nota.reserved) ? nota.departmentId : req.payload.departmentId
        }

        const updatedData = {
            subject: subject,
            to: to,
            reserved: true,
            departmentId: deptId,
            lastReserved: nota.reserved ? new Date(nota.lastReserved) : now,
            userId: (nota.reserved) ? nota.userId : req.payload.userId,
            classificationId: classificationId,
            levelId: levelId,
            attachmentCount: attachmentCount || 0,
            description: description,
            documentIndexName: documentIndexName,
            activeRetentionPeriodId: activeRetentionPeriodId,
            inactiveRetentionPeriodId: inactiveRetentionPeriodId,
            jraDescriptionId: jraDescriptionId,
            storageLocationId: storageLocationId,
            accessId: accessId,
            updateUserId: req.payload.userId,
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
            updatedData.filePath = file.filename;
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

        let fileDeleted = false;

        // Cek apakah filePath ada
        if (nota.filePath) {
            const filePath = path.join(process.env.UPLOAD_DIR, nota.filePath);

            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    fileDeleted = true;
                } catch (err) {
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                        message: 'Gagal menghapus file.',
                        error: err.message,
                    });
                }
            } else {
                console.warn(`File tidak ditemukan: ${filePath}`);
            }
        }

        await nota.update(
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
                documentIndexName: null,
                activeRetentionPeriodId: null,
                inactiveRetentionPeriodId: null,
                jraDescriptionId: null,
                storageLocationId: null,
                accessId: null,
                updateUserId: null,
            },
        );

        return res.json({
            message: fileDeleted
                ? 'File dan nota dinas berhasil dihapus'
                : 'Data berhasil diubah, file tidak ditemukan.',
        });
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

exports.exportNota = async (req, res) => {
    try {
        const {startDate, endDate, departmentId, classificationId, recursive} = req.query;
        const isAdmin = req.payload.isAdmin
        const filterConditions = {}

        if (classificationId) {
            if (recursive && stringToBoolean(recursive)) {
                filterConditions.classificationId = {
                    [Op.or]: [
                        {[Op.like]: `${classificationId}.%`},
                        {[Op.eq]: classificationId},
                    ]
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

        let end = new Date(endDate);
        end = getEndTime(end);

        filterConditions.date = {
            [Op.between]: [start, end],
        }
        filterConditions.reserved = true

        if (isAdmin) {
            if (departmentId) {
                filterConditions.departmentId = departmentId;
            }
        } else {
            if (departmentId) {
                return res.status(StatusCodes.FORBIDDEN).json({message: 'User hanya dapat mengekspor nota dinas bidang sendiri.'})
            }
            filterConditions.departmentId = req.payload.departmentId;
        }

        // Query ke database berdasarkan filter tanggal dan bidang
        const nota = await Nota.findAll({
            where: filterConditions,
            order: [['number', 'ASC']],
            include: [
                {
                    model: User,
                    attributes: ['username'],
                    as: 'CreateUser',
                    include: [
                        {
                            model: Department,
                            attributes: ['id', 'name'],
                        },
                    ],
                },
                {
                    model: User,
                    attributes: ['username'],
                    as: 'UpdateUser',
                },
                {
                    model: Classification,
                    attributes: ['id', 'name'],
                },
                {
                    model: Level,
                    attributes: ['name']
                },
                {
                    model: StorageLocation,
                    attributes: ['name']
                },
                {
                    model: JraDescription,
                    attributes: ['name']
                },
                {
                    model: RetentionPeriod,
                    attributes: ['name'],
                    as: 'ActiveRetentionPeriod'
                },
                {
                    model: RetentionPeriod,
                    attributes: ['name'],
                    as: 'InactiveRetentionPeriod'
                },
                {
                    model: Access,
                    attributes: ['name'],
                }
            ],
        });

        const filename = `Nota-Dinas_${currentTimestamp()}.xlsx`

        // Cek jika tidak ada data
        if (nota.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Tidak ada data ditemukan untuk filter yang diberikan.',
            });
        }

        // Buat workbook dan worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Surat');

        // Tambahkan header
        worksheet.columns = [
            {header: 'Kode Klasifikasi', key: 'classificationId', width: 15},
            {header: 'Nama Klasifikasi', key: 'classificationName', width: 35},
            {header: 'Nomor Surat', key: 'number', width: 13},
            {header: 'Tanggal Surat', key: 'date', width: 18},
            {header: 'Kepada', key: 'to', width: 40},
            {header: 'Perihal', key: 'subject', width: 40},
            {header: 'Sifat', key: 'levelName', width: 15},
            {header: 'Jumlah Lampiran', key: 'attachmentCount', width: 15},
            {header: 'Keterangan', key: 'description', width: 15},
            {header: 'Nama File', key: 'filename', width: 15},
            {header: 'Kode Bidang', key: 'departmentId', width: 12},
            {header: 'Bidang', key: 'departmentName', width: 25},
            {header: 'Pembuat', key: 'createUserName', width: 36},
            {header: 'Pengubah', key: 'updateUserName', width: 36},
            {header: 'Hak Akses', key: 'access', width: 36},
            {header: 'Indeks Nama Berkas', key: 'documentIndexName', width: 36},
            {header: 'Deskripsi JRA', key: 'jraDescription', width: 36},
            {header: 'Jangka Waktu Simpan Aktif', key: 'activeRetentionPeriod', width: 36},
            {header: 'Jangka Waktu Simpan Inaktif', key: 'inactiveRetentionPeriod', width: 36},
            {header: 'Lokasi Simpan', key: 'storageLocation', width: 36},
        ];

        // Tambahkan data ke worksheet
        nota.forEach((data) => {
            worksheet.addRow({
                // id: letter.id,
                number: data.number,
                date: formatDate(data.date),
                userName: data.User.username,
                createUserName: data.CreateUser.username,
                updateUserName: data.UpdateUser.username,
                departmentId: data.departmentId,
                departmentName: data.CreateUser.Department.name,
                to: data.to,
                subject: data.subject,
                levelName: data.Level.name,
                attachmentCount: data.attachmentCount,
                description: data.description,
                filename: data.filename,
                classificationId: data.Classification.id,
                classificationName: data.Classification.name,
                access: data.Access?.name || NULL_PLACEHOLDER,
                jraDescription: data.JraDescription?.name || NULL_PLACEHOLDER,
                activeRetentionPeriod: data.ActiveRetentionPeriod?.name || NULL_PLACEHOLDER,
                inactiveRetentionPeriod: data.InactiveRetentionPeriod?.name || NULL_PLACEHOLDER,
                storageLocation: data.StorageLocation?.name || NULL_PLACEHOLDER,
                documentIndexName: data.documentIndexName?.name || NULL_PLACEHOLDER,
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