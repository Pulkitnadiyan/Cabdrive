import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../apiClient";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle, Smartphone, AlertCircle, XCircle, Info } from 'lucide-react';
import RatingModal from '../RatingModal';

const CustomModal = ({ title, message, onClose, type = 'info' }) => {
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

const CustomerPayment = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rideDetails, setRideDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    const fetchRideDetails = async () => {
      if (!rideId) {
        setLoading(false);
        setError("Invalid ride ID.");
        return;
      }
      try {
        const rideRes = await api.get(`/api/rides/${rideId}`);
        setRideDetails(rideRes.data);
      } catch (err) {
        setError("Could not load ride details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRideDetails();
  }, [rideId]);

  const handleSimulatePayment = async () => {
    try {
        await api.post(`/api/rides/${rideId}/mark-as-paid`);
        setShowRatingModal(true);
    } catch (err) {
        setModal({
          title: "Payment Failed",
          message: "Could not complete simulated payment. Please try again.",
          type: 'error',
          onClose: () => setModal(null)
        });
    }
  };
  
  const handleRatingSubmit = async (rideId, { rating, review }) => {
      try {
          await api.post(`/api/rides/${rideId}/rate`, { rating, review });
      } catch (err) {
          console.error("Failed to submit rating:", err);
      } finally {
          setShowRatingModal(false);
          navigate('/dashboard');
      }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6 text-center">
         <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 font-semibold">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 bg-blue-600 text-white px-5 py-2 rounded-md">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Complete Your Payment</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
                For your ride from {rideDetails?.pickup.address.split(',')[0]} to {rideDetails?.dropoff.address.split(',')[0]}
            </p>

            <div className="text-6xl font-extrabold text-gray-900 dark:text-white my-6">
                ₹{rideDetails?.fare.toFixed(2)}
            </div>
            
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">For Testing Purposes</span>
                </div>
            </div>

             <div className="mt-4">
                <button
                    onClick={handleSimulatePayment}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-md w-full mx-auto flex justify-center items-center space-x-2"
                >
                    <CheckCircle size={20}/>
                    <span>Simulate Successful Payment</span>
                </button>
            </div>
        </div>
        {modal && <CustomModal {...modal} />}
        {showRatingModal && (
            <RatingModal 
                rideId={rideId}
                driverName={rideDetails?.driver?.user?.username || 'the driver'}
                onSubmit={handleRatingSubmit}
                onSkip={() => navigate('/dashboard')}
            />
        )}
    </div>
  );
};

export default CustomerPayment;
