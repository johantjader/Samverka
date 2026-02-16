import { LayoutDashboard, Users, MessageSquare, LogOut, Shield } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@samverka/shared';

export default function NavRail() {
    const location = useLocation();
    const currentPath = location.pathname;
    const { user, logout } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Meetings', path: '/meetings' },
        { icon: MessageSquare, label: 'Rooms', path: '/rooms' },
    ];

    if (user?.role === UserRole.ADMIN) {
        navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
    }

    // Get initials
    const initials = user?.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'User';

    return (
        <nav className="w-[72px] bg-slate-900 h-screen flex flex-col items-center py-6 shrink-0 z-50">
            {/* Brand Logo */}
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-blue-900/20">
                <span className="text-white font-bold text-xl">S</span>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 flex flex-col gap-4 w-full px-3">
                {navItems.map((item) => {
                    const isActive = item.path === '/'
                        ? currentPath === '/'
                        : currentPath.startsWith(item.path);

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                            title={item.label}
                        >
                            <item.icon className="w-6 h-6" />
                        </Link>
                    );
                })}
            </div>

            {/* User Actions */}
            <div className="flex flex-col gap-4 items-center w-full px-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold border-2 border-slate-800" title={user?.displayName}>
                    {initials}
                </div>
                <button
                    onClick={logout}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                    title="Logout"
                >
                    <LogOut className="w-6 h-6" />
                </button>
            </div>
        </nav>
    );
}
