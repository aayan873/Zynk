import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Calendar, CalendarPlus } from 'lucide-react';
import ScheduleMeetModal from './ScheduleMeetModal.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ClassroomStream({ classroom, user, isTeacher, token }) {
    const navigate = useNavigate();
    const [meets,               setMeets]               = useState([]);
    const [loading,             setLoading]             = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    useEffect(() => {
        const fetchStreamMeets = async () => {
            if (!token || !classroom?._id) return;
            try {
                const res = await axios.get(`${BACKEND_URL}/api/meets/upcoming/${classroom._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) setMeets(res.data.meets);
            } catch (err) {
                console.error("Failed to fetch classroom meets:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStreamMeets();
        const interval = setInterval(fetchStreamMeets, 60000);
        return () => clearInterval(interval);
    }, [token, classroom?._id]);

    const isLive = (meet) => {
        const now = new Date();
        return now >= new Date(meet.scheduledFor) && now <= new Date(meet.scheduledEndTime);
    };

    const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d) => new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="flex flex-col h-[65vh] sm:h-[70vh] w-full">

            {/* ── Top bar: heading + Schedule Meet button (teacher only) — never scrolls ── */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800/60">
                <h3 className="text-base sm:text-lg font-semibold text-gray-200">
                    Upcoming Meets
                    {meets.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                            ({meets.length})
                        </span>
                    )}
                </h3>

                {isTeacher && (
                    <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
                    >
                        <CalendarPlus size={14} />
                        <span>Schedule Meet</span>
                    </button>
                )}
            </div>

            {/* ── Meets list — ONLY this scrolls ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Spinner />
                    </div>
                ) : meets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[160px] border border-dashed border-gray-800 rounded-xl text-center px-4">
                        <Calendar size={36} className="text-gray-700 mb-3" />
                        <h4 className="text-gray-300 font-medium text-sm sm:text-base">No upcoming meets scheduled</h4>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-xs">
                            {isTeacher
                                ? 'Click "Schedule Meet" above to create one.'
                                : 'When the teacher schedules a new class, it will appear here.'}
                        </p>
                    </div>
                ) : (
                    meets.map((meet, index) => {
                        const live = isLive(meet);
                        return (
                            <div
                                key={meet._id || index}
                                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 rounded-2xl border transition-all gap-4 ${
                                    live
                                        ? 'bg-[#1e1f26] border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative overflow-hidden'
                                        : 'bg-[#0e0e11] border-gray-800/80 hover:border-gray-700'
                                }`}
                            >
                                {live && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                                )}

                                {/* Left: dot + info */}
                                <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                                    <div className="mt-1 sm:mt-0 shrink-0">
                                        <div className={`w-3 h-3 rounded-full ring-4 ${live ? 'bg-indigo-500 ring-indigo-500/20' : 'bg-gray-700 ring-gray-800'}`} />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            {live && (
                                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                                    Live Now
                                                </span>
                                            )}
                                            <span className="text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                                                {formatDate(meet.scheduledFor)}
                                            </span>
                                            <span className="text-gray-400 text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                                                <Clock size={11} />
                                                {formatTime(meet.scheduledFor)} – {formatTime(meet.scheduledEndTime)}
                                            </span>
                                        </div>
                                        <h4 className="text-gray-200 font-bold text-base sm:text-xl mb-0.5">{meet.title}</h4>
                                        <p className="text-gray-500 text-xs sm:text-sm flex items-center gap-1.5 font-medium">
                                            <Video size={12} /><span>Interactive Meeting</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Right: action button */}
                                <div className="sm:shrink-0 sm:ml-auto pl-7 sm:pl-0">
                                    {live ? (
                                        <button
                                            onClick={() => navigate(`/room/${meet.roomId}`)}
                                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 text-sm"
                                        >
                                            Join Meeting
                                        </button>
                                    ) : (
                                        <div className="inline-flex p-2.5 sm:p-3 bg-[#1e1f26] border border-gray-800 rounded-xl text-gray-500 hover:text-gray-300 transition-colors" title="Not started yet">
                                            <Calendar size={18} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <ScheduleMeetModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                classroomId={classroom._id}
            />
        </div>
    );
}

const Spinner = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-indigo-500" />
);