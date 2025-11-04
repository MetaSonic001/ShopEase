const mongoose = require('mongoose');

const FeatureFlagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    value: { type: mongoose.Schema.Types.Mixed, default: true },
    conditions: { type: Object, default: {} }, // e.g., { users: ["user1"], percentage: 50 }
    projectId: { type: String, default: 'default' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeatureFlag', FeatureFlagSchema);
