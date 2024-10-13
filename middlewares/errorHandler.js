const {
    ValidationError,
    UniqueConstraintError,
    ForeignKeyConstraintError,
    ConnectionError,
} = require('sequelize');

const errorHandler = (err, req, res, next) => {
    console.log(`Handled by errorHandler: ${err.name}, ${err.message}`)
    console.error(err.stack);
    if (err instanceof UniqueConstraintError) {
        return res.status(400).json({error: err.name, message: err.errors[0].message});
    }
    res.status(err.statusCode || 500).json({error: 'Internal Server Error', message: err.message});
};

module.exports = errorHandler;
