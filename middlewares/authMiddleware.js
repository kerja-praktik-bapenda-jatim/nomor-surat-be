const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({message: 'Access token required'});

    jwt.verify(token, process.env.JWT_SECRET, {algorithms: ["HS384"]}, (err, user) => {
        if (err) return res.status(403).json({message: 'Invalid or expired token', error: err});
        console.log(user)
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
