/**
 * Heatmap Aggregation Service
 * 
 * Provides efficient clustering and aggregation of interaction points
 * for accurate heatmap visualization with 20px radius clustering.
 */

const UserInteraction = require('../models/UserInteraction');
const SessionRecording = require('../models/SessionRecording');
const HeatmapData = require('../models/HeatmapData');

/**
 * Calculate distance between two points
 */
function getDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Cluster nearby points within specified radius
 * @param {Array} points - Array of {x, y, intensity} objects
 * @param {number} radius - Clustering radius in pixels (default: 20)
 * @returns {Array} Clustered points with aggregated intensity
 */
function clusterPoints(points, radius = 20) {
  if (!points || points.length === 0) return [];

  const clusters = [];
  const processed = new Set();

  for (let i = 0; i < points.length; i++) {
    if (processed.has(i)) continue;

    const point = points[i];
    const cluster = {
      x: point.x,
      y: point.y,
      intensity: point.intensity || 1,
      count: 1,
      points: [point],
    };

    // Find all points within radius
    for (let j = i + 1; j < points.length; j++) {
      if (processed.has(j)) continue;

      const otherPoint = points[j];
      const distance = getDistance(point.x, point.y, otherPoint.x, otherPoint.y);

      if (distance <= radius) {
        cluster.points.push(otherPoint);
        cluster.intensity += otherPoint.intensity || 1;
        cluster.count++;
        processed.add(j);
      }
    }

    // Calculate weighted centroid
    if (cluster.points.length > 1) {
      let totalWeight = 0;
      let weightedX = 0;
      let weightedY = 0;

      cluster.points.forEach((p) => {
        const weight = p.intensity || 1;
        weightedX += p.x * weight;
        weightedY += p.y * weight;
        totalWeight += weight;
      });

      cluster.x = Math.round(weightedX / totalWeight);
      cluster.y = Math.round(weightedY / totalWeight);
    }

    clusters.push({
      x: cluster.x,
      y: cluster.y,
      intensity: cluster.intensity,
      count: cluster.count,
    });

    processed.add(i);
  }

  return clusters;
}

/**
 * Extract interaction points from session recordings
 * @param {Array} sessionIds - Array of session IDs
 * @param {string} eventType - Type of event (click, scroll, hover, mousemove)
 * @returns {Array} Array of {x, y, intensity, sessionId} objects
 */
async function extractPointsFromSessions(sessionIds, eventType) {
  const points = [];

  // First, try to get points from UserInteraction collection (faster)
  const interactions = await UserInteraction.find({
    sessionId: { $in: sessionIds },
    eventType,
    'metadata.x': { $exists: true },
    'metadata.y': { $exists: true },
  })
    .select('metadata.x metadata.y sessionId')
    .lean();

  interactions.forEach((interaction) => {
    if (interaction.metadata && interaction.metadata.x !== undefined && interaction.metadata.y !== undefined) {
      points.push({
        x: Math.round(interaction.metadata.x),
        y: Math.round(interaction.metadata.y),
        intensity: 1,
        sessionId: interaction.sessionId,
      });
    }
  });

  // TODO: Also extract from SessionRecording.events (rrweb events)
  // This would parse packed rrweb events to extract mouse positions
  // For now, we rely on UserInteraction data

  return points;
}

/**
 * Aggregate heatmap data from sessions
 * @param {string} pageURL - Page URL to aggregate
 * @param {string} type - Heatmap type (click, scroll, hover, mousemove)
 * @param {Array} sessionIds - Array of session IDs to include
 * @param {Object} options - Additional options
 * @returns {Object} Aggregated heatmap data
 */
