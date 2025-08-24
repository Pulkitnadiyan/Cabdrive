// src/components/Admin/ReportsView.jsx

import React, { useState, useEffect } from 'react';
import api from '../../apiClient';
import { CheckCircle, AlertCircle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

const ReportsView = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openChats, setOpenChats] = useState({});

    // Toggles the visibility of a specific report's chat history
    const toggleChat = (reportId) => {
        setOpenChats(prev => ({
            ...prev,
            [reportId]: !prev[reportId]
        }));
    };

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                // Fetch reports and their associated chat sessions
                const response = await api.get('/api/admin/reports');
                setReports(response.data);
            } catch (err) {
                setError('Failed to fetch reports.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const handleResolveReport = async (reportId) => {
        try {
            const response = await api.post(`/api/admin/reports/${reportId}/resolve`);
            
            // Update the local state to immediately reflect the change
            setReports(prevReports =>
                prevReports.map(report =>
                    report._id === reportId ? { ...report, isResolved: response.data.isResolved } : report
                )
            );
        } catch (err) {
            console.error('Failed to resolve report:', err);
            alert('Could not update report status. Please check the console.');
        }
    };

    if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Submitted Reports</h2>
            <div className="space-y-4">
                {reports.length > 0 ? reports.map(report => (
                    <div key={report._id} className={`p-4 rounded-lg transition-colors ${report.isResolved ? 'bg-gray-100 dark:bg-gray-700' : 'bg-yellow-50 dark:bg-yellow-900/50'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                    <span className="font-normal text-gray-500 dark:text-gray-400">Reported User:</span> {report.reportedUser?.username || 'User Not Found'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold">Reported by:</span> {report.reporter?.username || 'User Not Found'}
                                </p>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(report.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-600 p-3 rounded-md">
                            <span className="font-semibold">Reason:</span> {report.reason}
                        </p>
                        
                        {/* Chat History Section */}
                        {report.ride?.chatSession?.messages?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                <button onClick={() => toggleChat(report._id)} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    <span>{openChats[report._id] ? 'Hide Chat' : 'View Chat'}</span>
                                    {openChats[report._id] ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                                </button>
                                {openChats[report._id] && (
                                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                                        {report.ride.chatSession.messages.map((message, index) => (
                                            <div key={index} className={`flex ${message.sender?._id === report.reporter?._id ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`p-2 rounded-lg text-sm max-w-[75%] ${message.sender?._id === report.reporter?._id ? 'bg-blue-200 text-gray-800 dark:bg-blue-900/50 dark:text-gray-200' : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}`}>
                                                    <p className="font-semibold">{message.sender?.username || 'Unknown User'}</p>
                                                    <p>{message.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="mt-4 flex justify-between items-center">
                             <span className={`flex items-center text-xs font-medium rounded-full px-2 py-1 ${
                                report.isResolved 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                            }`}>
                                {report.isResolved ? <CheckCircle size={14} className="mr-1"/> : <AlertCircle size={14} className="mr-1"/>}
                                {report.isResolved ? 'Resolved' : 'Pending'}
                            </span>
                            <button
                                onClick={() => handleResolveReport(report._id)}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                    report.isResolved
                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                            >
                                {report.isResolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                            </button>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No reports have been submitted.</p>
                )}
            </div>
        </div>
    );
};

export default ReportsView;
