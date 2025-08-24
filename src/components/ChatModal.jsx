import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import api from '../apiClient';
import { useAuth } from '../context/AuthContext';

const ChatModal = ({ rideId, senderId, receiverId, onClose }) => {
  const { socket, chatMessages, addNewChatMessage } = useSocket();
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const messages = chatMessages[rideId] || [];

  // Scroll to bottom on messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/chat/${rideId}`);
        const history = response.data;
        if (socket) {
          socket.emit('populateChatHistory', { rideId, messages: history });
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (socket) {
      socket.emit('joinRideRoom', rideId);
      fetchChatHistory();
    }
  }, [rideId, socket]);

  // Proper sender check with string equality
  const isSender = (messageSender) => String(messageSender._id) === String(user.id);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const messageText = messageInput.trim();
    if (messageText === '') return;

    // Optimistic UI message with tempId & full sender info
    const tempId = String(Date.now());
    const tempMessage = {
      _id: tempId,
      ride: rideId,
      sender: {
        _id: user.id,
        username: user.username,
      },
      text: messageText,
      timestamp: new Date().toISOString(),
      tempId,
    };

    // Add optimistic message immediately
    addNewChatMessage(tempMessage);

    // Send message to backend with tempId for deduplication
    if (socket) {
      socket.emit('sendMessage', {
        rideId,
        senderId: user.id,
        text: messageText,
        tempId,
      });
    }

    setMessageInput('');
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col h-[70vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Chat with {user.isDriver ? "Customer" : "Driver"}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Start a conversation!</p>
          ) : (
            messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${isSender(message.sender) ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
                  isSender(message.sender)
                    ? 'bg-blue-600 text-white rounded-br-none'   // sender's own message on right
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none' // received message on left
                }`}
                >
                  <p className="text-sm font-medium">
                    {message.sender?.username || 'Unknown'}
                  </p>
                  <p className="text-sm mt-1">{message.text}</p>
                  <span className={`block text-xs mt-1 ${
                    isSender(message.sender) ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
            disabled={messageInput.trim() === ''}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
