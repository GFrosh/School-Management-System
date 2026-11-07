const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const requestId = require('./middlewares/requestId');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const ApiResponse = require("./utils/Response");


// ROUTERS
const userRouter = require("./routes/user.route");
const sessionRouter = require("./routes/session.route");

const app = express();

app.use(requestId);
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running properly!' });
});

app.get('/health', (req, res) => {
  ApiResponse.success(res, { status: 'ok' }, null, 200);
});



// Module routes will be mounted under /api/v1 here later

app.use("/api/v1/users", userRouter);
app.use("/api/v1/sessions", sessionRouter);


app.use(notFound);
app.use(errorHandler);

module.exports = app;