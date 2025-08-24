const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleType: { type: String, default: 'Not specified' }, // FIX: No longer required, has a default
  vehicleNumber: { type: String, default: 'Not specified' }, // FIX: No longer required, has a default
  rating: { type: Number, default: 5.0 },
  isOnline: { type: Boolean, default: false },
  currentLocation: { lat: Number, lng: Number },
  completedTrips: { type: Number, default: 0 },
  phoneNumber: { type: String },
  aadharNumber: { type: String },
  profilePhoto: { type: String },
  carPhoto: { type: String },
  drivingLicensePhoto: { type: String },
  upiId: { type: String },
    payoutAccountId: { type: String, default: null },
  profileCompleted: { type: Boolean, default: false },
  outstandingFine: { type: Number, default: 0 },
  rejectionReason: { type: String, default: null }
});

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;