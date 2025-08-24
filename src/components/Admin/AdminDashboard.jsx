import React, { useState } from 'react';
import { Users, Car, FileText, BarChart2, DollarSign, Monitor, Menu, X } from 'lucide-react';
import UserManagement from './UserManagement';
import DriverManagement from './DriverManagement';
import ReportsView from './ReportsView';
import AnalyticsDashboard from './AnalyticsDashboard';
import EarningsPanel from './EarningsPanel';
import RideMonitor from './RideMonitor';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

    const renderContent = () => {
        switch (activeTab) {
            case 'users':
                return <UserManagement />;
            case 'drivers':
                return <DriverManagement />;
            case 'reports':
                return <ReportsView />;
            case 'analytics':
                return <AnalyticsDashboard />;
            case 'earnings':
                return <EarningsPanel />;
            case 'monitor':
                return <RideMonitor />;
            default:
                return <AnalyticsDashboard />;
        }
    };

    const NavItem = ({ tabName, icon, label }) => (
        <button
            onClick={() => {
                setActiveTab(tabName);
                setIsSidebarOpen(false); // Close sidebar on item click
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors w-full text-left
                ${activeTab === tabName
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
        >
            {React.cloneElement(icon, { className: 'h-5 w-5 mr-3' })}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <header className="md:hidden bg-white shadow-md p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-40">
                <div className="flex items-center">
                    <Car className="h-8 w-8 text-blue-600 mr-2" />
                    <h1 className="text-xl font-bold text-gray-900">Admin</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <Menu className="h-6 w-6 text-gray-800" />
                </button>
            </header>

            <div className="flex">
                {/* Sidebar Navigation */}
                <aside className={`fixed inset-y-0 left-0 bg-white shadow-lg p-4 flex-col z-50 w-64 transform transition-transform duration-300 ease-in-out 
                                 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                                 md:translate-x-0 md:flex md:fixed`}>
                    <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center">
                            <Car className="h-8 w-8 text-blue-600 mr-2" />
                            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
                            <X className="h-6 w-6 text-gray-800" />
                        </button>
                    </div>
                    <nav className="space-y-2">
                        <NavItem tabName="analytics" icon={<BarChart2 />} label="Analytics" />
                        <NavItem tabName="monitor" icon={<Monitor />} label="Monitor Rides" />
                        <NavItem tabName="earnings" icon={<DollarSign />} label="Earnings" />
                        <NavItem tabName="users" icon={<Users />} label="Manage Users" />
                        <NavItem tabName="drivers" icon={<Car />} label="Manage Drivers" />
                        <NavItem tabName="reports" icon={<FileText />} label="View Reports" />
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-8 pt-24 md:pt-8 md:ml-64">
                    <div className="bg-white rounded-xl shadow-lg p-6 h-full">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;