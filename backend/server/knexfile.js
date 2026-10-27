require('dotenv').config();
const path = require('path');
const migrationsDirectory = path.join(__dirname, 'db', 'migrations');
const seedsDirectory = path.join(__dirname, 'db', 'seeds');


/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  development: {
    client: 'pg',
    connection:  {
      connectionString: process.env.LOCAL_DB_URL,
      ssl: false
    },
    migrations: {
      directory: migrationsDirectory,
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: seedsDirectory
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false }
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: migrationsDirectory,
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: seedsDirectory
    }
  }

};
