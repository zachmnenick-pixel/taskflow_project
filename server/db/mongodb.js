// db/mongodb.js — MongoDB: Tasks & Projects
const mongoose = require('mongoose');

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager');
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Running without MongoDB (tasks will use mock data)');
  }
};

module.exports = connectMongo;
