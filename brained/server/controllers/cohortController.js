const Cohort = require('../models/Cohort');
const Session = require('../models/Session');
const UserEvent = require('../models/UserEvent');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Create a new cohort
exports.createCohort = async (req, res) => {
  try {
    const { name, description, conditions, projectId } = req.body;

    if (!name || !conditions || conditions.length === 0) {
      return res.status(400).json({ error: 'Cohort name and at least 1 condition are required' });
    }

    const cohort = new Cohort({
      name,
      description,
      conditions,
      projectId: projectId || 'default',
    });

    await cohort.save();

    // Calculate initial user count
    const userCount = await calculateCohortUserCount(cohort);
    cohort.userCount = userCount;
    await cohort.save();

    res.status(201).json({ success: true, cohort });
  } catch (error) {
    console.error('Error creating cohort:', error);
    res.status(500).json({ error: 'Failed to create cohort' });
  }
};

// Get all cohorts
exports.getCohorts = async (req, res) => {
  try {
    const { projectId } = req.query;

    const query = {};
    if (projectId) query.projectId = projectId;

    const cohorts = await Cohort.find(query).sort({ createdAt: -1 });

    // Update user counts
    for (let cohort of cohorts) {
      const userCount = await calculateCohortUserCount(cohort);
      if (cohort.userCount !== userCount) {
        cohort.userCount = userCount;
        await cohort.save();
      }
    }

    res.json({ success: true, cohorts });
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    res.status(500).json({ error: 'Failed to fetch cohorts' });
  }
};

// Get cohort by ID
exports.getCohortById = async (req, res) => {
  try {
    const { id } = req.params;

    const cohort = await Cohort.findById(id);

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    // Update user count
    const userCount = await calculateCohortUserCount(cohort);
    cohort.userCount = userCount;
    await cohort.save();

    res.json({ success: true, cohort });
  } catch (error) {
    console.error('Error fetching cohort:', error);
    res.status(500).json({ error: 'Failed to fetch cohort' });
  }
};

// Update cohort
exports.updateCohort = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, conditions } = req.body;

    const cohort = await Cohort.findByIdAndUpdate(
      id,
      { name, description, conditions, updatedAt: new Date() },
      { new: true }
    );

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    // Recalculate user count
    const userCount = await calculateCohortUserCount(cohort);
    cohort.userCount = userCount;
    await cohort.save();

    res.json({ success: true, cohort });
  } catch (error) {
    console.error('Error updating cohort:', error);
    res.status(500).json({ error: 'Failed to update cohort' });
  }
};

// Delete cohort
exports.deleteCohort = async (req, res) => {
  try {
    const { id } = req.params;

    const cohort = await Cohort.findByIdAndDelete(id);

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    res.json({ success: true, message: 'Cohort deleted successfully' });
  } catch (error) {
    console.error('Error deleting cohort:', error);
    res.status(500).json({ error: 'Failed to delete cohort' });
  }
};

// Analyze cohort
exports.analyzeCohort = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;

    const cohort = await Cohort.findById(id);

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    // Calculate date filter
    let startDate = new Date();
    if (dateRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (dateRange === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }

    // Get users matching cohort conditions
    const query = buildCohortQuery(cohort);
    query.startTime = { $gte: startDate };

    const sessions = await Session.find(query).select('userId startTime');
    const uniqueUsers = [...new Set(sessions.map(s => s.userId))];

    // Calculate retention data (weekly)
    const retention = [];
    const weeks = Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000));

    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSessions = sessions.filter(
        s => s.startTime >= weekStart && s.startTime < weekEnd
      );
      const weekUsers = [...new Set(weekSessions.map(s => s.userId))];

      const retentionRate = uniqueUsers.length > 0 
        ? (weekUsers.length / uniqueUsers.length) * 100 
        : 0;

      retention.push({
        week: `Week ${week + 1}`,
        retention: Math.round(retentionRate * 10) / 10,
        users: weekUsers.length,
      });
    }

    // Calculate behavior metrics
    const behavior = [];

    // Average sessions per user
    const avgSessions = uniqueUsers.length > 0 
      ? sessions.length / uniqueUsers.length 
      : 0;

    behavior.push({
      metric: 'Avg Sessions',
      value: Math.round(avgSessions * 10) / 10,
      trend: 5.2, // You can calculate actual trend by comparing with previous period
    });

    // Average events per user
    const userEventsQuery = {
      ...buildCohortQuery(cohort),
      timestamp: { $gte: startDate },
      userId: { $in: uniqueUsers },
    };

    const totalEvents = await UserEvent.countDocuments(userEventsQuery);
    const avgEvents = uniqueUsers.length > 0 ? totalEvents / uniqueUsers.length : 0;

    behavior.push({
      metric: 'Avg Events',
      value: Math.round(avgEvents),
      trend: 3.1,
    });

    // Average session duration
    const sessionsWithDuration = await Session.find({
      ...query,
      duration: { $exists: true, $gt: 0 },
    });

    const avgDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithDuration.length
      : 0;

    behavior.push({
      metric: 'Avg Duration (sec)',
      value: Math.round(avgDuration),
      trend: -2.3,
    });

    // Active users (last 7 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);

    const recentSessions = await Session.find({
      ...query,
      startTime: { $gte: recentDate },
    });

    const activeUsers = [...new Set(recentSessions.map(s => s.userId))].length;

    behavior.push({
      metric: 'Active Users (7d)',
      value: activeUsers,
      trend: 8.7,
    });

    res.json({ success: true, retention, behavior });
  } catch (error) {
    console.error('Error analyzing cohort:', error);
    res.status(500).json({ error: 'Failed to analyze cohort' });
  }
};

