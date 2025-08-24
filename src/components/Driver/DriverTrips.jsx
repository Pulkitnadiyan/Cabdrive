import React, {useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Car, Calendar, User, Calculator, MessageSquare } from 'lucide-react';
import api from '../../apiClient';

const DriverTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, []);

const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/drivers/trips');
      setTrips(response.data);
    } catch (err) {
      console.error('Error fetching trips:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to fetch trip history. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (status) => {
    const colors = {
      completed: 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300',
      cancelled: 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300',
      started: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300',
      accepted: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300',
      requested: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[status] || 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
  };

  const totalEarnings = trips
    .filter(trip => trip.status === 'completed')
    .reduce((sum, trip) => sum + trip.fare, 0);

  const completedTrips = trips.filter(trip => trip.status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading trip history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trip History</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard
            icon={<Car className="h-8 w-8 text-blue-600" />}
            label="Completed Trips"
            value={completedTrips}
          />
          <SummaryCard
            icon={<span className="text-3xl text-green-600">₹</span>}
            label="Total Earnings"
            value={`₹${Math.round(totalEarnings * 100) / 100}`}
          />
          <SummaryCard
            icon={<Calculator className="h-8 w-8 text-purple-600" />}
            label="Average Fare"
            value={
              completedTrips > 0
                ? `₹${Math.round((totalEarnings / completedTrips) * 100) / 100}`
                : '₹0'
            }
          />
        </div>

        {trips.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <Car className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No trips yet</h3>
            <p className="text-gray-600 dark:text-gray-400">Your trip history will appear here once you start accepting rides.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div key={trip._id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {trip.user?.username || 'Customer'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(trip.createdAt).toLocaleDateString()} at {new Date(trip.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-600 font-semibold">
                      <span className="text-lg mr-1">₹</span>
                      {trip.fare}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{trip.distance} km</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <LocationItem label="Pickup" color="text-green-500" address={trip.pickup.address} />
                  <LocationItem label="Dropoff" color="text-red-500" address={trip.dropoff.address} />
                </div>

                {trip.review && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                        <div className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                            <MessageSquare className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                            <div>
                                <p className="font-semibold">Customer Review:</p>
                                <p className="italic">"{trip.review}"</p>
                            </div>
                        </div>
                    </div>
                )}

                {trip.status === 'completed' && trip.startTime && trip.endTime && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Clock className="h-4 w-4 mr-1" />
                      Duration: {Math.round((new Date(trip.endTime) - new Date(trip.startTime)) / 60000)} minutes
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value }) => (
  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex items-center">
    {icon}
    <div className="ml-4">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  </div>
);

const LocationItem = ({ label, color, address }) => (
  <div className="flex items-start">
    <MapPin className={`h-4 w-4 ${color} mr-3 mt-1 flex-shrink-0`} />
    <div className="flex-grow">
      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">{address}</p>
    </div>
  </div>
);

export default DriverTrips;
