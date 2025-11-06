const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const EventAnalytics = require('../models/EventAnalytics');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const SessionRecording = require('../models/SessionRecording');
const UserInteraction = require('../models/UserInteraction');
const analyticsService = require('../services/analyticsService');
const AppSettings = require('../models/AppSettings');
const { authenticate, authorize } = require('../controllers/authController');
const { enrichWithUserNames } = require('../utils/userEnricher');

// sanitize incoming metadata to avoid storing sensitive info
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const SENSITIVE_KEYS = ['password', 'pwd', 'creditcard', 'cc', 'ssn', 'token', 'auth', 'authorization', 'value'];
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) continue;
    const v = obj[k];
    out[k] = typeof v === 'object' ? sanitize(v) : v;
  }
  return out;
}

// POST /api/analytics/events
router.post('/events', async (req, res) => {
  try {
    const { eventType, element, pageURL, timestamp, metadata, sessionId, userId } = req.body;

    // Validate required fields
    if (!eventType) {
      console.error('Missing eventType in request body:', req.body);
      return res.status(400).json({ message: 'eventType is required' });
    }

    // prefer deviceInfo from middleware (parsed UA) but allow client-supplied deviceInfo
    const deviceInfo = req.deviceInfo || req.body.deviceInfo;
    const cleanMeta = sanitize(metadata || {});

    // Save to EventAnalytics (legacy model)
    const doc = await EventAnalytics.create({ eventType, element, pageURL, timestamp, deviceInfo, metadata: cleanMeta });

    // Also capture to our custom analytics service
    const distinctId = userId || req.userId || req.ip || 'anonymous';
    analyticsService.captureEvent(distinctId, sessionId, {
      eventType,
      eventName: eventType,
      pageURL,
      metadata: cleanMeta,
      device: deviceInfo,
      projectId: 'default',
    }).catch(e => console.error('Analytics service error:', e));

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save event' });
  }
});

// GET /api/analytics/seed
// Creates sample documents for testing DB connectivity and data flow
router.get('/seed', async (req, res) => {
  try {
    // sample event documents
    const sampleEvents = [
      {
        eventType: 'click',
        element: '#signup',
        pageURL: 'https://example.com/signup',
        metadata: { source: 'test-seed' },
        deviceInfo: req.deviceInfo || { device: 'desktop', browser: 'Chrome', os: 'Windows' }
      },
      {
        eventType: 'scroll',
        element: 'body',
        pageURL: 'https://example.com',
        metadata: { percent: 75 },
        deviceInfo: req.deviceInfo || { device: 'mobile', browser: 'Safari', os: 'iOS' }
      }
    ];

    const createdEvents = await EventAnalytics.insertMany(sampleEvents);

    // sample performance documents
    const samplePerfs = [
      {
        pageURL: 'https://example.com',
        TTFB: 120,
        LCP: 1500,
        FCP: 600,
        CLS: 0.02,
        jsErrors: [],
        deviceInfo: req.deviceInfo || { device: 'desktop', browser: 'Chrome', os: 'Windows' }
      },
      {
        pageURL: 'https://example.com/signup',
        TTFB: 140,
        LCP: 1800,
        FCP: 700,
        CLS: 0.01,
        jsErrors: [{ message: 'TestError', stack: 'seed' }],
        deviceInfo: req.deviceInfo || { device: 'mobile', browser: 'Safari', os: 'iOS' }
      }
    ];

    const createdPerfs = await PerformanceMetrics.insertMany(samplePerfs);

    res.json({ createdEventsCount: createdEvents.length, createdPerfsCount: createdPerfs.length, createdEvents, createdPerfs });
  } catch (err) {
    console.error('Seed error', err);
    res.status(500).json({ message: 'Failed to seed sample data', error: err.message });
  }
});

// POST /api/analytics/performance
router.post('/performance', async (req, res) => {
  try {
    const {
      pageURL,
      TTFB,
      LCP,
      FCP,
      CLS,
      INP,
      FID,
      loadTime,
      domReadyTime,
      dnsTime,
      jsErrors,
      apiCalls,
      timestamp,
      sessionId,
      userId,
      projectId
    } = req.body;

    // Validate required fields
    if (!pageURL) {
      console.error('Missing pageURL in performance metrics:', req.body);
      return res.status(400).json({ message: 'pageURL is required' });
    }

    // Handle empty body (from beacon API issues)
    if (Object.keys(req.body).length === 0) {
      console.error('Empty request body received');
      return res.status(400).json({ message: 'Request body is empty' });
    }

    const deviceInfo = req.deviceInfo || req.body.deviceInfo;

    const doc = await PerformanceMetrics.create({
      pageURL,
      TTFB,
      LCP,
      FCP,
      CLS,
      INP,
      FID,
      loadTime,
      domReadyTime,
      dnsTime,
      jsErrors,
      apiCalls,
      timestamp,
      deviceInfo,
      sessionId,
      userId,
      projectId: projectId || 'default'
    });    // Track performance metrics with custom analytics
    const distinctId = userId || req.userId || 'anonymous';
    await analyticsService.captureEvent(distinctId, sessionId, {
      eventType: 'performance',
      eventName: 'performance_metrics',
      pageURL,
      metadata: {
        TTFB,
        LCP,
        FCP,
        CLS,
        INP,
        FID,
        loadTime,
        domReadyTime,
        dnsTime,
        jsErrorCount: jsErrors?.length || 0,
        apiCallCount: apiCalls?.length || 0,
        timestamp
      }
    }).catch(e => console.error('Analytics service error:', e));

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save performance metrics' });
  }
});

// POST /api/analytics/track
// Accepts either a single event or { events: [...] } and stores in UserInteraction
router.post('/track', async (req, res) => {
  try {
    const payload = req.body?.events && Array.isArray(req.body.events) ? req.body.events : [req.body];

    const docs = payload
      .filter(Boolean)
      .map((i) => ({
        sessionId: i.sessionId,
        userId: i.userId || 'anonymous',
        projectId: i.projectId || 'default',
        eventType: i.eventType || i.event || 'custom',
        eventName: i.eventName || i.eventType || i.event || 'custom',
        pageURL: i.pageURL || i.url,
        pageTitle: i.metadata?.pageTitle,
        referrer: i.metadata?.referrer,
        metadata: sanitize(i.metadata || i.properties || {}),
        timestamp: i.timestamp ? new Date(i.timestamp) : new Date(),
      }));

    if (docs.length === 0) {
      return res.status(400).json({ message: 'No events to track' });
    }

    await UserInteraction.insertMany(docs);
    res.json({ message: 'Tracked', count: docs.length });
  } catch (err) {
    console.error('Error in /analytics/track:', err);
    res.status(500).json({ message: 'Failed to track events' });
  }
});

