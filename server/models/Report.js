const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterRole: { type: String, enum: ['customer', 'driver'], required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isResolved: { type: Boolean, default: false }
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;