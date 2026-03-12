// index.js — Main Express server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectMongo = require('./db/mongodb');

// Initialize SQLite (runs immediately)
require('./db/sqlite');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/projects', require('./routes/projects'));

// Health check — shows both DB statuses
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    databases: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      sqlite: 'connected'
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Connect MongoDB then start server
connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 MongoDB → Tasks & Projects`);
    console.log(`🗃️  SQLite  → Users & Sessions`);
  });
});
