const express = require('express');
const router = express.Router();
const FeatureFlag = require('../models/FeatureFlag');

// List flags
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId;
    const flags = await FeatureFlag.find(query).sort({ createdAt: -1 }).lean();
    res.json({ flags });
  } catch (err) {
    console.error('Error listing flags:', err);
    res.status(500).json({ message: 'Failed to list flags' });
  }
});

// Create flag
router.post('/', async (req, res) => {
  try {
    const { name, key, description, enabled = true, value = true, conditions = {}, projectId = 'default' } = req.body;
    if (!name || !key) {
      return res.status(400).json({ message: 'name and key are required' });
    }
    const existing = await FeatureFlag.findOne({ key });
    if (existing) return res.status(409).json({ message: 'Flag key already exists' });
    const flag = await FeatureFlag.create({ name, key, description, enabled, value, conditions, projectId });
    res.status(201).json({ flag });
  } catch (err) {
    console.error('Error creating flag:', err);
    res.status(500).json({ message: 'Failed to create flag' });
  }
});

// Update flag
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body, updatedAt: new Date() };
    const flag = await FeatureFlag.findByIdAndUpdate(id, update, { new: true });
    if (!flag) return res.status(404).json({ message: 'Flag not found' });
    res.json({ flag });
  } catch (err) {
    console.error('Error updating flag:', err);
    res.status(500).json({ message: 'Failed to update flag' });
  }
});

// Delete flag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await FeatureFlag.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ message: 'Flag not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting flag:', err);
    res.status(500).json({ message: 'Failed to delete flag' });
  }
});

// Evaluate flags (very basic)
router.get('/evaluate', async (req, res) => {
  try {
    const { userId, projectId = 'default' } = req.query;
    const flags = await FeatureFlag.find({ projectId, enabled: true }).lean();
    // naive evaluation: return value for enabled flags; ignore conditions for now
    const result = {};
    for (const f of flags) {
      result[f.key] = f.value;
    }
    res.json({ flags: result });
  } catch (err) {
    console.error('Error evaluating flags:', err);
    res.status(500).json({ message: 'Failed to evaluate flags' });
  }
});

module.exports = router;
