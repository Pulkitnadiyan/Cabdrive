import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  MapPin, Car, ArrowLeft, Clock, Phone, CheckCircle, QrCode, XCircle, Info, MessageCircle, Shield, User, Star, AlertTriangle, Briefcase
} from 'lucide-react';
import MapComponent from '../Map/MapComponent';
import api from '../../apiClient';
import CustomConfirmModal from '../CustomConfirmModal';
import ChatModal from "../ChatModal";
import ReportCustomerModal from '../Admin/ReportCustomerModal'; 
import StatusUpdater from '../Driver/StatusUpdater';

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
        <button
          onClick={onClose}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full"
        >
          OK
        </button>
      </div>
    </div>
  );
};


const PaymentReceivedPopup = () => (
  <div className="fixed inset-0 bg-green-600 bg-opacity-95 flex items-center justify-center z-[1000]">
    <div className="text-center text-white animate-pulse">
      <CheckCircle className="h-24 w-24 mx-auto mb-6" />
      <h2 className="text-4xl font-bold mb-2">Payment Received!</h2>
      <p className="text-lg">Redirecting to dashboard...</p>
    </div>
  </div>
);

const RideCancelledPopup = ({ message }) => (
    <div className="fixed inset-0 bg-red-600 bg-opacity-95 flex items-center justify-center z-[1000]">
        <div className="text-center text-white animate-pulse">
            <XCircle className="h-24 w-24 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-2">Ride Cancelled</h2>
            <p className="text-lg">{message}</p>
        </div>
    </div>
);

