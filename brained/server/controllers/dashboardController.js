const EventAnalytics = require('../models/EventAnalytics');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const Session = require('../models/Session');
const PageView = require('../models/PageView');

// Get comprehensive dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const { projectId, from, to } = req.query;

    const matchQuery = {};
    if (projectId) matchQuery.projectId = projectId;

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
        ...(Object.keys(dateQuery).length && { timestamp: dateQuery }),
      }),

      // Unique visitors (distinct user IDs)
      Session.distinct('userId', {
        ...matchQuery,
        ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
      }).then(users => users.length),

      // Session metrics
      Session.aggregate([
        {
          $match: {
            ...matchQuery,
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
            ...(Object.keys(dateQuery).length && { startTime: dateQuery }),
          },
        },
        {
          $group: {
            _id: '$device.deviceType',
            count: { $sum: 1 },
          },
        },
      ]),

      // Browser breakdown
      Session.aggregate([
        {
          $match: {
            ...matchQuery,
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
