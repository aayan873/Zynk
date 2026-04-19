import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, Calendar, ExternalLink, Plus } from 'lucide-react';
import CreateClassroomModal from './CreateClassroomModal.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function MyClassrooms() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewAll, setViewAll] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchClassrooms = async () => {
            if (!auth?.token) return;
            try {
                const res = await axios.get(`${BACKEND_URL}/api/classrooms`, {
                    headers: {
                        Authorization: `Bearer ${auth.token}`
                    }
                });
                if (res.data.success) {
                    setClassrooms(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch classrooms:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchClassrooms();
    }, [auth?.token]);

    const handleClassroomCreated = (newClassroom) => {
        setClassrooms((prev) => [newClassroom, ...prev]);
    };

    const isTeacher = auth?.user?.role === 'Teacher';
    const displayedClassrooms = viewAll ? classrooms : classrooms.slice(0, 3);

    return (
        <section className="space-y-4 pb-12">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-200">My Classrooms</h3>
                {classrooms.length > 3 && (
                    <button 
                        onClick={() => setViewAll(!viewAll)}
                        className="cursor-pointer text-sm font-medium text-gray-400 hover:text-indigo-400 transition"
                    >
                        {viewAll ? 'Show Less ▴' : 'View All ▾'}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48 bg-[#14151a] rounded-2xl border border-gray-800/80">
                    <Spinner />
                </div>
            ) : classrooms.length === 0 && !isTeacher ? (
                <div className="bg-[#14151a] rounded-2xl border border-gray-800/80 p-8 text-center flex flex-col items-center justify-center h-48 border-dashed">
                    <h4 className="text-gray-300 font-medium">You are not enrolled in any classrooms yet.</h4>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isTeacher && (
                        <div 
                            onClick={() => setIsModalOpen(true)}
                            className="bg-[#121414] border border-white/10 hover:border-white/30 rounded-2xl overflow-hidden group transition-all cursor-pointer flex flex-col items-center justify-center p-8 border-dashed shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] min-h-[220px]"
                        >
                            <div className="w-14 h-14 bg-white/5 text-gray-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
                                <Plus size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors">Create New Classroom</h4>
                            <p className="text-xs text-gray-500 mt-2 text-center">Set up a new cohort, syllabus and student roster.</p>
                        </div>
                    )}
                    {displayedClassrooms.map((cls) => (
                        <div key={cls._id} onClick={() => navigate(`/classroom/${cls._id}`)} className="bg-[#121414] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden group transition-all cursor-pointer">
                            {/* Card Banner */}
                            <div className="h-28 bg-gradient-to-br from-[#1e1f24] to-[#121414] relative border-b border-white/5">
                                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-[10px] font-bold px-2.5 py-1 rounded text-gray-300 uppercase tracking-wider border border-white/10">
                                    {cls.institute || 'Institution'}
                                </div>
                            </div>
                            
                            {/* Card Details */}
                            <div className="p-5 relative">
                                <h4 className="text-lg font-bold text-gray-100 mb-1 truncate" title={cls.name}>{cls.name}</h4>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-5 truncate">
                                    {cls.programme || 'Programme'}
                                </p>
                                
                                <div className="flex items-center justify-between text-gray-400 text-sm mb-4">
                                    <div className="flex items-center space-x-2">
                                        <Users size={15} />
                                        <span>{cls.students?.length || 0} Students</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Calendar size={15} />
                                        <span>{cls.semester || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
                                    <div className="flex -space-x-2">
                                        {/* Static user avatar approximations for design effect */}
                                        <div className="w-7 h-7 rounded-full border-2 border-[#14151a] bg-gray-600"></div>
                                        <div className="w-7 h-7 rounded-full border-2 border-[#14151a] bg-gray-500"></div>
                                        <div className="w-7 h-7 rounded-full border-2 border-[#14151a] bg-gray-800 flex items-center justify-center text-[9px] text-gray-300 font-bold">+{cls.students?.length || 0}</div>
                                    </div>
                                    <div className="p-1.5 bg-[#1e1f26] rounded-lg text-gray-500 group-hover:bg-white group-hover:text-black transition-all transform group-hover:scale-105">
                                        <ExternalLink size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <CreateClassroomModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={handleClassroomCreated} 
            />
        </section>
    );
}

const Spinner = () => (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/20 border-t-white"></div>
);