const RideSummary = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { rideId } = useParams();
  const [showReportModal, setShowReportModal] = useState(false);
  const [rideDetails, setRideDetails] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelPopupMessage, setCancelPopupMessage] = useState('');
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const [cancelWarning, setCancelWarning] = useState("");
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  
  const currentStatus = rideDetails ? rideDetails.status : 'accepted';

  useEffect(() => {
    if (socket && user?.id) {
      socket.emit('joinDriverRoom', user.id);
    }
  }, [socket, user]);

  const fetchRideDetails = useCallback(async () => {
    if (!rideId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get(`/api/rides/${rideId}`);
      setRideDetails(resp.data);
      if (resp.data.status === 'completed') setShowPaymentDetails(true);
      if (resp.data.status === 'cancelled') {
        setInfoModal({
            title: "Ride Cancelled",
            message: "This ride has already been cancelled.",
            onClose: () => navigate('/dashboard')
        });
      }
    } catch (err) {
      console.error('Failed to fetch ride details:', err);
      setError('Failed to load ride details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [rideId, navigate]);

  useEffect(() => {
    fetchRideDetails();
  }, [fetchRideDetails]);
  
  useEffect(() => {
    if (!socket || !rideId) return;
    
    const handleStatusUpdate = (data) => {
        if (data.rideId === rideId) {
            setRideDetails(prev => {
              const updatedRide = prev ? { ...prev, status: data.status } : null;
              if (data.status === 'completed') {
                setShowPaymentDetails(true);
              }
              return updatedRide;
            });
        }
    };

    const handleChatMessage = (message) => {
        if (message.ride === rideId && message.sender._id !== user.id && !showChatModal) {
            setUnreadCount(prev => prev + 1);
        }
    };

    socket.on('rideStatusUpdate', handleStatusUpdate);
    socket.on('chatMessage', handleChatMessage);

    return () => {
        socket.off('rideStatusUpdate', handleStatusUpdate);
        socket.off('chatMessage', handleChatMessage);
    };
  }, [socket, rideId, user, showChatModal]);

  useEffect(() => {
    const fetchQrCode = async () => {
      if (!rideId) return;
      try {
        const resp = await api.get(`/api/rides/${rideId}/qrcode`);
        setQrCodeDataUrl(resp.data.qrImage || '');
      } catch (err) {
        console.error('Failed to fetch QR code:', err);
      }
    };
    if (showPaymentDetails) {
      fetchQrCode();
    }
  }, [showPaymentDetails, rideId]);

  useEffect(() => {
    if (!socket || !rideId) return;

    const onPaymentComplete = (data) => {
      if (data.rideId === rideId && data.status === 'paid') {
        setShowPaymentPopup(true);
      }
    };
    const handleRideCancelled = (data) => {
        if (data.fineApplied) {
            setCancelPopupMessage("User cancelled. You will receive compensation.");
        } else {
            setCancelPopupMessage("The user cancelled the ride.");
        }
        setShowCancelPopup(true);
    };

    socket.on('paymentComplete', onPaymentComplete);
    socket.on('rideCancelled', handleRideCancelled);
    return () => {
      socket.off('paymentComplete', onPaymentComplete);
      socket.off('rideCancelled', handleRideCancelled);
    };
  }, [socket, rideId]);

  useEffect(() => {
    if (showCancelPopup || showPaymentPopup) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showCancelPopup, showPaymentPopup, navigate]);
  
  const handleCancelClick = () => {
    if (rideDetails?.acceptedAt) {
      const timeSinceAccepted = (new Date() - new Date(rideDetails.acceptedAt)) / 1000 / 60;
      if (timeSinceAccepted > 3) {
        setCancelWarning("Cancelling now will result in a ₹30 fine. Are you sure?");
      } else {
        setCancelWarning("Are you sure you want to cancel this ride?");
      }
    } else {
       setCancelWarning("Are you sure you want to cancel this ride?");
    }
    setShowConfirmCancel(true);
  };


  const handleDriverCancel = async () => {
    setShowConfirmCancel(false);
    try {
      await api.post(`/api/rides/${rideId}/cancel`, { reason: 'Cancelled by driver' });

      navigate('/dashboard');

    } catch (error) {
      console.error("Failed to cancel ride:", error);
       setInfoModal({
          title: "Error",
          message: error.response?.data?.error || "Could not cancel the ride.",
          type: 'error',
          onClose: () => setInfoModal(null)
      });
    }
  };
const handleReportSubmit = async (reason) => {
    try {
        const response = await api.post(`/api/rides/${rideId}/report-customer`, { reason });
        setInfoModal({
            title: "Report Submitted",
            message: response.data.message,
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
  
  const handleVerifyOtp = async (otp) => {
    try {
      const response = await api.post(`/api/rides/${rideId}/verify-otp`, { otp });
      if (response.data.success) {
        setIsOtpVerified(true);
        setInfoModal({
          title: "Success",
          message: "OTP verified. You can now start the ride.",
          onClose: () => setInfoModal(null)
        });
      }
    } catch (err) {
      setIsOtpVerified(false);
      setInfoModal({
        title: "Invalid OTP",
        message: err.response?.data?.error || "The OTP you entered is incorrect. Please try again.",
        type: 'error',
        onClose: () => setInfoModal(null)
      });
    }
  };

  const handleCallUser = () => {
    const phoneNumber = rideDetails?.user?.phoneNumber;
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      setInfoModal({
        title: "Contact Not Available",
        message: "The customer's phone number is not available.",
        type: 'error',
        onClose: () => setInfoModal(null)
      });
    }
  };

  const handleOpenChat = () => {
      setUnreadCount(0);
      setShowChatModal(true);
  };

  const renderMap = () => {
    if (!rideDetails) return null;
    const { pickup, dropoff } = rideDetails;
    let center = pickup;

    if (currentStatus === 'accepted') {
      center = driverLocation
        ? { lat: (driverLocation.lat + pickup.lat) / 2, lng: (driverLocation.lng + pickup.lng) / 2 }
        : pickup;
    }
    if (['arrived', 'started', 'completed'].includes(currentStatus)) {
      center = { lat: (pickup.lat + dropoff.lat) / 2, lng: (pickup.lng + dropoff.lng) / 2 };
    }
     return (
        <MapComponent
          center={center}
          pickup={pickup}
          dropoff={dropoff}
          driverLocation={driverLocation}
          tracking={true}
          height="500px"
          rideStatus={currentStatus}
        />
      );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><p className="text-gray-900 dark:text-white">Loading ride summary...</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><p className="text-red-500">{error}</p></div>;
  if (!rideDetails) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><p className="text-gray-900 dark:text-white">Ride details not found.</p></div>;
  
  if (showPaymentPopup) return <PaymentReceivedPopup />;
  if (showCancelPopup) return <RideCancelledPopup message={cancelPopupMessage} />;

  if (infoModal) {
      return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <InfoModal {...infoModal} />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {showConfirmCancel && (
            <CustomConfirmModal
                title="Confirm Cancellation"
                message={cancelWarning}
                onConfirm={handleDriverCancel}
                onCancel={() => setShowConfirmCancel(false)}
                confirmText="Yes, Cancel"
            />
        )}

      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => navigate('/dashboard')} className="mr-4 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ride Summary</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">

            <h2 className="text-lg font-medium mb-6 text-gray-900 dark:text-white">Trip Details</h2>

            <div className="space-y-4">
              <DetailItem icon={<MapPin className="text-green-500" />} label="Pickup Location" value={rideDetails.pickup.address} />
              <DetailItem icon={<MapPin className="text-red-500" />} label="Dropoff Location" value={rideDetails.dropoff.address} />
              <DetailItem icon={<Clock className="text-gray-400 dark:text-gray-500" />} label="Status" value={currentStatus} />
              <DetailItem icon={<Car className="text-gray-400 dark:text-gray-500" />} label="Distance" value={`${rideDetails.distance.toFixed(1)} km`} />
              <DetailItem icon={<span className="text-yellow-600 text-xl">₹</span>} label="Fare" value={`₹${rideDetails.fare.toFixed(2)}`} />
            </div>
            
            {rideDetails.user && (
              <>
                <hr className="my-4 dark:border-gray-700" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{rideDetails.user.username || 'Customer'}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleCallUser}
                      className="p-3 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 transition"
                    >
                        <Phone className="h-5 w-5" />
                    </button>
                    <div className="relative">
                      <button 
                          onClick={handleOpenChat}
                          className="p-3 bg-green-100 dark:bg-green-900 text-green-600 rounded-full hover:bg-green-200 dark:hover:bg-green-700 transition"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </button>
                      {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                              {unreadCount}
                          </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
             {rideDetails.user && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="w-full flex items-center justify-center py-3 px-4 border border-red-300 dark:border-red-700 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900"
                    >
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Report Customer
                    </button>
                </div>
            )}
            {showPaymentDetails ? (
              <div className="mt-8 border-t pt-6 dark:border-gray-700 text-center">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Awaiting Payment: ₹{rideDetails.fare.toFixed(2)}</h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">Please have the customer scan this QR code to pay:</p>
                <div className="mb-4 flex justify-center">
                  {qrCodeDataUrl ? <img src={qrCodeDataUrl} alt="Payment QR Code" className="w-48 h-48 rounded-lg" /> : <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"><QrCode className="text-gray-500 dark:text-gray-400 w-12 h-12" /></div>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for payment confirmation...</p>
              </div>
            ) : (
                <div className="mt-8 space-y-4 text-center">
                    <StatusUpdater 
                        rideId={rideId}
                        currentStatus={currentStatus}
                        isOtpVerified={isOtpVerified}
                        onCancelClick={handleCancelClick}
                        onVerifyOtp={handleVerifyOtp}
                    />
                </div>
            )}
          </section>

          <section className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            {renderMap()}
          </section>
        </div>
      </main>

      {showChatModal && (
        <ChatModal 
          rideId={rideId}
          senderId={rideDetails.driver.user._id}
          receiverId={rideDetails.user._id}
          onClose={() => setShowChatModal(false)}
        />
      )}
            {showReportModal && (
        <ReportCustomerModal 
          username={rideDetails.user.username}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReportModal(false)}
        />
      )}

    </div>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3">
    <div className="text-gray-500 dark:text-gray-400">{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default RideSummary;
