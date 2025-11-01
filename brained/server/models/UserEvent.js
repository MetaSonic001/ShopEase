const mongoose = require('mongoose');

const userEventSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: String,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  projectId: {
    type: String,
    default: 'default',
    index: true,
  },
  
  // Event data
  eventType: {
    type: String,
    required: true,
    index: true,
    // click, hover, scroll, pageview, form_submit, button_click, purchase, etc.
  },
  eventName: {
    type: String,
    required: true,
  },
  
  // Page context
  pageURL: {
    type: String,
    required: true,
    index: true,
  },
  pageTitle: String,
  referrer: String,
  
  // Event metadata
  metadata: {
    // For clicks: element, id, className, text, coordinates
    element: String,
    id: String,
    className: String,
    text: String,
    x: Number,
    y: Number,
    
    // Viewport dimensions for heatmap normalization
    vw: Number,
    vh: Number,
    
    // For hovers: duration, area
    hoverDuration: Number,
    hoverArea: String,
    
    // For scrolls: depth, direction
    scrollDepth: Number,
    scrollDirection: String,
    
    // For forms: formId, fields
    formId: String,
    fields: [String],
    
    // Custom properties
    custom: mongoose.Schema.Types.Mixed,
  },
  
  // Device & browser info
  device: {
    type: String, // desktop, mobile, tablet
    browser: String,
    os: String,
    screenResolution: String,
    viewport: String,
  },
  
  // Location
  location: {
    country: String,
    city: String,
    region: String,
    ip: String,
  },
  
  // Timing
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  
  // Super properties (persistent user-level data)
  superProperties: {
    userPlan: String,
    userSegment: String,
    cohort: String,
    custom: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
userEventSchema.index({ projectId: 1, timestamp: -1 });
userEventSchema.index({ sessionId: 1, timestamp: 1 });
userEventSchema.index({ userId: 1, timestamp: -1 });
userEventSchema.index({ eventType: 1, timestamp: -1 });
userEventSchema.index({ pageURL: 1, eventType: 1 });

module.exports = mongoose.model('UserEvent', userEventSchema);
