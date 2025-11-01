require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// middleware
app.use(express.json());

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({ origin: CLIENT_URL }));

// routes
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const rateLimiter = require('./middleware/rateLimiter');
const deviceInfo = require('./middleware/deviceInfo');

// Apply rate limiter globally (you can scope it to /api if preferred)
app.use(rateLimiter);

app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running' });
});

// Mount analytics routes with deviceInfo middleware to capture UA data
app.use('/api/analytics', deviceInfo, analyticsRoutes);

// health
app.get('/', (req, res) => res.json({ message: 'Brained API' }));

// connect to MongoDB
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not defined. Set it in .env');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
