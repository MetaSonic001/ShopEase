const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    index: true,
  },
  projectId: {
    type: String,
    index: true,
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in seconds
  },
  pageViews: {
    type: Number,
    default: 0,
  },
  events: {
    type: Number,
    default: 0,
  },
  entryPage: {
    type: String,
  },
  exitPage: {
    type: String,
  },
  referrer: {
    type: String,
  },
  utmSource: {
    type: String,
  },
  utmMedium: {
    type: String,
  },
  utmCampaign: {
    type: String,
  },
  device: {
    type: {
      type: String, // desktop, mobile, tablet
    },
    browser: String,
    os: String,
    screenResolution: String,
  },
  location: {
    country: String,
    city: String,
    ip: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  pages: [{
    url: String,
    title: String,
    timestamp: Date,
    timeSpent: Number, // seconds on page
  }],
  bounced: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
sessionSchema.index({ startTime: -1 });
sessionSchema.index({ projectId: 1, startTime: -1 });
sessionSchema.index({ sessionId: 1, isActive: 1 });

module.exports = mongoose.model('Session', sessionSchema);
