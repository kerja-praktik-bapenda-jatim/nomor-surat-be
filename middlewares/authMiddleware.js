const {StatusCodes} = require('http-status-codes');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(StatusCodes.UNAUTHORIZED).json({message: 'Access token required'});

    jwt.verify(token, process.env.JWT_SECRET, {algorithms: ["HS384"]}, (err, payload) => {
        if (err) return res.status(StatusCodes.UNAUTHORIZED).json({message: 'Invalid or expired token', error: err});
        req.payload = payload;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    if (req.payload.isAdmin) {
        next()
    } else {
        return res.status(StatusCodes.FORBIDDEN).json({message: "Access denied. Admin privileges required to access this endpoint."})
    }
};

module.exports = {authenticateToken, authenticateAdmin};
