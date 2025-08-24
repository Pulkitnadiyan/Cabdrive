const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isDriver: { type: Boolean, default: false },
  location: { lat: Number, lng: Number },
  rideHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }],
  phoneNumber: { type: String },
  age: { type: Number },
  upiId: { type: String },
  outstandingFine: { type: Number, default: 0 },
  // REPLACED isSuspended with a field that stores the suspension end date
  suspendedUntil: { type: Date, default: null } 
});

const User = mongoose.model('User', userSchema);

module.exports = User;