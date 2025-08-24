import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ReportDriverModal = ({ rideId, driverName, onSubmit, onClose }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (reason.trim() === '') {
            alert('Please provide a reason for the report.');
            return;
        }
        setIsSubmitting(true);
        await onSubmit(rideId, { reason });
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000]">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm w-full relative text-center">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X size={20} />
                </button>
                
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Report Driver</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">You are reporting {driverName}. Please provide a reason below.</p>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please describe the issue..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 min-h-[120px] focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />

                <div className="mt-6">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || reason.trim() === ''}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
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

export default ReportDriverModal;
