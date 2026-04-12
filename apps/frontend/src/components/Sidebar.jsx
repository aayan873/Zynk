import { NavLink, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, User, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar() {
    const { auth, logout } = useAuth();
    const user = auth?.user;
    const navigate = useNavigate();

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            isActive
                ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_12px_-2px_rgba(99,102,241,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`;

    return (
        <nav className="w-full sticky top-0 z-50 bg-[#0e0e11]/80 backdrop-blur-md border-b border-gray-800/50">
            <div className="flex items-center justify-between px-8 h-16">

                {/* Left — Brand */}
                <div
                    className="flex flex-col cursor-pointer select-none"
                    onClick={() => navigate('/home')}
                >
                    <span className="text-xl font-bold tracking-tight text-white leading-none">
                        Zynk
                    </span>
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-indigo-400 uppercase mt-0.5">
                        Live Learning
                    </span>
                </div>

                {/* Right — Nav links + user */}
                <div className="flex items-center gap-2">
                    <NavLink to="/home" className={navLinkClass}>
                        <HomeIcon size={15} />
                        <span>Home</span>
                    </NavLink>

                    <NavLink to="/profile" className={navLinkClass}>
                        <User size={15} />
                        <span>Profile</span>
                    </NavLink>

                    {/* Divider */}
                    <div className="w-px h-5 bg-gray-700/60 mx-2" />

                    {/* User pill */}
                    <div className="flex items-center gap-2.5 bg-[#14151a] border border-gray-800/80 rounded-full pl-1 pr-3 py-1">
                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {user?.fullName?.[0] || user?.email?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xs font-semibold text-gray-200">
                                {user?.fullName || 'User'}
                            </span>
                            <span className="text-[10px] text-gray-500">
                                {user?.role || 'Student'}
                            </span>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={() => navigate('/logout')}
                        className="ml-1 p-2 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </nav>
    );
}
