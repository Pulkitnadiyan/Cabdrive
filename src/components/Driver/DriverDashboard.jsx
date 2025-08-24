import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Car, ToggleLeft, ToggleRight, Bell, Clock, User, LogOut,
  MapPin, X, Check, AlertTriangle, CreditCard, Star, Briefcase
} from 'lucide-react';
import api from '../../apiClient';
import axios from 'axios';
import CustomConfirmModal from '../CustomConfirmModal';

const NotificationPanel = ({ notifications, onClear }) => {
  return (
    <div className="absolute top-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-700 z-20 overflow-hidden">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <div key={notif.id} className="p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-200">{notif.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(notif.timestamp || notif.id).toLocaleTimeString()}</p>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No new notifications.</p>
        )}
      </div>
      {notifications.length > 0 && (
        <div className="p-2 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-700">
          <button onClick={onClear} className="text-sm text-blue-600 hover:underline w-full text-center">Clear all</button>
        </div>
      )}
    </div>
  );
};

const ProfileCompletionPopup = ({ onCompleteProfile, onClose }) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl text-center max-w-md mx-4">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Complete Your Profile</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        You must complete your profile with all required documents and information before you can go online and accept rides.
      </p>
      <button
        onClick={onCompleteProfile}
        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 w-full font-semibold transition"
      >
        Go to Profile
      </button>
      <button
        onClick={onClose}
        className="mt-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 w-full"
      >
        Dismiss
      </button>
    </div>
  </div>
);

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const { notifications, removeNotification, socket } = useSocket();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('Fetching location...');
  const [stats, setStats] = useState({ totalTrips: 0, totalEarnings: 0, todayTrips: 0, rating: 0 });
  const [rideRequests, setRideRequests] = useState([]);
  const [scheduledRides, setScheduledRides] = useState([]);
  const [cooldown, setCooldown] = useState(false);
  const [outstandingFine, setOutstandingFine] = useState(0);
  const notificationRef = useRef(null);
  const [infoModal, setInfoModal] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [rideViewTab, setRideViewTab] = useState('live');

  // Set dark mode permanently on component mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  
  const fetchDriverData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [tripsResponse, profileResponse, scheduledResponse] = await Promise.all([
        api.get('/api/drivers/trips'),
        api.get(`/api/drivers/profile/${user.id}`),
        api.get('/api/drivers/scheduled-rides')
      ]);

      const trips = tripsResponse.data;
      const platformCommission = 0.15;
      const totalEarnings = trips
        .filter(t => t.status === 'completed')
        .reduce((sum, trip) => sum + (trip.fare || 0) * (1 - platformCommission), 0);
      const today = new Date().toDateString();
      const todayTrips = trips.filter(t => t.status === 'completed' && new Date(t.createdAt).toDateString() === today).length;

      setStats({
        totalTrips: trips.filter(t => t.status === 'completed').length,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        todayTrips,
        rating: typeof profileResponse.data.rating === 'number' ? profileResponse.data.rating : 0
      });

      setScheduledRides(scheduledResponse.data);
      setOutstandingFine(profileResponse.data.outstandingFine || 0);
    } catch (err) {
      console.error('Error fetching driver data:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.profileCompleted) {
      fetchDriverData();
    }
  }, [user?.profileCompleted, fetchDriverData]);

  const reverseGeocode = useCallback(async (lat, lng, setAddress) => {
    try {
      const resp = await axios.get('https://nominatim.openstreetmap.org/reverse', { params: { format: 'json', lat, lon: lng, zoom: 18, addressdetails: 1 }});
      setAddress(resp.data?.display_name || `Unknown (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      setAddress(`Could not fetch address.`);
    }
  }, []);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject({ message: "Geolocation is not supported." });
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => reject({ message: "Location access was denied." })
      );
    });
  };

  useEffect(() => {
    let locationInterval;
    if (isOnline && socket && user?.id) {
      const updateLocation = async () => {
        try {
          const location = await getCurrentLocation();
          setCurrentLocation(location);
          await reverseGeocode(location.lat, location.lng, setCurrentAddress);
          socket.emit('updateLocation', { userId: user.id, location });
        } catch (error) {
          console.error("Interval location update failed:", error.message);
          setCurrentAddress("Could not fetch address.");
        }
      };
      updateLocation();
      locationInterval = setInterval(updateLocation, 30000);
    }
    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [isOnline, socket, user?.id, reverseGeocode]);

  useEffect(() => {
    if (!socket) return;
    const handleNewRideRequest = (ride) => {
      if (ride.status === 'requested' && !cooldown) {
        setRideRequests(prev => !prev.some(r => r._id === ride._id) ? [...prev, ride] : prev);
      }
    };
    const handleNewScheduledRide = (ride) => {
      if (ride.status === 'scheduled') {
        setScheduledRides(prev => !prev.some(r => r._id === ride._id) ? [...prev, ride] : prev);
      }
    };
    const handleNewNotification = () => {
      fetchDriverData();
    };

    socket.on('newRideRequest', handleNewRideRequest);
    socket.on('newScheduledRide', handleNewScheduledRide);
    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newRideRequest', handleNewRideRequest);
      socket.off('newScheduledRide', handleNewScheduledRide);
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket, cooldown, fetchDriverData]);


  const toggleOnlineStatus = async () => {
    // Check if profile is incomplete
    if (!user?.profileCompleted && !isOnline) {
      setShowProfilePopup(true);
      return;
    }
    
    // Check if there's an outstanding fine
    if (outstandingFine > 0 && !isOnline) {
        setInfoModal({
            title: "Action Required",
            message: `You cannot go online with an outstanding fine of ₹${outstandingFine}. Please pay the fine first.`,
            onClose: () => setInfoModal(null),
        });
        return;
    }

    const newStatus = !isOnline;
    if (!user?.id) {
      setInfoModal({
        title: "Error",
        message: 'Cannot toggle online status: user not loaded.',
        onClose: () => setInfoModal(null),
      });
      return;
    }
    setCooldown(false);

    if (newStatus) {
      try {
        const location = await getCurrentLocation();
        await api.post('/api/drivers/status', { isOnline: newStatus, location });
        setIsOnline(true);
        setCurrentLocation(location);
        await reverseGeocode(location.lat, location.lng, setCurrentAddress);
        if (socket) socket.emit('requestInitialRides');
      } catch (error) {
        console.error('Failed to go online:', error);
        setInfoModal({
          title: "Error",
          message: `Could not go online: ${error.response?.data?.error || 'A server error occurred.'}`,
          onClose: () => setInfoModal(null),
        });
      }
    } else {
      try {
        await api.post('/api/drivers/status', { isOnline: false });
        setIsOnline(false);
        setRideRequests([]);
      } catch (err) {
        console.error('Failed to go offline:', err);
      }
    }
  };

  const handleAcceptRide = async (rideId) => {
    try {
      const { data } = await api.post(`/api/rides/${rideId}/accept`);
      if (!data || !data._id) throw new Error("Invalid ride data received");
      setRideRequests(prev => prev.filter(ride => ride._id !== rideId));
      setScheduledRides(prev => prev.filter(ride => ride._id !== rideId));
      navigate(`/ride-summary/${data._id}`);
      if (socket) socket.emit('joinRideRoom', data._id);
    } catch (err) {
      setInfoModal({
        title: "Failed to Accept",
        message: err.response?.data?.error || 'Could not accept the ride. Please refresh and try again.',
        type: 'error',
        onClose: () => setInfoModal(null)
      });
      setRideRequests(prev => prev.filter(ride => ride._id !== rideId));
    }
  };

  const handleRejectRide = (rideId) => {
    setRideRequests(prev => prev.filter(ride => (ride._id || ride.rideId) !== rideId));
  };

  const onCompleteProfile = () => navigate('/driver-profile');

  const handleClearNotifications = () => {
    notifications.forEach(n => removeNotification(n.id));
  };
  
  const handlePayFine = async () => {
    try {
        // Build the UPI deep link
        const upiId = 'your-upi-id@bank'; // Replace with a real UPI ID
        const merchantName = 'CabRide';
        const transactionId = `FINE_${user.id}_${Date.now()}`;
        const amount = outstandingFine.toFixed(2);
        const transactionNote = 'Payment for outstanding fine';
        
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tr=${transactionId}&tn=${encodeURIComponent(transactionNote)}`;
        
        // Open the UPI app
        window.location.href = upiUrl;

        // A simple alert to inform the user
        alert('Please complete the payment in your UPI app. The fine will be cleared shortly after payment.');
        
    } catch (error) {
        console.error('Error initiating fine payment:', error);
        alert('Failed to initiate fine payment. Please try again.');
    }
  };


  const notificationCount = notifications.length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans antialiased">
      {showProfilePopup && <ProfileCompletionPopup onCompleteProfile={onCompleteProfile} onClose={() => setShowProfilePopup(false)} />}
      {infoModal && <CustomConfirmModal {...infoModal} />}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">CabRide Driver</h1>
            </div>
            <div className="flex items-center space-x-4">
              
              <div className="relative" ref={notificationRef}>
                <button onClick={() => setShowNotifications(s => !s)} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Bell className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                      {notificationCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationPanel 
                    notifications={notifications} 
                    onClear={handleClearNotifications} 
                  />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.username}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><LogOut className="h-4 w-4 mr-1" />Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{getGreeting()}, {user?.username}!</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">You are currently <span className={`font-semibold ${isOnline ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>{isOnline ? 'online' : 'offline'}</span></p>
              {isOnline && <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-400"><MapPin className="h-4 w-4 mr-1" />Location: {currentAddress}</div>}
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-2">
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>{isOnline ? 'Go Offline' : 'Go Online'}</span>
              <button onClick={toggleOnlineStatus} className="focus:outline-none" disabled={!user?.profileCompleted || outstandingFine > 0}>
                {isOnline ? <ToggleRight className="h-10 w-10 text-green-600" /> : <ToggleLeft className="h-10 w-10 text-gray-400 dark:text-gray-600" />}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
              <nav className="-mb-px flex space-x-6">
                <button onClick={() => setRideViewTab('live')} className={`py-4 px-1 border-b-2 font-medium text-sm ${rideViewTab === 'live' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                  Live Requests
                </button>
                <button onClick={() => setRideViewTab('scheduled')} className={`py-4 px-1 border-b-2 font-medium text-sm ${rideViewTab === 'scheduled' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                  Scheduled Rides
                </button>
                {outstandingFine > 0 && (
                  <button onClick={() => setRideViewTab('fine')} className={`py-4 px-1 border-b-2 font-medium text-sm ${rideViewTab === 'fine' ? 'border-red-500 text-red-600' : 'border-transparent text-red-500 hover:text-red-700 hover:border-red-300'}`}>
                    <div className="flex items-center space-x-1">
                      <CreditCard className="h-4 w-4" />
                      <span>Outstanding Fine</span>
                    </div>
                  </button>
                )}
              </nav>
            </div>

            {rideViewTab === 'live' && (
              <div>
                {!isOnline ? (
                  <p className="text-center py-6 text-gray-500 dark:text-gray-400">Go online to see live ride requests.</p>
                ) : rideRequests.length > 0 ? (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {rideRequests.map(ride => (
                      <div key={ride._id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{ride.pickup?.address.split(',')[0]} → {ride.dropoff?.address.split(',')[0]}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Fare: ₹{ride.fare ?? '--'} • Distance: {typeof ride.distance === 'number' ? ride.distance.toFixed(1) : '--'} km</p>
                        </div>
                        <div className="flex space-x-2 mt-4 sm:mt-0">
                          <button onClick={() => handleAcceptRide(ride._id)} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"><Check /></button>
                          <button onClick={() => handleRejectRide(ride._id)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><X /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-gray-500 dark:text-gray-400">No new requests right now.</p>
                )}
              </div>
            )}

            {rideViewTab === 'scheduled' && (
              <div>
                {scheduledRides.length > 0 ? (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {scheduledRides.map(ride => (
                      <div key={ride._id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{ride.pickup?.address.split(',')[0]} → {ride.dropoff?.address.split(',')[0]}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{new Date(ride.scheduledFor).toLocaleString()}</p>
                        </div>
                        <button onClick={() => handleAcceptRide(ride._id)} className="mt-4 sm:mt-0 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-sm">Accept</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-gray-500 dark:text-gray-400">No upcoming scheduled rides.</p>
                )}
              </div>
            )}

            {rideViewTab === 'fine' && (
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4 text-red-500">
                  <CreditCard className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pay Outstanding Fine</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">You have an outstanding fine of</p>
                <p className="text-5xl font-bold text-red-600 mb-6">₹{outstandingFine.toFixed(2)}</p>
                <button
                  onClick={handlePayFine}
                  className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700 transition"
                >
                  Pay Fine Now
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<Briefcase />} label="Completed Trips" value={stats.totalTrips} />
            <StatCard icon={<span className="text-2xl">₹</span>} label="Total Earnings" value={`₹${stats.totalEarnings}`} />
            <StatCard icon={<Star />} label="Rating" value={`${stats.rating.toFixed(1)}★`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickLink to="/driver-trips" icon={<Clock />} title="Trip History" desc="View your past and earnings" />
            <QuickLink to="/driver-profile" icon={<User />} title="Driver Profile" desc="Manage your driver profile and vehicle details" />
          </div>
        </div>
      </main>
      {showLogoutConfirm && (
        <CustomConfirmModal 
          title="Confirm Logout" 
          message="Are you sure you want to log out of your account?" 
          onConfirm={() => { logout(); setShowLogoutConfirm(false); }} 
          onCancel={() => setShowLogoutConfirm(false)} 
        />
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex items-center hover:shadow-xl transition-shadow duration-200 animate-fade-in">
    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">{icon}</div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

const QuickLink = ({ to, icon, title, desc }) => (
  <Link to={to} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center hover:shadow-2xl transition-shadow duration-200 block h-full">
    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">{React.cloneElement(icon, { className: "h-6 w-6 text-gray-600 dark:text-gray-400" })}</div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
  </Link>
);

export default DriverDashboard;
