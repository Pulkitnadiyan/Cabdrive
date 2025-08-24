import React, { useState, useEffect } from 'react';
import api from '../../apiClient';
import { Shield, Ban } from 'lucide-react';
import SuspensionModal from './SuspensionModal'; // Import the new modal

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/admin/users');
                setUsers(response.data);
            } catch (err) {
                setError('Failed to fetch users. You may not have admin privileges.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const openSuspendModal = (user) => {
        setSelectedUser(user);
        setShowSuspendModal(true);
    };

    const handleSuspendUser = async (duration) => {
        if (!selectedUser) return;

        try {
            const response = await api.post(`/api/admin/users/${selectedUser._id}/suspend`, { duration });
            
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user._id === selectedUser._id ? { ...user, suspendedUntil: response.data.suspendedUntil } : user
                )
            );
        } catch (err) {
            console.error('Failed to suspend user:', err);
            alert('Could not update user status. Please check the console.');
        } finally {
            setShowSuspendModal(false);
            setSelectedUser(null);
        }
    };

    const handleUnsuspendUser = async (userId) => {
        try {
            const response = await api.post(`/api/admin/users/${userId}/suspend`, { duration: 0 });
            
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user._id === userId ? { ...user, suspendedUntil: null } : user
                )
            );
        } catch (err) {
            console.error('Failed to unsuspend user:', err);
            alert('Could not update user status. Please check the console.');
        }
    };
    
    const isUserSuspended = (user) => {
        return user.suspendedUntil && new Date(user.suspendedUntil) > new Date();
    };

    if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading users...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">User Management</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
                    <thead>
                        <tr className="border-b dark:border-gray-700">
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Username</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => {
                            const suspended = isUserSuspended(user);
                            return (
                                <tr key={user._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="py-3 px-4 text-gray-800 dark:text-white">{user.username}</td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                                    <td className="py-3 px-4">
                                        <span className={`flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                                            suspended 
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
                                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        }`}>
                                            {suspended ? `Suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}` : 'Active'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {user.username !== 'pulkit' && (
                                            <button
                                                onClick={() => suspended ? handleUnsuspendUser(user._id) : openSuspendModal(user)}
                                                className={`flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                                                    suspended
                                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                                }`}
                                            >
                                                {suspended ? <Shield className="h-4 w-4 mr-1"/> : <Ban className="h-4 w-4 mr-1"/>}
                                                {suspended ? 'Unsuspend' : 'Suspend'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showSuspendModal && selectedUser && (
                <SuspensionModal
                    username={selectedUser.username}
                    onSubmit={handleSuspendUser}
                    onClose={() => setShowSuspendModal(false)}
                />
            )}
        </div>
    );
};

export default UserManagement;
