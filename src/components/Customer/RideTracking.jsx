import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Car, Clock, MapPin, Star, XCircle, Info, RefreshCcw, AlertTriangle, Siren } from 'lucide-react';
import MapComponent from '../Map/MapComponent';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../apiClient';
import CustomConfirmModal from '../CustomConfirmModal';
import CancellationReasonModal from '../CancellationReasonModal';
import ChatModal from "../ChatModal";
import ReportDriverModal from '../ReportDriverModal';
import SOSModal from '../SOSModal';

const InfoModal = ({ title, message, onClose, type = 'info' }) => {
  const Icon = type === 'error' ? XCircle : Info;
  const color = type === 'error' ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000]">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center mb-4">
          <Icon className={`h-6 w-6 ${color} mr-2`} />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const RideTracking = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCancelReasons, setShowCancelReasons] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const [infoModal, setInfoModal] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [otp, setOtp] = useState(null);

  const displayStatus = ride ? ride.status : 'requested';
  const handleConfirmSOS = () => {
    console.log("SOS Alert Triggered for ride:", rideId);
    setShowSOSModal(false);
    setShowReportModal(true);
    setInfoModal({
        title: "SOS Alert Sent",
        message: "Your emergency alert has been sent. Help is on the way.",
        onClose: () => setInfoModal(null),
    });
  };
  const fetchRideDetails = useCallback(async () => {
    try {
      if (!loading) setLoading(true);
      const resp = await api.get(`/api/rides/${rideId}`);
      setRide(resp.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Could not load ride details.');
    } finally {
      setLoading(false);
    }
  }, [rideId, loading]);

  useEffect(() => {
    fetchRideDetails();
  }, [fetchRideDetails]);

  useEffect(() => {
    if (displayStatus === 'completed') {
      navigate(`/payment/${rideId}`);
    }
    if (displayStatus === 'cancelled') {
      setInfoModal({
        title: "Ride Cancelled",
        message: "This ride has been cancelled.",
        onClose: () => navigate('/dashboard')
      });
    }
  }, [displayStatus, navigate, rideId]);

  useEffect(() => {
    if (!socket) return;
    
    const handleDriverLocation = (data) => {
        if (ride && data.driverId === ride.driver?._id.toString()) {
            setDriverLocation(data.location);
        }
    };
    
    const handleStatusUpdate = (data) => {
        if (data.rideId === rideId) {
            setRide(prevRide => prevRide ? { ...prevRide, status: data.status } : null);
        }
    };
    
    const handleRideAccepted = (data) => {
        if (data.rideId === rideId) {
            setOtp(data.otp);
        }
    };

    const handleChatMessage = (message) => {
        if (message.ride === rideId && message.sender._id !== user.id && !showChatModal) {
            setUnreadCount(prev => prev + 1);
        }
    };

    socket.on('driverLocationUpdate', handleDriverLocation);
    socket.on('rideStatusUpdate', handleStatusUpdate);
    socket.on('rideAccepted', handleRideAccepted);
    socket.on('chatMessage', handleChatMessage);

    return () => {
        socket.off('driverLocationUpdate', handleDriverLocation);
        socket.off('rideStatusUpdate', handleStatusUpdate);
        socket.off('rideAccepted', handleRideAccepted);
        socket.off('chatMessage', handleChatMessage);
    };
  }, [socket, ride, rideId, user, showChatModal]);

  const handleCancelClick = () => {
    if (displayStatus === 'requested') {
      setShowCancelReasons(true);
    } else if (displayStatus === 'accepted') {
      const timeSinceAccepted = (new Date() - new Date(ride.acceptedAt)) / 1000 / 60;
      if (timeSinceAccepted > 3) {
        setCancelMessage("Cancelling now will result in a ₹50 fee. Are you sure?");
      } else {
        setCancelMessage("Are you sure you want to cancel this ride?");
      }
      setShowConfirmCancel(true);
    }
  };

  const confirmCancellation = async (reason = "Cancelled by customer") => {
    setShowCancelReasons(false);
    setShowConfirmCancel(false);
    try {
      await api.post(`/api/rides/${rideId}/cancel`, { reason });
    } catch (error) {
      setInfoModal({
        title: "Error",
        message: "Failed to cancel the ride. Please try again.",
        type: 'error',
        onClose: () => setInfoModal(null)
      });
    }
  };

  const handleCallDriver = () => {
    if (ride?.driver?.phoneNumber) {
      window.location.href = `tel:${ride.driver.phoneNumber}`;
    } else {
      setInfoModal({
        title: "Contact Not Available",
        message: "The driver's phone number is not available.",
        type: 'error',
        onClose: () => setInfoModal(null)
      });
    }
  };
  
  const handleOpenChat = () => {
      setUnreadCount(0);
      setShowChatModal(true);
  };
  
  const handleReportSubmit = async (rideId, { reason }) => {
      try {
          const response = await api.post(`/api/rides/${rideId}/report`, { reason });
          setInfoModal({
              title: "Report Submitted",
              message: "Thank you. Your report has been submitted and will be reviewed.",
              onClose: () => setInfoModal(null),
          });
      } catch (err) {
          setInfoModal({
              title: "Error",
              message: err.response?.data?.error || "Failed to submit report.",
              type: 'error',
              onClose: () => setInfoModal(null),
          });
      } finally {
          setShowReportModal(false);
      }
  };
  const getStatusColor = (status) => {
    const colors = {
      requested: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-900',
      accepted: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-900',
      arrived: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-900',
      started: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-900',
      completed: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
      cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-900'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
  };

  const getStatusMessage = (status) => {
    const messages = {
      requested: 'Looking for a driver...',
      accepted: 'Driver is on the way',
      arrived: 'Driver has arrived',
      started: 'Trip in progress',
      completed: 'Trip completed',
      cancelled: 'Trip cancelled'
    };
    return messages[status] || 'Unknown status';
  };


  if (loading || !ride) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><p className="text-gray-800 dark:text-white">Loading Ride Details...</p></div>;
  }

  if (infoModal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <InfoModal {...infoModal} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Track Your Ride</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Ride Status</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(displayStatus)}`}>
                  {displayStatus?.charAt(0).toUpperCase() + displayStatus?.slice(1)}
                </span>
              </div>
              <div className="flex items-center mb-4">
                <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                <span className="text-gray-600 dark:text-gray-300">{getStatusMessage(displayStatus)}</span>
              </div>
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Pickup</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{ride.pickup?.address || '--'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Dropoff</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{ride.dropoff?.address || '--'}</p>
                  </div>
                </div>
              </div>
            </div>

            {ride.driver && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Your Driver</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {ride.driver.profilePhoto ? (
                      <img
                        src={ride.driver.profilePhoto}
                        alt={ride.driver.user?.username || 'Driver'}
                        className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-blue-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
                        <Car className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ride.driver?.user?.username || 'Driver'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {ride.driver?.vehicleType || '--'} • {ride.driver?.vehicleNumber || '--'}
                      </p>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 dark:text-gray-300 ml-1 font-semibold">
                          {typeof ride.driver?.rating === 'number' ? ride.driver.rating.toFixed(1) : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={handleCallDriver} className="p-3 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm">
                      <Phone className="h-5 w-5" />
                    </button>
                    <div className="relative">
                      <button 
                          onClick={handleOpenChat}
                          className="p-3 bg-green-100 dark:bg-green-900 text-green-600 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors shadow-sm"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </button>
                      {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white border-2 border-white">
                              {unreadCount}
                          </span>
                      )}
                    </div>
                  </div>
                </div>
                {ride.otp && (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Your Ride OTP</p>
            <div className="text-4xl font-bold text-blue-600 tracking-widest mt-2">
                {ride.otp}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Share this with your driver to start the ride.</p>
        </div>
    </div>
)}
              </div>
            )}
            <div className="space-y-4">
                {ride.driver && (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 border border-red-200 dark:border-red-800">
                        <button
                            onClick={() => setShowSOSModal(true)}
                            className="w-full flex items-center justify-center py-2 px-4 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md transition-colors"
                        >
                            <Siren className="mr-2 h-5 w-5" />
                            EMERGENCY SOS
                        </button>
                    </div>
                )}
                {ride.driver && (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="w-full flex items-center justify-center py-3 px-4 border border-red-300 dark:border-red-700 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900"
                        >
                            <AlertTriangle className="mr-2 h-5 w-5" />
                            Report Driver
                        </button>
                    </div>
                )}
                {(displayStatus === 'requested' || displayStatus === 'accepted') && (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border dark:border-gray-700">
                        <button
                          onClick={handleCancelClick}
                          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="mr-2 h-5 w-5" />
                          Cancel Ride
                        </button>
                    </div>
                )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border dark:border-gray-700 flex-1">
            <MapComponent
              center={ride.pickup}
              pickup={ride.pickup}
              dropoff={ride.dropoff}
              driverLocation={driverLocation || ride.driver?.currentLocation}
              tracking={true}
              height="100%"
              rideStatus={displayStatus}
            />
          </div>
        </div>
      </main>

      {showCancelReasons && (
        <CancellationReasonModal
          onCancel={() => setShowCancelReasons(false)}
          onSubmit={(reason) => confirmCancellation(reason)}
        />
      )}

      {showConfirmCancel && (
        <CustomConfirmModal
          title="Confirm Cancellation"
          message={cancelMessage}
          onConfirm={() => confirmCancellation()}
          onCancel={() => setShowConfirmCancel(false)}
          confirmText="Yes, Cancel"
        />
      )}
      
      {showChatModal && (
        <ChatModal 
          rideId={rideId}
          senderId={ride.user._id}
          receiverId={ride.driver.user._id}
          onClose={() => setShowChatModal(false)}
        />
      )}
      
      {showReportModal && (
          <ReportDriverModal
              rideId={rideId}
              driverName={ride.driver?.user?.username || 'the driver'}
              onSubmit={handleReportSubmit}
              onClose={() => setShowReportModal(false)}
          />
      )}
        {showSOSModal && (
            <SOSModal
                rideDetails={ride}
                onClose={() => setShowSOSModal(false)}
                onConfirm={handleConfirmSOS}
            />
        )}
    </div>
  );
};

export default RideTracking;
