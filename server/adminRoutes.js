const express = require('express');
const User = require('./models/User');
const Driver = require('./models/Driver');
const Report = require('./models/Report');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Ride = require('./models/Ride');

// This will be set by the main server file
let io;
const setIoInstance = (ioInstance) => {
    io = ioInstance;
};

// Middleware to verify if the user is an admin
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user && user.username === 'pulkit') {
            next();
        } else {
            return res.status(403).json({ error: 'Access denied. You must be an admin.' });
        }
    } catch (error) {
        console.error("Error in isAdmin middleware:", error);
        return res.status(500).json({ error: 'Server error during admin verification.' });
    }
};

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Apply authentication and admin check to all routes in this file
router.use(authenticateToken, isAdmin);

// --- Admin Routes ---
// GET for analytics data
router.get('/analytics', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isDriver: false });
        const totalDrivers = await Driver.countDocuments();
        const rides = await Ride.find({ status: 'completed' });

        const totalRides = rides.length;
        const totalEarnings = rides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
        
        // Data for a simple rides-per-day chart
        const ridesByDate = rides.reduce((acc, ride) => {
            const date = new Date(ride.createdAt).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        res.json({
            totalUsers,
            totalDrivers,
            totalRides,
            totalEarnings,
            ridesByDate,
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ error: 'Server error fetching analytics data.' });
    }
});
router.get('/active-rides', async (req, res) => {
    try {
        const activeRides = await Ride.find({ 
            status: { $in: ['accepted', 'arrived', 'started'] } 
        })
        .populate({
            path: 'user',
            select: 'username'
        })
        .populate({
            path: 'driver',
            populate: {
                path: 'user',
                select: 'username'
            }
        })
        .sort({ createdAt: -1 });

        res.json(activeRides);
    } catch (error) {
        console.error("Error fetching active rides:", error);
        res.status(500).json({ error: 'Server error fetching active rides.' });
    }
});

// GET all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching users.' });
    }
});

// GET all drivers
router.get('/drivers', async (req, res) => {
    try {
        const drivers = await Driver.find({}).populate('user', 'username email');
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching drivers.' });
    }
});

// GET all reports
router.get('/reports', async (req, res) => {
    try {
        const reports = await Report.find({})
            .populate('reporter', 'username') 
            .populate('reportedUser', 'username')
            .populate({
                path: 'ride',
                model: 'Ride',
                populate: {
                    path: 'chatSession',
                    model: 'ChatSession',
                    populate: {
                        path: 'messages.sender',
                        model: 'User',
                        select: 'username'
                    }
                }
            })
            .sort({ timestamp: -1 });
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Server error fetching reports.' });
    }
});

router.get('/drivers/:id', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id).populate('user', 'username email');
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found.' });
        }
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching driver details.' });
    }
});

router.get('/earnings', async (req, res) => {
    try {
        const completedRides = await Ride.find({ status: 'completed' });
        const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
        const platformCommission = totalRevenue * 0.15; // Assuming 15% commission

        const driverEarnings = await Ride.aggregate([
            { $match: { status: 'completed', driver: { $ne: null } } },
            {
                $group: {
                    _id: "$driver",
                    totalEarnings: { $sum: { $multiply: ["$fare", 0.85] } } // Driver gets 85%
                }
            },
            {
                $lookup: {
                    from: "drivers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "driverDetails"
                }
            },
            { $unwind: "$driverDetails" },
            {
                $lookup: {
                    from: "users",
                    localField: "driverDetails.user",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    _id: 0,
                    driverId: "$_id",
                    driverName: "$userDetails.username",
                    upiId: "$driverDetails.upiId",
                    totalEarnings: 1
                }
            },
            { $sort: { totalEarnings: -1 } }
        ]);

        res.json({
            totalRevenue,
            platformCommission,
            driverEarnings
        });
    } catch (error) {
        console.error("Error fetching earnings:", error);
        res.status(500).json({ error: 'Server error fetching earnings data.' });
    }
});

router.post('/reports/:id/resolve', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        // Toggle the resolved status
        report.isResolved = !report.isResolved;
        await report.save();

        res.json({ 
            success: true, 
            message: `Report has been marked as ${report.isResolved ? 'Resolved' : 'Unresolved'}.`,
            isResolved: report.isResolved
        });
    } catch (error) {
        console.error('Error resolving report:', error);
        res.status(500).json({ error: 'Server error while updating report.' });
    }
});


// POST to verify a driver
router.post('/drivers/:id/verify', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found.' });
        }

        // MODIFICATION: This is the official verification step
        driver.profileCompleted = true;
        driver.rejectionReason = null; // Clear rejection reason on approval
        await driver.save();
        
        // MODIFICATION: This officially enables the user's driver status
        const user = await User.findByIdAndUpdate(driver.user, { isDriver: true }, { new: true });
        if (!user) {
             return res.status(404).json({ error: 'Associated user not found.' });
        }
        
        res.json({ success: true, message: 'Driver has been verified.' });
    } catch (error) {
        console.error('Error verifying driver:', error);
        res.status(500).json({ error: 'Server error while verifying driver.' });
    }
});

router.post('/users/:id/suspend', async (req, res) => {
    const { duration } = req.body; // Expects duration in days (e.g., 3, 7, 30)

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (duration > 0) {
            const suspensionEndDate = new Date();
            suspensionEndDate.setDate(suspensionEndDate.getDate() + duration);
            user.suspendedUntil = suspensionEndDate;
            await user.save();
            res.json({
                success: true,
                message: `User has been suspended until ${suspensionEndDate.toLocaleDateString()}.`,
                suspendedUntil: user.suspendedUntil
            });
        } else { // If duration is 0 or not provided, unsuspend the user
            user.suspendedUntil = null;
            await user.save();
            res.json({
                success: true,
                message: 'User has been unsuspended.',
                suspendedUntil: null
            });
        }
    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ error: 'Server error while updating user status.' });
    }
});

router.post('/drivers/:id/reject', async (req, res) => {
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ error: 'A reason for rejection is required.' });
    }

    try {
        const driver = await Driver.findByIdAndUpdate(
            req.params.id,
            { rejectionReason: reason, profileCompleted: false }, // Set reason and ensure they are not verified
            { new: true }
        );

        if (!driver) {
            return res.status(404).json({ error: 'Driver not found.' });
        }

        // Ensure the user is not marked as a driver
        await User.findByIdAndUpdate(driver.user, { isDriver: false });

        res.json({ success: true, message: 'Driver application has been rejected.' });
    } catch (error) {
        console.error('Error rejecting driver:', error);
        res.status(500).json({ error: 'Server error while rejecting driver.' });
    }
});

module.exports = router;
module.exports.setIoInstance = setIoInstance; // Export the setter function
