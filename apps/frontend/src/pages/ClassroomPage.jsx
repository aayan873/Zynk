import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ClassroomAnnouncements from '../components/ClassroomAnnouncements.jsx';
import ClassroomChat from '../components/ClassroomChat.jsx';
import { 
    BookOpen, 
    MessageSquare, 
    Users, 
    Video, 
    Megaphone,
    LogOut,
    ExternalLink,
    CalendarPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import ScheduleMeetModal from '../components/ScheduleMeetModal.jsx';
import ClassroomStream from '../components/ClassroomStream.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const ENROLLMENT_TABS = [
    { id: 'stream', label: 'Stream', icon: Video },
    { id: 'resources', label: 'Resources', icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'people', label: 'People', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
];

export default function ClassroomPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { auth } = useAuth();
    const user = auth?.user;

    const [classroom, setClassroom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [activeTab, setActiveTab] = useState('stream');
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [isTeacherState, setIsTeacherState] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

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

                    // Check enrollment status
                    const isTeacher = classData.teachers.some(t => (t.user?._id || t.user) === user?._id);
                    const isStudentEnrolled = classData.students.some(s => (s.user?._id || s.user) === user?._id);
                    const isUserTeacherRole = user?.role === 'Teacher';
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

    const handleEnroll = async () => {
        setEnrolling(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/classrooms/${id}/enroll`, {}, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            if (res.data.success) {
                toast.success("Successfully enrolled in the classroom!");
                setIsEnrolled(true);
                // Optionally refetch class data to update the students list
            }
        } catch (err) {
            console.error("Enrollment failed:", err);
            toast.error(err.response?.data?.message || "Failed to enroll. Eligibility restrictions may apply.");
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0e0e11] text-gray-100 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!classroom) {
        return (
            <div className="flex h-screen bg-[#0e0e11] text-gray-100">
                <Sidebar />
                <main className="flex-1 flex flex-col items-center justify-center shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-400">Classroom not found</h2>
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

    return (
        <div className="flex h-screen bg-[#0e0e11] text-gray-100 font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Classroom Header */}
                <header className="px-10 py-8 border-b border-gray-800/50 bg-[#14151a] shrink-0 sticky top-0 z-10 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-transparent"></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                            <span>{classroom.institute}</span>
                            <span>•</span>
                            <span>{classroom.programme}</span>
                            <span>•</span>
                            <span>{classroom.semester}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                            {classroom.name}
                        </h1>
                        <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
                            {classroom.description || 'Welcome to the class! Here you can find all course materials, discussions, and updates.'}
                        </p>
                        <div className="mt-4 flex items-center space-x-4">
                            <div className="flex items-center text-sm font-medium text-gray-500">
                                <Users size={16} className="mr-2" />
                                {classroom.students?.length || 0} Students Enrolled
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto w-full p-10 max-w-6xl mx-auto">
                    {!isEnrolled ? (
                        // Enrollment UI
                        <div className="w-full mt-10 p-12 bg-[#14151a] border border-gray-800/80 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
                                <BookOpen size={36} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Join this Classroom</h2>
                            <p className="text-gray-400 max-w-md mb-8">
                                You are eligible for this classroom. Enroll now to access the stream, resources, chat, and engage with the community.
                            </p>
                            <button
                                onClick={handleEnroll}
                                disabled={enrolling}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70 flex items-center space-x-2 w-full max-w-xs justify-center"
                            >
                                {enrolling ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Enrolling...</span>
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink size={20} />
                                        <span>Enroll Now</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        // Enrolled: Tabs UI
                        <div className="w-full h-full flex flex-col">
                            {/* Tabs Navigation */}
                            <div className="flex items-center justify-between border-b border-gray-800/80 mb-6 bg-[#0e0e11] sticky top-0 z-10 pt-2">
                                <div className="flex space-x-1">
                                    {ENROLLMENT_TABS.map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                                                    isActive
                                                        ? 'border-indigo-500 text-indigo-400'
                                                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                                                }`}
                                            >
                                                <Icon size={16} />
                                                <span>{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {isTeacherState && (
                                    <button
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="mb-2 flex items-center space-x-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                    >
                                        <CalendarPlus size={16} />
                                        <span>Schedule Meet</span>
                                    </button>
                                )}
                            </div>

                            {/* Tab Content Display */}
                            <div className={`flex-1 bg-[#14151a] border border-gray-800/80 rounded-2xl overflow-hidden ${
                                activeTab === 'announcements' ? 'p-6 overflow-y-auto' :
                                activeTab === 'chat' ? 'flex flex-col' :
                                activeTab === 'stream' ? 'flex flex-col' :
                                'p-10 flex flex-col items-center justify-center text-center shadow-sm'
                            }`}>
                                {activeTab === 'stream' ? (
                                    <ClassroomStream
                                        classroom={classroom}
                                        user={user}
                                        isTeacher={isTeacherState}
                                        token={auth.token}
                                    />
                                ) : activeTab === 'announcements' ? (
                                    <ClassroomAnnouncements 
                                        classroom={classroom} 
                                        user={user} 
                                        isTeacher={isTeacherState} 
                                    />
                                ) : activeTab === 'chat' ? (
                                    <ClassroomChat 
                                        classroom={classroom} 
                                        user={user} 
                                        isTeacher={isTeacherState} 
                                        token={auth.token}
                                    />
                                ) : (
                                    <>
                                        <div className="text-gray-600 mb-4">
                                            <BookOpen size={48} className="mx-auto opacity-20" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-300 mb-2 capitalize">{activeTab}</h3>
                                        <p className="text-gray-500 text-sm">
                                            The {activeTab} section is currently under construction. Check back soon!
                                        </p>
                                    </>
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
    <div className={`animate-spin rounded-full border-b-2 border-indigo-500/30 border-t-indigo-500 ${size === "sm" ? "h-4 w-4" : "h-8 w-8"}`}></div>
);
