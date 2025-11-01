const mongoose = require('mongoose');

const DeviceInfoSchema = new mongoose.Schema(
  {
    device: { type: String },
    browser: { type: String },
    os: { type: String }
  },
  { _id: false }
);

const PerformanceMetricsSchema = new mongoose.Schema(
  {
    pageURL: { type: String, required: true },
    TTFB: { type: Number },
    LCP: { type: Number },
    FCP: { type: Number },
    CLS: { type: Number },
    jsErrors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    timestamp: { type: Date, default: Date.now },
    deviceInfo: { type: DeviceInfoSchema, default: {} }
  },
  { collection: 'performance_metrics' }
);

module.exports = mongoose.model('PerformanceMetrics', PerformanceMetricsSchema);
