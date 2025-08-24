import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import api from '../apiClient';
import { useAuth } from '../context/AuthContext';

const ChatbotModal = ({ onClose }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([{ sender: 'bot', text: 'Hi there! How can I help you with your cab ride today?' }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isTyping]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const userMessage = input.trim();
        if (!userMessage) return;

        // Optimistic update for user message
        const newUserMessage = { sender: 'user', text: userMessage };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await api.post('/api/chat/chatbot', { message: userMessage });
            const botMessage = { sender: 'bot', text: response.data.response };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessage = { sender: 'bot', text: "Sorry, I'm having trouble connecting right now. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000]">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col h-[70vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                        <Bot className="h-6 w-6 text-blue-600 mr-2" />
                        CabRide Assistant
                    </h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%] p-3 rounded-xl shadow-sm ${
                                message.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                            }`}>
                                {message.sender === 'bot' && <p className="font-semibold text-xs text-gray-600 dark:text-gray-400">Bot</p>}
                                <p className="text-sm mt-1">{message.text}</p>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="max-w-[75%] p-3 rounded-xl shadow-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none">
                                <p className="font-semibold text-xs text-gray-600 dark:text-gray-400">Bot is typing...</p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
                        disabled={!input.trim() || isTyping}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatbotModal;
