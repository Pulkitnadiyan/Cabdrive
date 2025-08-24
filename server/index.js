const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs'); // Import the file system module
require('dotenv').config();
const paymentRoutes = require('./paymentRoutes');
const Report = require('./models/Report');
const ChatSession = require('./models/ChatSession');
// Router & models
const authRoutes = require('./authRoutes');
const User = require('./models/User');
const Driver = require('./models/Driver');
const adminRoutes = require('./adminRoutes');
const app = express();
const server = http.createServer(app);
const Ride = require('./models/Ride');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET missing in environment!');
  process.exit(1);
}

// --- Create uploads directory if it doesn't exist ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory.');
}


const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL || "http://192.168.203.44:5173",
  // ADD YOUR VERCEL URL HERE TO THE ALLOWED ORIGINS
  "https://cabrde-3n4zfj5jg-nadiyanpulkit06-3110s.projects.vercel.app"
];

// --- Middleware ---
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed from origin: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// --- Use Auth Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// --- Multer setup (upload for profile, vehicle, license images) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// --- JWT Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- OSRM & Fallback ---
const haversineDistance = (coord1, coord2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
const fetchRoadDistance = async (start, end) => {
  try {
    const response = await axios.get(`http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`);
    if (response.data.routes && response.data.routes.length > 0) {
      return response.data.routes[0].distance / 1000;
    }
    return 0;
  } catch (error) {
    console.error('OSRM API failed, falling back to haversine:', error.message);
    return haversineDistance(start, end);
  }
};

// --- Socket.io Setup ---
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// PASS THE IO INSTANCE TO THE ADMIN ROUTES
adminRoutes.setIoInstance(io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});
io.on('connection', async (socket) => {
  const userId = socket.user?.userId;
  if (!userId) {
    socket.disconnect();
    return;
  }

  if (socket.user.isDriver) {
    socket.join(`driver_${userId}`);
    socket.join('drivers');
    try {
      const driver = await Driver.findOne({ user: userId });
      if (driver && driver.vehicleType) {
        socket.join(driver.vehicleType);
      }
    } catch (error) {
      console.error("Error finding driver for socket room:", error);
    }
  } else {
    socket.join(`user_${userId}`);
  }

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  socket.on('joinRideRoom', (rideId) => {
    socket.join(rideId);
    console.log(`User ${userId} joined ride room: ${rideId}`);
  });

  socket.on('populateChatHistory', ({ rideId, messages }) => {
    io.to(socket.id).emit('chatHistory', { rideId, messages });
  });

// FIX: This section is rewritten for reliability
socket.on('sendMessage', async ({ rideId, senderId, text, tempId }) => {
  try {
    // Find the sender's username
    const sender = await User.findById(senderId).select('username');
    if (!sender) {
      console.error('Sender not found for message:', senderId);
      return;
    }

    // Create the message object to be saved in the database
    const newMessage = {
      sender: senderId,
      text: text,
      timestamp: new Date(),
    };

    // Find and update the chat session
    const chatSession = await ChatSession.findOneAndUpdate(
      { ride: rideId },
      { $push: { messages: newMessage } },
      { upsert: true, new: true }
    );

    // Get the saved message and build the final payload
    const savedMessage = chatSession.messages[chatSession.messages.length - 1];
    const messagePayload = {
      _id: savedMessage._id,
      ride: rideId,
      sender: {
        _id: sender._id,
        username: sender.username,
      },
      text: savedMessage.text,
      timestamp: savedMessage.timestamp,
      tempId,  // Echo back the tempId to help client deduplicate
    };

    // Broadcast the final payload to all clients in the ride room
    io.to(rideId).emit('chatMessage', messagePayload);
  } catch (error) {
    console.error('Error sending message:', error);
  }
});


  socket.on('requestInitialRides', async () => {
    try {
      const expiryMinutes = 60;
      const expiryTime = new Date(Date.now() - expiryMinutes * 60000);
      const rides = await Ride.find({
        status: 'requested',
        driver: { $exists: false },
        createdAt: { $gte: expiryTime }
      }).populate('user', 'username').sort({ createdAt: 1 });
      socket.emit('initialRides', rides);
    } catch (error) {
      console.error('Error fetching initial rides:', error);
    }
  });

  socket.on('updateLocation', async (data) => {
    const { userId, location } = data;
    if (!userId || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return;
    try {
      await Driver.findOneAndUpdate({ user: userId }, { currentLocation: location });
      socket.broadcast.emit('driverLocationUpdate', { driverId: userId, location });
    } catch (error) {
      console.error('Error updating location via socket:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- API endpoint to fetch chat history
app.get('/api/chat/:rideId', authenticateToken, async (req, res) => {
  try {
    const chatSession = await ChatSession.findOne({ ride: req.params.rideId })
      .populate('messages.sender', 'username');

    if (!chatSession) {
      return res.json([]);
    }

    const ride = await Ride.findById(req.params.rideId);
    const isParticipant = ride.user.toString() === req.user.userId || (ride.driver && ride.driver.user.toString() === req.user.userId);
    if (!isParticipant) {
      return res.status(403).json({ error: "Unauthorized access to chat." });
    }

    res.json(chatSession.messages);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Server error fetching chat history." });
  }
});

app.post('/api/auth/reauthenticate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate a new token with the user's most recent data from the database
    const newToken = jwt.sign(
      { userId: user._id, isDriver: user.isDriver },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: newToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isDriver: user.isDriver,
      },
    });
  } catch (error) {
    console.error('Error during reauthentication:', error);
    res.status(500).json({ error: 'Server error during reauthentication.' });
  }
});

// --- RIDE: Report a customer (CORRECTED) ---
app.post('/api/rides/:id/report-customer', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const ride = await Ride.findById(req.params.id).populate({
      path: 'driver',
      populate: { path: 'user' }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const isDriverOfThisRide = ride.driver && ride.driver.user && ride.driver.user._id.toString() === req.user.userId;
    if (!isDriverOfThisRide) {
      return res.status(403).json({ error: 'You are not authorized to report this customer.' });
    }

    const existingReport = await Report.findOne({ ride: ride._id, reporter: req.user.userId });
    if (existingReport) {
      return res.status(400).json({ error: 'You have already submitted a report for this ride.' });
    }

    const newReport = new Report({
      ride: ride._id,
      reporter: req.user.userId,
      reportedUser: ride.user,
      reporterRole: 'driver',
      reason: reason,
    });

    await newReport.save();

    res.status(201).json({ success: true, message: 'Your report has been submitted and will be reviewed.' });
  } catch (err) {
    console.error('Error submitting customer report:', err);
    res.status(500).json({ error: 'Server error while submitting your report.' });
  }
});


// --- DRIVER: Go Online/Offline ---
app.post('/api/drivers/status', authenticateToken, async (req, res) => {
  if (!req.user.isDriver) return res.status(403).json({ error: 'Only drivers can update status.' });
  const { isOnline, location } = req.body;
  try {
    const driver = await Driver.findOneAndUpdate(
      { user: req.user.userId },
      { isOnline, currentLocation: location },
      { new: true }
    );
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });
    io.emit('driverStatusUpdate', {
      driverId: driver._id,
      isOnline: driver.isOnline,
      location: driver.currentLocation,
    });
    res.json({ success: true, isOnline: driver.isOnline });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ error: 'Server error while updating status.' });
  }
});

