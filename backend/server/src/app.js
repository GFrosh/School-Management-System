const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/respond');

const app = express();

app.use(requestId);
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  sendSuccess(res, { message: 'Backend is running properly!' });
});

app.get('/health', (req, res) => {
  sendSuccess(res, { status: 'ok' });
});

// Module routes will be mounted under /api/v1 here later

app.use(notFound);
app.use(errorHandler);

module.exports = app;