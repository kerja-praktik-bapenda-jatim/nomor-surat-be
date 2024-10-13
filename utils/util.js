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

module.exports = {stringToBoolean};