// --- DRIVER: Profile update ---
app.put(
  '/api/drivers/profile/:id',
  authenticateToken,
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'carPhoto', maxCount: 1 },
    { name: 'drivingLicensePhoto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { name, email, vehicleType, vehiclePlate, phoneNumber, aadharNumber, upiId } = req.body;

      const userToUpdate = await User.findById(req.params.id);
      if (!userToUpdate) {
        return res.status(404).json({ error: 'User not found.' });
      }
      userToUpdate.username = name;
      userToUpdate.email = email;

      const driver = await Driver.findOneAndUpdate(
        { user: req.params.id },
        { user: req.params.id },
        { new: true, upsert: true }
      );

      driver.vehicleType = vehicleType;
      driver.vehicleNumber = vehiclePlate;
      driver.phoneNumber = phoneNumber;
      driver.aadharNumber = aadharNumber;
      driver.upiId = upiId;

      if (req.files['profilePhoto']) driver.profilePhoto = req.files['profilePhoto'][0].path;
      if (req.files['carPhoto']) driver.carPhoto = req.files['carPhoto'][0].path;
      if (req.files['drivingLicensePhoto']) driver.drivingLicensePhoto = req.files['drivingLicensePhoto'][0].path;

      // MODIFICATION: Do NOT automatically verify. Admin will do this.
      // We also set user.isDriver to false to ensure they can't access rides yet.
      driver.profileCompleted = false;
      driver.rejectionReason = null; // Clear any previous rejection reason on resubmission
      userToUpdate.isDriver = false;

      await userToUpdate.save();
      const updatedDriver = await driver.save();

      const populatedDriver = await Driver.findById(updatedDriver._id).populate('user', 'username email');
      res.json({
        name: populatedDriver.user.username,
        email: populatedDriver.user.email,
        vehicleType: populatedDriver.vehicleType,
        vehiclePlate: populatedDriver.vehicleNumber,
        rating: populatedDriver.rating,
        phoneNumber: populatedDriver.phoneNumber,
        aadharNumber: populatedDriver.aadharNumber,
        profilePhoto: populatedDriver.profilePhoto ? `${BACKEND_URL}/${populatedDriver.profilePhoto.replace(/\\/g, '/')}` : '',
        carPhoto: populatedDriver.carPhoto ? `${BACKEND_URL}/${populatedDriver.carPhoto.replace(/\\/g, '/')}` : '',
        drivingLicensePhoto: populatedDriver.drivingLicensePhoto ? `${BACKEND_URL}/${populatedDriver.drivingLicensePhoto.replace(/\\/g, '/')}` : '',
        upiId: populatedDriver.upiId,
        profileCompleted: populatedDriver.profileCompleted, // This will be false
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);
// --- DRIVER: Get driver profile ---
app.get('/api/drivers/profile/:id', authenticateToken, async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.params.id }).populate('user', 'username email');
    if (!driver) return res.status(404).json({ error: 'Driver profile not found.' });
    res.json({
      name: driver.user.username,
      email: driver.user.email,
      vehicleType: driver.vehicleType,
      vehiclePlate: driver.vehicleNumber,
      rating: driver.rating,
      phoneNumber: driver.phoneNumber,
      aadharNumber: driver.aadharNumber,
      profilePhoto: driver.profilePhoto ? `${BACKEND_URL}/${driver.profilePhoto.replace(/\\/g, '/')}` : '',
      carPhoto: driver.carPhoto ? `${BACKEND_URL}/${driver.carPhoto.replace(/\\/g, '/')}` : '',
      drivingLicensePhoto: driver.drivingLicensePhoto ? `${BACKEND_URL}/${driver.drivingLicensePhoto.replace(/\\/g, '/')}` : '',
      upiId: driver.upiId,
      profileCompleted: driver.profileCompleted,
      outstandingFine: driver.outstandingFine || 0,
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({ error: 'Server error while fetching profile.' });
  }
});
// --- RIDE: Get user's ride history ---

