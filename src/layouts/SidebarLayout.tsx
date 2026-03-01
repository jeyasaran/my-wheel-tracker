import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Settings, Archive, DollarSign, TrendingUp, Palette, Building2, Loader2, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTradeStore } from '../hooks/useTradeStore';

export function SidebarLayout() {
    const { loading } = useTradeStore();

    return (
        <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
            {/* Sidebar code... omitted for brevity in replace_file_content if possible but I'll include enough to match */}
            <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex">
                <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-800">
                    <h1 className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-500">
                        Wheel Tracker
                    </h1>
                </div>
                {/* ... existing nav ... */}
                <nav className="flex-1 space-y-1 p-4">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/metrics"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <Activity className="h-4 w-4" />
                        Metrics
                    </NavLink>
                    <NavLink
                        to="/trades"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <List className="h-4 w-4" />
                        Trades
                    </NavLink>
                    <NavLink
                        to="/positions"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <TrendingUp className="h-4 w-4" />
                        Positions
                    </NavLink>
                    <NavLink
                        to="/archive"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <Archive className="h-4 w-4" />
                        Archive
                    </NavLink>

                    <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Settings
                    </div>
                    <NavLink
                        to="/settings/cash-ledger"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <DollarSign className="h-4 w-4" />
                        Cash Ledger
                    </NavLink>
                    <NavLink
                        to="/settings/massive"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <Settings className="h-4 w-4" />
                        Massive
                    </NavLink>
                    <NavLink
                        to="/settings/brokers"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <Building2 className="h-4 w-4" />
                        Brokers
                    </NavLink>
                    <NavLink
                        to="/settings/theme"
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                            )
                        }
                    >
                        <Palette className="h-4 w-4" />
                        Theme
                    </NavLink>
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500">
                        <Settings className="h-4 w-4" />
                        <span>v1.0.0</span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto">
                <div className="w-full p-4 md:p-6 lg:p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-gray-500 animate-pulse font-medium">Loading your portfolio...</p>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </div>
            </main>
        </div>
    );
}
