const express = require('express');
const router = express.Router();
const PerformanceMetrics = require('../models/PerformanceMetrics');
const UserInteraction = require('../models/UserInteraction');

// GET /api/insights/weekly-summary?projectId=default&startDate&endDate
router.get('/weekly-summary', async (req, res) => {
  try {
    const { projectId = 'default', startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Top error groups (by message fingerprint)
    const errorDocs = await PerformanceMetrics.find({
      projectId,
      timestamp: { $gte: start, $lte: end },
      jsErrors: { $exists: true, $ne: [] },
    })
      .select('jsErrors pageURL')
      .lean();

    const errorMap = new Map();
    for (const doc of errorDocs) {
      for (const err of doc.jsErrors || []) {
        const key = String(err.message || 'Unknown').slice(0, 100);
        const cur = errorMap.get(key) || { message: key, count: 0, pages: new Set() };
        cur.count += 1;
        cur.pages.add(doc.pageURL);
        errorMap.set(key, cur);
      }
    }
    const topErrors = Array.from(errorMap.values())
      .map((e) => ({ ...e, pages: Array.from(e.pages) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top rage selectors (heuristic from clicks)
    const clicks = await UserInteraction.find({
      projectId,
      eventType: 'click',
      timestamp: { $gte: start, $lte: end },
    })
      .select('sessionId timestamp metadata.element metadata.elementId metadata.className pageURL')
      .sort({ sessionId: 1, timestamp: 1 })
      .lean();

    const sigFor = (m) =>
      (m?.elementId && `#${m.elementId}`) ||
      (typeof m?.className === 'string' &&
        `.${m.className.split(' ').slice(0, 2).join('.')}`) ||
      (m?.element && String(m.element).toLowerCase()) ||
      'unknown';

    const bySession = new Map();
    for (const c of clicks) {
      const arr = bySession.get(c.sessionId) || [];
      arr.push(c);
      bySession.set(c.sessionId, arr);
    }

    const rageMap = new Map();
    bySession.forEach((arr) => {
      let i = 0;
      for (let j = 0; j < arr.length; j++) {
        const tj = new Date(arr[j].timestamp).getTime();
        while (i < j && tj - new Date(arr[i].timestamp).getTime() > 3000) i++;
        const window = arr.slice(i, j + 1);
        const bySel = new Map();
        window.forEach((ev) => {
          const s = sigFor(ev.metadata || {});
          bySel.set(s, (bySel.get(s) || 0) + 1);
        });
        for (const [sel, cnt] of bySel.entries()) {
          if (cnt >= 3) {
            const cur = rageMap.get(sel) || { selector: sel, incidents: 0, pages: new Set() };
            cur.incidents += 1;
            cur.pages.add(arr[j].pageURL);
            rageMap.set(sel, cur);
          }
        }
      }
    });

    const topRage = Array.from(rageMap.values())
      .map((r) => ({ ...r, pages: Array.from(r.pages) }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 10);

    // Slow LCP pages (p75 > 2.5s)
    const lcpDocs = await PerformanceMetrics.find({
      projectId,
      timestamp: { $gte: start, $lte: end },
      LCP: { $exists: true, $gt: 2500 },
    })
      .select('pageURL LCP')
      .lean();

    const lcpMap = new Map();
    for (const doc of lcpDocs) {
      const cur = lcpMap.get(doc.pageURL) || { pageURL: doc.pageURL, values: [] };
      cur.values.push(doc.LCP);
      lcpMap.set(doc.pageURL, cur);
    }

    const slowPages = Array.from(lcpMap.values())
      .map((p) => {
        p.values.sort((a, b) => a - b);
        const idx = Math.floor(0.75 * (p.values.length - 1));
        return { pageURL: p.pageURL, lcpP75: p.values[idx], sampleCount: p.values.length };
      })
      .sort((a, b) => b.lcpP75 - a.lcpP75)
      .slice(0, 10);

    // Recommended actions
    const actions = [];
    if (topErrors.length > 0) {
      actions.push({
        title: 'Fix Top JavaScript Errors',
        description: `${topErrors[0].count} occurrences of "${topErrors[0].message}"`,
        priority: 'high',
        type: 'error',
      });
    }
    if (topRage.length > 0) {
      actions.push({
        title: 'Investigate Rage Clicks',
        description: `${topRage[0].incidents} rage incidents on ${topRage[0].selector}`,
        priority: 'high',
        type: 'rage',
      });
    }
    if (slowPages.length > 0) {
      actions.push({
        title: 'Optimize Slow Pages',
        description: `${slowPages[0].pageURL} has LCP p75 of ${(slowPages[0].lcpP75 / 1000).toFixed(2)}s`,
        priority: 'medium',
        type: 'performance',
      });
    }

    res.json({
      period: { start, end },
      topErrors,
      topRageSelectors: topRage,
      slowPages,
      actions,
    });
  } catch (e) {
    console.error('Error computing insights:', e);
    res.status(500).json({ message: 'Failed to compute insights', error: e.message });
  }
});

module.exports = router;
