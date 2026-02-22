require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const detectionRoutes = require('./routes/detectionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/graphshield';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || true
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', detectionRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    try {
      const Transaction = require('./models/Transaction');
      await Transaction.collection.dropIndex('transaction_id_1').catch(() => {});
      console.log('✓ Database indexes updated');
    } catch (indexError) {
    }
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    console.log('→ Server will continue without database (results won\'t persist)');
  }
};

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗ ██████╗  █████╗ ██████╗ ██╗  ██╗               ║
║  ██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██║  ██║               ║
║  ██║  ███╗██████╔╝███████║██████╔╝███████║               ║
║  ██║   ██║██╔══██╗██╔══██║██╔═══╝ ██╔══██║               ║
║  ╚██████╔╝██║  ██║██║  ██║██║     ██║  ██║               ║
║   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝               ║
║                                                           ║
║   ███████╗██╗  ██╗██╗███████╗██╗     ██████╗             ║
║   ██╔════╝██║  ██║██║██╔════╝██║     ██╔══██╗            ║
║   ███████╗███████║██║█████╗  ██║     ██║  ██║            ║
║   ╚════██║██╔══██║██║██╔══╝  ██║     ██║  ██║            ║
║   ███████║██║  ██║██║███████╗███████╗██████╔╝            ║
║   ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═════╝             ║
║                                                           ║
║   Money Muling Detection Engine                          ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║   Server running on port ${PORT}                            ║
║   API: http://localhost:${PORT}/api                         ║
║   Health: http://localhost:${PORT}/api/health               ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
};

startServer();

module.exports = app;
