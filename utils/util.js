const bcrypt = require("bcrypt");

function stringToBoolean(value) {
    if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true') {
            return true;
        } else if (lowerValue === 'false') {
            return false;
        }
    }
    return undefined;
}

async function hashPassword(password, saltRounds = 10) {
    if (typeof password !== 'string') {
        throw new TypeError('Password must be a string');
    }
    return await bcrypt.hash(password, saltRounds);
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

function currentTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

module.exports = {stringToBoolean, hashPassword, formatDate, currentTimestamp};