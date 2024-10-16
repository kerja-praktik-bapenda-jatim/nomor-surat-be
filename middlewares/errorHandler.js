const {
    ValidationError,
    UniqueConstraintError,
    ForeignKeyConstraintError,
    ConnectionError,
} = require('sequelize');
const {StatusCodes} = require('http-status-codes');

const errorHandler = (err, req, res, next) => {
    console.log(`Handled by errorHandler: ${err.name}, ${err.message}`)
    console.error(err.stack);
    if (err instanceof UniqueConstraintError) {
        return res.status(StatusCodes.BAD_REQUEST).json({error: err.name, message: err.errors[0].message});
    }
    res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal Server Error',
        message: err.message
    });
};

module.exports = errorHandler;
