import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CustomerDashboard from './components/Customer/CustomerDashboard';
import DriverDashboard from './components/Driver/DriverDashboard';
import BookRide from './components/Customer/BookRide';
import RideTracking from './components/Customer/RideTracking';
import RideHistory from './components/Customer/RideHistory';
import DriverTrips from './components/Driver/DriverTrips';
import DriverProfile from './components/Driver/DriverProfile';
import UserProfile from './components/Customer/UserProfile';
import RideSummary from './components/Driver/RideSummary';
import CustomerPayment from './components/Customer/CustomerPayment.jsx';
import AdminDashboard from './components/Admin/AdminDashboard';
import RegisterDriver from './components/Auth/RegisterDriver';
import './index.css';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>;
  }

  return token ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user } = useAuth();

  // Permanently set the dark theme for the whole project
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <Router>
      <SocketProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
              <Route path="/register-driver" element={<RegisterDriver />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  {user?.isDriver ? <DriverDashboard /> : <CustomerDashboard />}
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/book-ride" 
              element={
                <ProtectedRoute>
                  <BookRide />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/track-ride/:rideId" 
              element={
                <ProtectedRoute>
                  <RideTracking />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payment/:rideId"
              element={
                <ProtectedRoute>
                  <CustomerPayment />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/ride-history" 
              element={
                <ProtectedRoute>
                  <RideHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/driver-trips" 
              element={
                <ProtectedRoute>
                  <DriverTrips />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/driver-profile"
              element={
                <ProtectedRoute>
                  <DriverProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/user-profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/ride-summary/:rideId"
              element={
                <ProtectedRoute>
                  <RideSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/" 
              element={
                user ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />
          </Routes>
        </div>
      </SocketProvider>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
