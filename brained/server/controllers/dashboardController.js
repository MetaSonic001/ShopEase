const EventAnalytics = require('../models/EventAnalytics');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const Session = require('../models/Session');
const PageView = require('../models/PageView');
const UserInteraction = require('../models/UserInteraction');

// Get comprehensive dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const { projectId, from, to, device, country, utmSource, referrerContains, pathPrefix } = req.query;

  const matchQuery = {};
    if (projectId) matchQuery.projectId = projectId;

  // Segment filters applied to Session-based aggregations
  const sessionSegmentMatch = {};
  if (device) sessionSegmentMatch['device.type'] = device; // session schema uses device.type
  if (country) sessionSegmentMatch['location.country'] = country;
  if (utmSource) sessionSegmentMatch['utmSource'] = utmSource;
  if (referrerContains) sessionSegmentMatch['referrer'] = { $regex: referrerContains, $options: 'i' };

  // Page-level segment filters
  const pageViewSegmentMatch = {};
  if (pathPrefix) pageViewSegmentMatch.pageURL = { $regex: `^${pathPrefix}` };
  if (referrerContains) pageViewSegmentMatch.referrer = { $regex: referrerContains, $options: 'i' };
  if (device) pageViewSegmentMatch['device'] = device; // PageView schema has device as string

  // Interaction-level filters
  const interactionSegmentMatch = {};
  if (pathPrefix) interactionSegmentMatch.pageURL = { $regex: `^${pathPrefix}` };
  if (device) interactionSegmentMatch['metadata.device'] = device;
  if (country) interactionSegmentMatch['metadata.country'] = country; // if stored
  if (utmSource) interactionSegmentMatch['metadata.utmSource'] = utmSource; // if stored
  if (referrerContains) interactionSegmentMatch.referrer = { $regex: referrerContains, $options: 'i' };

    const dateQuery = {};
    if (from || to) {
      if (from) dateQuery.$gte = new Date(from);
      if (to) dateQuery.$lte = new Date(to);
    }

    // Parallel queries for all metrics
    const [
      totalPageViews,
      uniqueVisitors,
      sessionMetrics,
      topPages,
      trafficSources,
      deviceBreakdown,
      browserBreakdown,
      realTimeVisitors,
      pageViewTrend,
    ] = await Promise.all([
      // Total page views
      PageView.countDocuments({
        ...matchQuery,
        ...pageViewSegmentMatch,
        ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
      }),

      // Unique visitors (distinct user IDs)
      Session.distinct('userId', {
        ...matchQuery,
        ...sessionSegmentMatch,
        ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
      }).then(users => users.length),

      // Session metrics
      Session.aggregate([
        {
          $match: {
            ...matchQuery,
            ...sessionSegmentMatch,
            ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
          },
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
            totalBounced: { $sum: { $cond: ['$bounced', 1, 0] } },
            avgPageViews: { $avg: '$pageViews' },
          },
        },
      ]),

      // Top pages
      PageView.aggregate([
        {
          $match: {
            ...matchQuery,
            ...pageViewSegmentMatch,
            ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
          },
        },
        {
          $group: {
            _id: '$pageURL',
            views: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$userId' },
            avgTimeOnPage: { $avg: '$timeOnPage' },
          },
        },
        {
          $project: {
            pageURL: '$_id',
            views: 1,
            uniqueVisitors: { $size: '$uniqueVisitors' },
            avgTimeOnPage: 1,
          },
        },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),

      // Traffic sources (referrers)
      Session.aggregate([
        {
          $match: {
            ...matchQuery,
            ...sessionSegmentMatch,
            ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
            referrer: { $exists: true, $ne: null, $ne: '' },
          },
        },
        {
          $group: {
            _id: '$referrer',
            sessions: { $sum: 1 },
          },
        },
        { $sort: { sessions: -1 } },
        { $limit: 10 },
      ]),

      // Device breakdown
      Session.aggregate([
        {
          $match: {
            ...matchQuery,
            ...sessionSegmentMatch,
            ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
          },
        },
        {
          $group: {
            _id: '$device.type',
            count: { $sum: 1 },
          },
        },
      ]),

      // Browser breakdown
      Session.aggregate([
        {
          $match: {
            ...matchQuery,
            ...sessionSegmentMatch,
            ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
          },
        },
        {
          $group: {
            _id: '$device.browser',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Real-time visitors (last 5 minutes)
      Session.countDocuments({
        ...matchQuery,
        isActive: true,
        lastActivityAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }),

      // Page view trend (last 7 days, daily)
      PageView.aggregate([
        {
          $match: {
            ...matchQuery,
            ...pageViewSegmentMatch,
            timestamp: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
            views: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Compute events per minute (last 60s) and short trend (last 15 min)
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60 * 1000);
    const fifteenMinAgo = new Date(now - 15 * 60 * 1000);
    const uiMatchBase = {
      ...(projectId ? { projectId } : {}),
      ...interactionSegmentMatch,
    };

    const [eventsPerMinute, eventsPerMinuteTrendRaw] = await Promise.all([
      UserInteraction.countDocuments({
        ...uiMatchBase,
        timestamp: { $gte: oneMinuteAgo },
      }),
      UserInteraction.aggregate([
        {
          $match: {
            ...uiMatchBase,
            timestamp: { $gte: fifteenMinAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%H:%M', date: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Map to trend array with label/time and events
    const eventsPerMinuteTrend = (eventsPerMinuteTrendRaw || []).map((t) => ({ time: t._id, events: t.count }));

    // Compute Core Web Vitals P75 over last 30 minutes
    const thirtyMinAgo = new Date(now - 30 * 60 * 1000);
    const perfMatch = {
      ...(projectId ? { projectId } : {}),
      timestamp: { $gte: thirtyMinAgo },
      ...(pathPrefix ? { pageURL: { $regex: `^${pathPrefix}` } } : {}),
    };
    const perfDocs = await PerformanceMetrics.find(perfMatch)
      .select('LCP CLS INP')
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

    function percentile(arr, p) {
      if (!arr || arr.length === 0) return 0;
      const a = arr.slice().filter((v) => v !== undefined && v !== null && !Number.isNaN(v)).sort((x, y) => x - y);
      if (a.length === 0) return 0;
      const idx = Math.ceil((p / 100) * a.length) - 1;
      return a[Math.max(0, Math.min(a.length - 1, idx))];
    }

    const lcpVals = perfDocs.map((d) => d.LCP).filter((v) => typeof v === 'number');
    const clsVals = perfDocs.map((d) => d.CLS).filter((v) => typeof v === 'number');
    const inpVals = perfDocs.map((d) => d.INP).filter((v) => typeof v === 'number');

    const lcpP75 = Math.round(percentile(lcpVals, 75));
    const clsP75 = Math.round(percentile(clsVals, 75) * 1000) / 1000; // keep 3 decimals
    const inpP75 = Math.round(percentile(inpVals, 75));

    // Rage and error counts over last 10 minutes
    const tenMinAgo = new Date(now - 10 * 60 * 1000);

    // Error sessions: count perf documents with at least one jsError in window
    const errorsLast10m = await PerformanceMetrics.countDocuments({
      ...(projectId ? { projectId } : {}),
      timestamp: { $gte: tenMinAgo },
      jsErrors: { $exists: true, $ne: [] },
      ...(pathPrefix ? { pageURL: { $regex: `^${pathPrefix}` } } : {}),
    });

    // Rage sessions: heuristic based on 3+ clicks on same element within 3s window per session
    const clickDocs = await UserInteraction.find({
      ...(projectId ? { projectId } : {}),
      eventType: 'click',
      timestamp: { $gte: tenMinAgo },
      ...interactionSegmentMatch,
    })
      .select('sessionId pageURL metadata.element metadata.elementId metadata.text timestamp')
      .sort({ sessionId: 1, 'metadata.elementId': 1, timestamp: 1 })
      .lean();

    let rageLast10m = 0;
    const rageSessions = new Set();
    const keyFor = (doc) => `${doc.sessionId}|${doc.pageURL}|${doc.metadata?.elementId || doc.metadata?.element || doc.metadata?.text || 'unknown'}`;
    let i = 0;
    while (i < clickDocs.length) {
      const base = clickDocs[i];
      const baseKey = keyFor(base);
      let count = 1;
      let j = i + 1;
      while (j < clickDocs.length) {
        const cur = clickDocs[j];
        if (keyFor(cur) !== baseKey) break;
        if (new Date(cur.timestamp) - new Date(base.timestamp) <= 3000) {
          count++;
          j++;
          continue;
        }
        break;
      }
      if (count >= 3) {
        rageSessions.add(base.sessionId);
      }
      i = j;
    }
    rageLast10m = rageSessions.size;

    // Co-occurrence: sessions with both rage AND errors
    const errorSessions = await PerformanceMetrics.find({
      ...(projectId ? { projectId } : {}),
      timestamp: { $gte: tenMinAgo },
      jsErrors: { $exists: true, $ne: [] },
    }).distinct('sessionId');
    
    const errorSessionSet = new Set(errorSessions);
    const coOccurrence = [...rageSessions].filter(sid => errorSessionSet.has(sid)).length;

    const sessionData = sessionMetrics[0] || {
      totalSessions: 0,
      avgDuration: 0,
      totalBounced: 0,
      avgPageViews: 0,
    };

    const bounceRate = sessionData.totalSessions > 0
      ? (sessionData.totalBounced / sessionData.totalSessions) * 100
      : 0;

    // Format for RealTimeAnalyticsDashboard component
    res.json({
      success: true,
      // Flat structure for direct access
      totalVisitors: uniqueVisitors,
      activeVisitors: realTimeVisitors,
      totalPageViews,
      avgSessionDuration: Math.round(sessionData.avgDuration || 0),
      bounceRate: Math.round(bounceRate * 10) / 10,
      eventsPerMinute,
      eventsPerMinuteTrend,
      lcpP75,
      clsP75,
      inpP75,
      rageLast10m,
      errorsLast10m,
      rageErrorCoOccurrence: coOccurrence,
      topPages: topPages.map(p => ({
        page: p.pageURL, // Changed from 'url' to 'page' for frontend consistency
        views: p.views,
        uniqueVisitors: p.uniqueVisitors,
        avgTimeOnPage: Math.round(p.avgTimeOnPage || 0),
      })),
      deviceBreakdown: deviceBreakdown.map(d => ({
        device: d._id || 'Unknown', // Changed from 'type' to 'device'
        count: d.count,
      })),
      browserBreakdown: browserBreakdown.map(b => ({
        browser: b._id || 'Unknown',
        count: b.count,
      })),
      eventTrends: pageViewTrend.map(t => ({
        time: t._id, // Changed from 'date' to 'time'
        events: t.views, // Changed from 'views' to 'events'
      })),
      trafficSources: trafficSources.map(t => ({
        source: t._id,
        sessions: t.sessions,
      })),
      // Keep for backwards compatibility
      overview: {
        totalPageViews,
        uniqueVisitors,
        totalSessions: sessionData.totalSessions,
        avgSessionDuration: Math.round(sessionData.avgDuration || 0),
        bounceRate: Math.round(bounceRate * 10) / 10,
        avgPageViews: Math.round((sessionData.avgPageViews || 0) * 10) / 10,
        realTimeVisitors,
      },
      // Echo applied segment filters for client awareness
      segments: {
        device: device || null,
        country: country || null,
        utmSource: utmSource || null,
        referrerContains: referrerContains || null,
        pathPrefix: pathPrefix || null,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
};

// Get page-specific analytics
exports.getPageAnalytics = async (req, res) => {
  try {
    const { projectId, pageURL, from, to } = req.query;

    if (!pageURL) {
      return res.status(400).json({ error: 'pageURL is required' });
    }

    const matchQuery = { pageURL };
    if (projectId) matchQuery.projectId = projectId;

    const dateQuery = {};
    if (from || to) {
      if (from) dateQuery.$gte = new Date(from);
      if (to) dateQuery.$lte = new Date(to);
    }

    const [totalViews, uniqueVisitors, avgTimeOnPage, avgScrollDepth, viewTrend] = await Promise.all([
      PageView.countDocuments({
        ...matchQuery,
        ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
      }),

      PageView.distinct('userId', {
        ...matchQuery,
        ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
      }).then(users => users.length),

      PageView.aggregate([
        {
          $match: {
            ...matchQuery,
            ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$timeOnPage' },
            avgScroll: { $avg: '$scrollDepth' },
          },
        },
      ]),

      PageView.aggregate([
        {
          $match: {
            ...matchQuery,
            ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
            scrollDepth: { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgScrollDepth: { $avg: '$scrollDepth' },
          },
        },
      ]),

      PageView.aggregate([
        {
          $match: {
            ...matchQuery,
            ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
            views: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const avgData = avgTimeOnPage[0] || { avgTime: 0, avgScroll: 0 };
    const scrollData = avgScrollDepth[0] || { avgScrollDepth: 0 };

    res.json({
      success: true,
      pageAnalytics: {
        pageURL,
        totalViews,
        uniqueVisitors,
        avgTimeOnPage: Math.round(avgData.avgTime || 0),
        avgScrollDepth: Math.round(scrollData.avgScrollDepth || 0),
        viewTrend: viewTrend.map(t => ({
          date: t._id,
          views: t.views,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting page analytics:', error);
    res.status(500).json({ error: 'Failed to get page analytics' });
  }
};

// Get user flow (page transitions)
exports.getUserFlow = async (req, res) => {
  try {
    const { projectId, from, to } = req.query;

    const matchQuery = {};
    if (projectId) matchQuery.projectId = projectId;

    const dateQuery = {};
    if (from || to) {
      if (from) dateQuery.$gte = new Date(from);
      if (to) dateQuery.$lte = new Date(to);
    }

    const sessions = await Session.find({
      ...matchQuery,
      ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
      'pages.1': { $exists: true }, // At least 2 pages
    })
      .select('pages')
      .limit(1000);

    // Build flow map
    const flowMap = {};

    sessions.forEach(session => {
      for (let i = 0; i < session.pages.length - 1; i++) {
        const from = session.pages[i].url;
        const to = session.pages[i + 1].url;
        const key = `${from} → ${to}`;

        flowMap[key] = (flowMap[key] || 0) + 1;
      }
    });

    // Convert to array and sort
    const flows = Object.entries(flowMap)
      .map(([path, count]) => {
        const [from, to] = path.split(' → ');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({
      success: true,
      userFlows: flows,
    });
  } catch (error) {
    console.error('Error getting user flow:', error);
    res.status(500).json({ error: 'Failed to get user flow' });
  }
};
