const { Op } = require('sequelize');
const disposisi = require('../models/disposisi');

const getCurrentYear = () => new Date().getFullYear();

const validateRequiredFields = (fields, body) => {
    const errors = [];
    fields.forEach(field => {
        if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
            errors.push(`Field '${field}' is required`);
        }
    });
    return errors;
};

const formatDisposisiResponse = (disposisi) => {
    try {
        return {
            id: disposisi.id,
            noDispo: disposisi.noDispo,
            tglDispo: disposisi.tglDispo,
            dispoKe: Array.isArray(disposisi.dispoKe) ? disposisi.dispoKe : JSON.parse(disposisi.dispoKe || '[]'),
            isiDispo: disposisi.isiDispo,
            letterIn_id: disposisi.letterIn_id,
            createdAt: disposisi.createdAt,
            updatedAt: disposisi.updatedAt,
            LetterIn: disposisi.LetterIn || null
        };
    } catch (error) {
        console.error('Error formatting disposisi response:', error);
        return disposisi;
    }
};

exports.create = async (req, res) => {
    try {
        const { letterIn_id, noDispo, tglDispo, dispoKe, isiDispo } = req.body;

        const requiredFields = ['letterIn_id', 'noDispo', 'tglDispo', 'dispoKe', 'isiDispo'];
        const fieldErrors = validateRequiredFields(requiredFields, req.body);

        if (fieldErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Semua field disposisi harus diisi.',
                errors: fieldErrors
            });
        }

        if (!Array.isArray(dispoKe) || dispoKe.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tujuan disposisi harus dipilih minimal satu.'
            });
        }

        const existingLetterDisposition = await disposisi.findOne({
            where: { letterIn_id: letterIn_id }
        });

        if (existingLetterDisposition) {
            return res.status(409).json({
                success: false,
                message: 'Surat sudah didisposisikan',
                details: {
                    existingDisposition: {
                        id: existingLetterDisposition.id,
                        noDispo: existingLetterDisposition.noDispo,
                        tglDispo: existingLetterDisposition.tglDispo,
                        createdAt: existingLetterDisposition.createdAt
                    }
                },
                errorType: 'LETTER_ALREADY_DISPOSED'
            });
        }

        const existingDisposisi = await disposisi.findOne({
            where: { noDispo: noDispo }
        });

        if (existingDisposisi) {
            return res.status(409).json({
                success: false,
                message: `Nomor disposisi ${noDispo} sudah digunakan. Silakan ambil nomor baru.`,
                errorType: 'DISPOSISI_NUMBER_EXISTS'
            });
        }

        const newDisposisi = await disposisi.create({
            letterIn_id,
            noDispo,
            tglDispo: new Date(tglDispo),
            dispoKe: Array.isArray(dispoKe) ? dispoKe : [dispoKe],
            isiDispo: isiDispo.trim(),
            userId: req.user?.id || null,
            updateUserId: req.user?.id || null
        });

        res.status(201).json({
            success: true,
            message: `Disposisi berhasil dibuat dengan nomor ${newDisposisi.noDispo}`,
            data: formatDisposisiResponse(newDisposisi)
        });

    } catch (error) {
        console.error('Create disposisi error:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            const constraintName = error.errors[0]?.path;

            if (constraintName === 'noDispo') {
                return res.status(409).json({
                    success: false,
                    message: 'Nomor disposisi sudah digunakan. Silakan ambil nomor baru.',
                    errorType: 'DISPOSISI_NUMBER_EXISTS'
                });
            }

            if (constraintName === 'letterIn_id') {
                return res.status(409).json({
                    success: false,
                    message: 'Surat sudah didisposisikan',
                    errorType: 'LETTER_ALREADY_DISPOSED'
                });
            }
        }

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Data tidak valid: ' + error.errors.map(e => e.message).join(', '),
                errorType: 'VALIDATION_ERROR'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Gagal membuat disposisi.',
            error: error.message,
            errorType: 'INTERNAL_SERVER_ERROR'
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            letterIn_id,
            year,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const whereClause = {};

        if (letterIn_id) {
            whereClause.letterIn_id = letterIn_id;
        }

        if (year) {
            whereClause.tglDispo = {
                [Op.between]: [`${year}-01-01`, `${year}-12-31`]
            };
        }

        const { count, rows } = await disposisi.findAndCountAll({
            where: whereClause,
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            success: true,
            data: rows.map(formatDisposisiResponse),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit)),
                totalRows: count,
                rowsPerPage: parseInt(limit),
                hasNextPage: offset + parseInt(limit) < count,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get all disposisi error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data disposisi.',
            error: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        const foundDisposisi = await disposisi.findByPk(id);

        if (!foundDisposisi) {
            return res.status(404).json({
                success: false,
                message: 'Disposisi tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: formatDisposisiResponse(foundDisposisi)
        });

    } catch (error) {
        console.error('Get disposisi by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data disposisi.',
            error: error.message
        });
    }
};

