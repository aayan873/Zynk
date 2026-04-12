import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Calendar } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ClassroomStream({ classroom, user, isTeacher, token }) {
    const navigate = useNavigate();
    const [meets, setMeets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStreamMeets = async () => {
            if (!token || !classroom?._id) return;
            try {
                const res = await axios.get(`${BACKEND_URL}/api/meets/upcoming/${classroom._id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (res.data.success) {
                    setMeets(res.data.meets);
                }
            } catch (err) {
                console.error("Failed to fetch classroom meets:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStreamMeets();
        
        // Polling every minute to update the "Live Now" status if needed (optional but good for UX)
        const interval = setInterval(fetchStreamMeets, 60000);
        return () => clearInterval(interval);
    }, [token, classroom?._id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48 bg-[#14151a] rounded-2xl border border-gray-800/80">
                <Spinner />
            </div>
        );
    }

    if (meets.length === 0) {
        return (
            <div className="bg-[#14151a] rounded-2xl border border-gray-800/80 p-12 text-center flex flex-col items-center justify-center h-48 border-dashed">
                <Calendar size={40} className="text-gray-700 mb-4" />
                <h4 className="text-gray-300 font-medium">No upcoming meets scheduled</h4>
                <p className="text-gray-500 text-sm mt-1">When the teacher schedules a new class, it will appear here.</p>
            </div>
        );
    }

    const isLive = (meet) => {
        const now = new Date();
        const start = new Date(meet.scheduledFor);
        const end = new Date(meet.scheduledEndTime);
        return now >= start && now <= end;
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString([], options);
    };

    return (
        <div className="space-y-4">
            {meets.map((meet, index) => {
                const live = isLive(meet);
                return (
                    <div 
                        key={meet._id || index}
                        className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
                            live 
                            ? 'bg-[#1e1f26] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative overflow-hidden' 
                            : 'bg-[#14151a] border-gray-800/80 hover:border-gray-700'
                        }`}
                    >
                        {live && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>}
                        <div className="flex items-center space-x-6">
                            <div className="flex flex-col items-center">
                                <div className={`w-3.5 h-3.5 rounded-full ring-4 ${live ? 'bg-indigo-500 ring-indigo-500/20' : 'bg-gray-700 ring-gray-800'}`}></div>
                            </div>
                            
                            <div>
                                <div className="flex items-center space-x-3 mb-1.5">
                                    {live && (
                                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                            Live Now
                                        </span>
                                    )}
                                    <span className="text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                        {formatDate(meet.scheduledFor)}
                                    </span>
                                    <span className="text-gray-400 text-xs font-semibold flex items-center">
                                        <Clock size={12} className="mr-1" />
                                        {formatTime(meet.scheduledFor)} - {formatTime(meet.scheduledEndTime)}
                                    </span>
                                </div>
                                <h4 className="text-gray-200 font-bold text-xl mb-1">{meet.title}</h4>
                                <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5 font-medium">
                                    <Video size={14} />
                                    <span>Interactive Meeting</span>
                                </p>
                            </div>
                        </div>

                        <div>
                            {live ? (
                                <button 
                                    onClick={() => navigate(`/room/${meet.roomId}`)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                                >
                                    Join Meeting
                                </button>
                            ) : (
                                <div className="p-3 bg-[#1e1f26] border border-gray-800 rounded-xl text-gray-500 transition-colors hover:text-gray-300" title="Not started yet">
                                    <Calendar size={20} />
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
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500/30 border-t-indigo-500"></div>
);
