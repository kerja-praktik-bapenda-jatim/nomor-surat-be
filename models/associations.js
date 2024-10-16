const User = require('../models/user');
const Letter = require('../models/letter');

const defineAssociations = () => {
    User.hasMany(Letter, {foreignKey: 'userId',});
    Letter.belongsTo(User, {foreignKey: 'userId'});
};

module.exports = defineAssociations;
