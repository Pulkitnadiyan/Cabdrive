import React from 'react';
import { X, Siren, Phone } from 'lucide-react';

const SOSModal = ({ rideDetails, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full relative text-center">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X size={20} />
                </button>
                
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center animate-pulse">
                        <Siren className="h-8 w-8 text-red-600" />
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-red-600 mb-2">Emergency SOS</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to send an emergency alert? Your ride details and current location will be shared with emergency services.
                </p>

                <div className="space-y-4 mb-6 text-left">
                    <a href="tel:112" className="flex items-center p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Phone className="h-5 w-5 text-gray-700 dark:text-gray-300 mr-3"/>
                        <span className="font-semibold text-gray-800 dark:text-white">Call Emergency Services (112)</span>
                    </a>
                </div>

                <div className="mt-6">
                    <button
                        onClick={onConfirm}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Confirm & Send Alert
                    </button>
                    <button
                        onClick={onClose}
                        className="mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SOSModal;
