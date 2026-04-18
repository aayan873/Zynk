import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import MySessionsToday from './MySessionsToday.jsx';
import MyClassrooms from './MyClassrooms.jsx';
import { Zap, Calendar } from 'lucide-react';
import Navbar from './Navbar.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function DashboardHome() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const user = auth?.user;
    const [creatingSession, setCreatingSession] = useState(false);

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
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error("Failed to start instant session:", err);
        } finally {
            setCreatingSession(false);
        }
    };

    return (
        /* Full viewport, no overflow at root level */
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0e0e11] text-gray-100 font-sans">
            <Navbar />

            {/* Scrollable content area — only this scrolls */}
            <main className="flex-1 overflow-y-auto ">

                {/* Sticky sub-header for teacher action */}
                {user?.role === 'Teacher' && (
                    <header className="sticky top-0 z-10 flex justify-end px-4 sm:px-8 lg:px-10 py-4 border-b border-gray-800/50 bg-[#0e0e11]/80 backdrop-blur-md">
                        <button
                            onClick={handleInstantSession}
                            disabled={creatingSession}
                            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-[0_4px_20px_-5px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 disabled:opacity-75 disabled:translate-y-0"
                        >
                            <Zap size={14} className="text-indigo-100" />
                            <span>{creatingSession ? 'Starting...' : 'Start Instant Session'}</span>
                        </button>
                    </header>
                )}

                {/* Dashboard body */}
                <div className="px-4 sm:px-8 lg:px-10 py-8 w-full mx-auto space-y-10 max-w-screen-2xl">

                    {/* Welcome Row */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                                Good morning, {user?.fullName?.split(' ')[0] || 'User'}.
                            </h2>
                            <p className="text-gray-400 text-sm font-medium">
                                You have upcoming sessions scheduled for today.
                            </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end bg-[#14151a] px-4 py-2.5 rounded-xl border border-gray-800/80 shadow-sm shrink-0">
                            <div className="flex items-center gap-1.5 text-gray-500 text-[10px] mb-1.5 font-bold tracking-widest uppercase">
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
