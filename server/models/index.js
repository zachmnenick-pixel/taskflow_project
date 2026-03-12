// models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  assignedTo: { type: String }, // user_id from SQLite
  createdBy: { type: String, required: true }, // user_id from SQLite
  tags: [{ type: String }],
  dueDate: { type: Date },
  completedAt: { type: Date },
  order: { type: Number, default: 0 }
}, { timestamps: true });

// models/Project.js
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  ownerId: { type: String, required: true }, // user_id from SQLite
  members: [{ type: String }], // user_ids from SQLite
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active'
  },
  taskCount: { type: Number, default: 0 }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);
const Project = mongoose.model('Project', projectSchema);

module.exports = { Task, Project };
