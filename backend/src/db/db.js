const knex = require('knex');
const { nodeEnv } = require('../config');
const knexConfig = require('../../knexfile');

const environment = nodeEnv;
const db = knex(knexConfig[environment]);

module.exports = db;