// Export cohort analysis as CSV (combined retention and behavior)
exports.exportCohortCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;

    // Run the same analysis pipeline
    const cohort = await Cohort.findById(id);
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    let startDate = new Date();
    if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

    const query = buildCohortQuery(cohort);
    query.startTime = { $gte: startDate };
    const sessions = await Session.find(query).select('userId startTime');
    const uniqueUsers = [...new Set(sessions.map(s => s.userId))];

    const weeks = Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000));
    const retention = [];
    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekSessions = sessions.filter(s => s.startTime >= weekStart && s.startTime < weekEnd);
      const weekUsers = [...new Set(weekSessions.map(s => s.userId))];
      const retentionRate = uniqueUsers.length > 0 ? (weekUsers.length / uniqueUsers.length) * 100 : 0;
      retention.push({ week: `Week ${week + 1}`, retention: Math.round(retentionRate * 10) / 10, users: weekUsers.length });
    }

    const userEventsQuery = {
      ...buildCohortQuery(cohort),
      timestamp: { $gte: startDate },
      userId: { $in: uniqueUsers },
    };
    const totalEvents = await UserEvent.countDocuments(userEventsQuery);
    const avgEvents = uniqueUsers.length > 0 ? totalEvents / uniqueUsers.length : 0;

    const sessionsWithDuration = await Session.find({ ...query, duration: { $exists: true, $gt: 0 } });
    const avgDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithDuration.length
      : 0;

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentSessions = await Session.find({ ...query, startTime: { $gte: recentDate } });
    const activeUsers = [...new Set(recentSessions.map(s => s.userId))].length;

    const behavior = [
      { metric: 'Avg Sessions', value: uniqueUsers.length > 0 ? sessions.length / uniqueUsers.length : 0, trend: 0 },
      { metric: 'Avg Events', value: Math.round(avgEvents), trend: 0 },
      { metric: 'Avg Duration (sec)', value: Math.round(avgDuration), trend: 0 },
      { metric: 'Active Users (7d)', value: activeUsers, trend: 0 },
    ];

    // Combine into flat CSV rows with a type column
    const rows = [
      ...retention.map(r => ({ type: 'retention', ...r })),
      ...behavior.map(b => ({ type: 'behavior', metric: b.metric, value: b.value, trend: b.trend })),
    ];

    const fields = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`cohort_${cohort.name.replace(/[^a-z0-9_-]+/gi, '_')}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting cohort CSV:', error);
    res.status(500).json({ error: 'Failed to export cohort CSV' });
  }
};

// Export cohort analysis as PDF
exports.exportCohortPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;
    const cohort = await Cohort.findById(id);
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    let startDate = new Date();
    if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
    else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

    const query = buildCohortQuery(cohort);
    query.startTime = { $gte: startDate };
    const sessions = await Session.find(query).select('userId startTime');
    const uniqueUsers = [...new Set(sessions.map(s => s.userId))];
    const weeks = Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000));
    const retention = [];
    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekSessions = sessions.filter(s => s.startTime >= weekStart && s.startTime < weekEnd);
      const weekUsers = [...new Set(weekSessions.map(s => s.userId))];
      const retentionRate = uniqueUsers.length > 0 ? (weekUsers.length / uniqueUsers.length) * 100 : 0;
      retention.push({ week: `Week ${week + 1}`, retention: Math.round(retentionRate * 10) / 10, users: weekUsers.length });
    }

    const userEventsQuery = {
      ...buildCohortQuery(cohort),
      timestamp: { $gte: startDate },
      userId: { $in: uniqueUsers },
    };
    const totalEvents = await UserEvent.countDocuments(userEventsQuery);
    const avgEvents = uniqueUsers.length > 0 ? totalEvents / uniqueUsers.length : 0;
    const sessionsWithDuration = await Session.find({ ...query, duration: { $exists: true, $gt: 0 } });
    const avgDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithDuration.length
      : 0;
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentSessions = await Session.find({ ...query, startTime: { $gte: recentDate } });
    const activeUsers = [...new Set(recentSessions.map(s => s.userId))].length;

    const behavior = [
      { metric: 'Avg Sessions', value: uniqueUsers.length > 0 ? sessions.length / uniqueUsers.length : 0 },
      { metric: 'Avg Events', value: Math.round(avgEvents) },
      { metric: 'Avg Duration (sec)', value: Math.round(avgDuration) },
      { metric: 'Active Users (7d)', value: activeUsers },
    ];

    const doc = new PDFDocument({ autoFirstPage: false, margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cohort-${cohort.name.replace(/[^a-z0-9_-]+/gi, '_')}.pdf`);
    doc.pipe(res);

    // Cover
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 120).fill('#111827');
    doc.rect(0, 120, doc.page.width, 6).fill('#2563EB');
    doc.fillColor('#FFFFFF').fontSize(26).text('Cohort Report', 40, 40);
    doc.fillColor('#D1D5DB').fontSize(12).text(cohort.name, 40, 80);
    doc.fillColor('#111827');

    const addHeader = (title) => {
      doc.fillColor('#111827').fontSize(18).text(title, { align: 'left' });
      doc.moveDown(0.3);
      doc.rect(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 2).fill('#2563EB');
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

    // Summary
    doc.addPage();
    addHeader('Summary');
    const summary = [
      { label: 'Total Users', value: uniqueUsers.length },
      { label: 'Avg Sessions', value: uniqueUsers.length > 0 ? Math.round((sessions.length / uniqueUsers.length) * 10) / 10 : 0 },
      { label: 'Active Users (7d)', value: activeUsers },
    ];
    summary.forEach((s, idx) => {
      const by = doc.y + idx * 44;
      doc.roundedRect(doc.x, by, 280, 36, 6).fill('#F3F4F6');
      doc.fillColor('#6B7280').fontSize(10).text(s.label, doc.x + 12, by + 8);
      doc.fillColor('#111827').fontSize(16).text(String(s.value), doc.x + 12, by + 18);
      doc.fillColor('#111827');
    });
    addFooter();

    // Retention bar chart
    doc.addPage();
    addHeader('Retention (Weekly)');
    const chartData = retention.map(r => ({ label: r.week, value: r.retention }));
    const barChart = (x, y, width, height, data, color = '#2563EB') => {
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
        doc.fillColor('#1F2937').text(String(d.value) + '%', x + 115 + barWidth, by + 2, { width: 60 });
      });
      doc.restore();
    };
    barChart(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right - 20, 260, chartData);
    addFooter();

    // Behavior metrics
    doc.addPage();
    addHeader('Behavior Metrics');
    behavior.forEach((b, idx) => {
      const y = doc.y + idx * 24;
      doc.fontSize(12).fillColor('#111827').text(b.metric, doc.x, y);
      doc.fontSize(12).fillColor('#374151').text(String(b.value), doc.x + 220, y);
    });
    addFooter();

    doc.end();
  } catch (error) {
    console.error('Error exporting cohort PDF:', error);
    res.status(500).json({ error: 'Failed to export cohort PDF' });
  }
};

