const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema({
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
  
  // Feature flag or A/B test
  type: {
    type: String,
    enum: ['feature_flag', 'ab_test', 'multivariate'],
    default: 'feature_flag',
  },
  
  // Variants
  variants: [{
    key: {
      type: String,
      required: true,
    },
    name: String,
    description: String,
    weight: {
      type: Number,
      default: 50, // percentage
    },
    config: mongoose.Schema.Types.Mixed, // variant-specific config
  }],
  
  // Targeting
  targeting: {
    enabled: Boolean,
    conditions: {
      userProperties: mongoose.Schema.Types.Mixed,
      cohorts: [String],
      percentage: Number, // 0-100
    },
  },
  
  // Metrics to track
  metrics: [{
    name: String,
    eventType: String,
    eventName: String,
    aggregation: String, // count, sum, avg, unique
  }],
  
  // Results by variant
  results: [{
    variantKey: String,
    impressions: Number,
    conversions: Number,
    conversionRate: Number,
    avgValue: Number,
    confidence: Number, // statistical significance
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'running', 'paused', 'completed'],
    default: 'draft',
  },
  
  // Schedule
  schedule: {
    startDate: Date,
    endDate: Date,
  },
  
  // Winner (for completed tests)
  winner: {
    variantKey: String,
    reason: String,
    declaredAt: Date,
  },
  
}, {
  timestamps: true,
});

experimentSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model('Experiment', experimentSchema);
