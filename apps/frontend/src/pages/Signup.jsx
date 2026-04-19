import { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from "../context/AuthContext.jsx";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Zap, GraduationCap, BookOpen } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const ROLES = [
    { value: 'Student', label: 'Student', icon: GraduationCap, desc: 'Join classes & learn' },
    { value: 'Teacher', label: 'Teacher', icon: BookOpen,      desc: 'Create & manage classes' },
];

export default function Signup() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [fullName,     setFullName]     = useState("");
    const [email,        setEmail]        = useState("");
    const [password,     setPassword]     = useState("");
    const [role,         setRole]         = useState("Student");
    const [loading,      setLoading]      = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, password, role })
            });
            const data = await response.json();
            if (response.ok) {
                if (data.token) {
                    login(data.user, data.token);
                    toast.success("Account created! Let's set up your profile.");
                    navigate("/profile-setup");
                } else {
                    toast.success(data.message || "Account created! Please verify your email.");
                    navigate("/login");
                }
            } else {
                toast.error(data.message || "Signup failed. Please try again.");
            }
        } catch (err) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

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
                    {/* <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                        <Zap size={22} className="text-indigo-400" fill="currentColor" />
                    </div> */}
                    <img src="/brand_name.png" alt="Zynk Live Learning" className="h-12 mx-auto" />
                </div>

                {/* Form card */}
                <div className="bg-[#14151a] border border-gray-800/80 rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
                    <div className="mb-7">
                        <h2 className="text-xl font-bold text-white">Create your account</h2>
                        {/* <p className="text-sm text-gray-500 mt-1">Join thousands learning on Zynk.</p> */}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Role selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Role</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ROLES.map(({ value, label, icon: Icon, desc }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRole(value)}
                                        className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150 ${
                                            role === value
                                                ? 'bg-gray-500/10 border-gray-500/50 text-white'
                                                : 'bg-[#0e0e11] border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon size={15} className={role === value ? 'text-gray-200' : 'text-gray-600'} />
                                            <span className="text-sm font-semibold">{label}</span>
                                        </div>
                                        <span className="text-[11px] text-gray-500 leading-tight">{desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                            <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${
                                focusedField === 'name'
                                    ? 'border-gray-500/60 ring-1 ring-gray-500/20'
                                    : 'border-gray-800 hover:border-gray-700'
                            }`}>
                                <User size={16} className={`shrink-0 transition-colors ${focusedField === 'name' ? 'text-gray-200' : 'text-gray-600'}`} />
                                <input
                                    type="text"
                                    value={fullName}
                                    required
                                    autoComplete="name"
                                    onChange={e => setFullName(e.target.value)}
                                    onFocus={() => setFocusedField('name')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Your full name"
                                    className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
                            <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${
                                focusedField === 'email'
                                    ? 'border-gray-500/60 ring-1 ring-gray-500/20'
                                    : 'border-gray-800 hover:border-gray-700'
                            }`}>
                                <Mail size={16} className={`shrink-0 transition-colors ${focusedField === 'email' ? 'text-gray-200' : 'text-gray-600'}`} />
                                <input
                                    type="email"
                                    value={email}
                                    required
                                    autoComplete="email"
                                    onChange={e => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="you@iitp.ac.in"
                                    className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                            <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${
                                focusedField === 'password'
                                    ? 'border-gray-500/60 ring-1 ring-gray-500/20'
                                    : 'border-gray-800 hover:border-gray-700'
                            }`}>
                                <Lock size={16} className={`shrink-0 transition-colors ${focusedField === 'password' ? 'text-gray-200' : 'text-gray-600'}`} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Password"
                                    className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            {/* Password strength bar */}
                            {password.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                                password.length >= i * 3
                                                    ? password.length < 6  ? 'bg-red-500'
                                                    : password.length < 10 ? 'bg-yellow-500'
                                                    : 'bg-emerald-500'
                                                    : 'bg-gray-800'
                                            }`}
                                        />
                                    ))}
                                    <span className="text-[10px] text-gray-500 ml-1 whitespace-nowrap">
                                        {password.length < 6 ? 'Too short' : password.length < 10 ? 'Fair' : 'Strong'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-black-600/20 active:scale-[0.98] text-sm"
                        >
                            {loading ? (
                                <>
                                    <Spinner />
                                    <span>Creating account…</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-gray-800" />
                        <span className="text-xs text-gray-600 font-medium">OR</span>
                        <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    {/* Login link */}
                    <p className="text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-gray-300 hover:text-gray-200 font-semibold transition-colors"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>

                {/* Terms note */}
                {/* <p className="text-center text-[11px] text-gray-600 mt-5 px-4">
                    By creating an account you agree to our{' '}
                    <span className="text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">Privacy Policy</span>.
                </p> */}
            </div>
        </div>
    );
}

const Spinner = () => (
    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
);