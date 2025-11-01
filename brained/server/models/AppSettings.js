const mongoose = require('mongoose');

const AppSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    recordingEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSettings', AppSettingsSchema);
