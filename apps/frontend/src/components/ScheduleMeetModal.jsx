import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { X, CalendarPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ScheduleMeetModal({ isOpen, onClose, onSuccess, classroomId }) {
    const { auth } = useAuth();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        scheduledFor: '',
        duration: '60',
        type: 'MEET'
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.scheduledFor) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setLoading(true);

        try {
            const scheduledForDate = new Date(formData.scheduledFor);
            const durationMs = parseInt(formData.duration) * 60000;
            const scheduledEndTime = new Date(scheduledForDate.getTime() + durationMs);

            const payload = {
                title: formData.title,
                classroom: classroomId,
                scheduledFor: scheduledForDate.toISOString(),
                scheduledEndTime: scheduledEndTime.toISOString(),
                type: formData.type
            };

            const res = await axios.post(`${BACKEND_URL}/api/meets/schedule`, payload, {
                headers: {
                    Authorization: `Bearer ${auth.token}`
                }
            });

            if (res.data.success) {
                toast.success('Meeting scheduled successfully!');
                if (onSuccess) onSuccess(res.data.meetingDetails);
                onClose();
                setFormData({ title: '', scheduledFor: '', duration: '60', type: 'MEET' });
            }
        } catch (error) {
            console.error("Failed to schedule meet:", error);
            toast.error(error.response?.data?.error || 'Failed to schedule meeting');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#14151a] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-5 right-5 text-gray-500 hover:text-white transition"
                >
                    <X size={20} />
                </button>
                
                <div className="p-8 pb-6 border-b border-gray-800/80">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarPlus className="text-indigo-500" /> 
                        Schedule a Meet
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">Plan a future session for your classroom.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Meet Title *</label>
                        <input 
                            required 
                            name="title" 
                            value={formData.title} 
                            onChange={handleChange} 
                            placeholder="e.g. Weekly Q&A Session" 
                            className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-600 transition"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time *</label>
                            <input 
                                required 
                                type="datetime-local"
                                name="scheduledFor" 
                                value={formData.scheduledFor} 
                                onChange={handleChange} 
                                className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white transition [color-scheme:dark]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration *</label>
                            <select 
                                required 
                                name="duration" 
                                value={formData.duration} 
                                onChange={handleChange} 
                                className="w-full bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white transition appearance-none"
                            >
                                <option value="30">30 Minutes</option>
                                <option value="45">45 Minutes</option>
                                <option value="60">1 Hour</option>
                                <option value="90">1.5 Hours</option>
                                <option value="120">2 Hours</option>
                                <option value="180">3 Hours</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                            {loading ? 'Scheduling...' : 'Schedule Meet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
