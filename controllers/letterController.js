const Letter = require('../models/letter');
const {Op} = require("sequelize");

exports.createLetter = async (req, res, next) => {
    const {spareCounts, date, subject, to} = req.body;
    const file = req.file;
    console.log(req.body)

    try {
        
        if (spareCounts) {
            // Buat array dengan panjang sebanyak spareCounts
            const letters = Array.from({ length: spareCounts }, () => ({
                date: date,
                // subject: subject,
                // to: to,
                // file: file
            }));

            // Bulk create letters
            const createdLetters = await Letter.bulkCreate(letters);

            // Return response dengan data yang dibuat
            return res.status(201).json({ createdLetters });
        }
        else{
            console.log("creating")

            if (!file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const letter = await Letter.create({
                date: date, 
                subject: subject, 
                to: to, 
                filename: file.originalname,
                file: file.buffer,
            })
            return res.status(201).json(letter)
        }
    } catch (error) {
        next(error)
    }
}

exports.getAllLetter = async (req, res, next) => {
    console.log(req.query)
    const {min, max, desc, recent} = req.query
    const filterConditions = {}

    if (min) {
        filterConditions.amount = {
            [Op.gte]: parseInt(min)
        }
    }
    if (max) {
        filterConditions.amount = {
            ...filterConditions.amount,
            [Op.lte]: parseInt(max)
        }
    }
    if (desc) {
        filterConditions.description = {
            [Op.iLike]: `%${desc}%`
        }
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
            attributes: {exclude: ['file']},
            where: filterConditions
        })
        if (count === 0) {
            return res.status(404).json({message: 'Letter not found'})
        }
        return res.json(rows)
    } catch (error) {
        next(error)
    }
}

exports.getLetterById = async (req, res, next) => {
    const id = req.params.id
    try {
        const letter = await Letter.findByPk(id,{
            attributes: {exclude: ['file']}
        })
        if (!letter) {
            return res.status(404).json({message: 'Not found'})
        }
        return res.status(200).json(letter)
    } catch (error) {
        next(error)
    }
}

// Controller untuk mengunduh file surat
exports.downloadLetterFile = async (req, res, next) => {
    const { id } = req.params;

    try {
        // Cari surat berdasarkan id
        const letter = await Letter.findByPk(id);

        if (!letter) {
            return res.status(404).json({ message: 'Letter not found' });
        }

        // Cek apakah file ada
        if (letter.file) {

            const fileName = letter.filename
            console.log(fileName)
            // Set header untuk mendownload file
            res.setHeader('Content-Type', 'application/pdf'); // Sesuaikan dengan tipe file
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Kirim file sebagai buffer
            return res.status(200).send(letter.file);
        } else {
            return res.status(404).json({ message: 'No file attached to this letter' });
        }
    } catch (error) {
        next(error);
    }
};

exports.updateLetterById = async (req, res, next) => {
    const id = req.params.id;
    const updatedData = req.body;

    try {
        const letter = await Letter.findByPk(id);
        if (!letter) {
            return res.status(404).json({message: 'Letter not found'})
        }
        await letter.update(updatedData)
        return res.status(200).json(letter)
    } catch (error) {
        next(error)
    }
}

exports.deleteLetterById = async (req, res, next) => {
    const id = req.params.id;

    try {
        const count = await Letter.destroy({
            where: {id: id}
        })

        if (count === 0) {
            return res.status(404).json({message: 'Letter not found'})
        }

        return res.status(204).send();
    } catch (error) {
        next(error)
    }
}

exports.deleteAllLetter = async (req, res, next) => {
    const {truncate} = req.body;

    try {
        if (truncate){
            const count = await Letter.destroy({
                truncate: truncate,
            })
            return res.status(204).send();
        }
        else{
            return res.status(200).json({message: 'Do Nothing'})
        }
    } catch (error) {
        next(error)
    }
}