'use strict';

const users = require("../data/users.json");
const {hashPassword} = require("../utils/util");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add seed commands here.
         *
         * Example:
         * await queryInterface.bulkInsert('People', [{
         *   name: 'John Doe',
         *   isBetaMember: false
         * }], {});
         */
        const processedUsers = await Promise.all(
            users.map(async (item) => ({
                id: item.id,
                username: item.username,
                password: await hashPassword(item.password, 10),
                is_admin: item.is_admin,
                department_id: item.department_id,
                created_at: new Date(),
                updated_at: new Date(),
            }))
        );

        return queryInterface.bulkInsert("users", processedUsers);
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        return queryInterface.bulkDelete('users', null, {});
    }
};
