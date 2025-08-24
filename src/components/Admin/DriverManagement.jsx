import React, { useState, useEffect } from 'react';
import api from '../../apiClient';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import DriverDetailsModal from './DriverDetailsModal';

const DriverManagement = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/drivers');
            setDrivers(response.data);
        } catch (err) {
            setError('Failed to fetch drivers.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleRowClick = async (driverId) => {
        try {
            const response = await api.get(`/api/admin/drivers/${driverId}`);
            setSelectedDriver(response.data);
            setIsModalOpen(true);
        } catch (err) {
            console.error('Failed to fetch driver details:', err);
            alert('Could not load driver details.');
        }
    };

    const handleVerifyDriver = async (driverId) => {
        try {
            await api.post(`/api/admin/drivers/${driverId}/verify`);
            fetchDrivers(); // Refresh the list
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to verify driver:', err);
            alert('Could not verify the driver. Please check the console for errors.');
        }
    };

    const handleRejectDriver = async (driverId, reason) => {
        try {
            await api.post(`/api/admin/drivers/${driverId}/reject`, { reason });
            fetchDrivers(); // Refresh the list
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to reject driver:', err);
            alert('Could not reject the driver. Please check the console for errors.');
        }
    };

    if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading drivers...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Driver Management</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Driver</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Vehicle</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {drivers.map(driver => (
                            <tr 
                                key={driver._id} 
                                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                onClick={() => handleRowClick(driver._id)}
                            >
                                <td className="py-3 px-4">
                                    <p className="text-gray-800 dark:text-white font-medium">{driver.user.username}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{driver.user.email}</p>
                                </td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{driver.vehicleType} - {driver.vehicleNumber}</td>
                                <td className="py-3 px-4">
                                    {driver.profileCompleted ? (
                                        <span className="flex items-center text-xs font-medium text-green-600 dark:text-green-400">
                                            <ShieldCheck className="h-4 w-4 mr-1" />
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                            <ShieldOff className="h-4 w-4 mr-1" />
                                            Pending
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <DriverDetailsModal 
                    driver={selectedDriver}
                    onClose={() => setIsModalOpen(false)}
                    onVerify={handleVerifyDriver}
                    onReject={handleRejectDriver}
                />
            )}
        </div>
    );
};

export default DriverManagement;
