import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Home as HomeIcon,
  LayoutDashboard,
  Bell,
  Settings,
  User,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const user = auth?.user;

    const handleLogout = () => {
        navigate('/logout');
    };

    const navLinkClass = ({ isActive }) =>
        isActive
            ? "flex items-center space-x-3 px-4 py-3 bg-[#1e1f26] text-white rounded-lg transition relative"
            : "flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-[#1e1f26] rounded-lg transition";

    return (
        <aside className="w-64 bg-[#14151a] border-r border-gray-800 flex flex-col justify-between hidden md:flex shrink-0">
            <div>
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">ZynkEdu</h1>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Live Learning</p>
                </div>
                <nav className="mt-6 px-4 space-y-2">
                    <NavLink to="/home" className={navLinkClass}>
                        {({ isActive }) => (
                            <>
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>}
                                <HomeIcon size={20} className={isActive ? "text-indigo-400" : ""} />
                                <span className="font-medium text-sm">Home</span>
                            </>
                        )}
                    </NavLink>
                    <NavLink to="/classrooms" className={navLinkClass}>
                        {({ isActive }) => (
                            <>
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>}
                                <LayoutDashboard size={20} className={isActive ? "text-indigo-400" : ""} />
                                <span className="font-medium text-sm">Classrooms</span>
                            </>
                        )}
                    </NavLink>
                    <NavLink to="/notifications" className={navLinkClass}>
                        {({ isActive }) => (
                            <>
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>}
                                <Bell size={20} className={isActive ? "text-indigo-400" : ""} />
                                <span className="font-medium text-sm">Notifications</span>
                            </>
                        )}
                    </NavLink>
                    <NavLink to="/settings" className={navLinkClass}>
                        {({ isActive }) => (
                            <>
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>}
                                <Settings size={20} className={isActive ? "text-indigo-400" : ""} />
                                <span className="font-medium text-sm">Settings</span>
                            </>
                        )}
                    </NavLink>
                    <NavLink to="/profile" className={navLinkClass}>
                        {({ isActive }) => (
                            <>
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>}
                                <User size={20} className={isActive ? "text-indigo-400" : ""} />
                                <span className="font-medium text-sm">Profile</span>
                            </>
                        )}
                    </NavLink>
                </nav>
            </div>
            
            {/* User Profile Snippet */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center justify-between bg-[#1a1b23] p-3 rounded-lg border border-gray-800/80">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-sm text-white">
                            {user?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate w-24 text-gray-200">{user?.fullName || 'Guest'}</p>
                            <p className="text-[10px] text-gray-500 font-medium truncate">{user?.role || 'Welcome'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition" title="Logout">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
