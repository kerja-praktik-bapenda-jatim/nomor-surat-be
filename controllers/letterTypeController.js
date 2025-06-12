const LetterType = require('../models/letterType');
const { StatusCodes } = require('http-status-codes');

exports.createLetterType = async (req, res, next) => {
    const { name } = req.body;

    try {
        // Cek apakah sudah ada nama yang sama
        const existing = await LetterType.findOne({ where: { name } });
        if (existing) {
            return res.status(StatusCodes.CONFLICT).json({ message: 'Jenis surat sudah ada.' });
        }

        const letterType = await LetterType.create({ name });
        return res.status(StatusCodes.CREATED).json(letterType);
    } catch (error) {
        next(error);
    }
};

// untuk kebutuhan bulk banyak lettertype
// exports.createManyLetterTypes = async (req, res, next) => {
//     const types = req.body;

//     // Debug: Log data yang diterima
//     console.log('Received types:', types);

//     if (!Array.isArray(types)) {
//         return res.status(StatusCodes.BAD_REQUEST).json({ message: "Data harus berupa array" });
//     }

//     try {
//         const validTypes = types.filter(item => {
//             // Debug: Log setiap item yang diproses
//             console.log('Processing item:', item);
//             return item && item.name;  // Pastikan item dan item.name ada
//         });

//         if (validTypes.length === 0) {
//             return res.status(StatusCodes.BAD_REQUEST).json({ message: "Tidak ada data valid untuk diproses" });
//         }

//         const created = await Promise.all(
//             validTypes.map(async (item) => {
//                 // Debug: Pastikan item memiliki name yang valid
//                 console.log('Checking if type already exists:', item.name);
//                 const existing = await LetterType.findOne({ where: { name: item.name } });
//                 if (!existing) {
//                     console.log('Creating new LetterType:', item.name);
//                     return await LetterType.create({ name: item.name });
//                 }
//                 return null;
//             })
//         );

//         res.status(StatusCodes.CREATED).json({
//             message: "Jenis surat berhasil ditambahkan",
//             data: created.filter(Boolean),
//         });
//     } catch (error) {
//         next(error);
//     }
// };

exports.getAllLetterTypes = async (req, res, next) => {
    try {
        const types = await LetterType.findAll({ order: [['createdAt', 'ASC']] });
        return res.json(types);
    } catch (error) {
        next(error);
    }
};

exports.getLetterTypeById = async (req, res, next) => {
    const { id } = req.params;  // Mendapatkan ID dari parameter URL

    try {
        // Mencari jenis surat berdasarkan ID
        const letterType = await LetterType.findOne({ where: { id } });

        // Jika jenis surat tidak ditemukan
        if (!letterType) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Jenis surat tidak ditemukan.' });
        }

        // Mengembalikan data jenis surat
        return res.status(StatusCodes.OK).json(letterType);
    } catch (error) {
        next(error);
    }
};

// kasih peringatan aja kalau jenis suratnya dan update misalkan typo
// exports.deleteLetterTypeById = async (req, res, next) => {
//     const { id } = req.params; // Mendapatkan ID dari parameter URL

//     try {
//         // Mencari jenis surat berdasarkan ID
//         const letterType = await LetterType.findOne({ where: { id } });

//         // Jika jenis surat tidak ditemukan
//         if (!letterType) {
//             return res.status(StatusCodes.NOT_FOUND).json({ message: 'Jenis surat tidak ditemukan.' });
//         }

//         // Menghapus jenis surat berdasarkan ID
//         await LetterType.destroy({ where: { id } });

//         // Mengembalikan response dengan pesan bahwa jenis surat berhasil dihapus
//         return res.status(StatusCodes.OK).json({
//             message: `Jenis surat ${letterType.name} berhasil dihapus.`
//         });
//     } catch (error) {
//         next(error);
//     }
// };

exports.updateLetterTypeById = async (req, res, next) => {
    const { id, oldName, newName } = req.body;
    console.log('ID:', id);
    console.log('Old Name:', oldName);
    console.log('New Name:', newName);

    try {
        const letterType = await LetterType.findOne({ where: { id } });

        if (!letterType) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Jenis surat tidak ditemukan.' });
        }

        if (letterType.name !== oldName) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Nama lama tidak cocok dengan data.' });
        }

        const existing = await LetterType.findOne({ where: { name: newName } });
        if (existing && existing.id !== Number(id)) {
            return res.status(StatusCodes.CONFLICT).json({ message: 'Jenis surat dengan nama ini sudah ada.' });
        }

        await letterType.update({ name: newName });

        return res.status(StatusCodes.OK).json({
            message: 'Jenis surat berhasil diperbarui.',
            data: letterType
        });
    } catch (error) {
        next(error);
    }
};