app.get('/api/rides/history', authenticateToken, async (req, res) => {
  try {
    const query = Ride.find({ user: req.user.userId }).sort({ createdAt: -1 });

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        query.limit(limit);
      }
    }

    const rides = await query.exec();

    const sanitizedRides = await Promise.all(
      rides.map(async (ride) => {
        const rideObject = ride.toObject();

        let driverInfo = null;
        if (rideObject.driver) {
          try {
            const driver = await Driver.findById(rideObject.driver);
            if (driver && driver.user) {
              const driverUser = await User.findById(driver.user).select('username');
              if (driverUser) {
                driverInfo = {
                  ...driver.toObject(),
                  user: driverUser.toObject(),
                };
              }
            }
          } catch (e) {
            console.error("Error fetching driver details for a ride:", e);
          }
        }

        return {
          _id: rideObject._id,
          status: rideObject.status || 'unknown',
          fare: rideObject.fare ?? 0,
          distance: rideObject.distance ?? 0,
          createdAt: rideObject.createdAt,
          startTime: rideObject.startTime,
          endTime: rideObject.endTime,
          pickup: {
            address: rideObject.pickup?.address || 'Unknown Pickup Address',
          },
          dropoff: {
            address: rideObject.dropoff?.address || 'Unknown Dropoff Address',
          },
          driver: driverInfo,
        };
      })
    );

    res.json(sanitizedRides);
  } catch (error) {
    console.error('CRITICAL FAILURE in /api/rides/history:', error);
    res.status(500).json({ error: 'A critical server error occurred.' });
  }
});

