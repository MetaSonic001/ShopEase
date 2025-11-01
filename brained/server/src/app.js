const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({ origin: CLIENT_URL }));

app.get('/', (req, res) => res.json({ message: 'Brained API' }));

app.use('/api/auth', authRoutes);

// shared error handler
app.use(errorHandler);

module.exports = app;
