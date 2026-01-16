const mongoose = require('mongoose');

const dangerZoneSchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
    unique: true
  },
  incidentCount: {
    type: Number,
    required: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DangerZone', dangerZoneSchema);
