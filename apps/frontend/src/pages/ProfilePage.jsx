import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import { Edit2, Save, X, Loader2, CheckCircle2, User } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ProfilePage() {
    const { auth } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchProfile(); }, [auth.token]);

    const fetchProfile = async () => {
        if (!auth?.token) return;
        try {
            const res = await axios.get(`${BACKEND_URL}/api/profiles/`, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            const fetched = { ...res.data.data, institution: res.data.data.user?.institution || auth.user?.institution };
            setProfile(fetched);
            setFormData(fetched);
        } catch (err) {
            toast.error("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSave = async () => {
        setSaving(true);
        try {
            const { _id, user, createdAt, updatedAt, __v, ...payload } = formData;
            const res = await axios.patch(`${BACKEND_URL}/api/profiles/`, payload, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            const updated = { ...res.data.data, institution: res.data.data.user?.institution || auth.user?.institution };
            setProfile(updated);
            setFormData(updated);
            setIsEditing(false);
            toast.success("Profile updated successfully!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "bg-[#14151a] border border-gray-700 rounded-lg px-3 sm:px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all w-full text-sm";
    const readClass  = "bg-[#1a1b23] border border-gray-800 rounded-lg px-3 sm:px-4 py-2.5 text-gray-200 text-sm w-full";

    const renderField = (label, name, type = "text", placeholder = "") => (
        <div className="flex flex-col space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
            {isEditing
                ? <input type={type} name={name} value={formData[name] || ''} onChange={handleChange} placeholder={placeholder} className={inputClass} />
                : <div className={readClass}>{profile[name] || <span className="text-gray-600 italic">Not provided</span>}</div>
            }
        </div>
    );

    const renderSelect = (label, name, options) => (
        <div className="flex flex-col space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
            {isEditing
                ? (
                    <select name={name} value={formData[name] || ''} onChange={handleChange}
                        className={`${inputClass} appearance-none`}>
                        <option value="" disabled hidden>Select {label}</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                )
                : <div className={readClass}>{profile[name] || <span className="text-gray-600 italic">Not provided</span>}</div>
            }
        </div>
    );

    const renderStaticField = (label, value) => (
        <div className="flex flex-col space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
            <div className={`${readClass} cursor-not-allowed opacity-70`}>{value || <span className="text-gray-600 italic">Not provided</span>}</div>
        </div>
    );

    const Shell = ({ children }) => (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0e0e11] text-gray-100 font-sans">
            <Navbar />
            <main className="flex-1 overflow-y-auto pt-4">{children}</main>
        </div>
    );

    if (loading) return (
        <Shell>
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
            </div>
        </Shell>
    );

    if (!profile) return (
        <Shell>
            <div className="flex items-center justify-center h-full">
                <h2 className="text-xl text-gray-400">Profile not found</h2>
            </div>
        </Shell>
    );

    const role = profile.user?.role || auth.user?.role;

    return (
        <Shell>
            <div className="px-4 sm:px-8 lg:px-10 py-6 sm:py-10 w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">My Profile</h1>
                        <p className="text-gray-400 text-sm">Manage your personal information and settings.</p>
                    </div>

                    {/* Action Buttons */}
                    {!isEditing ? (
                        <button
                            onClick={() => { setFormData(profile); setIsEditing(true); }}
                            className="self-start sm:self-auto flex items-center gap-2 bg-[#1e1f26] hover:bg-[#2a2b36] border border-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0"
                        >
                            <Edit2 size={15} className="text-indigo-400" />
                            <span>Edit Profile</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1a1b23] transition-all"
                            >
                                <X size={15} /><span>Cancel</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70 shrink-0"
                            >
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <div className="bg-[#14151a] border border-gray-800 rounded-2xl p-5 sm:p-8 relative overflow-hidden">
                    {/* Decorative blur */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">

                        {/* General Information */}
                        <div className="space-y-5">
                            <h3 className="text-base sm:text-lg font-semibold text-white border-b border-gray-800 pb-2 flex items-center gap-2">
                                <User size={17} className="text-indigo-400" />
                                General Information
                            </h3>
                            {renderField("Full Name", "fullName")}
                            {renderStaticField("Institution", profile.institution || profile.user?.institution)}
                            <div className="flex flex-col space-y-1.5">
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</label>
                                <div className="bg-[#1a1b23] border border-gray-800 rounded-lg px-3 sm:px-4 py-2.5 text-gray-400 text-sm cursor-not-allowed">{role}</div>
                                <p className="text-[10px] text-gray-500">Role cannot be changed.</p>
                            </div>
                        </div>

                        {/* Role-specific Information */}
                        <div className="space-y-5">
                            <h3 className="text-base sm:text-lg font-semibold text-white border-b border-gray-800 pb-2 flex items-center gap-2">
                                <CheckCircle2 size={17} className="text-indigo-400" />
                                {role === 'Teacher' ? 'Professional Details' : 'Academic Details'}
                            </h3>

                            {role === 'Teacher' && (
                                <>
                                    {renderField("Department", "department")}
                                    {renderField("Designation", "designation")}
                                    {renderField("Employee ID", "employeeId")}
                                    <div className="flex flex-col space-y-1.5">
                                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Bio</label>
                                        {isEditing ? (
                                            <textarea
                                                name="bio"
                                                value={formData.bio || ''}
                                                onChange={handleChange}
                                                placeholder="Tell students a bit about yourself..."
                                                className="bg-[#14151a] border border-gray-700 rounded-lg px-3 sm:px-4 py-2.5 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all min-h-[100px] resize-y w-full"
                                            />
                                        ) : (
                                            <div className="bg-[#1a1b23] border border-gray-800 rounded-lg px-3 sm:px-4 py-3 text-gray-200 text-sm leading-relaxed min-h-[100px]">
                                                {profile.bio || <span className="text-gray-600 italic">No bio added yet.</span>}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {role === 'Student' && (
                                <>
                                    {renderStaticField("Roll Number", profile.rollNumber)}
                                    <div className='grid grid-cols-[1fr_1fr] gap-3 sm:gap-4'>
                                        {renderStaticField("Programme", profile.programme)}
                                        {renderStaticField("Branch", profile.branch)}
                                    </div>
                                    {/* Semester + Batch side by side on all screen sizes */}
                                    <div className="grid grid-cols-[1fr_1fr] gap-3 sm:gap-4">
                                        {renderSelect("Semester", "semester", ['1','2','3','4','5','6','7','8'])}
                                        {renderStaticField("Batch Year", profile.batchYear)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom padding for mobile scroll comfort */}
                <div className="h-4 sm:h-0" />
            </div>
        </Shell>
    );
}