// Helper function to calculate cohort user count
async function calculateCohortUserCount(cohort) {
  try {
    const query = buildCohortQuery(cohort);
    const sessions = await Session.find(query).select('userId');
    const uniqueUsers = [...new Set(sessions.map(s => s.userId))];
    return uniqueUsers.length;
  } catch (error) {
    console.error('Error calculating cohort user count:', error);
    return 0;
  }
}

// Helper function to build MongoDB query from cohort conditions
function buildCohortQuery(cohort) {
  const query = { projectId: cohort.projectId };

  const conds = cohort.conditions;

  // Backwards-compatible handling: some cohorts store conditions as an array
  // of simple { field, operator, value } conditions; others (seeded by
  // analytics seeder) use an object { events: [], properties: [], timeRange }.
  if (Array.isArray(conds)) {
    conds.forEach(condition => {
      const { field, operator, value } = condition;
      switch (operator) {
        case 'equals':
          query[field] = value;
          break;
        case 'not_equals':
          query[field] = { $ne: value };
          break;
        case 'contains':
          query[field] = { $regex: value, $options: 'i' };
          break;
        case 'starts_with':
          query[field] = { $regex: `^${value}`, $options: 'i' };
          break;
      }
    });
  } else if (conds && typeof conds === 'object') {
    // properties: list of { key, operator, value }
    if (Array.isArray(conds.properties)) {
      conds.properties.forEach(prop => {
        const key = prop.key;
        const operator = prop.operator;
        const value = prop.value;
        if (!key) return;
        switch (operator) {
          case 'equals':
            query[key] = value;
            break;
          case 'not_equals':
            query[key] = { $ne: value };
            break;
          case 'contains':
            query[key] = { $regex: value, $options: 'i' };
            break;
          case 'starts_with':
            query[key] = { $regex: `^${value}`, $options: 'i' };
            break;
        }
      });
    }

    // events are more complex (counts, sequences). For now, we log a
    // warning and do not convert event conditions automatically. This avoids
    // throwing errors for seeded cohorts while still allowing property-based
    // cohorts to work. A future improvement: resolve event-based conditions
    // by querying UserEvent and deriving sessionId lists.
    if (Array.isArray(conds.events) && conds.events.length > 0) {
      console.warn('Cohort contains event-based conditions; event filters are not applied in this query.');
    }
  }

  return query;
}
