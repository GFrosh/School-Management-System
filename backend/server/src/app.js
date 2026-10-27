const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const UserRepository = require('../db/repositories/user.repository');
const { sendSuccess } = require('./utils/respond');

const app = express();

app.use(requestId);
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running properly!' });
});

app.get('/health', (req, res) => {
  sendSuccess(res, { status: 'ok' });
});

// Module routes will be mounted under /api/v1 here later

app.get('/api/v1/users', async (req, res) => {
  const userRepository = new UserRepository();
  res.status(200).json(await userRepository.getAllUsers());
});


app.use(notFound);
app.use(errorHandler);

module.exports = app;