// POST /api/analytics/session
// Alias for recording rrweb session chunks
router.post('/session', async (req, res) => {
  try {
    const { sessionId, userId, events, consoleLogs, networkRequests, metadata, projectId } = req.body;

    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'sessionId and events array are required' });
    }

    let session = await SessionRecording.findOne({ sessionId });
    if (!session) {
      session = new SessionRecording({
        sessionId,
        userId: userId || 'anonymous',
        projectId: projectId || 'default',
        startTime: new Date(),
        events: [],
        consoleLogs: [],
        networkRequests: [],
        device: metadata?.device || {},
        entryURL: metadata?.url || '',
        pagesVisited: metadata?.url ? [metadata?.url] : [],
      });
    }

    session.events.push(...events);
    if (consoleLogs && Array.isArray(consoleLogs)) session.consoleLogs.push(...consoleLogs);
    if (networkRequests && Array.isArray(networkRequests)) session.networkRequests.push(...networkRequests);

    if (metadata) {
      if (metadata.url && !session.pagesVisited.includes(metadata.url)) {
        session.pagesVisited.push(metadata.url);
        session.exitURL = metadata.url;
      }
      if (metadata.device) session.device = { ...session.device, ...metadata.device };
    }

    // Update basic stats
    session.stats = session.stats || {};
    session.stats.totalEvents = (session.stats.totalEvents || 0) + events.length;

    await session.save();
    res.json({ message: 'Session events recorded', sessionId: session.sessionId });
  } catch (err) {
    console.error('Error in /analytics/session:', err);
    res.status(500).json({ message: 'Failed to record session' });
  }
});

