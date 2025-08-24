import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { user, token, logout } = useAuth();
  
  const [rideStatuses, setRideStatuses] = useState({});
  const [chatMessages, setChatMessages] = useState({});

const addNewChatMessage = (message) => {
  const rideId = message.ride;
  if (!rideId) return;
  setChatMessages(prev => {
    const rideMessages = prev[rideId] || [];

    // Find existing by Mongo _id or by tempId match for optimistic deduplication
    const existingIndex = rideMessages.findIndex(m =>
      (m._id === message._id) ||
      (m.tempId && message.tempId && m.tempId === message.tempId)
    );

    let updatedMessages;
    if (existingIndex > -1) {
      updatedMessages = [...rideMessages];
      updatedMessages[existingIndex] = message; // Replace duplicate/optimistic message
    } else {
      updatedMessages = [...rideMessages, message];
    }

    return { ...prev, [rideId]: updatedMessages };
  });
};


  useEffect(() => {
    if (token && user?.id) {
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
      if (!SOCKET_URL) {
        console.error("VITE_SOCKET_URL is not defined!");
        return;
      }
      
      const newSocket = io(SOCKET_URL, {
        auth: { token }
      });

      newSocket.on('connect', () => console.log('✅ WebSocket Connected'));

      newSocket.on('rideStatusUpdate', (data) => {
        setRideStatuses(prev => ({
          ...prev,
          [data.rideId]: data.status
        }));
        setNotifications(prev => [...prev, { id: Date.now(), type: 'statusUpdate', message: `Ride status updated to: ${data.status}` }]);
      });

      // Listener for incoming chat messages
      newSocket.on('chatMessage', (message) => {
        addNewChatMessage(message);
      });
      
      // Listener to populate chat history
      newSocket.on('chatHistory', ({ rideId, messages }) => {
        setChatMessages(prev => ({
          ...prev,
          [rideId]: messages
        }));
      });
      
      newSocket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
        if (err.message.includes('Authentication error')) {
          logout();
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setRideStatuses({});
        setChatMessages({});
      };
    } else {
      if (socket) socket.disconnect();
      setRideStatuses({});
      setChatMessages({});
    }
  }, [token, user, logout]);

  const clearRideStatuses = () => {
      setRideStatuses({});
  };

  const contextValue = {
    socket,
    notifications,
    rideStatuses,
    clearRideStatuses,
    chatMessages,
    addNewChatMessage,
    removeNotification: (id) => setNotifications(prev => prev.filter(n => n.id !== id)),
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};
