import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Car, Bell, Clock, User, LogOut,
  MapPin, Bot, CreditCard
} from 'lucide-react';
import api from '../../apiClient';
import CustomConfirmModal from '../CustomConfirmModal';
import ChatbotModal from '../ChatbotModal';

const NotificationPanel = ({ notifications, fine, onClear }) => {
  return (
    <div
      className="absolute top-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-300 dark:border-gray-700 z-30 overflow-hidden transform transition-transform duration-300 scale-100 hover:scale-105"
      style={{ willChange: 'transform' }}
    >
      <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-100 via-white to-white dark:from-blue-900 dark:via-gray-800 dark:to-gray-800">
        <h3 className="font-semibold text-gray-800 dark:text-white text-lg tracking-wide select-text">Notifications</h3>
      </div>
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600 scrollbar-track-gray-100 dark:scrollbar-track-900">
        {fine > 0 && (
          <div className="p-4 border-b dark:border-gray-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-start rounded-tl-lg rounded-tr-lg transition-colors duration-150">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-3 flex-shrink-0 shadow-inner animate-pulse">
              <CreditCard className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300 select-text">Outstanding Fine</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed select-text">You have a cancellation fee of ₹{fine}. This must be paid before booking new rides.</p>
            </div>
          </div>
        )}
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <div key={notif.id} className="p-4 border-b dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors duration-150 select-text animate-fadeIn">
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{notif.message}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 select-none">{new Date(notif.timestamp || notif.id).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          ))
        ) : (
          fine <= 0 && <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center italic select-text">No new notifications.</p>
        )}
      </div>
      {(notifications.length > 0 || fine > 0) && (
        <div className="p-2 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-700 flex justify-center rounded-bl-lg rounded-br-lg">
          <button onClick={onClear} className="text-sm text-blue-600 hover:text-blue-800 font-medium transition">Clear all</button>
        </div>
      )}
    </div>
  );
};

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [recentRides, setRecentRides] = useState([]);
  const [frequentLocations, setFrequentLocations] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [outstandingFine, setOutstandingFine] = useState(0);
  const notificationRef = useRef(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [customerViewTab, setCustomerViewTab] = useState('main');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      try {
        const [fineResponse, locationsResponse] = await Promise.all([
          api.get(`/api/users/profile/${user.id}`),
          api.get('/api/users/frequent-locations')
        ]);
        setOutstandingFine(fineResponse.data.outstandingFine || 0);
        setFrequentLocations(locationsResponse.data.slice(0, 2));
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };
    fetchUserData();
  }, [user]);

  const fetchRecentRides = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRides(true);
    try {
      const response = await api.get('/api/rides/history?limit=3');
      setRecentRides(response.data);
    } catch (err) {
      console.error('Failed to fetch recent rides:', err);
      setRecentRides([]);
    } finally {
      setLoadingRides(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentRides();
  }, [fetchRecentRides]);

  useEffect(() => {
    if (socket) {
      socket.on('rideStatusUpdate', fetchRecentRides);
      socket.on('newNotification', (notif) => {
        setNotifications(prev => [notif, ...prev]);
      });
      return () => {
        socket.off('rideStatusUpdate', fetchRecentRides);
        socket.off('newNotification');
      };
    }
  }, [socket, fetchRecentRides]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFrequentLocationClick = (location) => {
    navigate('/book-ride', {
      state: {
        pickupLocation: location.pickup || null,
        dropoffLocation: location.dropoff || location
      }
    });
  };

  const handleBookRideNowClick = () => {
    navigate('/book-ride');
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setOutstandingFine(0);
  };

  const handlePayFine = async () => {
    try {
      const upiId = 'nadiyanpulkit06@oksbi';
      const merchantName = 'CabRide';
      const transactionId = `CUSTFINE_${user.id}_${Date.now()}`;
      const amount = outstandingFine.toFixed(2);
      const transactionNote = 'Payment for outstanding cancellation fine.';
      
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tr=${transactionId}&tn=${encodeURIComponent(transactionNote)}`;
      
      window.location.href = upiUrl;

      alert('Please complete the payment in your UPI app. The fine will be cleared shortly after payment.');
    } catch (error) {
      console.error("Failed to initiate fine payment:", error);
      alert("Failed to initiate payment. Please try again.");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans antialiased text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 animate-slideDown">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Car className="h-8 w-8 text-blue-600 animate-bounce" />
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">CabRide</h1>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setShowChatbot(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
              aria-label="Chat with assistant"
              title="Chat with our assistant"
            >
              <Bot className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(s => !s)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                {(notifications.length + (outstandingFine > 0 ? 1 : 0)) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-md">
                    {notifications.length + (outstandingFine > 0 ? 1 : 0)}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  fine={outstandingFine}
                  notifications={notifications}
                  onClear={handleClearNotifications}
                />
              )}
            </div>

            <div className="flex items-center space-x-3 select-none text-gray-700 dark:text-gray-200 font-medium">
              <User className="h-6 w-6" />
              <span>{user?.username}</span>
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {showChatbot && <ChatbotModal onClose={() => setShowChatbot(false)} />}

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{getGreeting()}, {user?.username}!</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Ready to book your next ride?</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <nav className="-mb-px flex space-x-6">
              <button onClick={() => setCustomerViewTab('main')} className={`py-4 px-1 border-b-2 font-medium text-sm ${customerViewTab === 'main' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                Main
              </button>
              {outstandingFine > 0 && (
                <button onClick={() => setCustomerViewTab('fine')} className={`py-4 px-1 border-b-2 font-medium text-sm ${customerViewTab === 'fine' ? 'border-red-500 text-red-600' : 'border-transparent text-red-500 hover:text-red-700 hover:border-red-300'}`}>
                  <div className="flex items-center space-x-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Outstanding Fine</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {customerViewTab === 'main' && (
            <>
              <section className="p-4 text-center select-text animate-fadeIn delay-200">
                <p className="text-2xl font-semibold text-gray-800 dark:text-white mb-7">
                  {outstandingFine > 0
                    ? `You must pay your outstanding fine of ₹${outstandingFine} before you can book a new ride.`
                    : 'Where would you like to go today?'}
                </p>

                <button
                  onClick={outstandingFine > 0 ? () => setCustomerViewTab('fine') : handleBookRideNowClick}
                  className={`inline-flex items-center justify-center px-12 py-4 rounded-full shadow-lg text-white font-bold select-none transition-colors
                    ${outstandingFine > 0 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-110'
                    }`}
                >
                  {outstandingFine > 0 ? 'Pay Fine to Book' : 'Book a Ride Now'}
                </button>
              </section>

              <section className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow p-8 select-text animate-fadeIn delay-300 mt-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Go Again?</h3>
                {frequentLocations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {frequentLocations.map((location) => (
                      <button
                        key={location.address}
                        onClick={() => handleFrequentLocationClick(location)}
                        className="p-6 bg-white dark:bg-gray-700 rounded-lg text-left hover:bg-blue-50 dark:hover:bg-blue-900 shadow-sm transition-colors select-text"
                        aria-label={`Navigate to ${location.address}`}
                      >
                        <p className="font-semibold text-gray-900 dark:text-white text-lg truncate">{location.address.split(',')[0]}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{location.address.split(',').slice(1).join(',')}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic text-center select-text">Your frequent destinations will appear here after a few trips.</p>
                )}
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8 select-text animate-fadeIn delay-400 mt-8">
                <QuickLink to="/ride-history" icon={<Clock />} title="Ride History" desc="View your past and upcoming rides" />
                <QuickLink to="/user-profile" icon={<User />} title="Your Profile" desc="Manage your personal details and settings" />
              </section>
              
              <section className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow p-8 select-text animate-fadeIn delay-500 mt-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
                {loadingRides ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 italic select-none">
                    <p>Loading recent rides...</p>
                  </div>
                ) : recentRides.length > 0 ? (
                  <div className="space-y-6">
                    {recentRides.map((ride) => (
                      <div
                        key={ride._id}
                        className="p-6 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-between shadow hover:shadow-md transition-shadow cursor-default select-text"
                        aria-label={`Ride from ${ride.pickup.address.split(',')[0]} to ${ride.dropoff.address.split(',')[0]}, status: ${ride.status}`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
                            <MapPin className="h-5 w-5 text-gray-500" />
                            <span>From: {ride.pickup.address.split(',')[0]}</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-8 mt-1 select-text">To: {ride.dropoff.address.split(',').slice(1).join(',')}</p>
                        </div>
                        <span
                          className={`px-4 py-2 text-sm font-semibold rounded-full capitalize select-none ${
                            ride.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : ride.status === 'cancelled'
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          }`}
                          aria-label={`Ride status: ${ride.status}`}
                        >
                          {ride.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 flex flex-col items-center space-y-3 select-text">
                    <Car className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <span>No recent rides. Book your first ride to get started!</span>
                  </div>
                )}
              </section>
            </>
          )}

          {customerViewTab === 'fine' && (
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
      </main>

      {showLogoutConfirm && (
        <CustomConfirmModal
          title="Confirm Logout"
          message="Are you sure you want to log out of your account?"
          onConfirm={() => {
            logout();
            setShowLogoutConfirm(false);
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
};

const QuickLink = ({ to, icon, title, desc }) => (
  <Link
    to={to}
    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow duration-200 block h-full select-none"
    aria-label={`${title} - ${desc}`}
  >
    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
      {React.cloneElement(icon, { className: 'h-6 w-6 text-blue-600 dark:text-blue-300' })}
    </div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
  </Link>
);

export default CustomerDashboard;

