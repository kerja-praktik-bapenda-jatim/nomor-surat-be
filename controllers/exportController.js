const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const Letter = require('../models/letter');
const Department = require('../models/department');
const User = require('../models/user');

exports.exportToExcel = async (req, res) => {
    try {
        const { startDate, endDate, departmentId } = req.query;

        // Validasi input
        if (!startDate || !endDate || !departmentId) {
            return res.status(400).json({
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
            'attachment; filename=letters.xlsx'
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