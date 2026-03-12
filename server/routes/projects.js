// routes/projects.js — Uses MongoDB for projects
const express = require('express');
const router = express.Router();
const { Project, Task } = require('../models');
const { authenticate } = require('./auth');
const db = require('../db/sqlite');

// GET /api/projects
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ ownerId: req.userId }, { members: req.userId }]
    }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/', authenticate, async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, ownerId: req.userId });
    db.prepare('UPDATE user_stats SET projects_created = projects_created + 1 WHERE user_id = ?').run(req.userId);
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/projects/:id/tasks
router.get('/:id/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.id }).sort({ order: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Project.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    await Task.deleteMany({ projectId: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
