const env = process.env.NODE_ENV || 'development';
require('dotenv').config({
    path: `${__dirname}/.env.${env}`,
});

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const {sequelize, connectDb} = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const {authenticateAdmin, authenticateToken} = require('./middlewares/authMiddleware');
const letterRoutes = require('./routes/letterRoutes')
const levelRoutes = require('./routes/levelRoutes')
const classificationRoutes = require('./routes/classificationRoutes')
const notaRoutes = require('./routes/notaRoutes')
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes')
const departmentRoutes = require('./routes/departmentRoutes');
const jraDescriptionRoutes = require('./routes/jraDescriptionRoutes');
const retentionPeriodRoutes = require('./routes/retentionPeriodRoutes');
const storageLocationRoutes = require('./routes/storageLocationRoutes');
const accessRoutes = require('./routes/accessRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    console.log(`${req.method} request for ${req.url}`);
    next();
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).json({});
    }

    next();
});

app.get('/api', (req, res) => {
    res.json({message: 'Welcome to BAPENDA Surat API'});
})

app.use('/api/auth', authRoutes);
app.use('/api/letter', authenticateToken, letterRoutes)
app.use('/api/level', levelRoutes)
app.use('/api/classification', classificationRoutes)
app.use('/api/nota', authenticateToken, notaRoutes)
app.use('/api/user', authenticateToken, userRoutes)
app.use('/api/department', departmentRoutes)
app.use('/api/jra', jraDescriptionRoutes)
app.use('/api/retention', retentionPeriodRoutes)
app.use('/api/storage', storageLocationRoutes)
app.use('/api/access', accessRoutes)
app.use(errorHandler);

async function startServer() {
    console.log(`server.js Current env: ${env}`);
    try {
        await connectDb();

        await sequelize.sync({alter: false});
        console.log('Database synced successfully!');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start the server:', error);
    }
}

startServer();