const express = require('express');
const cors = require('cors');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Your module routes will be mounted here later, e.g.
// app.use('/api/students', studentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;