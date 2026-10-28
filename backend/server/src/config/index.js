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
  adminUser: process.env.DB_ADMIN_USER,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtlSeconds: 900, // 15 minutes
    refreshTtlDays: 30,
  },
};


