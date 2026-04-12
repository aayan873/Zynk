import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { Edit2, Save, X, Loader2, CheckCircle2, User } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ProfilePage() {
    const { auth, login } = useAuth(); // Assuming login updates the auth context
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [auth.token]);

    const fetchProfile = async () => {
        if (!auth?.token) return;
        try {
            const res = await axios.get(`${BACKEND_URL}/api/profiles/`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            const fetchedProfile = { ...res.data.data, institution: res.data.data.user?.institution || auth.user?.institution };
            setProfile(fetchedProfile);
            setFormData(fetchedProfile);
        } catch (err) {
            console.error("Failed to fetch profile:", err);
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { _id, user, createdAt, updatedAt, __v, ...payload } = formData;
            const res = await axios.patch(`${BACKEND_URL}/api/profiles/`, payload, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            const updatedProfile = { ...res.data.data, institution: res.data.data.user?.institution || auth.user?.institution };
            setProfile(updatedProfile);
            setFormData(updatedProfile);
            setIsEditing(false);
            toast.success("Profile updated successfully!");
            
        } catch (err) {
            console.error("Failed to update profile:", err);
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0e0e11] text-gray-100 font-sans overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
                </main>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex h-screen bg-[#0e0e11] text-gray-100 font-sans overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center flex-col">
                    <h2 className="text-2xl text-gray-400">Profile not found</h2>
                </main>
            </div>
        );
    }

    const role = profile.user?.role || auth.user?.role;

    const renderField = (label, name, type = "text", placeholder = "") => {
        return (
            <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
                {isEditing ? (
                    <input
                        type={type}
                        name={name}
                        value={formData[name] || ''}
                        onChange={handleChange}
                        placeholder={placeholder}
                        className="bg-[#14151a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                    />
                ) : (
                    <div className="bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-2.5 text-gray-200">
                        {profile[name] || <span className="text-gray-600 italic">Not provided</span>}
                    </div>
                )}
            </div>
        );
    };

    const renderSelectField = (label, name, options) => {
        return (
            <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
                {isEditing ? (
                    <select
                        name={name}
                        value={formData[name] || ''}
                        onChange={handleChange}
                        className="bg-[#14151a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all appearance-none"
                    >
                        <option value="" disabled hidden>Select {label}</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <div className="bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-2.5 text-gray-200">
                        {profile[name] || <span className="text-gray-600 italic">Not provided</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-[#0e0e11] text-gray-100 font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-y-auto relative p-10">
                <div className="max-w-4xl w-full mx-auto space-y-8 mt-10">
                    
                    {/* Header Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                            <p className="text-gray-400">Manage your personal information and settings.</p>
                        </div>
                        
                        {!isEditing ? (
                            <button 
                                onClick={() => { setFormData(profile); setIsEditing(true); }}
                                className="flex items-center space-x-2 bg-[#1e1f26] hover:bg-[#2a2b36] border border-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                            >
                                <Edit2 size={16} className="text-indigo-400" />
                                <span>Edit Profile</span>
                            </button>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1a1b23] transition-all"
                                >
                                    <X size={16} />
                                    <span>Cancel</span>
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Profile Card */}
                    <div className="bg-[#14151a] border border-gray-800 rounded-2xl p-8 relative overflow-hidden backdrop-blur-xl">
                        {/* Decorative Background Blur */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            
                            {/* General Information */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2 mb-4 flex items-center">
                                    <User size={18} className="mr-2 text-indigo-400" />
                                    General Information
                                </h3>
                                
                                {renderField("Full Name", "fullName")}
                                {renderField("Institution", "institution")}
                                
                                <div className="flex flex-col space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</label>
                                    <div className="bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed">
                                        {role}
                                    </div>
                                    <p className="text-[10px] text-gray-500">Role cannot be changed.</p>
                                </div>
                            </div>

                            {/* Role Specific Information */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2 mb-4 flex items-center">
                                    <CheckCircle2 size={18} className="mr-2 text-indigo-400" />
                                    {role === 'Teacher' ? 'Professional Details' : 'Academic Details'}
                                </h3>
                                
                                {role === 'Teacher' && (
                                    <>
                                        {renderField("Department", "department")}
                                        {renderField("Designation", "designation")}
                                        {renderField("Employee ID", "employeeId")}
                                        {isEditing ? (
                                             <div className="flex flex-col space-y-1.5 col-span-2">
                                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bio</label>
                                                <textarea
                                                    name="bio"
                                                    value={formData.bio || ''}
                                                    onChange={handleChange}
                                                    placeholder="Tell students a bit about yourself..."
                                                    className="bg-[#14151a] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all min-h-[100px] resize-y"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col space-y-1.5 col-span-2">
                                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bio</label>
                                                <div className="bg-[#1a1b23] border border-gray-800 rounded-lg px-4 py-3 text-gray-200 text-sm leading-relaxed min-h-[100px]">
                                                    {profile.bio || <span className="text-gray-600 italic">No bio added yet.</span>}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {role === 'Student' && (
                                    <>
                                        {renderField("Roll Number", "rollNumber")}
                                        {renderSelectField("Programme", "programme", ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BBA', 'MBA', 'B.Sc', 'M.Sc'])}
                                        <div className="grid grid-cols-2 gap-4">
                                            {renderSelectField("Semester", "semester", ['1', '2', '3', '4', '5', '6', '7', '8'])}
                                            {renderField("Batch Year", "batchYear", "text")}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
