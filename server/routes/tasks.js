// routes/tasks.js — Uses MongoDB for tasks
const express = require('express');
const router = express.Router();
const { Task, Project } = require('../models');
const { authenticate } = require('./auth');
const db = require('../db/sqlite');

// GET /api/tasks — all user's tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority, projectId, search } = req.query;
    const filter = { createdBy: req.userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (projectId) filter.projectId = projectId;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter).populate('projectId', 'name color').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create task
router.post('/', authenticate, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.userId });

    // Update SQLite stats
    db.prepare('UPDATE user_stats SET tasks_created = tasks_created + 1 WHERE user_id = ?').run(req.userId);

    // Update project task count
    if (req.body.projectId) {
      await Project.findByIdAndUpdate(req.body.projectId, { $inc: { taskCount: 1 } });
    }

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      { ...req.body, ...(req.body.status === 'done' ? { completedAt: new Date() } : {}) },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Update completed stats
    if (req.body.status === 'done') {
      db.prepare('UPDATE user_stats SET tasks_completed = tasks_completed + 1 WHERE user_id = ?').run(req.userId);
    }

    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, createdBy: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/stats — combined stats from BOTH DBs
router.get('/stats', authenticate, async (req, res) => {
  try {
    // From MongoDB
    const [byStatus, byPriority, recentTasks] = await Promise.all([
      Task.aggregate([
        { $match: { createdBy: req.userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { createdBy: req.userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.find({ createdBy: req.userId }).sort({ createdAt: -1 }).limit(5)
    ]);

    // From SQLite
    const sqliteStats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(req.userId);

    res.json({ byStatus, byPriority, recentTasks, userStats: sqliteStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
