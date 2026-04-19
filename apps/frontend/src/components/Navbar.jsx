import { NavLink, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useState } from 'react';

export default function Navbar() {
    const { auth, logout } = useAuth();
    const user = auth?.user;
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            isActive
                ? 'bg-white/10 text-white shadow-[0_0_12px_-2px_rgba(255,255,255,0.15)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`;

    return (
        <>
            {/* ── Fixed navbar ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center justify-between px-5 sm:px-8 h-16">

                    {/* Left — Brand */}
                    <div
                        className="flex flex-col cursor-pointer select-none shrink-0"
                        onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}
                    >
                        <img src="/brand_name.png" alt="Zynk Live Learning" className="h-8" />
                    </div>

                    {/* Desktop Right */}
                    <div className="hidden md:flex items-center gap-2">
                        <NavLink to="/dashboard" className={navLinkClass}>
                            <HomeIcon size={15} /><span>Home</span>
                        </NavLink>
                        <NavLink to="/profile" className={navLinkClass}>
                            <User size={15} /><span>Profile</span>
                        </NavLink>

                        <div className="w-px h-5 bg-gray-700/60 mx-2" />

                        {/* User pill */}
                        <div className="flex items-center gap-2.5 bg-[#121414] border border-white/5 rounded-full pl-1 pr-3 py-1">
                            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold uppercase">
                                {user?.fullName?.[0] || user?.email?.[0] || 'U'}
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-xs font-semibold text-gray-200">{user?.fullName || 'User'}</span>
                                <span className="text-[10px] text-gray-500">{user?.role || 'Student'}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/logout')}
                            className="ml-1 p-2 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>

                    {/* Mobile: user avatar + hamburger */}
                    <div className="flex md:hidden items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                            {user?.fullName?.[0] || user?.email?.[0] || 'U'}
                        </div>
                        <button
                            onClick={() => setMenuOpen(prev => !prev)}
                            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            {menuOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown */}
                {menuOpen && (
                    <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-white/10 px-5 py-4 flex flex-col gap-2">
                        {/* User info row */}
                        <div className="flex items-center gap-3 px-3 py-2 mb-1">
                            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white uppercase">
                                {user?.fullName?.[0] || 'U'}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-200">{user?.fullName || 'User'}</p>
                                <p className="text-[11px] text-gray-500">{user?.role || 'Student'}</p>
                            </div>
                        </div>

                        <div className="h-px bg-gray-800/60 mb-1" />

                        <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                            <HomeIcon size={15} /><span>Home</span>
                        </NavLink>
                        <NavLink to="/profile" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                            <User size={15} /><span>Profile</span>
                        </NavLink>

                        <div className="h-px bg-gray-800/60 my-1" />

                        <button
                            onClick={() => { navigate('/logout'); setMenuOpen(false); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all w-full"
                        >
                            <LogOut size={15} /><span>Logout</span>
                        </button>
                    </div>
                )}
            </nav>

            {/* ── Spacer so page content starts below the fixed bar ── */}
            <div className="h-16 shrink-0" />
        </>
    );
}
