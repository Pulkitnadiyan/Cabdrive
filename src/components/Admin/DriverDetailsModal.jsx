import React, { useState } from 'react';
import { X, User, Car, Shield, Phone, CreditCard, Star, Ban } from 'lucide-react';
import RejectionModal from './RejectionModal';

const DriverDetailsModal = ({ driver, onClose, onVerify, onReject }) => {
    if (!driver) return null;

    const [showRejectionModal, setShowRejectionModal] = useState(false);

    // Check if all required fields are filled for verification
    const isProfileComplete = 
        driver.phoneNumber &&
        driver.aadharNumber &&
        driver.upiId &&
        driver.profilePhoto &&
        driver.carPhoto &&
        driver.drivingLicensePhoto;

    const handleRejectSubmit = (reason) => {
        onReject(driver._id, reason);
        setShowRejectionModal(false); // Close the rejection modal
    };

    const getPhotoURL = (path) => {
        if (!path) return 'https://via.placeholder.com/150';
        // Your backend URL should be configured to serve static files from the 'uploads' directory
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        return `${backendUrl}/${path.replace(/\\/g, '/')}`;
    };

    const InfoItem = ({ icon, label, value }) => (
      <div className="flex items-center space-x-3">
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">{value || 'Not provided'}</p>
        </div>
      </div>
    );
    
    const ImageDisplay = ({ label, src }) => (
        <div>
            <p className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</p>
            <img
                src={src}
                alt={label}
                className="w-full h-40 object-cover rounded-lg border dark:border-gray-600 shadow-sm"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Driver Verification</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center space-x-4">
                        <img src={getPhotoURL(driver.profilePhoto)} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 dark:border-gray-700"/>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{driver.user.username}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{driver.user.email}</p>
                            <div className="flex items-center mt-1">
                                <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                                <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    {driver.rating ? driver.rating.toFixed(1) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem icon={<Phone size={20}/>} label="Phone Number" value={driver.phoneNumber} />
                        <InfoItem icon={<CreditCard size={20}/>} label="UPI ID" value={driver.upiId} />
                        <InfoItem icon={<Car size={20}/>} label="Vehicle" value={`${driver.vehicleType} - ${driver.vehicleNumber}`} />
                        <InfoItem icon={<Shield size={20}/>} label="Aadhar Number" value={driver.aadharNumber} />
                    </div>
                    
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Uploaded Documents</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageDisplay label="Car Photo" src={getPhotoURL(driver.carPhoto)} />
                            <ImageDisplay label="Driving License" src={getPhotoURL(driver.drivingLicensePhoto)} />
                        </div>
                    </div>
                </div>

                {/* Footer with Action Buttons */}
                {!driver.profileCompleted && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 flex flex-col">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowRejectionModal(true)}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center"
                            >
                                <Ban className="mr-2" size={18}/>
                                Reject
                            </button>
                            <button
                                onClick={() => onVerify(driver._id)}
                                disabled={!isProfileComplete}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                Verify and Approve
                            </button>
                        </div>
                         {/* NEW: Show a message explaining why the button is disabled */}
                        {!isProfileComplete && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-2 text-center">
                                Cannot verify: Driver has not provided all required information and documents.
                            </p>
                        )}
                        {!isProfileComplete && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-2 text-center">
                                Cannot verify: Driver has not provided all required information and documents.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {showRejectionModal && (
                <RejectionModal 
                    username={driver.user.username}
                    onSubmit={handleRejectSubmit}
                    onClose={() => setShowRejectionModal(false)}
                />
            )}
        </div>
    );
};

export default DriverDetailsModal;
