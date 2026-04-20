import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import MySessionsToday from '../components/MySessionsToday.jsx';
import MyClassrooms from '../components/MyClassrooms.jsx';
import { Zap, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';

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
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-black text-gray-100 font-['SK_Concretica',_'Manrope',_sans-serif] relative">
            <div className="fixed inset-0 pointer-events-none opacity-[0.14] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23noise)' opacity='0.18'/%3E%3C/svg%3E")` }} />
            <div className="z-10 flex flex-col flex-1 h-full w-full overflow-hidden">
            <Navbar />

            {/* Scrollable content area — only this scrolls */}
            <main className="flex-1 overflow-y-auto ">

                {/* Sticky sub-header for teacher action */}
                {user?.role === 'Teacher' && (
                    <header className="sticky top-0 z-10 flex justify-end px-4 sm:px-8 lg:px-10 py-4 border-b border-white/10 bg-black/80 backdrop-blur-md">
                        <button
                            onClick={handleInstantSession}
                            disabled={creatingSession}
                            className="flex items-center gap-2 bg-gradient-to-tr from-white to-[#f0f0f0] hover:scale-[1.02] text-black px-4 sm:px-5 py-2 rounded-full text-sm font-bold transition-all shadow-[0_20px_38px_-28px_rgba(255,255,255,0.85)] disabled:opacity-75"
                        >
                            <Zap size={14} className="text-black" />
                            <span>{creatingSession ? 'Starting...' : 'Start Instant Session'}</span>
                        </button>
                    </header>
                )}

                {/* Dashboard body */}
                <div className="px-4 sm:px-8 lg:px-10 py-8 w-full mx-auto space-y-10 max-w-screen-2xl">

                    {/* Welcome Row */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-['Outfit',_'Manrope',_sans-serif] font-bold tracking-tight text-white mb-2">
                                Welcome Back, {user?.fullName?.split(' ')[0] || 'User'}.
                            </h2>
                            <p className="text-gray-400 text-sm font-medium">
                                You have upcoming sessions scheduled for today.
                            </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end bg-[#121414] px-4 py-2.5 rounded-xl border border-white/5 shadow-sm shrink-0">
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
        </div>
    );
}