// --- USER: Get user profile ---
app.get('/api/users/profile/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
      name: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      age: user.age,
      outstandingFine: user.outstandingFine || 0,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error while fetching profile.' });
  }
});

// --- DRIVER: Find nearby drivers ---
app.get('/api/drivers/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const customerLocation = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };

    const onlineDrivers = await Driver.find({
      isOnline: true,
      profileCompleted: true,
    }).populate('user', 'username');

    const searchRadiusKm = 10;
    const nearbyDrivers = onlineDrivers.filter(driver => {
      if (!driver.currentLocation || driver.currentLocation.lat == null || driver.currentLocation.lng == null) {
        return false;
      }
      const distance = haversineDistance(customerLocation, driver.currentLocation);
      return distance <= searchRadiusKm;
    });

    res.json(nearbyDrivers);
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    res.status(500).json({ error: 'Server error while fetching nearby drivers.' });
  }
});

// --- RIDE: Request a new ride ---
app.post('/api/rides/request', authenticateToken, async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType, fare, scheduledFor } = req.body;
    if (!pickup || !dropoff || !vehicleType) {
      return res.status(400).json({ error: 'Pickup, dropoff, and vehicle type are required.' });
    }
    
    // Check for outstanding fine
    const userWithFine = await User.findById(req.user.userId);
    if (userWithFine.outstandingFine > 0) {
        return res.status(403).json({ error: `You cannot book a new ride with an outstanding fine of ₹${userWithFine.outstandingFine}.` });
    }

    const distance = await fetchRoadDistance(pickup, dropoff);

    const newChatSession = new ChatSession({
      ride: null,
      messages: []
    });

    const newRideData = {
      user: req.user.userId,
      pickup,
      dropoff,
      distance: parseFloat(distance.toFixed(2)),
      fare,
      vehicleType,
      chatSession: newChatSession._id,
      status: scheduledFor ? 'scheduled' : 'requested',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    };

    const newRide = new Ride(newRideData);
    newChatSession.ride = newRide._id;

    await newRide.save();
    await newChatSession.save();

    // Prepare notification payload
    const rideForNotification = await Ride.findById(newRide._id).populate('user', 'username');

    if (newRide.status === 'requested') {
      io.to(vehicleType).emit('newRideRequest', rideForNotification);
    } else if (newRide.status === 'scheduled') {
      io.to(vehicleType).emit('newScheduledRide', rideForNotification);
    }

    res.status(201).json(newRide);
  } catch (error) {
    console.error("Error in /api/rides/request:", error);
    res.status(500).json({ error: 'Server error while requesting ride.' });
  }
});

// --- RIDE: Get specific ride details (Corrected and Robust) ---
app.get('/api/rides/:id', authenticateToken, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('user', 'username email phoneNumber')
      .populate({
        path: 'driver',
        populate: {
          path: 'user',
          select: 'username'
        }
      });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const isCustomer = ride.user._id.toString() === req.user.userId;
    const isDriver = ride.driver && ride.driver.user && ride.driver.user._id.toString() === req.user.userId;

    if (!isCustomer && !isDriver) {
      return res.status(403).json({ error: 'You are not authorized to view this ride.' });
    }
    const rideObject = ride.toObject();

    if (rideObject.driver && rideObject.driver.profilePhoto) {
      rideObject.driver.profilePhoto = `${BACKEND_URL}/${rideObject.driver.profilePhoto.replace(/\\/g, '/')}`;
    }

    res.json(rideObject);
  } catch (error) {
    console.error('Error fetching ride details:', error);
    res.status(500).json({ error: 'Server error while fetching ride details.' });
  }
});

