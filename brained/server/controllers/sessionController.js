const Session = require('../models/Session');
const PageView = require('../models/PageView');
const { v4: uuidv4 } = require('uuid');

// Start a new session
exports.startSession = async (req, res) => {
  try {
    const {
      userId,
      projectId,
      entryPage,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      device,
      location,
    } = req.body;

    const sessionId = uuidv4();

    const session = new Session({
      sessionId,
      userId,
      projectId: projectId || 'default',
      entryPage,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      device,
      location,
      startTime: new Date(),
      isActive: true,
      lastActivityAt: new Date(),
    });

    await session.save();

    res.status(201).json({
      success: true,
      sessionId,
      message: 'Session started',
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

// Update session activity (heartbeat)
exports.updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { pageURL, pageTitle, timeOnPage, scrollDepth, exitPage } = req.body;

    const session = await Session.findOne({ sessionId, isActive: true });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update last activity
    session.lastActivityAt = new Date();
    session.pageViews = (session.pageViews || 0) + 1;

    // Add page to pages array
    if (pageURL) {
      session.pages.push({
        url: pageURL,
        title: pageTitle,
        timestamp: new Date(),
        timeSpent: timeOnPage,
      });
      
      // Update exit page
      session.exitPage = pageURL;
      
      // Track page view
      const pageView = new PageView({
        sessionId,
        userId: session.userId,
        projectId: session.projectId,
        pageURL,
        pageTitle,
        referrer: req.headers.referer,
        timestamp: new Date(),
        timeOnPage,
        scrollDepth,
        exitPage,
        device: session.device,
      });
      
      await pageView.save();
    }

    // Check if bounced (only 1 page view and quick exit)
    if (session.pageViews === 1 && timeOnPage < 5) {
      session.bounced = true;
    }

    await session.save();

    res.json({ success: true, message: 'Session updated' });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

// End session
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId, isActive: true });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.isActive = false;
    session.endTime = new Date();
    session.duration = Math.floor((session.endTime - session.startTime) / 1000); // seconds

    await session.save();

    res.json({ success: true, message: 'Session ended' });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
};

// Get active sessions count (real-time visitors)
exports.getActiveSessions = async (req, res) => {
  try {
    const { projectId } = req.query;
    
    // Consider sessions active if last activity was within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const query = {
      isActive: true,
      lastActivityAt: { $gte: fiveMinutesAgo },
    };
    
    if (projectId) {
      query.projectId = projectId;
    }

    const count = await Session.countDocuments(query);

    res.json({ success: true, activeVisitors: count });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
};

// Get session analytics
exports.getSessionAnalytics = async (req, res) => {
  try {
    const { projectId, from, to } = req.query;

    const matchQuery = {};
    
    if (projectId) {
      matchQuery.projectId = projectId;
    }
    
    if (from || to) {
      matchQuery.startTime = {};
      if (from) matchQuery.startTime.$gte = new Date(from);
      if (to) matchQuery.startTime.$lte = new Date(to);
    }

    // Aggregate session metrics
    const [totalSessions, avgDuration, bounceRate, avgPageViews] = await Promise.all([
      Session.countDocuments(matchQuery),
      Session.aggregate([
        { $match: matchQuery },
        { $match: { duration: { $exists: true } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
      ]),
      Session.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          bouncedSessions: { $sum: { $cond: ['$bounced', 1, 0] } },
        }},
      ]),
      Session.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, avgPageViews: { $avg: '$pageViews' } } },
      ]),
    ]);

    const avgSessionDuration = avgDuration[0]?.avgDuration || 0;
    const bounceRateValue = bounceRate[0] 
      ? (bounceRate[0].bouncedSessions / bounceRate[0].totalSessions) * 100 
      : 0;
    const avgPages = avgPageViews[0]?.avgPageViews || 0;

    res.json({
      success: true,
      analytics: {
        totalSessions,
        avgSessionDuration: Math.round(avgSessionDuration),
        bounceRate: Math.round(bounceRateValue * 10) / 10,
        avgPageViews: Math.round(avgPages * 10) / 10,
      },
    });
  } catch (error) {
    console.error('Error getting session analytics:', error);
    res.status(500).json({ error: 'Failed to get session analytics' });
  }
};
