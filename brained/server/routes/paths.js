const express = require('express');
const router = express.Router();
const PageView = require('../models/PageView');

// GET /api/paths/sankey?projectId=default&startDate&endDate&maxNodes=50&goal=/thank-you
router.get('/sankey', async (req, res) => {
  try {
    const { projectId = 'default', startDate, endDate, maxNodes = 50, goal } = req.query;
    const match = { projectId };
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }

    const views = await PageView.find(match)
      .select('sessionId pageURL timestamp')
      .sort({ sessionId: 1, timestamp: 1 })
      .lean();

    const transitions = new Map();
    const nodeCount = new Map();

    // Build transitions per session
    let curSession = null;
    let lastURL = null;
    for (const v of views) {
      if (v.sessionId !== curSession) {
        curSession = v.sessionId;
        lastURL = null;
      }
      const url = v.pageURL;
      nodeCount.set(url, (nodeCount.get(url) || 0) + 1);
      if (lastURL && lastURL !== url) {
        const key = `${lastURL}:::${url}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);
      }
      lastURL = url;
    }

    // Select top nodes by frequency if necessary
    const topNodes = Array.from(nodeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, parseInt(maxNodes, 10))
      .map(([url]) => url);
    const nodeIndex = new Map(topNodes.map((n, i) => [n, i]));

    // Build nodes array
    const nodes = topNodes.map((n) => ({ name: n, isGoal: goal ? n.includes(goal) : false }));

    // Build links array limited to top nodes
    const links = [];
    for (const [key, value] of transitions.entries()) {
      const [src, dst] = key.split(':::');
      if (!nodeIndex.has(src) || !nodeIndex.has(dst)) continue;
      links.push({ source: nodeIndex.get(src), target: nodeIndex.get(dst), value });
    }

    res.json({ nodes, links });
  } catch (e) {
    console.error('Error building sankey:', e);
    res.status(500).json({ message: 'Failed to compute sankey', error: e.message });
  }
});

module.exports = router;
