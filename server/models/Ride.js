const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  pickup: { address: String, lat: Number, lng: Number },
  dropoff: { address: String, lat: Number, lng: Number },
  // ADDED 'scheduled' to the status enum
  status: { type: String, enum: ['requested', 'scheduled', 'accepted', 'arrived', 'started', 'completed', 'cancelled'], default: 'requested' },
  fare: Number,
  distance: Number,
  startTime: Date,
  endTime: Date,
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  review: { type: String },
  rating: { type: Number },
  vehicleType: { type: String },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  cancellationReason: { type: String },
  otp: { type: String, default: null },
  chatSession: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession' },
  // ADDED a field to store the scheduled time
  scheduledFor: { type: Date } 
});

const Ride = mongoose.model('Ride', rideSchema);

module.exports = Ride;
