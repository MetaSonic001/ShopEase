const mongoose = require('mongoose');

const cohortSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  projectId: {
    type: String,
    default: 'default',
    index: true,
  },
  
  // Cohort definition
  conditions: {
    // Event-based conditions
    events: [{
      eventType: String,
      eventName: String,
      operator: String, // has_done, has_not_done, count_gt, count_lt
      value: mongoose.Schema.Types.Mixed,
    }],
    
    // User property conditions
    properties: [{
      key: String,
      operator: String, // equals, not_equals, contains, gt, lt
      value: mongoose.Schema.Types.Mixed,
    }],
    
    // Time-based conditions
    timeRange: {
      from: Date,
      to: Date,
      relative: String, // last_7_days, last_30_days, etc.
    },
  },
  
  // Cohort members
  userCount: {
    type: Number,
    default: 0,
  },
  
  // Stats
  stats: {
    avgSessionDuration: Number,
    avgPageViews: Number,
    conversionRate: Number,
    retentionRate: Number,
  },
  
  // Auto-update settings
  autoUpdate: {
    enabled: Boolean,
    frequency: String, // daily, weekly
    lastUpdated: Date,
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
  
}, {
  timestamps: true,
});

cohortSchema.index({ projectId: 1, isActive: 1 });

module.exports = mongoose.model('Cohort', cohortSchema);
