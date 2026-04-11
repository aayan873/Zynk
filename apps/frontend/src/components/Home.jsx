import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import MySessionsToday from './MySessionsToday.jsx';
import MyClassrooms from './MyClassrooms.jsx';
import {
  Home as HomeIcon,
  LayoutDashboard,
  Bell,
  Settings,
  User,
  Search,
  Zap,
  HelpCircle,
  Calendar,
  LogOut
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Home() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const user = auth?.user;
    const [creatingSession, setCreatingSession] = useState(false);

    const handleLogout = () => {
        navigate('/logout');
    };

    const handleInstantSession = async () => {
        if (!auth?.token) return;
        setCreatingSession(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/meets/create`, {
                title: `${user?.fullName || 'Teacher'}'s Instant Meeting`,
                type: "MEET"
            }, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            const roomId = res.data.roomId;
            navigate(`/room/${roomId}`);
        } catch (err) {
            console.error("Failed to start instant session:", err);
            // Optionally add toast here if it fails
        } finally {
            setCreatingSession(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#0e0e11] text-gray-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-[#14151a] border-r border-gray-800 flex flex-col justify-between hidden md:flex">
                <div>
                    <div className="p-6">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">ZynkEdu</h1>
                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Live Learning</p>
                    </div>
                    <nav className="mt-6 px-4 space-y-2">
                        <a href="#" className="flex items-center space-x-3 px-4 py-3 bg-[#1e1f26] text-white rounded-lg transition relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>
                            <HomeIcon size={20} className="text-indigo-400" />
                            <span className="font-medium text-sm">Home</span>
                        </a>
                        <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-[#1e1f26] rounded-lg transition">
                            <LayoutDashboard size={20} />
                            <span className="font-medium text-sm">Classrooms</span>
                        </a>
                        <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-[#1e1f26] rounded-lg transition">
                            <Bell size={20} />
                            <span className="font-medium text-sm">Notifications</span>
                        </a>
                        <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-[#1e1f26] rounded-lg transition">
                            <Settings size={20} />
                            <span className="font-medium text-sm">Settings</span>
                        </a>
                        <a href="/profile-setup" className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-[#1e1f26] rounded-lg transition">
                            <User size={20} />
                            <span className="font-medium text-sm">Profile</span>
                        </a>
                    </nav>
                </div>
                
                {/* User Profile Snippet */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center justify-between bg-[#1a1b23] p-3 rounded-lg border border-gray-800/80">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-sm">
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

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-y-auto relative">
                {/* Top Header */}
                <header className="flex items-center justify-between px-10 py-5 border-b border-gray-800/50 sticky top-0 bg-[#0e0e11]/80 backdrop-blur-md z-10">
                    <div className="relative w-full max-w-md">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Search lessons, students, or resources..." 
                            className="w-full bg-[#14151a] border border-gray-800/80 rounded-full py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-gray-300 placeholder-gray-500/80 transition-shadow"
                        />
                    </div>
                    <div className="flex items-center space-x-6 shrink-0">
                        {user?.role === 'Teacher' && (
                            <button 
                                onClick={handleInstantSession}
                                disabled={creatingSession}
                                className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-[0_4px_20px_-5px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5 disabled:opacity-75 disabled:transform-none"
                            >
                                <Zap size={14} className="text-indigo-100" />
                                <span>{creatingSession ? 'Starting...' : 'Start Instant Session'}</span>
                            </button>
                        )}
                        <button className="text-gray-400 hover:text-white transition relative">
                            <Bell size={18} />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full border border-[#0e0e11]"></span>
                        </button>
                        <button className="text-gray-400 hover:text-white transition">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </header>

                {/* Dashboard Body */}
                <div className="px-10 py-8 max-w-6xl w-full mx-auto space-y-10">
                    
                    {/* Welcome Row */}
                    <div className="flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                                Good morning, {user?.fullName?.split(' ')[0] || 'User'}.
                            </h2>
                            <p className="text-gray-400 text-sm font-medium">
                                You have upcoming sessions scheduled for today.
                            </p>
                        </div>
                        <div className="flex flex-col items-end bg-[#14151a] px-4 py-2.5 rounded-xl border border-gray-800/80 shadow-sm">
                            <div className="flex items-center space-x-1.5 text-gray-500 text-[10px] mb-1.5 font-bold tracking-widest uppercase">
                                <Calendar size={12} />
                                <span>Date</span>
                            </div>
                            <div className="text-gray-200 font-semibold text-sm">
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    {/* My Sessions Today */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-200">My Sessions Today</h3>
                        <MySessionsToday />
                    </section>

                    {/* My Classrooms */}
                    <MyClassrooms />

                </div>
            </main>
        </div>
    );
}
