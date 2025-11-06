const express = require('express');
const router = express.Router();
const AlertRule = require('../models/AlertRule');

// Create alert rule
router.post('/rules', async (req, res) => {
  try {
    const rule = new AlertRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (e) {
    res.status(400).json({ message: 'Failed to create rule', error: e.message });
  }
});

// List alert rules
router.get('/rules', async (req, res) => {
  try {
    const { projectId = 'default', active } = req.query;
    const filter = { projectId };
    if (active !== undefined) filter.isActive = active === 'true';
    const rules = await AlertRule.find(filter).sort({ createdAt: -1 });
    res.json(rules);
  } catch (e) {
    res.status(500).json({ message: 'Failed to list rules', error: e.message });
  }
});

// Get single rule
router.get('/rules/:id', async (req, res) => {
  try {
    const rule = await AlertRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (e) {
    res.status(500).json({ message: 'Failed to get rule', error: e.message });
  }
});

// Update rule
router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (e) {
    res.status(400).json({ message: 'Failed to update rule', error: e.message });
  }
});

// Delete rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete rule', error: e.message });
  }
});

module.exports = router;
