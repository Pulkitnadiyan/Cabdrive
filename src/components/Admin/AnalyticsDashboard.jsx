import React, { useState, useEffect } from 'react';
import api from '../../apiClient';
import { Users, Car, BarChart2, DollarSign } from 'lucide-react';
import StatCard from './StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AnalyticsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/admin/analytics');
                setStats(response.data);
            } catch (err) {
                setError('Failed to fetch analytics data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (!stats) return null;
    
    const chartData = Object.keys(stats.ridesByDate).map(date => ({
        date,
        rides: stats.ridesByDate[date],
    })).slice(-10); // Show last 10 days for clarity

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Platform Analytics</h2>
            
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={<Users />} label="Total Users" value={stats.totalUsers} color="blue" />
                <StatCard icon={<Car />} label="Total Drivers" value={stats.totalDrivers} color="purple" />
                <StatCard icon={<BarChart2 />} label="Completed Rides" value={stats.totalRides} color="yellow" />
                <StatCard icon={<DollarSign />} label="Total Earnings" value={`₹${stats.totalEarnings.toFixed(2)}`} color="green" />
            </div>

            {/* Rides Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Ride Activity</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="date" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#f3f4f6' }}/>
                            <Legend />
                            <Bar dataKey="rides" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
