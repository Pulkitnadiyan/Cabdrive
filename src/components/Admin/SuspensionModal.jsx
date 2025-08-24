import React, { useState } from 'react';
import { X, Ban } from 'lucide-react';

const SuspensionModal = ({ username, onSubmit, onClose }) => {
    const [duration, setDuration] = useState(7); // Default to 7 days

    const suspensionOptions = [
        { label: '3 Days', value: 3 },
        { label: '7 Days', value: 7 },
        { label: '15 Days', value: 15 },
        { label: '1 Month', value: 30 },
        { label: '3 Months', value: 90 },
    ];

    const handleSubmit = () => {
        onSubmit(duration);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[1000]">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full relative text-center">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X size={20} />
                </button>
                
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <Ban className="h-6 w-6 text-red-600" />
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Suspend User</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Select a suspension duration for {username}.</p>

                <div className="space-y-2 mb-6">
                    {suspensionOptions.map(option => (
                        <label key={option.value} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            <input
                                type="radio"
                                name="suspensionDuration"
                                value={option.value}
                                checked={duration === option.value}
                                onChange={() => setDuration(option.value)}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-gray-800 dark:text-gray-200">{option.label}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-6">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Apply Suspension
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

export default SuspensionModal;