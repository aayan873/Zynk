import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Video, Clock } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function MySessionsToday() {
    const { auth } = useAuth();
    const navigate = useNavigate();
    const [meets, setMeets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMeets = async () => {
            if (!auth?.token) return;
            try {
                const res = await axios.get(`${BACKEND_URL}/api/meets/upcoming/all`, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                if (res.data.success) setMeets(res.data.meets);
            } catch (err) {
                console.error("Failed to fetch meets:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeets();
    }, [auth?.token]);

    const isLive = (meet) => {
        const now = new Date();
        return now >= new Date(meet.scheduledFor) && now <= new Date(meet.scheduledEndTime);
    };

    const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (loading) return (
        <div className="flex justify-center items-center h-28 sm:h-32 bg-[#14151a] rounded-2xl border border-gray-800/80">
            <Spinner />
        </div>
    );

    if (meets.length === 0) return (
        <div className="bg-[#14151a] rounded-2xl border border-dashed border-gray-800/80 p-6 sm:p-8 text-center flex flex-col items-center justify-center h-28 sm:h-32">
            <h4 className="text-gray-300 font-medium text-sm sm:text-base">No sessions scheduled for today</h4>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Enjoy your free time!</p>
        </div>
    );

    return (
        <div className="space-y-3 sm:space-y-4">
            {meets.map((meet, index) => {
                const live = isLive(meet);
                return (
                    <div
                        key={meet._id || index}
                        className={`flex items-center justify-between p-3.5 sm:p-5 rounded-2xl border transition-all gap-3 sm:gap-4 ${
                            live
                                ? 'bg-[#1e1f26] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative overflow-hidden'
                                : 'bg-[#14151a] border-gray-800/80 hover:border-gray-700'
                        }`}
                    >
                        {live && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}

                        {/* Left: dot + info */}
                        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                            {/* Status dot */}
                            <div className="shrink-0">
                                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ring-4 ${
                                    live ? 'bg-indigo-500 ring-indigo-500/20' : 'bg-gray-700 ring-gray-800'
                                }`} />
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                                {/* Tags row */}
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-1">
                                    {live && (
                                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                                            Live Now
                                        </span>
                                    )}
                                    <span className="text-gray-400 text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                                        <Clock size={10} className="shrink-0" />
                                        {formatTime(meet.scheduledFor)} – {formatTime(meet.scheduledEndTime)}
                                    </span>
                                </div>

                                {meet.classroom?.name && (
                                    <h5 className="text-indigo-400 font-semibold text-[10px] sm:text-xs tracking-wide uppercase mb-0.5 truncate">
                                        {meet.classroom.name}
                                    </h5>
                                )}
                                <h4 className="text-gray-200 font-bold text-sm sm:text-lg truncate">{meet.title}</h4>
                                <p className="text-gray-500 text-[10px] sm:text-sm mt-0.5 flex items-center gap-1 sm:gap-1.5 font-medium">
                                    <Video size={12} className="shrink-0" />
                                    <span>Interactive Meeting</span>
                                </p>
                            </div>
                        </div>

                        {/* Right: action */}
                        <div className="shrink-0">
                            {live ? (
                                <button
                                    onClick={() => navigate(`/room/${meet.roomId}`)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm shadow-md whitespace-nowrap active:scale-95"
                                >
                                    Join Room
                                </button>
                            ) : (
                                <div className="p-2 sm:p-3 bg-[#1e1f26] border border-gray-800 rounded-lg text-gray-500 hover:text-gray-300 transition-colors" title="Not started yet">
                                    <Clock size={15} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const Spinner = () => (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500/30 border-t-indigo-500" />
);