// GET /api/analytics/dashboard
// Returns aggregated stats for admin
router.get('/dashboard', async (req, res) => {
  try {
    const [sessions, interactions, heatmapData] = await Promise.all([
      SessionRecording.countDocuments(),
      UserInteraction.countDocuments(),
      require('../models/HeatmapData').countDocuments(),
    ]);

    // Events by type (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const byType = await UserInteraction.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $project: { _id: 0, eventType: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);

    res.json({ stats: { sessions, interactions, heatmapData }, byType });
  } catch (err) {
    console.error('Error in /analytics/dashboard:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// GET /api/analytics/events (supports ?from=ISO&to=ISO&pageURL=/path)
router.get('/events', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const query = {};
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    if (pageURL) query.pageURL = pageURL;
    const items = await EventAnalytics.find(query).sort({ timestamp: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// GET /api/analytics/events/summary
router.get('/events/summary', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }
    if (pageURL) match.pageURL = pageURL;
    // counts by event type
    const byType = await EventAnalytics.aggregate([
      { $match: match },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $project: { _id: 0, eventType: '$_id', count: 1 } }
    ]);

    // counts by pageURL and eventType
    const byPageAndType = await EventAnalytics.aggregate([
      { $match: match },
      { $group: { _id: { pageURL: '$pageURL', eventType: '$eventType' }, count: { $sum: 1 } } },
      { $project: { _id: 0, pageURL: '$_id.pageURL', eventType: '$_id.eventType', count: 1 } }
    ]);

    res.json({ byType, byPageAndType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to compute event summaries' });
  }
});

// GET /api/analytics/performance
router.get('/performance', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const query = {};
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    if (pageURL) query.pageURL = pageURL;
    const items = await PerformanceMetrics.find(query).sort({ timestamp: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

// GET /api/analytics/performance/summary
router.get('/performance/summary', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }
    if (pageURL) match.pageURL = pageURL;

    // Average metrics grouped by pageURL
    const agg = await PerformanceMetrics.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$pageURL',
          avgTTFB: { $avg: '$TTFB' },
          avgLCP: { $avg: '$LCP' },
          avgFCP: { $avg: '$FCP' },
          avgCLS: { $avg: '$CLS' },
          avgINP: { $avg: '$INP' },
          avgFID: { $avg: '$FID' },
          avgLoadTime: { $avg: '$loadTime' },
          avgDomReadyTime: { $avg: '$domReadyTime' },
          avgDnsTime: { $avg: '$dnsTime' },
          totalJsErrors: { $sum: { $size: { $ifNull: ['$jsErrors', []] } } },
          totalApiCalls: { $sum: { $size: { $ifNull: ['$apiCalls', []] } } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          pageURL: '$_id',
          avgTTFB: 1,
          avgLCP: 1,
          avgFCP: 1,
          avgCLS: 1,
          avgINP: 1,
          avgFID: 1,
          avgLoadTime: 1,
          avgDomReadyTime: 1,
          avgDnsTime: 1,
          totalJsErrors: 1,
          totalApiCalls: 1,
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(agg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to compute performance summaries' });
  }
});

// GET /api/analytics/performance/detailed - Detailed performance analytics
router.get('/performance/detailed', async (req, res) => {
  try {
    const { from, to, pageURL } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }
    if (pageURL) match.pageURL = pageURL;

    // Get overall statistics
    const stats = await PerformanceMetrics.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          avgTTFB: { $avg: '$TTFB' },
          avgLCP: { $avg: '$LCP' },
          avgFCP: { $avg: '$FCP' },
          avgCLS: { $avg: '$CLS' },
          avgINP: { $avg: '$INP' },
          avgFID: { $avg: '$FID' },
          avgLoadTime: { $avg: '$loadTime' },
          avgDomReadyTime: { $avg: '$domReadyTime' },
          avgDnsTime: { $avg: '$dnsTime' },

          p50TTFB: { $percentile: { input: '$TTFB', p: [0.5], method: 'approximate' } },
          p75TTFB: { $percentile: { input: '$TTFB', p: [0.75], method: 'approximate' } },
          p95TTFB: { $percentile: { input: '$TTFB', p: [0.95], method: 'approximate' } },

          p50LCP: { $percentile: { input: '$LCP', p: [0.5], method: 'approximate' } },
          p75LCP: { $percentile: { input: '$LCP', p: [0.75], method: 'approximate' } },
          p95LCP: { $percentile: { input: '$LCP', p: [0.95], method: 'approximate' } },

          p50FCP: { $percentile: { input: '$FCP', p: [0.5], method: 'approximate' } },
          p75FCP: { $percentile: { input: '$FCP', p: [0.75], method: 'approximate' } },
          p95FCP: { $percentile: { input: '$FCP', p: [0.95], method: 'approximate' } },

          totalJsErrors: { $sum: { $size: { $ifNull: ['$jsErrors', []] } } },
          totalApiCalls: { $sum: { $size: { $ifNull: ['$apiCalls', []] } } },
          totalSamples: { $sum: 1 }
        }
      }
    ]);

    // Get error details
    const errorDetails = await PerformanceMetrics.aggregate([
      { $match: match },
      { $unwind: { path: '$jsErrors', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$jsErrors.message',
          count: { $sum: 1 },
          lastSeen: { $max: '$jsErrors.timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get API call statistics
    const apiStats = await PerformanceMetrics.aggregate([
      { $match: match },
      { $unwind: { path: '$apiCalls', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$apiCalls.url',
          avgDuration: { $avg: '$apiCalls.duration' },
          maxDuration: { $max: '$apiCalls.duration' },
          minDuration: { $min: '$apiCalls.duration' },
          count: { $sum: 1 },
          errorCount: {
            $sum: { $cond: [{ $or: [{ $eq: ['$apiCalls.status', 0] }, { $gte: ['$apiCalls.status', 400] }] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Device breakdown
    const deviceBreakdown = await PerformanceMetrics.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$deviceInfo.device',
          avgLCP: { $avg: '$LCP' },
          avgFCP: { $avg: '$FCP' },
          avgTTFB: { $avg: '$TTFB' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Performance over time
    const timeSeriesData = await PerformanceMetrics.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          avgTTFB: { $avg: '$TTFB' },
          avgLCP: { $avg: '$LCP' },
          avgFCP: { $avg: '$FCP' },
          avgCLS: { $avg: '$CLS' },
          avgINP: { $avg: '$INP' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.json({
      stats: stats[0] || {},
      errorDetails,
      apiStats,
      deviceBreakdown,
      timeSeriesData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to compute detailed performance analytics' });
  }
});

// GET /api/analytics/export/csv
router.get('/export/csv', async (req, res) => {
  try {
    const { from, to, pageURL, projectId = 'default', type = 'all', includeBehavior, includeErrors } = req.query;

    const matchCommon = {};
    if (from || to) {
      matchCommon.timestamp = {};
      if (from) matchCommon.timestamp.$gte = new Date(from);
      if (to) matchCommon.timestamp.$lte = new Date(to);
    }
    if (pageURL) matchCommon.pageURL = pageURL;

    const [events, perfs] = await Promise.all([
      type !== 'performance' ? EventAnalytics.find(matchCommon).lean() : Promise.resolve([]),
      type !== 'events' ? PerformanceMetrics.find(matchCommon).lean() : Promise.resolve([]),
    ]);

    const normalizedEvents = (events || []).map((e) => ({
      type: 'event',
      eventType: e.eventType,
      element: e.element,
      pageURL: e.pageURL,
      timestamp: e.timestamp,
      deviceInfo: JSON.stringify(e.deviceInfo || {}),
      metadata: JSON.stringify(e.metadata || {})
    }));

    const normalizedPerfs = (perfs || []).map((p) => ({
      type: 'performance',
      pageURL: p.pageURL,
      TTFB: p.TTFB,
      LCP: p.LCP,
      FCP: p.FCP,
      CLS: p.CLS,
      INP: p.INP,
      FID: p.FID,
      loadTime: p.loadTime,
      domReadyTime: p.domReadyTime,
      dnsTime: p.dnsTime,
      jsErrors: JSON.stringify(p.jsErrors || []),
      apiCalls: JSON.stringify(p.apiCalls || []),
      timestamp: p.timestamp,
      deviceInfo: JSON.stringify(p.deviceInfo || {})
    }));

  let all = [...normalizedEvents, ...normalizedPerfs];

    // Optionally include behavior (rage/dead clicks) summaries
    if (includeBehavior === 'true') {
      // Build basic matches once
      const match = {};
      if (from || to) {
        match.timestamp = {};
        if (from) match.timestamp.$gte = new Date(from);
        if (to) match.timestamp.$lte = new Date(to);
      }
      if (pageURL) match.pageURL = pageURL;

      const sigFor = (m) => (
        (m?.elementId && `#${m.elementId}`) ||
        (typeof m?.className === 'string' && `.${m.className.split(' ').slice(0,2).join('.')}`) ||
        (m?.element && String(m.element).toLowerCase()) ||
        'unknown'
      );

      // Rage clicks
      const clickDocs = await UserInteraction.find({ ...match, eventType: 'click' })
        .select('sessionId pageURL timestamp metadata.element metadata.elementId metadata.className metadata.text')
        .sort({ sessionId: 1, pageURL: 1, 'metadata.elementId': 1, timestamp: 1 })
        .lean();
      const t = 3, w = 3000;
      const groups = new Map();
      for (const c of clickDocs) {
        const sig = sigFor(c.metadata || {});
        const key = `${c.sessionId}|${c.pageURL}|${sig}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
      }
      const incidents = [];
      groups.forEach((arr, key) => {
        let i = 0;
        for (let j = 0; j < arr.length; j++) {
          const tj = new Date(arr[j].timestamp).getTime();
          while (i < j && tj - new Date(arr[i].timestamp).getTime() > w) i++;
          const count = j - i + 1;
          if (count >= t) {
            const slice = arr.slice(i, j + 1);
            const [sessionId, p, selector] = key.split('|');
            incidents.push({ sessionId, pageURL: p, selector, count, first: slice[0].timestamp, last: slice[slice.length-1].timestamp });
            i = j + 1;
          }
        }
      });
      const rageBySpot = new Map();
      for (const inc of incidents) {
        const k = `${inc.pageURL}|${inc.selector}`;
        const cur = rageBySpot.get(k) || { pageURL: inc.pageURL, selector: inc.selector, incidents: 0, clicks: 0, sessions: new Set(), first: inc.first, last: inc.last };
        cur.incidents += 1; cur.clicks += inc.count; cur.sessions.add(inc.sessionId);
        cur.first = new Date(Math.min(new Date(cur.first).getTime(), new Date(inc.first).getTime()));
        cur.last = new Date(Math.max(new Date(cur.last).getTime(), new Date(inc.last).getTime()));
        rageBySpot.set(k, cur);
      }
      const rageRows = Array.from(rageBySpot.values()).map(r => ({
        type: 'rage',
        pageURL: r.pageURL,
        selector: r.selector,
        incidents: r.incidents,
        clicks: r.clicks,
        sessions: Array.from(r.sessions).length,
        firstSeen: r.first,
        lastSeen: r.last,
      }));

      // Dead clicks
      const allDocs = await UserInteraction.find(match)
        .select('sessionId pageURL eventType timestamp metadata.element metadata.elementId metadata.className')
        .sort({ sessionId: 1, timestamp: 1 })
        .lean();
      const bySession = new Map();
      for (const ev of allDocs) {
        if (!bySession.has(ev.sessionId)) bySession.set(ev.sessionId, []);
        bySession.get(ev.sessionId).push(ev);
      }
      const idleMs = 2000;
      const deadResults = [];
      bySession.forEach((events) => {
        for (let i = 0; i < events.length; i++) {
          const ev = events[i];
          if (ev.eventType !== 'click') continue;
          const t0 = new Date(ev.timestamp).getTime();
          let meaningful = false;
          for (let j = i + 1; j < events.length; j++) {
            const e = events[j];
            const tj = new Date(e.timestamp).getTime();
            if (tj - t0 > idleMs) break;
            if (e.eventType === 'pageview' || e.eventType === 'submit') { meaningful = true; break; }
            if (e.eventType === 'click') {
              const s0 = sigFor(ev.metadata || {});
              const s1 = sigFor(e.metadata || {});
              if (s0 !== s1) { meaningful = true; break; }
            }
            if (e.metadata?.action && /navigate|open|success/i.test(String(e.metadata.action))) { meaningful = true; break; }
          }
          if (!meaningful) {
            deadResults.push({ sessionId: ev.sessionId, pageURL: ev.pageURL, selector: sigFor(ev.metadata || {}), timestamp: ev.timestamp });
          }
        }
      });
      const deadBySpot = new Map();
      for (const r of deadResults) {
        const k = `${r.pageURL}|${r.selector}`;
        const cur = deadBySpot.get(k) || { pageURL: r.pageURL, selector: r.selector, deadClicks: 0, sessions: new Set(), first: r.timestamp, last: r.timestamp };
        cur.deadClicks += 1; cur.sessions.add(r.sessionId);
        cur.first = new Date(Math.min(new Date(cur.first).getTime(), new Date(r.timestamp).getTime()));
        cur.last = new Date(Math.max(new Date(cur.last).getTime(), new Date(r.timestamp).getTime()));
        deadBySpot.set(k, cur);
      }
      const deadRows = Array.from(deadBySpot.values()).map(d => ({
        type: 'dead',
        pageURL: d.pageURL,
        selector: d.selector,
        deadClicks: d.deadClicks,
        sessions: Array.from(d.sessions).length,
        firstSeen: d.first,
        lastSeen: d.last,
      }));

      all = [...all, ...rageRows, ...deadRows];
    }
    if (all.length === 0) {
      return res.status(200).send('type,eventType,element,pageURL,timestamp,deviceInfo,metadata');
    }

    // Optionally include grouped error summaries (top 5)
    if (includeErrors === 'true') {
      const matchErr = {};
      if (from || to) {
        matchErr.timestamp = {};
        if (from) matchErr.timestamp.$gte = new Date(from);
        if (to) matchErr.timestamp.$lte = new Date(to);
      }
      if (pageURL) matchErr.pageURL = pageURL;

      const docs = await PerformanceMetrics.find(matchErr)
        .select('sessionId pageURL jsErrors timestamp')
        .sort({ timestamp: -1 })
        .lean();

      const normalizeStack = (stack) => {
        if (!stack || typeof stack !== 'string') return '';
        return stack
          .replace(/:\d+:\d+/g, ':__:__')
          .replace(/\(.*?\)/g, '(...)')
          .split('\n')
          .slice(0, 5)
          .join('\n');
      };
      const mkFingerprint = (err) => {
        const msg = (err?.message || '').trim();
        const name = (err?.name || '').trim();
        const stack = normalizeStack(err?.stack || '');
        return `${name}|${msg}|${stack}`.slice(0, 1000);
      };

      const groups = new Map();
      for (const d of docs) {
        const errors = Array.isArray(d.jsErrors) ? d.jsErrors : [];
        for (const je of errors) {
          const fp = mkFingerprint(je);
          const g = groups.get(fp) || {
            fingerprint: fp,
            name: je?.name || 'Error',
            message: je?.message || 'Unknown error',
            normalizedStack: normalizeStack(je?.stack || ''),
            count: 0,
            sessions: new Set(),
            pages: new Set(),
            firstSeen: d.timestamp,
            lastSeen: d.timestamp,
          };
          g.count += 1;
          if (d.sessionId) g.sessions.add(d.sessionId);
          if (d.pageURL) g.pages.add(d.pageURL);
          g.firstSeen = new Date(Math.min(new Date(g.firstSeen).getTime(), new Date(d.timestamp).getTime()));
          g.lastSeen = new Date(Math.max(new Date(g.lastSeen).getTime(), new Date(d.timestamp).getTime()));
          groups.set(fp, g);
        }
      }

      const topErrors = Array.from(groups.values())
        .map((g) => ({
          type: 'error',
          fingerprint: g.fingerprint,
          name: g.name,
          message: g.message,
          normalizedStack: g.normalizedStack,
          count: g.count,
          sessions: Array.from(g.sessions).length,
          pages: Array.from(g.pages).length,
          firstSeen: g.firstSeen,
          lastSeen: g.lastSeen,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      all = [...all, ...topErrors];
    }

  const fields = Object.keys(all[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(all);

    res.header('Content-Type', 'text/csv');
    const filenameSuffix = type === 'events' || type === 'performance' ? `_${type}` : '';
    res.attachment(`analytics${filenameSuffix}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export CSV' });
  }
});

// GET /api/analytics/export/pdf
router.get('/export/pdf', async (req, res) => {
  try {
    const { from, to, pageURL, includeErrors } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }
    if (pageURL) match.pageURL = pageURL;

    // Fetch data
    const [events, perfs, byType, perfAgg] = await Promise.all([
      EventAnalytics.find(match).limit(1000).sort({ timestamp: -1 }).lean(),
      PerformanceMetrics.find(match).limit(1000).sort({ timestamp: -1 }).lean(),
      EventAnalytics.aggregate([
        { $match: match },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $project: { _id: 0, eventType: '$_id', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      PerformanceMetrics.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            avgTTFB: { $avg: '$TTFB' },
            avgLCP: { $avg: '$LCP' },
            avgFCP: { $avg: '$FCP' },
            avgCLS: { $avg: '$CLS' },
            avgINP: { $avg: '$INP' },
            avgFID: { $avg: '$FID' },
            avgLoadTime: { $avg: '$loadTime' },
            count: { $sum: 1 }
          }
        }
      ]),
    ]);

    // Top raw errors (by message) for quick view
    const errorDetails = await PerformanceMetrics.aggregate([
      { $match: match },
      { $unwind: { path: '$jsErrors', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$jsErrors.message',
          count: { $sum: 1 },
          lastSeen: { $max: '$jsErrors.timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Optional grouped (fingerprinted) errors section reusing grouping logic
    let groupedErrors = [];
    if (includeErrors === 'true') {
      const docs = await PerformanceMetrics.find(match)
        .select('sessionId pageURL jsErrors timestamp')
        .sort({ timestamp: -1 })
        .lean();
      const normalizeStack = (stack) => {
        if (!stack || typeof stack !== 'string') return '';
        return stack
          .replace(/:\d+:\d+/g, ':__:__')
          .replace(/\(.*?\)/g, '(...)')
          .split('\n')
          .slice(0, 5)
          .join('\n');
      };
      const mkFingerprint = (err) => {
        const msg = (err?.message || '').trim();
        const name = (err?.name || '').trim();
        const stack = normalizeStack(err?.stack || '');
        return `${name}|${msg}|${stack}`.slice(0, 1000);
      };
      const groups = new Map();
      for (const d of docs) {
        const errors = Array.isArray(d.jsErrors) ? d.jsErrors : [];
        for (const je of errors) {
          const fp = mkFingerprint(je);
          const g = groups.get(fp) || {
            fingerprint: fp,
            name: je?.name || 'Error',
            message: je?.message || 'Unknown error',
            normalizedStack: normalizeStack(je?.stack || ''),
            count: 0,
            sessions: new Set(),
            pages: new Set(),
            firstSeen: d.timestamp,
            lastSeen: d.timestamp,
          };
          g.count += 1;
          if (d.sessionId) g.sessions.add(d.sessionId);
          if (d.pageURL) g.pages.add(d.pageURL);
          g.firstSeen = new Date(Math.min(new Date(g.firstSeen).getTime(), new Date(d.timestamp).getTime()));
          g.lastSeen = new Date(Math.max(new Date(g.lastSeen).getTime(), new Date(d.timestamp).getTime()));
          groups.set(fp, g);
        }
      }
      groupedErrors = Array.from(groups.values())
        .map(g => ({
          fingerprint: g.fingerprint,
            name: g.name,
            message: g.message,
            normalizedStack: g.normalizedStack,
            count: g.count,
            sessions: Array.from(g.sessions),
            pages: Array.from(g.pages),
            firstSeen: g.firstSeen,
            lastSeen: g.lastSeen,
        }))
        .sort((a,b)=> b.count - a.count)
        .slice(0, 10);
    }

  const doc = new PDFDocument({ autoFirstPage: false, margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics-report.pdf');
    doc.pipe(res);

    const addHeader = (title) => {
      doc.fillColor('#111827').fontSize(18).text(title, { align: 'left' });
      doc.moveDown(0.3);
      doc.rect(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 2)
        .fill('#2563EB');
      doc.moveDown(0.8);
      doc.fillColor('#111827');
    };

    const addFooter = () => {
      const y = doc.page.height - doc.page.margins.bottom + 10;
      doc.fillColor('#9CA3AF').fontSize(9)
        .text(`Generated: ${new Date().toLocaleString()}`, doc.page.margins.left, y, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'right'
        });
    };

    const addCover = () => {
      doc.addPage();
      // Accent block
      doc.rect(0, 0, doc.page.width, 120).fill('#111827');
      doc.rect(0, 120, doc.page.width, 6).fill('#2563EB');
      doc.fillColor('#FFFFFF').fontSize(28).text('PagePulse Analytics Report', 40, 40);
      doc.fillColor('#D1D5DB').fontSize(12).text('Engagement • Performance • Quality', 40, 80);
      doc.moveDown(8);
      doc.fillColor('#111827');
      doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
      if (from || to) {
        doc.text(`Range: ${from ? new Date(from).toLocaleString() : '…'} - ${to ? new Date(to).toLocaleString() : '…'}`);
      }
      if (pageURL) doc.text(`Page: ${pageURL}`);
      addFooter();
    };

    const barChart = (x, y, width, height, data, color = '#2563EB') => {
      // data: [{ label, value }]
      const max = Math.max(1, ...data.map(d => d.value));
      const barH = Math.min(22, Math.floor((height - 20) / data.length));
      const gap = 6;
      doc.save();
      doc.fontSize(10).fillColor('#374151');
      data.forEach((d, i) => {
        const barWidth = (d.value / max) * (width - 120);
        const by = y + i * (barH + gap);
        doc.fillColor('#6B7280').text(d.label, x, by + 2, { width: 100, ellipsis: true });
        doc.fillColor(color).rect(x + 110, by, barWidth, barH).fill();
        doc.fillColor('#1F2937').text(String(d.value), x + 115 + barWidth, by + 2, { width: 60 });
      });
      doc.restore();
    };

    addCover();

    // Summary page
    doc.addPage();
    addHeader('Summary');
    const totalEvents = events.length;
    const totalPerf = perfs.length;
    const perf = perfAgg[0] || {};
    const summaryItems = [
      { label: 'Events captured', value: totalEvents },
      { label: 'Performance samples', value: totalPerf },
      { label: 'Avg LCP (ms)', value: Math.round(perf.avgLCP || 0) },
      { label: 'Avg TTFB (ms)', value: Math.round(perf.avgTTFB || 0) },
      { label: 'Avg FCP (ms)', value: Math.round(perf.avgFCP || 0) },
      { label: 'Avg CLS', value: (perf.avgCLS || 0).toFixed(3) },
    ];
    doc.fontSize(12).fillColor('#111827');
    summaryItems.forEach((s, idx) => {
      const col = idx % 3; const row = Math.floor(idx / 3);
      const bx = doc.x + col * 180; const by = doc.y + row * 46;
      doc.roundedRect(bx, by, 160, 38, 6).fill('#F3F4F6');
      doc.fillColor('#6B7280').fontSize(10).text(s.label, bx + 10, by + 8);
      doc.fillColor('#111827').fontSize(16).text(String(s.value), bx + 10, by + 18);
      doc.fillColor('#111827').fontSize(12);
    });
    doc.moveDown(4);

    // Events by type chart
    addHeader('Events by Type');
    const chartData = byType.map((d) => ({ label: d.eventType, value: d.count }));
    if (chartData.length) {
      barChart(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right - 20, 220, chartData);
      doc.moveDown(12);
    } else {
      doc.text('No data in selected range.');
      doc.moveDown();
    }
    addFooter();

    // Recent events
    doc.addPage();
    addHeader('Recent Events');
    events.slice(0, 40).forEach((e) => {
      doc.fontSize(10).fillColor('#111827').text(`${new Date(e.timestamp).toLocaleString()}  |  ${e.eventType}  |  ${e.pageURL || '-'}  |  ${e.element || '-'}`);
      if (e.metadata) doc.fontSize(9).fillColor('#6B7280').text(JSON.stringify(e.metadata));
      doc.moveDown(0.3);
    });
    addFooter();

    // Performance summary
    doc.addPage();
    addHeader('Performance Summary');
    const perfSummary = [
      { label: 'Avg LCP', value: `${Math.round(perf.avgLCP || 0)} ms` },
      { label: 'Avg FCP', value: `${Math.round(perf.avgFCP || 0)} ms` },
      { label: 'Avg TTFB', value: `${Math.round(perf.avgTTFB || 0)} ms` },
      { label: 'Avg CLS', value: (perf.avgCLS || 0).toFixed(3) },
      { label: 'Samples', value: perf.count || 0 },
    ];
    perfSummary.forEach((s, idx) => {
      const y = doc.y + idx * 22;
      doc.fontSize(11).fillColor('#374151').text(s.label, doc.x, y);
      doc.fontSize(11).fillColor('#111827').text(String(s.value), doc.x + 220, y);
    });
    doc.moveDown(2);
    addFooter();

  // Top JS errors
    doc.addPage();
    addHeader('Top JavaScript Errors');
    if (errorDetails.length) {
      errorDetails.forEach((e) => {
        doc.fontSize(10).fillColor('#B91C1C').text(`${e._id}`);
        doc.fontSize(10).fillColor('#111827').text(`Count: ${e.count}  |  Last seen: ${e.lastSeen ? new Date(e.lastSeen).toLocaleString() : '-'}`);
        doc.moveDown(0.6);
      });
    } else {
      doc.text('No errors in selected range.');
    }
    addFooter();

    // Error Groups (fingerprinted)
    if (includeErrors === 'true') {
      doc.addPage();
      addHeader('Error Groups (Fingerprinting)');
      if (groupedErrors.length) {
        groupedErrors.forEach((g) => {
          doc.fontSize(10).fillColor('#DC2626').text(`${g.name}: ${g.message}`);
          doc.fontSize(9).fillColor('#6B7280').text(g.normalizedStack || '(no stack)');
          doc.fontSize(9).fillColor('#374151').text(`Count: ${g.count} | Sessions: ${g.sessions.length} | Pages: ${g.pages.length}`);
          doc.fontSize(8).fillColor('#9CA3AF').text(`Seen: ${new Date(g.firstSeen).toLocaleString()} → ${new Date(g.lastSeen).toLocaleString()}`);
          doc.moveDown(0.7);
        });
      } else {
        doc.text('No grouped errors.');
      }
      addFooter();
    }

    // UX Friction: Rage Clicks & Dead Clicks
    // Compute fresh using UserInteraction (same logic as tracking endpoints)
    try {
      const clicksMatch = { eventType: 'click' };
      if (from || to) {
        clicksMatch.timestamp = {};
        if (from) clicksMatch.timestamp.$gte = new Date(from);
        if (to) clicksMatch.timestamp.$lte = new Date(to);
      }
      if (pageURL) clicksMatch.pageURL = pageURL;

      const clickDocs = await UserInteraction.find(clicksMatch)
        .select('sessionId pageURL timestamp metadata.element metadata.elementId metadata.className metadata.text metadata.x metadata.y')
        .sort({ sessionId: 1, pageURL: 1, 'metadata.elementId': 1, timestamp: 1 })
        .lean();

      const sigFor = (m) => (
        (m?.elementId && `#${m.elementId}`) ||
        (typeof m?.className === 'string' && `.${m.className.split(' ').slice(0,2).join('.')}`) ||
        (m?.element && String(m.element).toLowerCase()) ||
        'unknown'
      );

      // Rage clicks
      const t = 3, w = 3000; // defaults
      const groups = new Map();
      for (const c of clickDocs) {
        const sig = sigFor(c.metadata || {});
        const key = `${c.sessionId}|${c.pageURL}|${sig}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
      }
      const incidents = [];
      groups.forEach((arr, key) => {
        let i = 0;
        for (let j = 0; j < arr.length; j++) {
          const tj = new Date(arr[j].timestamp).getTime();
          while (i < j && tj - new Date(arr[i].timestamp).getTime() > w) i++;
          const count = j - i + 1;
          if (count >= t) {
            const slice = arr.slice(i, j + 1);
            const avgX = Math.round(slice.reduce((s, it) => s + (it.metadata?.x ?? 0), 0) / slice.length);
            const avgY = Math.round(slice.reduce((s, it) => s + (it.metadata?.y ?? 0), 0) / slice.length);
            const [sessionId, p, selector] = key.split('|');
            incidents.push({ sessionId, pageURL: p, selector, count, firstTimestamp: slice[0].timestamp, lastTimestamp: slice[slice.length-1].timestamp, position: { x: avgX, y: avgY }, sampleText: slice.find(s => s.metadata?.text)?.metadata?.text?.slice(0, 60) || null });
            i = j + 1;
          }
        }
      });
      const rageBySpot = new Map();
      for (const inc of incidents) {
        const k = `${inc.pageURL}|${inc.selector}`;
        const cur = rageBySpot.get(k) || { pageURL: inc.pageURL, selector: inc.selector, incidents: 0, clicks: 0, sessions: new Set(), firstSeen: inc.firstTimestamp, lastSeen: inc.lastTimestamp, sampleText: inc.sampleText };
        cur.incidents += 1; cur.clicks += inc.count; cur.sessions.add(inc.sessionId);
        cur.firstSeen = new Date(Math.min(new Date(cur.firstSeen).getTime(), new Date(inc.firstTimestamp).getTime()));
        cur.lastSeen = new Date(Math.max(new Date(cur.lastSeen).getTime(), new Date(inc.lastTimestamp).getTime()));
        rageBySpot.set(k, cur);
      }
      const topRage = Array.from(rageBySpot.values()).map(v => ({...v, sessions: Array.from(v.sessions)})).sort((a,b)=> b.incidents - a.incidents || b.clicks - a.clicks).slice(0, 10);

      // Dead clicks (need nearby events). Fetch small window of non-clicks too
      const anyMatch = {};
      if (from || to) {
        anyMatch.timestamp = {};
        if (from) anyMatch.timestamp.$gte = new Date(from);
        if (to) anyMatch.timestamp.$lte = new Date(to);
      }
      if (pageURL) anyMatch.pageURL = pageURL;
      const all = await UserInteraction.find(anyMatch)
        .select('sessionId pageURL eventType timestamp metadata.element metadata.elementId metadata.className metadata.text')
        .sort({ sessionId: 1, timestamp: 1 })
        .lean();
      const bySession = new Map();
      for (const ev of all) {
        if (!bySession.has(ev.sessionId)) bySession.set(ev.sessionId, []);
        bySession.get(ev.sessionId).push(ev);
      }
      const idleMs = 2000;
      const selectorOf = sigFor;
      const deadResults = [];
      bySession.forEach((events) => {
        for (let i = 0; i < events.length; i++) {
          const ev = events[i];
          if (ev.eventType !== 'click') continue;
          const t0 = new Date(ev.timestamp).getTime();
          let meaningful = false;
          for (let j = i + 1; j < events.length; j++) {
            const e = events[j];
            const tj = new Date(e.timestamp).getTime();
            if (tj - t0 > idleMs) break;
            if (e.eventType === 'pageview' || e.eventType === 'submit') { meaningful = true; break; }
            if (e.eventType === 'click') {
              const s0 = selectorOf(ev.metadata || {});
              const s1 = selectorOf(e.metadata || {});
              if (s0 !== s1) { meaningful = true; break; }
            }
            if (e.metadata?.action && /navigate|open|success/i.test(String(e.metadata.action))) { meaningful = true; break; }
          }
          if (!meaningful) {
            deadResults.push({ sessionId: ev.sessionId, pageURL: ev.pageURL, selector: selectorOf(ev.metadata || {}), timestamp: ev.timestamp, sampleText: ev.metadata?.text?.slice(0,60) || null });
          }
        }
      });
      const deadBySpot = new Map();
      for (const r of deadResults) {
        const k = `${r.pageURL}|${r.selector}`;
        const cur = deadBySpot.get(k) || { pageURL: r.pageURL, selector: r.selector, deadClicks: 0, sessions: new Set(), firstSeen: r.timestamp, lastSeen: r.timestamp, sampleText: r.sampleText };
        cur.deadClicks += 1; cur.sessions.add(r.sessionId);
        cur.firstSeen = new Date(Math.min(new Date(cur.firstSeen).getTime(), new Date(r.timestamp).getTime()));
        cur.lastSeen = new Date(Math.max(new Date(cur.lastSeen).getTime(), new Date(r.timestamp).getTime()));
        deadBySpot.set(k, cur);
      }
      const topDead = Array.from(deadBySpot.values()).map(v => ({...v, sessions: Array.from(v.sessions)})).sort((a,b)=> b.deadClicks - a.deadClicks).slice(0, 10);

      // Render page
      doc.addPage();
      addHeader('UX Friction: Rage & Dead Clicks');
      doc.fontSize(12).fillColor('#111827').text('Top Rage Clicks', { continued: false });
      doc.moveDown(0.5);
      if (topRage.length) {
        topRage.forEach((r, idx) => {
          doc.fontSize(10).fillColor('#111827').text(`${idx+1}. ${r.selector}  |  incidents: ${r.incidents}, clicks: ${r.clicks}, sessions: ${r.sessions.length}`);
          if (r.sampleText) doc.fillColor('#6B7280').text(`Text: ${r.sampleText}`);
          doc.fillColor('#9CA3AF').text(`Seen: ${new Date(r.firstSeen).toLocaleString()} → ${new Date(r.lastSeen).toLocaleString()}`);
          doc.moveDown(0.4);
        });
      } else {
        doc.text('No rage clicks detected in selected range.');
      }
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#111827').text('Top Dead Clicks');
      doc.moveDown(0.5);
      if (topDead.length) {
        topDead.forEach((dItem, idx) => {
          doc.fontSize(10).fillColor('#111827').text(`${idx+1}. ${dItem.selector}  |  dead clicks: ${dItem.deadClicks}, sessions: ${dItem.sessions.length}`);
          if (dItem.sampleText) doc.fillColor('#6B7280').text(`Text: ${dItem.sampleText}`);
          doc.fillColor('#9CA3AF').text(`Seen: ${new Date(dItem.firstSeen).toLocaleString()} → ${new Date(dItem.lastSeen).toLocaleString()}`);
          doc.moveDown(0.4);
        });
      } else {
        doc.text('No dead clicks detected in selected range.');
      }
      addFooter();
    } catch (uxErr) {
      console.error('Failed to compute UX friction sections for PDF', uxErr);
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to export PDF' });
  }
});

// POST /api/analytics/recording-events - Capture recording events
router.post('/recording-events', async (req, res) => {
  try {
    const { sessionId, events } = req.body;
    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'sessionId and events array required' });
    }

    // Add events to session recording
    for (const event of events) {
      await analyticsService.captureRecordingEvent(sessionId, event);
    }

    res.json({ success: true, eventsProcessed: events.length });
  } catch (err) {
    console.error('Failed to capture recording events', err);
    res.status(500).json({ message: 'Failed to capture recording events' });
  }
});

// POST /api/analytics/snapshot - Capture DOM snapshot
router.post('/snapshot', async (req, res) => {
  try {
    const { sessionId, snapshot } = req.body;
    if (!sessionId || !snapshot) {
      return res.status(400).json({ message: 'sessionId and snapshot required' });
    }

    await analyticsService.addSnapshot(sessionId, snapshot);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to capture snapshot', err);
    res.status(500).json({ message: 'Failed to capture snapshot' });
  }
});

// POST /api/analytics/console - Capture console log
router.post('/console', async (req, res) => {
  try {
    const { sessionId, log } = req.body;
    if (!sessionId || !log) {
      return res.status(400).json({ message: 'sessionId and log required' });
    }

    await analyticsService.addConsoleLog(sessionId, log);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to capture console log', err);
    res.status(500).json({ message: 'Failed to capture console log' });
  }
});

// POST /api/analytics/identify - Identify user
router.post('/identify', async (req, res) => {
  try {
    const { userId, properties } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }

    await analyticsService.identifyUser(userId, properties);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to identify user', err);
    res.status(500).json({ message: 'Failed to identify user' });
  }
});

// GET /api/analytics/recordings - List session recordings
router.get('/recordings', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { projectId = 'default', limit = 50, hasErrors, userId } = req.query;

    const options = {
      limit: parseInt(limit),
      hasErrors: hasErrors === 'true',
      userId: userId || undefined
    };

    const recordings = await analyticsService.listRecordings(projectId, options);

    // Enrich recordings with user names
    const enrichedRecordings = await enrichWithUserNames(recordings);

    res.json({ recordings: enrichedRecordings });
  } catch (err) {
    console.error('Failed to list recordings', err);
    res.status(500).json({ message: 'Failed to list recordings' });
  }
});

// GET /api/analytics/recordings/:sessionId - Get session recording
router.get('/recordings/:sessionId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const recording = await analyticsService.getSessionRecording(sessionId);

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // Enrich recording with user name
    const enrichedRecording = (await enrichWithUserNames([recording]))[0];

    res.json({ recording: enrichedRecording });
  } catch (err) {
    console.error('Failed to get recording', err);
    res.status(500).json({ message: 'Failed to get recording' });
  }
});

// GET /api/analytics/heatmap - Get heatmap data
router.get('/heatmap', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { projectId = 'default', pageURL, eventType = 'click' } = req.query;

    if (!pageURL) {
      return res.status(400).json({ message: 'pageURL required' });
    }

    const heatmapData = await analyticsService.getHeatmapData(projectId, pageURL, eventType);
    res.json({ heatmapData });
  } catch (err) {
    console.error('Failed to get heatmap data', err);
    res.status(500).json({ message: 'Failed to get heatmap data' });
  }
});

module.exports = router;

// Integration endpoints (stubs) for external analytics tools
// POST /api/analytics/integrations/hotjar
router.post('/integrations/hotjar', async (req, res) => {
  // In a real integration you'd forward events to Hotjar API or trigger a script.
  console.log('Hotjar integration stub received', req.body);
  res.json({ message: 'Hotjar stub received' });
});

// POST /api/analytics/integrations/mixpanel
router.post('/integrations/mixpanel', async (req, res) => {
  console.log('Mixpanel integration stub received', req.body);
  res.json({ message: 'Mixpanel stub received' });
});

// POST /api/analytics/integrations/custom
router.post('/integrations/custom', async (req, res) => {
  // Allow consumers to register or forward events to custom listeners.
  console.log('Custom integration stub received', req.body);
  res.json({ message: 'Custom integration stub received' });
});

// Global recording toggle
router.get('/recording', async (req, res) => {
  try {
    const doc = await AppSettings.findOne({ key: 'global' });
    res.json({ enabled: !!(doc && doc.recordingEnabled) });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get recording flag' });
  }
});

router.post('/recording', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { enabled } = req.body;
    const doc = await AppSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: { recordingEnabled: !!enabled } },
      { upsert: true, new: true }
    );
    res.json({ enabled: doc.recordingEnabled });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to set recording flag' });
  }
});

// GET /api/analytics/errors/groups - Error grouping with fingerprinting
router.get('/errors/groups', async (req, res) => {
  try {
    const { from, to, pageURL, limit = 50 } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }
    if (pageURL) match.pageURL = pageURL;

    const docs = await PerformanceMetrics.find(match)
      .select('sessionId pageURL jsErrors timestamp')
      .sort({ timestamp: -1 })
      .lean();

    const normalizeStack = (stack) => {
      if (!stack || typeof stack !== 'string') return '';
      return stack
        .replace(/:\d+:\d+/g, ':__:__') // strip line:col numbers
        .replace(/\(.*?\)/g, '(...)') // collapse paths in parens
        .split('\n')
        .slice(0, 5)
        .join('\n');
    };

    const mkFingerprint = (err) => {
      const msg = (err?.message || '').trim();
      const name = (err?.name || '').trim();
      const stack = normalizeStack(err?.stack || '');
      return `${name}|${msg}|${stack}`.slice(0, 1000);
    };

    const groups = new Map();
    for (const d of docs) {
      const errors = Array.isArray(d.jsErrors) ? d.jsErrors : [];
      for (const je of errors) {
        const fp = mkFingerprint(je);
        const g = groups.get(fp) || {
          fingerprint: fp,
          name: je?.name || 'Error',
          message: je?.message || 'Unknown error',
          normalizedStack: normalizeStack(je?.stack || ''),
          count: 0,
          sessions: new Set(),
          pages: new Set(),
          firstSeen: d.timestamp,
          lastSeen: d.timestamp,
        };
        g.count += 1;
        if (d.sessionId) g.sessions.add(d.sessionId);
        if (d.pageURL) g.pages.add(d.pageURL);
        g.firstSeen = new Date(Math.min(new Date(g.firstSeen).getTime(), new Date(d.timestamp).getTime()));
        g.lastSeen = new Date(Math.max(new Date(g.lastSeen).getTime(), new Date(d.timestamp).getTime()));
        groups.set(fp, g);
      }
    }

    const items = Array.from(groups.values())
      .map((g) => ({
        ...g,
        sessions: Array.from(g.sessions),
        pages: Array.from(g.pages),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit, 10) || 50);

    res.json({ items, totalGroups: items.length });
  } catch (err) {
    console.error('Failed to group errors', err);
    res.status(500).json({ message: 'Failed to group errors' });
  }
});
