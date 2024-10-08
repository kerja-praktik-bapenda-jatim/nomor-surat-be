const errorHandler = (err, req, res, next) => {
    console.log(`Handled by errorHandler: ${err.name}, ${err.message}`)
    console.error(err.stack);
    res.status(err.statusCode || 500).json({error: 'Internal Server Error', message: err.message});
};

module.exports = errorHandler;