exports.updateById = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // PENGECEKAN ADMIN - HANYA ADMIN YANG BISA EDIT DISPOSISI
        const isAdmin = req.payload?.isAdmin || req.user?.isAdmin;
        
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Hanya admin yang dapat mengedit disposisi.'
            });
        }

        if (req.user?.id) {
            updateData.updateUserId = req.user.id;
        }

        const foundDisposisi = await disposisi.findByPk(id);

        if (!foundDisposisi) {
            return res.status(404).json({
                success: false,
                message: 'Disposisi tidak ditemukan'
            });
        }

        if (updateData.noDispo && updateData.noDispo !== foundDisposisi.noDispo) {
            const existingDisposisi = await disposisi.findOne({
                where: {
                    noDispo: updateData.noDispo,
                    id: { [Op.ne]: id }
                }
            });

            if (existingDisposisi) {
                return res.status(409).json({
                    success: false,
                    message: `Nomor disposisi ${updateData.noDispo} sudah digunakan.`,
                    errorType: 'DISPOSISI_NUMBER_EXISTS'
                });
            }
        }

        await foundDisposisi.update(updateData);

        res.json({
            success: true,
            message: 'Disposisi berhasil diperbarui',
            data: formatDisposisiResponse(foundDisposisi)
        });

    } catch (error) {
        console.error('Update disposisi error:', error);
        res.status(400).json({
            success: false,
            message: 'Gagal memperbarui disposisi.',
            error: error.message
        });
    }
};

exports.deleteById = async (req, res) => {
    try {
        const { id } = req.params;
        const foundDisposisi = await disposisi.findByPk(id);

        if (!foundDisposisi) {
            return res.status(404).json({
                success: false,
                message: 'Disposisi tidak ditemukan'
            });
        }

        const deletedData = {
            id: foundDisposisi.id,
            noDispo: foundDisposisi.noDispo,
            letterIn_id: foundDisposisi.letterIn_id
        };

        await foundDisposisi.destroy();

        res.json({
            success: true,
            message: `Disposisi nomor ${deletedData.noDispo} berhasil dihapus`,
            deletedData
        });

    } catch (error) {
        console.error('Delete disposisi error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus disposisi.',
            error: error.message
        });
    }
};

exports.getNextNumber = async (req, res) => {
    try {
        const maxDisposisi = await disposisi.findOne({
            attributes: ['noDispo'],
            order: [['noDispo', 'DESC']],
            limit: 1
        });

        const maxNumber = maxDisposisi ? maxDisposisi.noDispo : 0;
        const nextNumber = maxNumber + 1;

        res.json({
            success: true,
            noDispo: nextNumber,
            maxExisting: maxNumber,
            strategy: 'sequential',
            message: `Nomor disposisi selanjutnya: ${nextNumber}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting next disposisi number:', error);

        const currentYear = getCurrentYear();
        const fallbackNumber = parseInt(`${currentYear}${String(Date.now()).slice(-4)}`);

        res.status(500).json({
            success: false,
            message: 'Gagal mengambil nomor disposisi otomatis',
            error: error.message,
            fallback: {
                noDispo: fallbackNumber,
                note: 'Nomor fallback berdasarkan timestamp - harap verifikasi manual',
                timestamp: new Date().toISOString()
            }
        });
    }
};

exports.checkLetterDisposition = async (req, res) => {
    try {
        const { letterIn_id } = req.params;

        if (!letterIn_id || letterIn_id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Letter ID is required',
                errorType: 'MISSING_LETTER_ID'
            });
        }

        const existingDispositions = await disposisi.findAll({
            where: { letterIn_id: letterIn_id.trim() },
            order: [['createdAt', 'DESC']]
        });

        const isDisposed = existingDispositions.length > 0;
        const formattedDispositions = existingDispositions.map(formatDisposisiResponse);

        res.json({
            success: true,
            isDisposed,
            letterIn_id: letterIn_id.trim(),
            dispositions: formattedDispositions,
            count: existingDispositions.length,
            message: isDisposed ?
                `Surat sudah didisposisi ${existingDispositions.length} kali` :
                'Surat belum pernah didisposisi',
            lastDisposition: isDisposed ? formattedDispositions[0] : null
        });

    } catch (error) {
        console.error('Check letter disposition error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memeriksa status disposisi: ' + error.message,
            errorType: 'INTERNAL_SERVER_ERROR'
        });
    }
};

exports.getStats = async (req, res) => {
    try {
        const { year = getCurrentYear() } = req.query;

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const [
            totalCount,
            yearlyCount,
            monthlyCount,
            todayCount
        ] = await Promise.all([
            disposisi.count(),
            disposisi.count({
                where: {
                    tglDispo: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            }),
            disposisi.count({
                where: {
                    tglDispo: {
                        [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                }
            }),
            disposisi.count({
                where: {
                    tglDispo: {
                        [Op.gte]: new Date().toDateString()
                    }
                }
            })
        ]);

        res.json({
            success: true,
            data: {
                total: totalCount,
                yearly: yearlyCount,
                monthly: monthlyCount,
                today: todayCount,
                year: parseInt(year)
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik disposisi',
            error: error.message
        });
    }
};