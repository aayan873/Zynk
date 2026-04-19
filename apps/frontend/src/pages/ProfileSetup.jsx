import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { ArrowRight, BookOpen, User } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const ProfileSetup = () => {
    const { auth, login } = useAuth();
    const navigate = useNavigate();

    const role = auth?.user?.role;

    // Teacher specific
    const [loading, setLoading] = useState(false);

    // Teacher specific
    const [department, setDepartment] = useState('');
    const [designation, setDesignation] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [bio, setBio] = useState('');
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {};

        if (role === 'Teacher') {
            Object.assign(payload, { department, designation, employeeId, bio });
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/profiles/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${auth?.token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Profile creation successful!");
                // Re-sync local auth state so protected routes consider them verified
                if (auth && auth.user) {
                    login({ ...auth.user, profileCompleted: true }, auth.token);
                }
                navigate("/dashboard");
            } else {
                toast.error(data.message || "Failed to complete profile");
            }
        } catch (error) {
            toast.error("An error occurred during profile setup");
        } finally {
            setLoading(false);
        }
    };

    if (!auth?.user) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading user state...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0e0e11] flex items-center justify-center p-4 relative overflow-hidden">

            {/* Background grid */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
                    backgroundSize: '48px 48px',
                }}
            />

            {/* Glow blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-gray-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-gray-900/20 rounded-full blur-[120px] pointer-events-none" />

            {/* Card */}
            <div className="relative w-full max-w-md my-8">

                {/* Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight">Zynk</h1>
                    <p className="text-[11px] font-bold tracking-[0.25em] text-gray-400 uppercase mt-1">Live Learning</p>
                </div>

                {/* Form card */}
                <div className="bg-[#14151a] border border-gray-800/80 rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
                    <div className="mb-7">
                        <h2 className="text-xl font-bold text-white">Complete Your {role} Profile</h2>
                        <p className="text-sm text-gray-500 mt-1">You must complete this step to discover your classrooms.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {role === 'Teacher' && (
                            <>
                                {/* Department */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Department</label>
                                    <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${focusedField === 'department'
                                            ? 'border-gray-500/60 ring-1 ring-gray-500/20'
                                            : 'border-gray-800 hover:border-gray-700'
                                        }`}>
                                        <BookOpen size={16} className={`shrink-0 transition-colors ${focusedField === 'department' ? 'text-gray-200' : 'text-gray-600'}`} />
                                        <input
                                            type="text"
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value)}
                                            onFocus={() => setFocusedField('department')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            placeholder="e.g. Computer Science"
                                            className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Designation */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Designation</label>
                                    <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${focusedField === 'designation'
                                            ? 'border-gray-500/60 ring-1 ring-gray-500/20'
                                            : 'border-gray-800 hover:border-gray-700'
                                        }`}>
                                        <User size={16} className={`shrink-0 transition-colors ${focusedField === 'designation' ? 'text-gray-200' : 'text-gray-600'}`} />
                                        <input
                                            type="text"
                                            value={designation}
                                            onChange={(e) => setDesignation(e.target.value)}
                                            onFocus={() => setFocusedField('designation')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                            placeholder="e.g. Assistant Professor"
                                            className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Employee ID */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee ID (Optional)</label>
                                    <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${focusedField === 'employeeId'
                                            ? 'border-gray-500/60 ring-1 ring-gray-500/20'
                                            : 'border-gray-800 hover:border-gray-700'
                                        }`}>
                                        <User size={16} className={`shrink-0 transition-colors ${focusedField === 'employeeId' ? 'text-gray-200' : 'text-gray-600'}`} />
                                        <input
                                            type="text"
                                            value={employeeId}
                                            onChange={(e) => setEmployeeId(e.target.value)}
                                            onFocus={() => setFocusedField('employeeId')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="Employee ID"
                                            className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Bio */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bio (Optional)</label>
                                    <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${focusedField === 'bio'
                                            ? 'border-gray-500/60 ring-1 ring-gray-500/20'
                                            : 'border-gray-800 hover:border-gray-700'
                                        }`}>
                                        <User size={16} className={`shrink-0 transition-colors ${focusedField === 'bio' ? 'text-gray-200' : 'text-gray-600'}`} />
                                        <input
                                            type="text"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            onFocus={() => setFocusedField('bio')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="Short bio..."
                                            className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-black-600/20 active:scale-[0.98] text-sm"
                        >
                            {loading ? (
                                <>
                                    <Spinner />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <span>Finish Profile</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const Spinner = () => (
    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
);

export default ProfileSetup;
