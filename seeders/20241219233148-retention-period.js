'use strict';

const retentions = require("../data/retentionPeroid.json");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */
    return queryInterface.bulkInsert('retention_periods', retentions.map(item => ({
      id: item.id,
      name: item.name,
      active: item.active,
      created_at: new Date(),
      updated_at: new Date(),
    })))
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return queryInterface.bulkDelete('retention_periods', null, {});
  }
};
