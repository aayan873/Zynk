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

import Sidebar from './Sidebar.jsx';

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
        <div className="flex flex-col min-h-screen bg-[#0e0e11] text-gray-100 font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-y-auto relative">
                {/* Top Header */}
                 {user?.role === 'Teacher' && (
                <header className="flex justify-end px-10 py-5 border-b border-gray-800/50 sticky top-0 bg-[#0e0e11]/80 backdrop-blur-md z-10">
                    <div className="flex items-center space-x-6 shrink-0">
                       
                            <button 
                                onClick={handleInstantSession}
                                disabled={creatingSession}
                                className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-[0_4px_20px_-5px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5 disabled:opacity-75 disabled:transform-none"
                            >
                                <Zap size={14} className="text-indigo-100" />
                                <span>{creatingSession ? 'Starting...' : 'Start Instant Session'}</span>
                            </button>
                    </div>
                </header>    )}

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
