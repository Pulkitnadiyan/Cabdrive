import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Edit, Save, ArrowLeft, Phone, Calendar } from 'lucide-react';
import api from '../../apiClient';

const UserProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    age: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user profile
  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!user?.id) {
          throw new Error('User not authenticated.');
        }
        // FIX: The redundant 'headers' object has been removed.
        // The apiClient handles the token automatically.
        const response = await api.get(`/api/users/profile/${user.id}`);
        setUserData(response.data);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        if (err.message === 'User not authenticated.') {
          setError('Please log in to view your profile.');
        } else if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError('Failed to load profile. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchUserDetails();
    } else {
      setLoading(false);
      setError('User not authenticated.');
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prevData => ({ ...prevData, [name]: value }));
  };

  // Save profile changes
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) throw new Error('User not authenticated.');
      // FIX: The redundant 'headers' object has been removed.
      const response = await api.put(
        `/api/users/profile/${user.id}`,
        userData
      );
      setUserData(response.data);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to save user profile:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderProfileView = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <User className="h-6 w-6 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{userData.name || 'Not available'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Mail className="h-6 w-6 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Address</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{userData.email || 'Not available'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Phone className="h-6 w-6 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{userData.phoneNumber || 'Not available'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Calendar className="h-6 w-6 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Age</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{userData.age || 'Not available'}</p>
        </div>
      </div>
      <button
        onClick={() => setIsEditing(true)}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                   font-medium transition duration-200 flex items-center justify-center space-x-2"
      >
        <Edit className="h-5 w-5" />
        <span>Edit Profile</span>
      </button>
    </div>
  );

  const renderEditForm = () => (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
        <input
          type="text" id="name" name="name" value={userData.name}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 
                     focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
        <input
          type="email" id="email" name="email" value={userData.email}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 
                     focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        />
      </div>
      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
        <input
          type="tel" id="phoneNumber" name="phoneNumber" value={userData.phoneNumber}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 
                     focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div>
        <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
        <input
          type="number" id="age" name="age" value={userData.age}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 
                     focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div className="flex space-x-4">
        <button
          type="submit" disabled={loading}
          className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                     font-medium transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          <span>{loading ? 'Saving...' : 'Save Changes'}</span>
        </button>
        <button
          type="button" onClick={() => setIsEditing(false)}
          className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-md 
                     hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 
                     focus:ring-offset-2 font-medium transition duration-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {loading ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading profile...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : isEditing ? (
            renderEditForm()
          ) : (
            renderProfileView()
          )}
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
