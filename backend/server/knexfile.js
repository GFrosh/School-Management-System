const path = require('path');
const { localDatabaseUrl, databaseUrl } = require('./src/config');
const migrationsDirectory = path.join(__dirname, 'db', 'migrations');
const seedsDirectory = path.join(__dirname, 'db', 'seeds');


/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  development: {
    client: 'pg',
    connection:  {
      connectionString: localDatabaseUrl,
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

  test: {
    client: 'pg',
    connection: {
      connectionString: localDatabaseUrl,
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
    client: 'pg',
    connection: {
      connectionString: databaseUrl,
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
