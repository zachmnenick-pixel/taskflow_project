// routes/auth.js — Uses SQLite for users
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/sqlite');

const COLORS = ['#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4','#84cc16'];

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    db.prepare(`INSERT INTO users (id, username, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)`)
      .run(id, username, email, hash, color);

    db.prepare(`INSERT INTO user_stats (user_id) VALUES (?)`).run(id);

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id, username, email, avatar_color: color }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last active
    db.prepare('UPDATE user_stats SET last_active = CURRENT_TIMESTAMP WHERE user_id = ?').run(user.id);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar_color: user.avatar_color }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar_color, created_at FROM users WHERE id = ?').get(req.userId);
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(req.userId);
  res.json({ user, stats });
});

// Middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { router, authenticate };
