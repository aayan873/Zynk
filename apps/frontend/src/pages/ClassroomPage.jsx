import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import ClassroomAnnouncements from '../components/ClassroomAnnouncements.jsx';
import ClassroomChat from '../components/ClassroomChat.jsx';
import { 
    BookOpen, 
    MessageSquare, 
    Users, 
    Video, 
    Megaphone,
    ExternalLink,
    CalendarPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import ScheduleMeetModal from '../components/ScheduleMeetModal.jsx';
import ClassroomStream from '../components/ClassroomStream.jsx';
import ClassroomPeople from '../components/ClassroomPeople.jsx';
import ClassroomResources from '../components/ClassroomResources.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const ENROLLMENT_TABS = [
    { id: 'stream',        label: 'Stream',        icon: Video },
    { id: 'resources',     label: 'Resources',     icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'people',        label: 'People',        icon: Users },
    { id: 'chat',          label: 'Chat',          icon: MessageSquare },
];

export default function ClassroomPage() {
    const { id }        = useParams();
    const navigate      = useNavigate();
    const { auth }      = useAuth();
    const user          = auth?.user;
    const tabsRef       = useRef(null);

    const [classroom,           setClassroom]           = useState(null);
    const [loading,             setLoading]             = useState(true);
    const [enrolling,           setEnrolling]           = useState(false);
    const [activeTab,           setActiveTab]           = useState('stream');
    const [isEnrolled,          setIsEnrolled]          = useState(false);
    const [isTeacherState,      setIsTeacherState]      = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    /* ── fetch classroom ── */
    useEffect(() => {
        const fetchClassroom = async () => {
            if (!auth?.token) return;
            try {
                const res = await axios.get(`${BACKEND_URL}/api/classrooms/${id}`, {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                if (res.data.success) {
                    const classData = res.data.data;
                    setClassroom(classData);

                    const isTeacher        = classData.teachers.some(t => (t.user?._id || t.user) === user?._id);
                    const isStudentEnrolled= classData.students.some(s => (s.user?._id || s.user) === user?._id);
                    const isUserTeacherRole= user?.role === 'Teacher';
                    setIsEnrolled(isTeacher || isStudentEnrolled || isUserTeacherRole);
                    setIsTeacherState(isTeacher || isUserTeacherRole);
                }
            } catch (err) {
                console.error("Failed to fetch classroom:", err);
                toast.error("Failed to load classroom details.");
            } finally {
                setLoading(false);
            }
        };
        fetchClassroom();
    }, [id, auth?.token, user?._id]);

    /* ── scroll active tab into view on mobile ── */
    useEffect(() => {
        if (!tabsRef.current) return;
        const activeBtn = tabsRef.current.querySelector('[data-active="true"]');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeTab]);

    /* ── enroll ── */
    const handleEnroll = async () => {
        setEnrolling(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/classrooms/${id}/enroll`, {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            if (res.data.success) {
                toast.success("Successfully enrolled in the classroom!");
                setIsEnrolled(true);
            }
        } catch (err) {
            console.error("Enrollment failed:", err);
            toast.error(err.response?.data?.message || "Failed to enroll. Eligibility restrictions may apply.");
        } finally {
            setEnrolling(false);
        }
    };

    /* ── loading / not found states ── */
    if (loading) {
        return (
            <div className="flex h-screen bg-[#0e0e11] text-gray-100 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!classroom) {
        return (
            <div className="flex flex-col min-h-screen bg-[#0e0e11] text-gray-100">
                <Navbar />
                <main className="flex-1 flex flex-col items-center justify-center shadow-lg px-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-400 text-center">Classroom not found</h2>
                    <button
                        onClick={() => navigate('/home')}
                        className="mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-white font-semibold transition"
                    >
                        Go Home
                    </button>
                </main>
            </div>
        );
    }

    /* ── helpers for tab content wrapper ── */
    const tabNeedsFlex   = ['chat', 'stream', 'people'].includes(activeTab);
    const tabNeedsPadded = activeTab === 'announcements';

    return (
        <div className="flex flex-col min-h-screen bg-[#0e0e11] text-gray-100 font-sans overflow-hidden">
            <Navbar />

            <main className="flex-1 flex flex-col overflow-hidden relative">

                {/* ── Classroom Header ── */}
                <header className="px-4 sm:px-6 md:px-10 py-5 sm:py-8 border-b border-gray-800/50 bg-[#14151a] shrink-0 sticky top-0 z-20 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        {/* breadcrumb pills */}
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-indigo-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5">
                            <span className="truncate max-w-[120px] sm:max-w-none">{classroom.institute}</span>
                            <span>•</span>
                            <span className="truncate max-w-[100px] sm:max-w-none">{classroom.programme}</span>
                            <span>•</span>
                            <span>{classroom.semester}</span>
                        </div>

                        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-1 sm:mb-2 leading-tight">
                            {classroom.name}
                        </h1>

                        <p className="text-gray-400 text-xs sm:text-sm max-w-2xl leading-relaxed line-clamp-2 sm:line-clamp-none">
                            {classroom.description || 'Welcome to the class! Here you can find all course materials, discussions, and updates.'}
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center text-xs sm:text-sm font-medium text-gray-500">
                                <Users size={14} className="mr-1.5" />
                                {classroom.students?.length || 0} Students
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Page body ── */}
                <div className="flex-1 overflow-y-auto w-full p-3 sm:p-5 md:p-10 max-w-6xl mx-auto w-full">
                    {!isEnrolled ? (

                        /* ── Enroll card ── */
                        <div className="w-full mt-6 sm:mt-10 p-8 sm:p-12 bg-[#14151a] border border-gray-800/80 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-5 border border-indigo-500/20">
                                <BookOpen size={28} className="sm:hidden" />
                                <BookOpen size={36} className="hidden sm:block" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Join this Classroom</h2>
                            <p className="text-gray-400 text-sm max-w-md mb-6 sm:mb-8">
                                You are eligible for this classroom. Enroll now to access the stream, resources, chat, and engage with the community.
                            </p>
                            <button
                                onClick={handleEnroll}
                                disabled={enrolling}
                                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70 flex items-center space-x-2 w-full max-w-xs justify-center"
                            >
                                {enrolling ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Enrolling…</span>
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink size={18} />
                                        <span>Enroll Now</span>
                                    </>
                                )}
                            </button>
                        </div>

                    ) : (

                        /* ── Enrolled: Tabs UI ── */
                        <div className="w-full flex flex-col" style={{ minHeight: 0 }}>

                            {/* Tab bar row — sticky, horizontally scrollable on mobile */}
                            <div className="sticky top-0 z-10 bg-[#0e0e11] pt-1 pb-0 mb-4">
                                <div className="flex items-end justify-between gap-2 border-b border-gray-800/80">

                                    {/* scrollable tab list */}
                                    <div
                                        ref={tabsRef}
                                        className="flex overflow-x-auto scrollbar-none gap-0 flex-1 min-w-0"
                                        style={{ WebkitOverflowScrolling: 'touch' }}
                                    >
                                        {ENROLLMENT_TABS.map((tab) => {
                                            const Icon     = tab.icon;
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    data-active={isActive}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={[
                                                        'flex items-center gap-1.5 whitespace-nowrap flex-shrink-0',
                                                        'px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold',
                                                        'border-b-2 transition-all duration-150',
                                                        isActive
                                                            ? 'border-indigo-500 text-indigo-400'
                                                            : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700',
                                                    ].join(' ')}
                                                >
                                                    <Icon size={14} className="shrink-0" />
                                                    <span>{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Schedule Meet button — teacher only */}
                                    {isTeacherState && (
                                        <button
                                            onClick={() => setIsScheduleModalOpen(true)}
                                            className="mb-1.5 shrink-0 flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all"
                                        >
                                            <CalendarPlus size={14} />
                                            <span className="hidden sm:inline">Schedule Meet</span>
                                            <span className="sm:hidden">Meet</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── Tab content panel ── */}
                            {/*
                                Key insight: keep ONE stable wrapper div.
                                Use a key on the inner content so React fully remounts
                                the child when the tab changes — avoids stale renders
                                from child components that don't expect prop-only updates.
                                Flex-col + flex-1 ensures chat/stream fill height properly.
                            */}
                            <div
                                className={[
                                    'bg-[#14151a] border border-gray-800/80 rounded-2xl overflow-hidden',
                                    'flex flex-col',                        // always flex-col
                                    tabNeedsPadded ? 'p-4 sm:p-6' : '',    // padding only for announcements
                                ].join(' ')}
                                style={{ minHeight: '55vh' }}
                            >
                                {activeTab === 'stream' && (
                                    <ClassroomStream
                                        key="stream"
                                        classroom={classroom}
                                        user={user}
                                        isTeacher={isTeacherState}
                                        token={auth.token}
                                    />
                                )}

                                {activeTab === 'resources' && (
                                    <div key="resources" className="flex-1 overflow-y-auto p-4 sm:p-6">
                                        <ClassroomResources
                                            classroom={classroom}
                                            isTeacher={isTeacherState}
                                            token={auth.token}
                                        />
                                    </div>
                                )}

                                {activeTab === 'announcements' && (
                                    <ClassroomAnnouncements
                                        key="announcements"
                                        classroom={classroom}
                                        user={user}
                                        isTeacher={isTeacherState}
                                    />
                                )}

                                {activeTab === 'people' && (
                                    <ClassroomPeople
                                        key="people"
                                        classroom={classroom}
                                    />
                                )}

                                {activeTab === 'chat' && (
                                    <ClassroomChat
                                        key="chat"
                                        classroom={classroom}
                                        user={user}
                                        isTeacher={isTeacherState}
                                        token={auth.token}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <ScheduleMeetModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                classroomId={id}
            />
        </div>
    );
}

const Spinner = ({ size = "default" }) => (
    <div
        className={`animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500 ${
            size === "sm" ? "h-4 w-4" : "h-8 w-8"
        }`}
    />
);