import React, { useState, useEffect } from 'react';
import api from '../../apiClient';
import { useSocket } from '../../context/SocketContext';
import MapComponent from '../Map/MapComponent';
import { Car, User } from 'lucide-react';

const RideMonitor = () => {
    const [activeRides, setActiveRides] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { socket } = useSocket();

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const ridesResponse = await api.get('/api/admin/active-rides');
                setActiveRides(ridesResponse.data);

                const driversFromRides = ridesResponse.data
                    .map(ride => ride.driver)
                    .filter((driver, index, self) => driver && self.findIndex(d => d._id === driver._id) === index);
                
                setAllDrivers(driversFromRides);

            } catch (err) {
                setError('Failed to fetch initial ride data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleDriverLocationUpdate = (data) => {
            setAllDrivers(prevDrivers => {
                const driverExists = prevDrivers.some(d => d.user._id === data.driverId);
                if (driverExists) {
                    return prevDrivers.map(driver =>
                        driver.user._id === data.driverId
                            ? { ...driver, currentLocation: data.location }
                            : driver
                    );
                }
                // If the driver isn't in the list yet, you might need to fetch their details
                // For now, we'll just update existing ones.
                return prevDrivers;
            });
        };
        
        socket.on('driverLocationUpdate', handleDriverLocationUpdate);

        return () => {
            socket.off('driverLocationUpdate', handleDriverLocationUpdate);
        };
    }, [socket]);

    if (loading) return <p className="text-gray-500">Loading live ride data...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Live Ride Monitor</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                <div className="lg:col-span-2 bg-gray-200 rounded-lg overflow-hidden">
                    <MapComponent
                        center={{ lat: 28.6139, lng: 77.2090 }} // Default center
                        drivers={allDrivers}
                        height="100%"
                    />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Active Trips ({activeRides.length})</h3>
                    <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                        {activeRides.length > 0 ? activeRides.map(ride => (
                            <div key={ride._id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
                                <p className="font-semibold text-gray-900 dark:text-white flex items-center">
                                    <User className="h-4 w-4 mr-2" />
                                    {ride.user?.username || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-1">
                                    <Car className="h-4 w-4 mr-2" />
                                     with {ride.driver?.user?.username || 'N/A'}
                                </p>
                                <span className={`mt-2 inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800`}>
                                    {ride.status}
                                </span>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center pt-10">No active rides.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RideMonitor;