// src/components/Driver/StatusUpdater.jsx

import React, { useState } from 'react';
import api from '../../apiClient';
import { CheckCircle, Car, Clock, XCircle } from 'lucide-react';

const StatusButton = ({ onClick, color, icon, text }) => {
    const colors = {
        green: 'bg-green-600 hover:bg-green-700',
        blue: 'bg-blue-600 hover:bg-blue-700',
        yellow: 'bg-yellow-600 hover:bg-yellow-700',
    };
    const btnColor = colors[color] || 'bg-gray-600';

    return (
        <button onClick={onClick} className={`${btnColor} text-white px-4 py-3 rounded-md font-semibold flex justify-center items-center space-x-2 w-full`}>
            {icon}
            <span>{text}</span>
        </button>
    );
};

const StatusUpdater = ({ rideId, currentStatus, isOtpVerified, onCancelClick, onVerifyOtp }) => {
    const [otpInput, setOtpInput] = useState('');

    const updateRideStatus = async (status) => {
        try {
            await api.put(`/api/rides/${rideId}/status`, { status });
            // The status update will be handled by the socket listener
            // in RideSummary and other components. No need for a modal here.
        } catch (err) {
            console.error('Failed to update ride status:', err);
            alert("Failed to update ride status. Please check the console.");
        }
    };

    const renderButtons = () => {
        switch (currentStatus) {
            case 'accepted':
                return <StatusButton onClick={() => updateRideStatus('arrived')} color="green" icon={<CheckCircle />} text="Arrived at Pickup" />;
            case 'arrived':
                if (isOtpVerified) {
                    return <StatusButton onClick={() => updateRideStatus('started')} color="blue" icon={<Car />} text="Start Ride" />;
                }
                return (
                    <div className="flex space-x-2 w-full">
                        <input
                            type="text"
                            placeholder="Enter OTP"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            className="flex-1 px-4 py-2 border rounded-md"
                        />
                        <button
                            onClick={() => onVerifyOtp(otpInput)} // FIX: Correctly pass otpInput to the handler
                            disabled={otpInput.length !== 4}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
                        >
                            Verify
                        </button>
                    </div>
                );
            case 'started':
                return <StatusButton onClick={() => updateRideStatus('completed')} color="yellow" icon={<Clock />} text="End Ride" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4 text-center">
            {renderButtons()}
            {(currentStatus === 'accepted' || currentStatus === 'arrived') && (
                <button
                    onClick={onCancelClick}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-md flex justify-center items-center space-x-2 transition"
                >
                    <XCircle size={20} />
                    <span>Cancel Ride</span>
                </button>
            )}
        </div>
    );
};

export default StatusUpdater;
