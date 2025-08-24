import React from 'react';

const StatCard = ({ icon, label, value, color }) => {
    const colors = {
        blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
        green: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300',
        purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex items-center space-x-4">
            <div className={`p-3 rounded-full ${colors[color] || colors.blue}`}>
                {React.cloneElement(icon, { className: 'h-8 w-8' })}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;