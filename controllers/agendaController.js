const AgendaSurat = require('../models/agenda');
const LetterIn = require('../models/letterIn');

const convertToLocalTimezone = (dateString, timeString = null) => {
    if (!dateString) return null;

    try {
        if (timeString) {
            const combinedDateTime = `${dateString}T${timeString}`;
            const date = new Date(combinedDateTime);
            const localDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        }

        const date = new Date(dateString);
        const localDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error converting timezone:', error);
        return dateString;
    }
};

exports.create = async (req, res) => {
    try {
        const processedData = {
            ...req.body,
            tglMulai: req.body.tglMulai ? new Date(req.body.tglMulai).toISOString().split('T')[0] : null,
            tglSelesai: req.body.tglSelesai ? new Date(req.body.tglSelesai).toISOString().split('T')[0] : null,
        };

        const newData = await AgendaSurat.create(processedData);

        if (newData.letterIn_id) {
            try {
                await LetterIn.update(
                    { agenda: true },
                    { where: { id: newData.letterIn_id } }
                );
            } catch (updateErr) {
                console.error('Error updating LetterIn:', updateErr);
            }
        }

        res.status(201).json(newData);
    } catch (err) {
        console.error('Create error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await AgendaSurat.findAll({
            include: [
                {
                    model: LetterIn,
                    required: false,
                    attributes: ['id', 'perihal', 'surat_dari', 'no_surat']
                }
            ]
        });

        const formattedData = data.map(item => {
            const plainItem = item.toJSON();
            return {
                ...plainItem,
                tglMulai: plainItem.tglMulai ? new Date(plainItem.tglMulai).toISOString().split('T')[0] : null,
                tglSelesai: plainItem.tglSelesai ? new Date(plainItem.tglSelesai).toISOString().split('T')[0] : null,
            };
        });

        res.json(formattedData);
    } catch (err) {
        console.error('GetAll error:', err);
        res.status(500).json({
            message: err.message,
            error: process.env.NODE_ENV === 'development' ? err.stack : 'Internal server error'
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const data = await AgendaSurat.findByPk(req.params.id, {
            include: [
                {
                    model: LetterIn,
                    required: false,
                    attributes: ['id', 'perihal', 'surat_dari', 'no_surat']
                }
            ]
        });

        if (!data) {
            return res.status(404).json({ message: 'AgendaSurat not found' });
        }

        const formattedData = {
            ...data.toJSON(),
            tglMulai: data.tglMulai ? new Date(data.tglMulai).toISOString().split('T')[0] : null,
            tglSelesai: data.tglSelesai ? new Date(data.tglSelesai).toISOString().split('T')[0] : null,
        };

        res.json(formattedData);
    } catch (err) {
        console.error('GetById error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.deleteById = async (req, res) => {
    try {
        const data = await AgendaSurat.findByPk(req.params.id);

        if (!data) {
            return res.status(404).json({ message: 'AgendaSurat not found' });
        }

        const letterInId = data.letterIn_id;

        await data.destroy();

        if (letterInId) {
            try {
                await LetterIn.update(
                    { agenda: false },
                    { where: { id: letterInId } }
                );
            } catch (updateErr) {
                console.error('Error updating LetterIn:', updateErr);
            }
        }

        res.json({ message: 'AgendaSurat deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.deleteAll = async (req, res) => {
    const { truncate } = req.body;

    try {
        if (truncate) {
            try {
                await LetterIn.update(
                    { agenda: false },
                    { where: { agenda: true } }
                );
            } catch (updateErr) {
                console.error('Error updating LetterIn:', updateErr);
            }

            await AgendaSurat.destroy({ truncate: true });
            return res.json({ message: 'All AgendaSurat data truncated.' });
        }

        const agendas = await AgendaSurat.findAll({
            attributes: ['letterIn_id'],
            where: {}
        });

        const letterInIds = agendas.map(agenda => agenda.letterIn_id).filter(id => id);
        const deleted = await AgendaSurat.destroy({ where: {} });

        if (letterInIds.length > 0) {
            try {
                await LetterIn.update(
                    { agenda: false },
                    { where: { id: letterInIds } }
                );
            } catch (updateErr) {
                console.error('Error updating LetterIn:', updateErr);
            }
        }

        res.json({ message: `${deleted} AgendaSurat data deleted.` });
    } catch (err) {
        console.error('DeleteAll error:', err);
        res.status(500).json({ message: err.message });
    }
};