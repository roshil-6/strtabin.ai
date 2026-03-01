import { Outlet, NavLink } from 'react-router-dom';
import { LayoutGrid, Calendar, CheckSquare, Settings } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
    const getLinkClass = (isActive: boolean) =>
        clsx("p-3 rounded-xl transition-all", isActive ? "bg-white/10 text-primary" : "text-secondary hover:text-white hover:bg-white/5");

    return (
        <div className="flex w-full h-full bg-background text-white">
            {/* Sidebar */}
            <nav className="w-16 flex flex-col items-center py-6 border-r border-white/10 space-y-8 z-50 bg-[#0b0b0b]">
                {/* Logo Placeholder */}
                <div className="w-10 h-10 bg-white/10 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-4 border border-white/20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white rounded-sm" />
                </div>

                <NavLink
                    to="/"
                    className={({ isActive }) => getLinkClass(isActive)}
                    title="Notes"
                    end
                >
                    <LayoutGrid size={24} />
                </NavLink>

                <NavLink
                    to="/calendar"
                    className={({ isActive }) => getLinkClass(isActive)}
                    title="Calendar"
                >
                    <Calendar size={24} />
                </NavLink>

                <NavLink
                    to="/todo"
                    className={({ isActive }) => getLinkClass(isActive)}
                    title="To-Do"
                >
                    <CheckSquare size={24} />
                </NavLink>

                <div className="flex-grow" />

                <button
                    onClick={() => {
                        if (confirm('⚠️ Factory Reset: This will delete ALL projects and data. Are you sure?')) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}
                    className="p-3 text-secondary hover:text-red-500 hover:bg-white/5 rounded-xl transition-all"
                    title="Reset All Data"
                >
                    <Settings size={24} />
                </button>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
}
