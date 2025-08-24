import React, { useState } from 'react';
import { X } from 'lucide-react';

const CancellationReasonModal = ({ onCancel, onSubmit }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const reasons = [
    "Driver is too far away",
    "Expected a shorter wait time",
    "My plans have changed",
    "Booked by mistake",
    "Other"
  ];

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Ride</h2>
          <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Please select a reason for cancellation:</p>
        <div className="space-y-2 mb-6">
          {reasons.map((reason) => (
            <label key={reason} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <input
                type="radio"
                name="cancellationReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-800 dark:text-gray-200">{reason}</span>
            </label>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!selectedReason}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400"
        >
          Confirm Cancellation
        </button>
      </div>
    </div>
  );
};

export default CancellationReasonModal;
