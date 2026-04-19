import { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from "../context/AuthContext.jsx";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email,          setEmail]          = useState("");
    const [password,       setPassword]       = useState("");
    const [loading,        setLoading]        = useState(false);
    const [showPassword,   setShowPassword]   = useState(false);
    const [focusedField,   setFocusedField]   = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                login(data.user, data.token);
                toast.success("Welcome back!");
                navigate(data.user.profileCompleted ? "/dashboard" : "/profile-setup");
            } else {
                toast.error(data.message || "Login failed");
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
            <div className="absolute top-[-10%] left-[-5%] w-72 h-72  rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96  rounded-full blur-[120px] pointer-events-none" />

            {/* Card */}
            <div className="relative w-full max-w-md">

                {/* Brand */}
                <div className="text-center mb-8">
                    {/* <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                        <Zap size={22} className="text-indigo-400" fill="currentColor" />
                    </div> */}
                    <h1 className="text-3xl font-black text-white tracking-tight">Zynk</h1>
                    <p className="text-[11px] font-bold tracking-[0.25em] text-indigo-400 uppercase mt-1">Live Learning</p>
                </div>

                {/* Form card */}
                <div className="bg-[#14151a] border border-gray-800/80 rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
                    <div className="mb-7">
                        <h2 className="text-xl font-bold text-white">Welcome back</h2>
                        <p className="text-sm text-gray-500 mt-1">Sign in to continue your learning journey.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
                            <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${
                                focusedField === 'email'
                                    ? 'border-indigo-500/60 ring-1 ring-indigo-500/20'
                                    : 'border-gray-800 hover:border-gray-700'
                            }`}>
                                <Mail size={16} className={`shrink-0 transition-colors ${focusedField === 'email' ? 'text-indigo-400' : 'text-gray-600'}`} />
                                <input
                                    type="email"
                                    value={email}
                                    required
                                    autoComplete="email"
                                    onChange={e => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="you_@iitp.ac.in"
                                    className="flex-1 bg-transparent text-gray-100 text-sm placeholder:text-gray-600 outline-none"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                            <div className={`flex items-center gap-3 bg-[#0e0e11] border rounded-xl px-4 py-3 transition-all duration-200 ${
                                focusedField === 'password'
                                    ? 'border-indigo-500/60 ring-1 ring-indigo-500/20'
                                    : 'border-gray-800 hover:border-gray-700'
                            }`}>
                                <Lock size={16} className={`shrink-0 transition-colors ${focusedField === 'password' ? 'text-indigo-400' : 'text-gray-600'}`} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    required
                                    autoComplete="current-password"
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="••••••••"
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
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.98] text-sm"
                        >
                            {loading ? (
                                <>
                                    <Spinner />
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
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

                    {/* Sign up link */}
                    <p className="text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link
                            to="/signup"
                            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                        >
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

const Spinner = () => (
    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
);