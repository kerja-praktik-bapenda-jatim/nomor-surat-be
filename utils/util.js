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

module.exports = {stringToBoolean, hashPassword};