import React, { useState } from 'react';
import { X, Banknote } from 'lucide-react';

const BankAccountModal = ({ username, onSubmit, onClose }) => {
    const [accountNumber, setAccountNumber] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (accountNumber.trim() === '' || ifsc.trim() === '') {
            setError('Please fill out both fields.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await onSubmit({ accountNumber, ifsc });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to connect account.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000]">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X size={20} />
                </button>
                
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                            <Banknote className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Connect Bank Account</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Enter your bank details to receive payouts. This information is sent securely and is not stored on our servers.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</label>
                        <input
                            id="accountNumber"
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="mt-1 w-full border rounded-md shadow-sm p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="ifsc" className="block text-sm font-medium text-gray-700 dark:text-gray-300">IFSC Code</label>
                        <input
                            id="ifsc"
                            type="text"
                            value={ifsc}
                            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                            className="mt-1 w-full border rounded-md shadow-sm p-2 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="mt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Connecting...' : 'Connect Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BankAccountModal;