// --- DRIVER: Get driver trip history ---
app.get('/api/drivers/trips', authenticateToken, async (req, res) => {
  if (!req.user.isDriver) return res.status(403).json({ error: 'Only drivers can view trip history.' });
  try {
    const driver = await Driver.findOne({ user: req.user.userId });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    const rides = await Ride.find({ driver: driver._id })
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    res.json(rides);
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    res.status(500).json({ error: 'Server error while fetching trips.' });
  }
});

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
};

// --- RIDE: Accept ride (CORRECTED) ---
app.post('/api/rides/:id/accept', authenticateToken, async (req, res) => {
  if (!req.user.isDriver) {
    return res.status(403).json({ error: 'Only drivers can accept rides.' });
  }

  try {
    const driver = await Driver.findOne({ user: req.user.userId }).populate('user');
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    const otp = generateOTP();
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: 'requested', driver: { $exists: false } },
      {
        $set: {
          driver: driver._id,
          status: 'accepted',
          acceptedAt: new Date(),
          otp: otp
        }
      },
      { new: true }
    );

    if (!ride) {
      return res.status(400).json({ error: 'Ride not available or already accepted.' });
    }

    io.to(`user_${ride.user}`).emit('rideAccepted', {
      rideId: ride._id,
      driverName: driver.user.username,
      driverDetails: {
        user: { username: driver.user.username },
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        rating: driver.rating
      },
      otp: otp
    });

    io.to(`user_${ride.user}`).emit('rideStatusUpdate', {
      rideId: ride._id,
      status: 'accepted'
    });

    io.to(`driver_${req.user.userId}`).emit('rideStatusUpdate', {
      rideId: ride._id,
      status: ride.status
    });

    io.to('drivers').emit('rideTaken', { rideId: ride._id });

    res.json(ride);

  } catch (error) {
    console.error('Error accepting ride:', error);
    res.status(500).json({ error: 'A server error occurred while accepting the ride.' });
  }
});

// --- RIDE: Verify OTP (NEW) ---
app.post('/api/rides/:id/verify-otp', authenticateToken, async (req, res) => {
  try {
    const { otp } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const isDriver = ride.driver && ride.driver.toString() === (await Driver.findOne({ user: req.user.userId }))._id.toString();
    if (!isDriver) {
      return res.status(403).json({ error: 'You are not the assigned driver for this ride.' });
    }

    if (ride.otp && ride.otp === otp) {
      ride.otp = null; // Invalidate OTP after use
      await ride.save();
      return res.json({ success: true, message: 'OTP verified successfully.' });
    }

    res.status(400).json({ success: false, error: 'Invalid OTP.' });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Server error while verifying OTP.' });
  }
});


// --- RIDE: Update ride status (CORRECTED) ---
app.put('/api/rides/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = ['requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid ride status.' });
    }

    // CORRECTED: Populate the driver and driver's user data immediately
    const ride = await Ride.findById(id).populate({
      path: 'driver',
      populate: { path: 'user', select: '_id' }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if the user is authorized to update the ride
    const isDriver = ride.driver && ride.driver.user && ride.driver.user._id.toString() === req.user.userId;
    const isCustomer = ride.user.toString() === req.user.userId;

    if (!isDriver && !isCustomer) {
      return res.status(403).json({ error: 'Access denied. You are not authorized to update this ride.' });
    }

    // Prevent starting a ride if the OTP has not been verified
    if (status === 'started' && ride.otp) {
      return res.status(403).json({ error: 'OTP must be verified to start the ride.' });
    }

    ride.status = status;
    if (status === 'started') {
      ride.startTime = new Date();
    } else if (status === 'completed') {
      ride.endTime = new Date();
    }

    await ride.save();

    // Emit the status update to the customer's room
    io.to(`user_${ride.user.toString()}`).emit('rideStatusUpdate', { rideId: ride._id, status: ride.status });

    // Emit the status update to the driver's own room, in case they are on another page
    if (ride.driver && ride.driver.user) {
      io.to(`driver_${ride.driver.user._id.toString()}`).emit('rideStatusUpdate', { rideId: ride._id, status: ride.status });
    }

    const populatedRide = await ride.populate('user', 'username email phoneNumber');

    res.json(populatedRide);
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({ error: 'Server error while updating status.' });
  }
});

