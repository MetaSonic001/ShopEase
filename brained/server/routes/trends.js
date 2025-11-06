const express = require('express');
const router = express.Router();
const UserInteraction = require('../models/UserInteraction');
const PerformanceMetrics = require('../models/PerformanceMetrics');

// GET /api/trends/rage?projectId=default&hours=24
router.get('/rage', async (req, res) => {
  try {
    const { projectId = 'default', hours = 24 } = req.query;
    const h = parseInt(hours, 10);
    const since = new Date(Date.now() - h * 60 * 60 * 1000);

    const clicks = await UserInteraction.find({
      projectId,
      eventType: 'click',
      timestamp: { $gte: since },
    })
      .select('sessionId timestamp metadata.elementId metadata.element pageURL')
      .sort({ timestamp: 1 })
      .lean();

    // Group by hour
    const buckets = new Map();
    const sigFor = (m) =>
      (m?.elementId && `#${m.elementId}`) ||
      (m?.element && String(m.element).toLowerCase()) ||
      'unknown';

    for (const c of clicks) {
      const hour = new Date(c.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const arr = buckets.get(hour) || [];
      arr.push(c);
      buckets.set(hour, arr);
    }

    const trend = [];
    const sortedHours = [...buckets.keys()].sort();

    for (const hour of sortedHours) {
      const arr = buckets.get(hour) || [];
      const bySession = new Map();
      for (const c of arr) {
        const s = bySession.get(c.sessionId) || [];
        s.push(c);
        bySession.set(c.sessionId, s);
      }

      let incidents = 0;
      bySession.forEach((sess) => {
        let i = 0;
        for (let j = 0; j < sess.length; j++) {
          const tj = new Date(sess[j].timestamp).getTime();
          while (i < j && tj - new Date(sess[i].timestamp).getTime() > 3000) i++;
          const window = sess.slice(i, j + 1);
          const bySel = new Map();
          window.forEach((e) => {
            const sig = sigFor(e.metadata || {});
            bySel.set(sig, (bySel.get(sig) || 0) + 1);
          });
          if ([...bySel.values()].some((cnt) => cnt >= 3)) {
            incidents++;
            break; // count session once
          }
        }
      });

      trend.push({ hour, incidents });
    }

    res.json({ trend, hours: h });
  } catch (e) {
    console.error('Error computing rage trend:', e);
    res.status(500).json({ message: 'Failed to compute rage trend', error: e.message });
  }
});

// GET /api/trends/errors?projectId=default&hours=24
router.get('/errors', async (req, res) => {
  try {
    const { projectId = 'default', hours = 24 } = req.query;
    const h = parseInt(hours, 10);
    const since = new Date(Date.now() - h * 60 * 60 * 1000);

    const docs = await PerformanceMetrics.find({
      projectId,
      timestamp: { $gte: since },
      jsErrors: { $exists: true, $ne: [] },
    })
      .select('timestamp jsErrors')
      .lean();

    const buckets = new Map();
    for (const doc of docs) {
      const hour = new Date(doc.timestamp).toISOString().slice(0, 13);
      const cnt = buckets.get(hour) || 0;
      buckets.set(hour, cnt + (Array.isArray(doc.jsErrors) ? doc.jsErrors.length : 0));
    }

    const sortedHours = [...buckets.keys()].sort();
    const trend = sortedHours.map((hour) => ({ hour, errorCount: buckets.get(hour) }));

    res.json({ trend, hours: h });
  } catch (e) {
    console.error('Error computing error trend:', e);
    res.status(500).json({ message: 'Failed to compute error trend', error: e.message });
  }
});

module.exports = router;
