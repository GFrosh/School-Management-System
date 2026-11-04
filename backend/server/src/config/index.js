const path = require('path');
const dotenvPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: dotenvPath });


module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DB_URL,
  localDatabaseUrl: process.env.LOCAL_DB_URL,
  adminEmail: process.env.DB_ADMIN_EMAIL,
  adminPassword: process.env.DB_ADMIN_PASSWORD,
  adminUser: {
    first_name: process.env.DB_ADMIN_FIRSTNAME,
    last_name: process.env.DB_ADMIN_LASTNAME,
    middle_name: process.env.DB_ADMIN_MIDDLENAME,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtlSeconds: '15m',
    refreshTtlDays: '30d',
    lockoutDurationMinutes: 15
  },
};


