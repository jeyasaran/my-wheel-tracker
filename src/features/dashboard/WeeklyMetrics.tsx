import { Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
import type { useDashboardStats } from '../../hooks/useDashboardStats';

type WeeklyStats = ReturnType<typeof useDashboardStats>['weekly'];

interface WeeklyMetricsProps {
    data: WeeklyStats;
    onPrevClick: () => void;
    onNextClick: () => void;
    disableNext?: boolean;
}

export default function WeeklyMetrics({ data, onPrevClick, onNextClick, disableNext }: WeeklyMetricsProps) {
    const {
        weekNumber,
        year,
        currentWeekPnL,
        prevWeekPnL,
        winRate,
        overallWinRate,
        avgDailyPnL,
        tradingDays,
        dailyBreakdown,
        bestDay,
        worstDay,
        transactions
    } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between h-12">
                <h2 className="text-2xl font-bold tracking-tight">Week {weekNumber} • {year}</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={onPrevClick}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Previous Week"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={onNextClick}
                        disabled={disableNext}
                        className={`p-2 rounded-full transition-colors ${disableNext ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        aria-label="Next Week"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Left Card: P&L & Efficiency */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col h-[400px]">
                    <div className="space-y-6 flex-1">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-semibold text-gray-500 dark:text-gray-400">This Week</span>
                        </div>

                        <div>
                            <div className={`text-4xl font-extrabold tracking-tight ${currentWeekPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentWeekPnL >= 0 ? '+' : ''}${currentWeekPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                Previous: <span className={prevWeekPnL >= 0 ? 'text-green-600' : 'text-red-600'}>${prevWeekPnL.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-100 dark:bg-gray-800" />

                        <div className="flex items-center space-x-6">
                            <div className="flex-1">
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Win Ratio</div>
                                <div className="text-lg font-bold">
                                    {winRate.toFixed(0)}% <span className="text-xs text-gray-400 font-normal">| Overall: {overallWinRate.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Daily PnL</div>
                            <div className={`text-2xl font-bold ${avgDailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${avgDailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                vs Previous: ${Math.abs(prevWeekPnL / 5).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Card: Trading Days & Chart */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <Calendar className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Trading Days</div>
                                <div className="text-2xl font-bold">{tradingDays}</div>
                            </div>
                        </div>
                    </div>

                    {/* Recharts Bar Chart */}
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const val = payload[0].value as number;
                                            return (
                                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded shadow-sm">
                                                    <p className={`text-sm font-bold ${val >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {val >= 0 ? '+' : ''}${val.toFixed(2)}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#374151" strokeOpacity={0.5} />
                                <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                                    {dailyBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Footer Stats */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
                        <div>
                            <span className="text-gray-500 mr-2">Best Day:</span>
                            <span className="font-bold text-green-500">${bestDay.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 mr-2">Worst Day:</span>
                            <span className="font-bold text-red-500">${worstDay.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col h-[400px]">
                <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-lg">Transactions</h3>
                </div>
                <div className="flex-1 overflow-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {transactions.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            No transactions closed this week.
                        </div>
                    ) : (
                        transactions.map(t => {
                            const isStock = 'displayType' in t && t.displayType === 'Stock';
                            const pnl = isStock
                                ? (((t as any).sellPrice || 0) - (t as any).buyPrice) * (t as any).quantity
                                : (t as any).side === 'BUY'
                                    ? (((t as any).closePrice || 0) * (t as any).contracts * 100) - ((t as any).premiumPrice * (t as any).contracts * 100)
                                    : ((t as any).premiumPrice * (t as any).contracts * 100) - (((t as any).closePrice || 0) * (t as any).contracts * 100);

                            return (
                                <div key={t.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="grid grid-cols-12 gap-4 w-full items-center">
                                        <div className="col-span-3 text-sm text-gray-500">{t.closeDate}</div>
                                        <div className="col-span-2 font-bold">{t.symbol}</div>
                                        <div className="col-span-4 text-sm text-gray-600 dark:text-gray-400">
                                            {isStock ? 'Stock Sale' : ((t as any).type === 'Put' ? 'Cash Secured Put' : 'Covered Call')}
                                        </div>
                                        <div className="col-span-1 text-sm">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                                                {t.status === 'CLOSED' ? 'Close' : t.status}
                                            </span>
                                        </div>
                                        <div className={`col-span-2 text-right font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
