const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Driver = require('./models/Driver');
const router = express.Router();

// --- LOGIN ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
        return res.status(403).json({ 
            error: `Your account is suspended until ${user.suspendedUntil.toLocaleDateString()}.` 
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, isDriver: user.isDriver },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    let profileCompleted = false;
    if (user.isDriver) {
      const driver = await Driver.findOne({ user: user._id });
      profileCompleted = driver ? driver.profileCompleted : false;
    }

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isDriver: user.isDriver,
        profileCompleted: profileCompleted,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});


// --- REGISTER CUSTOMER ---
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, isDriver } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
  
    if (username.toLowerCase() === 'pulkit') {
        return res.status(400).json({ error: 'This username is reserved.' });
    }
    
    if (isDriver) {
        return res.status(403).json({ error: 'Driver registration is not allowed from this form.' });
    }
  
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'Email already in use' });
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isDriver: false,
    });
    await newUser.save();
  
    const token = jwt.sign(
      { userId: newUser._id, isDriver: newUser.isDriver },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isDriver: newUser.isDriver,
        profileCompleted: false,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});


// --- ✅ ROBUST DRIVER REGISTRATION ROUTE ---
router.post('/register-driver', async (req, res) => {
  console.log('Attempting to register a new driver...');
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    console.error('Validation failed: Missing fields.');
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    console.log(`Step 1: Checking if user '${email}' already exists...`);
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.error(`Error: User with email '${email}' already exists.`);
      return res.status(400).json({ error: 'Email already in use' });
    }
    console.log('Step 1 PASSED.');

    console.log('Step 2: Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Step 2 PASSED.');

    console.log('Step 3: Creating new User document...');
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isDriver: true,
    });
    await newUser.save();
    console.log(`Step 3 PASSED. User created with ID: ${newUser._id}`);

    console.log('Step 4: Creating new Driver document...');
    const newDriver = new Driver({
        user: newUser._id,
        profileCompleted: false,
    });
    await newDriver.save();
    console.log(`Step 4 PASSED. Driver created for User ID: ${newUser._id}`);

    console.log('Step 5: Signing JWT token...');
    if (!process.env.JWT_SECRET) {
        console.error("FATAL: JWT_SECRET is not defined in .env file.");
        return res.status(500).json({ error: "Server configuration error."});
    }
    const token = jwt.sign(
      { userId: newUser._id, isDriver: newUser.isDriver },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Step 5 PASSED.');

    console.log('Step 6: Sending successful response.');
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isDriver: newUser.isDriver,
        profileCompleted: false,
      },
    });

  } catch (error) {
    console.error('--- DRIVER REGISTRATION FAILED ---');
    console.error('The server crashed at some point during the registration process. See the error below:');
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
  }
});


module.exports = router;