import React, { useState, useEffect } from 'react';
import api from '../../apiClient';
import { DollarSign, BarChart2, Briefcase } from 'lucide-react';
import StatCard from './StatCard'; // Reusing the StatCard component

const EarningsPanel = () => {
    const [earningsData, setEarningsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEarnings = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/admin/earnings');
                setEarningsData(response.data);
            } catch (err) {
                setError('Failed to fetch earnings data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEarnings();
    }, []);

    if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading earnings data...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (!earningsData) return null;

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Earnings Overview</h2>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<DollarSign />} label="Total Revenue" value={`₹${earningsData.totalRevenue.toFixed(2)}`} color="green" />
                <StatCard icon={<Briefcase />} label="Platform Commission" value={`₹${earningsData.platformCommission.toFixed(2)}`} color="blue" />
            </div>

            {/* Driver Earnings Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Driver Earnings</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Driver</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">UPI ID</th>
                                <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Total Earnings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {earningsData.driverEarnings.map(driver => (
                                <tr key={driver.driverId} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="py-3 px-4 text-gray-800 dark:text-white">{driver.driverName}</td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{driver.upiId || 'Not Provided'}</td>
                                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-semibold">₹{driver.totalEarnings.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EarningsPanel;