// Add this route to your existing index.js file
app.post('/api/chat/chatbot', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Define a brief persona for the chatbot
    const persona = "You are a virtual assistant for a cab-hailing service named CabRide. Your only function is to answer questions directly related to our service, such as booking rides, payments, account issues, or driver information. You must refuse to answer any questions outside of these topics by saying, 'I can only assist with questions about your CabRide service.' Do not provide any other information or engage in general conversation. Here is some factual information about the service: Our base fare is ₹40, and the price per kilometer is ₹12. For complex issues, customers can contact human support by submitting a report in the app. Drivers must upload a profile photo, car photo, and driving license, which will be verified by an admin before they can accept rides. Our service area is limited to the Chandigarh, India area.";

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: persona + "\n" + message }] });
    const payload = { contents: chatHistory };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        return res.status(response.status).json({ error: "Failed to get response from AI model." });
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that. Please try again.";
      return res.json({ response: text });
    } catch (fetchError) {
      console.error('Fetch Error:', fetchError);
      return res.status(500).json({ error: "Failed to connect to the AI model server." });
    }
  } catch (error) {
    console.error('Chatbot API Error:', error);
    res.status(500).json({ error: 'Server error while processing your request.' });
  }
});

// --- RIDE: Cancel ride (CORRECTED) ---
app.post('/api/rides/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { reason } = req.body;
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        const userToUpdate = await User.findById(req.user.userId);
        const isCustomer = userToUpdate && ride.user.toString() === req.user.userId;
        const driverToUpdate = await Driver.findOne({ user: req.user.userId });
        const isDriver = driverToUpdate && ride.driver && driverToUpdate._id.toString() === ride.driver.toString();

        if (!isCustomer && !isDriver) {
            return res.status(403).json({ error: 'You are not authorized to cancel this ride.' });
        }

        if (ride.status === 'completed' || ride.status === 'cancelled') {
            return res.status(400).json({ error: 'This ride cannot be cancelled.' });
        }

        const timeSinceAccepted = ride.acceptedAt ? (new Date() - new Date(ride.acceptedAt)) / 1000 / 60 : 0;
        let fineApplied = false;

        if (isCustomer && ['accepted'].includes(ride.status) && timeSinceAccepted > 3) {
            userToUpdate.outstandingFine = (userToUpdate.outstandingFine || 0) + 50;
            await userToUpdate.save();
            fineApplied = true;
        }

        if (isDriver && ['accepted', 'arrived'].includes(ride.status) && timeSinceAccepted > 3) {
            driverToUpdate.outstandingFine = (driverToUpdate.outstandingFine || 0) + 30;
            await driverToUpdate.save();
            fineApplied = true;
        }

        ride.status = 'cancelled';
        ride.cancellationReason = reason || (isDriver ? 'Cancelled by driver' : 'Cancelled by user');
        await ride.save();

        if (isCustomer && ride.driver) {
            const driver = await Driver.findById(ride.driver);
            if (driver) {
                // FIX: Emit a newNotification event for the driver
                if (fineApplied) {
                    io.to(`driver_${driver.user}`).emit('newNotification', {
                        id: ride._id + Date.now(),
                        message: `A customer cancelled a ride. You will receive a compensation of ₹30.`,
                        timestamp: new Date(),
                    });
                } else {
                    io.to(`driver_${driver.user}`).emit('newNotification', {
                        id: ride._id + Date.now(),
                        message: `A customer cancelled the ride.`,
                        timestamp: new Date(),
                    });
                }
                io.to(`driver_${driver.user}`).emit('rideCancelled', { rideId: ride._id, fineApplied: fineApplied });
            }
        } else if (isDriver) {
            // FIX: Emit a newNotification event for the customer
            if (fineApplied) {
                io.to(`user_${ride.user}`).emit('newNotification', {
                    id: ride._id + Date.now(),
                    message: `Your ride was cancelled by the driver. A cancellation fine of ₹30 has been applied to the driver.`,
                    timestamp: new Date(),
                });
            } else {
                io.to(`user_${ride.user}`).emit('newNotification', {
                    id: ride._id + Date.now(),
                    message: `Your ride was cancelled by the driver.`,
                    timestamp: new Date(),
                });
            }
            io.to(`user_${ride.user}`).emit('rideCancelled', { rideId: ride._id, fineApplied: fineApplied });
        }
        
        io.emit('rideStatusUpdate', { rideId: ride._id, status: 'cancelled' });

        let responseMessage = "You have successfully cancelled the ride.";
        if (fineApplied) {
            const fineAmount = isCustomer ? 50 : 30;
            responseMessage = `You have cancelled the ride. A cancellation fine of ₹${fineAmount} has been applied to your account.`;
        }

        res.json({
            success: true,
            message: responseMessage,
            fineApplied: fineApplied
        });

    } catch (error) {
        console.error('Error cancelling ride:', error);
        res.status(500).json({ error: 'Server error while cancelling ride.' });
    }
});
// --- RIDE: QR code payment generation ---
app.get('/api/rides/:id/qrcode', authenticateToken, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate({ path: 'driver', populate: { path: 'user', select: '_id username' } });
    if (!ride) return res.status(404).json({ error: 'Ride not found.' });

    const isOwner = ride.user && ride.user._id.toString() === req.user.userId.toString();
    const isAssignedDriver = ride.driver && ride.driver.user && ride.driver.user._id.toString() === req.user.userId.toString();
    if (!isOwner && !isAssignedDriver) return res.status(403).json({ error: 'Access denied.' });
    if (ride.status !== 'completed') return res.status(400).json({ error: 'Ride must be completed.' });

    const upiId = 'nadiyanpulkit06@oksbi';
    const payeeName = 'CabRide Platform';
    const transactionId = ride._id.toString();
    const amount = ride.fare?.toFixed(2) || '0.00';
    const upiPaymentString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tr=${transactionId}&tn=Payment for CabRide`;
    const qrImage = await qrcode.toDataURL(upiPaymentString);

    res.json({ upiPaymentString, qrImage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate payment QR code.' });
  }
});

// --- RIDE: Mark as paid (for desktop simulation) ---
app.post('/api/rides/:id/mark-as-paid', authenticateToken, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate({
      path: 'driver',
      populate: { path: 'user', select: '_id' }
    });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'You are not authorized to pay for this ride.' });
    }

    ride.paymentStatus = 'paid';
    await ride.save();

    if (ride.driver && ride.driver.user) {
      const driverUserId = ride.driver.user._id.toString();
      io.to(`driver_${driverUserId}`).emit('paymentComplete', {
        rideId: ride._id,
        status: 'paid'
      });
    }

    res.json({ success: true, message: 'Payment marked as successful.' });
  } catch (err) {
    console.error('Error marking ride as paid:', err);
    res.status(500).json({ error: 'Server error while marking payment.' });
  }
});
app.get('/api/drivers/scheduled-rides', authenticateToken, async (req, res) => {
  if (!req.user.isDriver) return res.status(403).json({ error: 'Only drivers allowed.' });
  try {
    const driver = await Driver.findOne({ user: req.user.userId });
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });
    const rides = await Ride.find({
      driver: driver._id,
      status: 'scheduled',
      scheduledFor: { $gte: new Date() }
    }).sort({ scheduledFor: 1 });
    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch scheduled rides.' });
  }
});

app.get('/api/users/frequent-locations', authenticateToken, async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user.userId, status: 'completed' });
    const locationFrequency = {};

    rides.forEach(ride => {
      const { address: pickupAddress, lat: pickupLat, lng: pickupLng } = ride.pickup;
      const { address: dropoffAddress, lat: dropoffLat, lng: dropoffLng } = ride.dropoff;

      if (pickupAddress) {
        if (!locationFrequency[pickupAddress]) {
          locationFrequency[pickupAddress] = { count: 0, address: pickupAddress, coords: { lat: pickupLat, lng: pickupLng } };
        }
        locationFrequency[pickupAddress].count++;
      }
      if (dropoffAddress) {
        if (!locationFrequency[dropoffAddress]) {
          locationFrequency[dropoffAddress] = { count: 0, address: dropoffAddress, coords: { lat: dropoffLat, lng: dropoffLng } };
        }
        locationFrequency[dropoffAddress].count++;
      }
    });

    const sortedLocations = Object.values(locationFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Return top 5

    res.json(sortedLocations);
  } catch (error) {
    console.error('Error fetching frequent locations:', error);
    res.status(500).json({ error: 'Server error while fetching frequent locations.' });
  }
});


// index.js (Update the /api/rides/request route)

// --- RIDE: Request a new ride ---
app.post('/api/rides/request', authenticateToken, async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType, fare, scheduledFor } = req.body; // Destructure scheduledFor
    if (!pickup || !dropoff || !vehicleType) {
      return res.status(400).json({ error: 'Pickup, dropoff, and vehicle type are required.' });
    }
    
    // Check for outstanding fine
    const userWithFine = await User.findById(req.user.userId);
    if (userWithFine.outstandingFine > 0) {
        return res.status(403).json({ error: `You cannot book a new ride with an outstanding fine of ₹${userWithFine.outstandingFine}.` });
    }

    const distance = await fetchRoadDistance(pickup, dropoff);

    const newChatSession = new ChatSession({
      ride: null,
      messages: []
    });

    const newRideData = {
      user: req.user.userId,
      pickup,
      dropoff,
      distance: parseFloat(distance.toFixed(2)),
      fare,
      vehicleType: vehicleType,
      chatSession: newChatSession._id,
      status: scheduledFor ? 'scheduled' : 'requested', // Set status based on schedule
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null // Save the date if it exists
    };

    const newRide = new Ride(newRideData);

    newChatSession.ride = newRide._id;

    await newRide.save();
    await newChatSession.save();

    // Only notify drivers if the ride is not scheduled for the future
    if (newRide.status === 'requested') {
      io.to(vehicleType).emit('newRideRequest', rideForNotification);
    } else if (newRide.status === 'scheduled') {
      // Emit a new, separate event for scheduled rides
      io.to(vehicleType).emit('newScheduledRide', rideForNotification);
    }
    res.status(201).json(newRide);
  } catch (error) {
    console.error("Error in /api/rides/request:", error);
    res.status(500).json({ error: 'Server error while requesting ride.' });
  }
});

// --- RIDE: Rate and review a ride ---
app.post('/api/rides/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found.' });
    }
    if (ride.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'You can only rate your own rides.' });
    }

    if (rating && rating > 0) {
      ride.rating = rating;
    }

    if (review) {
      ride.review = review;
    }
    await ride.save();

    if (ride.driver && rating && rating > 0) {
      const driver = await Driver.findById(ride.driver);
      if (driver) {
        const rides = await Ride.find({ driver: ride.driver, rating: { $exists: true, $ne: null } });
        const totalRating = rides.reduce((sum, r) => sum + r.rating, 0);
        driver.rating = totalRating / rides.length;
        await driver.save();
      }
    }

    res.status(200).json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Error submitting rating:', err);
    res.status(500).json({ error: 'Server error while submitting feedback.' });
  }
});

// --- RIDE: Report a driver ---
app.post('/api/rides/:id/report', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found.' });
    }
    if (ride.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'You can only report on your own rides.' });
    }
    if (!ride.driver) {
      return res.status(400).json({ error: 'This ride has no assigned driver to report.' });
    }

    const existingReport = await Report.findOne({ ride: ride._id, reporter: req.user.userId });
    if (existingReport) {
      return res.status(400).json({ error: 'You have already submitted a report for this ride.' });
    }

    const newReport = new Report({
      ride: ride._id,
      reporter: req.user.userId,
      reportedUser: ride.driver,
      reporterRole: 'customer',
      reason: reason,
    });

    await newReport.save();

    res.status(201).json({ success: true, message: 'Your report has been submitted and will be reviewed.' });
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({ error: 'Server error while submitting your report.' });
  }
});

// --- Home route for sanity check ---
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
