const express = require('express');
const router = express.Router();
const ConsentMaskingRule = require('../models/ConsentMaskingRule');

// Create rule
router.post('/rules', async (req, res) => {
  try {
    const rule = new ConsentMaskingRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (e) {
    res.status(400).json({ message: 'Failed to create rule', error: e.message });
  }
});

// List rules
router.get('/rules', async (req, res) => {
  try {
    const { projectId = 'default', type, active } = req.query;
    const filter = { projectId };
    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';
    const rules = await ConsentMaskingRule.find(filter).sort({ priority: -1, createdAt: -1 });
    res.json(rules);
  } catch (e) {
    res.status(500).json({ message: 'Failed to list rules', error: e.message });
  }
});

// Get single rule
router.get('/rules/:id', async (req, res) => {
  try {
    const rule = await ConsentMaskingRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (e) {
    res.status(500).json({ message: 'Failed to get rule', error: e.message });
  }
});

// Update rule
router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await ConsentMaskingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (e) {
    res.status(400).json({ message: 'Failed to update rule', error: e.message });
  }
});

// Delete rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await ConsentMaskingRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete rule', error: e.message });
  }
});

// Get compiled selectors for SDK (public endpoint)
router.get('/selectors', async (req, res) => {
  try {
    const { projectId = 'default' } = req.query;
    const rules = await ConsentMaskingRule.find({ projectId, isActive: true }).sort({ priority: -1 });
    
    const maskSelectors = [];
    const blockSelectors = [];
    
    for (const rule of rules) {
      if (rule.type === 'mask') {
        maskSelectors.push(...rule.selectors);
      } else if (rule.type === 'block') {
        blockSelectors.push(...rule.selectors);
      }
    }
    
    res.json({ maskSelectors, blockSelectors });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get selectors', error: e.message });
  }
});

module.exports = router;