async function aggregateHeatmapFromSessions(pageURL, type, sessionIds = null, options = {}) {
  try {
    console.log(`[HeatmapAggregation] Aggregating ${type} heatmap for ${pageURL}`);

    // If no sessionIds provided, get all sessions for this page
    if (!sessionIds || sessionIds.length === 0) {
      const sessions = await SessionRecording.find({
        pagesVisited: pageURL,
      })
        .select('sessionId')
        .lean();

      sessionIds = sessions.map((s) => s.sessionId);
    }

    if (sessionIds.length === 0) {
      console.log(`[HeatmapAggregation] No sessions found for ${pageURL}`);
      return {
        points: [],
        metadata: {
          totalInteractions: 0,
          uniqueUsers: 0,
          sessionCount: 0,
          lastUpdated: new Date(),
        },
        sessionIds: [],
      };
    }

    console.log(`[HeatmapAggregation] Processing ${sessionIds.length} sessions`);

    // Extract points from sessions
    const rawPoints = await extractPointsFromSessions(sessionIds, type);
    console.log(`[HeatmapAggregation] Extracted ${rawPoints.length} raw points`);

    // Cluster points with 20px radius
    const clusterRadius = options.clusterRadius || 20;
    const clusteredPoints = clusterPoints(rawPoints, clusterRadius);
    console.log(`[HeatmapAggregation] Clustered to ${clusteredPoints.length} points`);

    // Calculate metadata
    const uniqueUsers = new Set(
      await SessionRecording.find({ sessionId: { $in: sessionIds } })
        .distinct('userId')
    ).size;

    const metadata = {
      totalInteractions: rawPoints.length,
      uniqueUsers,
      sessionCount: sessionIds.length,
      lastUpdated: new Date(),
    };

    return {
      points: clusteredPoints,
      metadata,
      sessionIds,
    };
  } catch (error) {
    console.error('[HeatmapAggregation] Error aggregating heatmap:', error);
    throw error;
  }
}

/**
 * Update or create heatmap data in database
 * @param {string} pageURL - Page URL
 * @param {string} type - Heatmap type
 * @param {string} device - Device type (optional)
 * @param {Array} sessionIds - Session IDs (optional)
 * @returns {Object} Created/updated heatmap document
 */
async function updateHeatmapData(pageURL, type, device = 'unknown', sessionIds = null) {
  try {
    const aggregated = await aggregateHeatmapFromSessions(pageURL, type, sessionIds);

    // Find existing heatmap or create new one
    let heatmap = await HeatmapData.findOne({
      pageURL,
      type,
      device,
    });

    if (heatmap) {
      // Update existing
      heatmap.points = aggregated.points;
      heatmap.metadata = {
        ...heatmap.metadata,
        ...aggregated.metadata,
      };
      heatmap.sessionIds = aggregated.sessionIds;
      heatmap.updatedAt = new Date();
    } else {
      // Create new
      heatmap = new HeatmapData({
        pageURL,
        type,
        device,
        points: aggregated.points,
        metadata: aggregated.metadata,
        sessionIds: aggregated.sessionIds,
      });
    }

    await heatmap.save();
    console.log(`[HeatmapAggregation] Saved heatmap for ${pageURL} (${type})`);

    return heatmap;
  } catch (error) {
    console.error('[HeatmapAggregation] Error updating heatmap data:', error);
    throw error;
  }
}

/**
 * Regenerate all heatmaps for a specific page
 * @param {string} pageURL - Page URL
 * @param {Array} sessionIds - Optional session IDs to include
 */
async function regenerateHeatmapsForPage(pageURL, sessionIds = null) {
  const heatmapTypes = ['click', 'scroll', 'hover', 'mousemove'];
  const results = [];

  for (const type of heatmapTypes) {
    try {
      const heatmap = await updateHeatmapData(pageURL, type, 'unknown', sessionIds);
      results.push({ type, success: true, pointCount: heatmap.points.length });
    } catch (error) {
      console.error(`[HeatmapAggregation] Failed to regenerate ${type} heatmap:`, error);
      results.push({ type, success: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  clusterPoints,
  extractPointsFromSessions,
  aggregateHeatmapFromSessions,
  updateHeatmapData,
  regenerateHeatmapsForPage,
};
