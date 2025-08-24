import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Car, Calendar } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../apiClient";

const RideHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRideHistory = useCallback(async () => {
    if (!user) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/rides/history");
      setRides(response.data);
    } catch (err) {
      console.error("Error fetching ride history:", err);
      setError("Failed to fetch ride history. Please check your network connection and try again.");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRideHistory();
  }, [fetchRideHistory]);

  useEffect(() => {
    if (socket) {
      const handleStatusUpdate = (data) => {
        if (data.status === "completed" || data.status === "cancelled") {
          fetchRideHistory();
        }
      };
      socket.on("rideStatusUpdate", handleStatusUpdate);

      return () => {
        socket.off("rideStatusUpdate", handleStatusUpdate);
      };
    }
  }, [socket, fetchRideHistory]);

  const getStatusColor = (status) => {
    const colors = {
      completed: "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300",
      cancelled: "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300",
      started: "text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
      accepted: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300",
      requested: "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[status] || "text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Car className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">Loading ride history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <p className="text-red-600 font-semibold text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-300 font-semibold w-full"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center space-x-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back to Dashboard"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white select-text">Ride History</h1>
        </div>
      </header>

      {/* Ride List */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {rides.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-10 text-center">
            <Car className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No rides yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your ride history will appear here once you start booking rides.
            </p>
            <button
              onClick={() => navigate("/book-ride")}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-300 font-semibold"
            >
              Book Your First Ride
            </button>
          </div>
        ) : (
          <ul className="space-y-6">
            {rides.map((ride) => (
              <li
                key={ride._id}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 space-y-4 md:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Car className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            ride.status
                          )} select-text`}
                        >
                          {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                        </span>
                        {ride.driver?.user && (
                          <span className="text-sm text-gray-700 dark:text-gray-200 select-text">
                            with {ride.driver.user.username}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-1 select-text">
                        <Calendar className="h-4 w-4" />
                        <time dateTime={ride.createdAt}>
                          {new Date(ride.createdAt).toLocaleDateString()} at {new Date(ride.createdAt).toLocaleTimeString()}
                        </time>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end text-green-600 font-semibold space-x-1">
                      <span className="text-lg">₹</span>
                      <span>{ride.fare}</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 select-text">{ride.distance} km</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-green-500 mr-3 mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white select-text">Pickup</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 select-text">{ride.pickup.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-red-500 mr-3 mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white select-text">Dropoff</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 select-text">{ride.dropoff.address}</p>
                    </div>
                  </div>
                </div>

                {ride.status === "completed" && ride.startTime && ride.endTime && (
                  <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center text-sm text-gray-700 dark:text-gray-200 space-x-2 select-text">
                      <Clock className="h-4 w-4" />
                      <span>
                        Duration:{" "}
                        {Math.round(
                          (new Date(ride.endTime) - new Date(ride.startTime)) / 60000
                        )}{" "}
                        minutes
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/track-ride/${ride._id}`)}
                      className="text-blue-600 hover:text-blue-800 font-semibold transition"
                    >
                      View Details
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default RideHistory;
