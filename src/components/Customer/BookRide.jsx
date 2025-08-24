import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Car, ArrowLeft, Navigation, XCircle, Briefcase, Bike } from 'lucide-react';
import MapComponent from '../Map/MapComponent';
import api from '../../apiClient';
import L from 'leaflet';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const CustomModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1000]">
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm w-full relative">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <XCircle className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Error</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  </div>
);
// Define vehicle types with different fare rates
const vehicleTypes = [
  { name: 'Bike', icon: <Bike />, rate: 8 },
  { name: 'Hatchback', icon: <Car />, rate: 12 },
  { name: 'Sedan', icon: <Briefcase />, rate: 15 },
  { name: 'SUV', icon: <Car />, rate: 18 },
];

const indiaBounds = L.latLngBounds(
  L.latLng(6.5, 68.1),
  L.latLng(35.5, 97.4)
);

const BookRide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [estimatedFares, setEstimatedFares] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectionMode, setSelectionMode] = useState('pickup');
  const [modalMessage, setModalMessage] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    // Prefill pickup and dropoff locations if state passed through navigation
    const pickupLoc = location.state?.pickupLocation;
    const dropoffLoc = location.state?.dropoffLocation;

    if (pickupLoc && pickupLoc.address && pickupLoc.coords) {
      setPickup(pickupLoc.address);
      setPickupCoords(pickupLoc.coords);
    }

    if (dropoffLoc && dropoffLoc.address && dropoffLoc.coords) {
      setDropoff(dropoffLoc.address);
      setDropoffCoords(dropoffLoc.coords);
    }

    // Clear the navigation state so it doesn't refill on reload or back nav
    if (pickupLoc || dropoffLoc) {
      navigate('.', { state: null, replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(coords);
          if (!pickup) {
            setPickupCoords(coords);
            reverseGeocode(coords.lat, coords.lng, setPickup);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          if (!pickup) {
            const defaultCoords = { lat: 30.7333, lng: 76.7794 };
            setCurrentLocation(defaultCoords);
            setPickupCoords(defaultCoords);
            setPickup('Default Location: Chandigarh, India');
          }
        }
      );
    }
    fetchFrequentLocations();
  }, [pickup]);

  useEffect(() => {
    if (currentLocation) {
      fetchNearbyDrivers();
    }
    // eslint-disable-next-line
  }, [currentLocation]);

  useEffect(() => {
    if (socket) {
      socket.on('driverStatusUpdate', fetchNearbyDrivers);
    }
    return () => {
      if (socket) {
        socket.off('driverStatusUpdate', fetchNearbyDrivers);
      }
    };
    // eslint-disable-next-line
  }, [socket, currentLocation]);

  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      calculateFares();
    } else {
      setEstimatedFares([]);
      setDistance(null);
      setSelectedVehicle(null);
    }
  }, [pickupCoords, dropoffCoords]);

  const fetchFrequentLocations = async () => {
    try {
      const response = await api.get('/api/users/frequent-locations');
      // Not used in this component but kept here for completeness
    } catch (error) {
      console.error('Error fetching frequent locations:', error);
    }
  };

  const reverseGeocode = async (lat, lng, setAddress) => {
    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/reverse',
        {
          params: {
            format: 'json',
            lat,
            lon: lng,
            zoom: 18,
            addressdetails: 1
          }
        }
      );
      if (response.data && response.data.display_name) {
        setAddress(response.data.display_name);
      } else {
        setAddress(`Unknown location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setAddress(`Error getting address (coords: ${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
  };

  const geocodeAddress = async (address) => {
    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: address,
            format: 'json',
            limit: 1,
            'accept-language': 'en'
          }
        }
      );
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (!indiaBounds.contains(L.latLng(lat, lng))) {
          return { error: 'Location is outside the service area (India).' };
        }
        return { lat, lng, address: result.display_name };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const fetchRoadDistance = async (start, end) => {
    try {
      const response = await axios.get(
        `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`
      );
      if (response.data.routes && response.data.routes.length > 0) {
        return response.data.routes[0].distance / 1000;
      }
      return 0;
    } catch (error) {
      console.error('OSRM routing API error:', error);
      return 0;
    }
  };

  const fetchNearbyDrivers = async () => {
    try {
      if (!currentLocation) return;
      const response = await api.get(
        `/api/drivers/nearby?lat=${currentLocation.lat}&lng=${currentLocation.lng}`
      );
      setNearbyDrivers(response.data);
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
      setModalMessage('Could not contact the server to get nearby drivers. Please check your connection or try later.');
      setNearbyDrivers([]);
    }
  };

  const calculateFares = async () => {
    if (pickupCoords && dropoffCoords) {
      const roadDistance = await fetchRoadDistance(pickupCoords, dropoffCoords);
      if (roadDistance > 0) {
        setDistance(roadDistance);
        const fares = vehicleTypes.map(vehicle => ({
          ...vehicle,
          fare: Math.round(roadDistance * vehicle.rate),
        }));
        setEstimatedFares(fares);
        setSelectedVehicle(fares[0]); // Default to first vehicle
      } else {
        setDistance(null);
        setEstimatedFares([]);
        setSelectedVehicle(null);
      }
    }
  };

  const handleDropoffChange = async (e) => {
    const value = e.target.value;
    setDropoff(value);

    if (value.length > 3) {
      const result = await geocodeAddress(value);
      if (result && !result.error) {
        setDropoffCoords(result);
      } else {
        setDropoffCoords(null);
        setEstimatedFares([]);
        setDistance(null);
        if (result && result.error) setModalMessage(result.error);
      }
    } else {
      setDropoffCoords(null);
      setEstimatedFares([]);
      setDistance(null);
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          if (!indiaBounds.contains(L.latLng(coords.lat, coords.lng))) {
            setModalMessage('Service is not available in your current location.');
            return;
          }
          setPickupCoords(coords);
          await reverseGeocode(coords.lat, coords.lng, setPickup);
        },
        (error) => {
          console.error('Error getting location for button:', error);
          setModalMessage('Could not get your current location. Please enter it manually.');
        }
      );
    } else {
      setModalMessage('Geolocation is not supported by your browser.');
    }
  };

  const bookRide = async () => {
    if (!pickupCoords || !dropoffCoords || !selectedVehicle) {
      setModalMessage('Please select pickup, dropoff, and a vehicle type.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/rides/request', {
        pickup: { address: pickup, ...pickupCoords },
        dropoff: { address: dropoff, ...dropoffCoords },
        vehicleType: selectedVehicle.name,
        fare: selectedVehicle.fare,
        scheduledFor: isScheduling && scheduleDate && scheduleTime
          ? new Date(`${scheduleDate}T${scheduleTime}:00`)
          : null
      });
      navigate(`/track-ride/${response.data._id}`);
    } catch (error) {
      setModalMessage(error.response?.data?.error || 'Failed to book ride.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (coords) => {
    if (selectionMode === 'pickup') {
      setPickupCoords(coords);
      reverseGeocode(coords.lat, coords.lng, setPickup);
      setSelectionMode('dropoff');
    } else if (selectionMode === 'dropoff') {
      setDropoffCoords(coords);
      reverseGeocode(coords.lat, coords.lng, setDropoff);
      setSelectionMode(null);
    }
  };

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Book a Ride</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-6 text-gray-900 dark:text-white">Trip Details</h2>
            <div className="space-y-4">
              <div
                className={`p-2 border-2 rounded-md ${selectionMode === 'pickup' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-transparent'}`}
                onClick={() => setSelectionMode('pickup')}
              >
                <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
                  Pickup Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-green-500" />
                  <input
                    type="text"
                    value={pickup}
                    onChange={(e) => {
                      setPickup(e.target.value);
                      if (e.target.value === '') setPickupCoords(null);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter pickup location or click on map"
                  />
                  <button
                    onClick={useCurrentLocation}
                    className="absolute right-2 top-2 p-1 text-blue-600 hover:text-blue-800"
                    title="Use current location"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                className={`p-2 border-2 rounded-md ${selectionMode === 'dropoff' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-transparent'}`}
                onClick={() => setSelectionMode('dropoff')}
              >
                <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
                  Dropoff Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-red-500" />
                  <input
                    type="text"
                    value={dropoff}
                    onChange={handleDropoffChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter dropoff location or click on map"
                  />
                </div>
              </div>

              {/* Schedule Ride Section */}
              <div className="pt-4 border-t dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Schedule for later</h3>
                  <button onClick={() => setIsScheduling(!isScheduling)} className={`px-4 py-2 text-sm rounded-md ${isScheduling ? 'bg-blue-100 dark:bg-blue-900 text-blue-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                    {isScheduling ? 'Schedule Active' : 'Schedule Ride'}
                  </button>
                </div>
                {isScheduling && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
                  </div>
                )}
              </div>
              {/* Vehicle Selection */}
              {estimatedFares.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-4">Choose a ride</h3>
                  <div className="space-y-3">
                    {estimatedFares.map(vehicle => (
                      <div
                        key={vehicle.name}
                        onClick={() => setSelectedVehicle(vehicle)}
                        className={`p-4 flex items-center justify-between rounded-lg cursor-pointer transition-all ${
                          selectedVehicle?.name === vehicle.name
                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="mr-4 text-gray-900 dark:text-white">{vehicle.icon}</div>
                          <div>
                            <p className="font-bold">{vehicle.name}</p>
                            <p className="text-xs">{distance ? `${distance.toFixed(1)} km` : ''}</p>
                          </div>
                        </div>
                        <p className="font-semibold">₹{vehicle.fare}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nearbyDrivers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
                    Available Drivers ({nearbyDrivers.length})
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {nearbyDrivers.map((driver) => (
                      <div key={driver._id} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {driver.user.username}
                            </span>
                            <span className="text-sm ml-2 text-gray-600 dark:text-gray-300">
                              {driver.vehicleType}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-yellow-600">
                          ★ {driver.rating ? driver.rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={bookRide}
                disabled={loading || !selectedVehicle}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Booking...' : `Book ${selectedVehicle ? selectedVehicle.name : 'Ride'}`}
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <MapComponent
              center={currentLocation}
              pickup={pickupCoords}
              dropoff={dropoffCoords}
              drivers={nearbyDrivers}
              height="600px"
              onMapClick={handleMapClick}
            />
          </div>
        </div>
      </div>
      {modalMessage && <CustomModal message={modalMessage} onClose={() => setModalMessage(null)} />}
    </div>
  );
};

export default BookRide;
