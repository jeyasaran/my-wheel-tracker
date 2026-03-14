import { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { format, startOfWeek, startOfMonth, parseISO, subMonths } from 'date-fns';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { cn } from '../../lib/utils';

type Period = 'Weekly' | 'Monthly';
type ViewType = 'Bar' | 'Cumulative';
type TimeRange = '3 Months' | '6 Months' | '12 Months' | 'All Time';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-xl animate-in zoom-in-95 duration-200">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-tight">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{entry.name}</span>
                            </div>
                            <span className={`text-sm font-bold ${entry.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {entry.value < 0 ? '-' : ''}${Math.abs(entry.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function IncomeChart() {
    const { trades, stockPositions } = useTradeStore();
    const [period, setPeriod] = useState<Period>('Weekly');
    const [viewType, setViewType] = useState<ViewType>('Bar');
    const [timeRange, setTimeRange] = useState<TimeRange>('12 Months');

    const chartData = useMemo(() => {
        // 1. Combine valid closed trades and stock positions
        const closedTrades = trades.filter(t => t.status !== 'OPEN' && t.closeDate);
        const closedStocks = stockPositions.filter(p => p.status === 'CLOSED' && p.closeDate);

        const allClosed = [
            ...closedTrades.map(t => ({ ...t, displayType: 'Option' })),
            ...closedStocks.map(s => ({ ...s, displayType: 'Stock' }))
        ];

        // 2. Filter by Time Range
        let filtered = allClosed;
        if (timeRange !== 'All Time') {
            const monthsMap: Record<string, number> = { '3 Months': 3, '6 Months': 6, '12 Months': 12 };
            const cutoffDate = subMonths(new Date(), monthsMap[timeRange]);
            filtered = allClosed.filter(item => {
                const dateStr = item.closeDate || item.openDate;
                return new Date(dateStr) >= cutoffDate;
            });
        }

        // 3. Sort by date
        filtered.sort((a, b) => {
            const dateA = a.closeDate || a.openDate;
            const dateB = b.closeDate || b.openDate;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
        });

        if (filtered.length === 0) return [];

        // 4. Group by Period (Weekly/Monthly)
        const groupedData = new Map<string, {
            date: string;
            dateObj: Date;
            csp: number;
            cc: number;
            stocks: number;
            total: number;
            cumulative?: number;
        }>();

        filtered.forEach(item => {
            const dateStr = item.closeDate || item.openDate;
            const actionDate = parseISO(dateStr);
            let key = '';
            let dateLabel = '';

            if (period === 'Weekly') {
                const start = startOfWeek(actionDate);
                key = start.toISOString();
                dateLabel = format(start, 'MMM d');
            } else {
                const start = startOfMonth(actionDate);
                key = start.toISOString();
                dateLabel = format(start, 'MMM yyyy');
            }

            if (!groupedData.has(key)) {
                groupedData.set(key, {
                    date: dateLabel,
                    dateObj: period === 'Weekly' ? startOfWeek(actionDate) : startOfMonth(actionDate),
                    csp: 0,
                    cc: 0,
                    stocks: 0,
                    total: 0
                });
            }

            // Calculate Realized P&L
            let pnl = 0;
            if ('displayType' in item && item.displayType === 'Stock') {
                const stock = item as any;
                pnl = ((stock.sellPrice || 0) - stock.buyPrice) * stock.quantity;
            } else {
                const trade = item as any;
                const premium = (trade.premiumPrice || 0) * trade.contracts * 100;
                const costToClose = (trade.closePrice || 0) * trade.contracts * 100;
                if (trade.strategy === 'Vert') {
                    pnl = premium + costToClose;
                } else {
                    pnl = trade.side === 'BUY' ? (costToClose - premium) : (premium - costToClose);
                }
            }

            const entry = groupedData.get(key)!;
            if ('displayType' in item && item.displayType === 'Stock') {
                entry.stocks += pnl;
            } else {
                const trade = item as any;
                if (trade.type === 'Put') {
                    entry.csp += pnl;
                } else {
                    entry.cc += pnl;
                }
            }
            entry.total += pnl;
        });

        // Convert map to array and sort by date
        const result = Array.from(groupedData.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        // 5. Calculate Cumulative if needed
        if (viewType === 'Cumulative') {
            let runningTotal = 0;
            return result.map(item => {
                runningTotal += item.total;
                return { ...item, cumulative: runningTotal };
            });
        }

        return result;
    }, [trades, stockPositions, period, viewType, timeRange]);

    const totalIncome = chartData.reduce((sum, item) => sum + (viewType === 'Bar' ? item.total : 0), 0);
    const displayTotal = viewType === 'Cumulative' && chartData.length > 0 ? chartData[chartData.length - 1].cumulative : totalIncome;

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-normal text-muted-foreground">Income Overview</CardTitle>
                    <div className={cn(
                        "text-2xl font-bold transition-colors duration-300",
                        (displayTotal || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                        {(displayTotal || 0) >= 0 ? '+' : '-'}${Math.abs(displayTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <Button
                            variant={viewType === 'Bar' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewType('Bar')}
                            className="h-7 text-xs"
                        >
                            Bars
                        </Button>
                        <Button
                            variant={viewType === 'Cumulative' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewType('Cumulative')}
                            className="h-7 text-xs"
                        >
                            Cumulative
                        </Button>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <Button
                            variant={timeRange === '3 Months' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeRange('3 Months')}
                            className="h-7 text-xs"
                        >
                            3M
                        </Button>
                        <Button
                            variant={timeRange === '6 Months' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeRange('6 Months')}
                            className="h-7 text-xs"
                        >
                            6M
                        </Button>
                        <Button
                            variant={timeRange === '12 Months' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeRange('12 Months')}
                            className="h-7 text-xs"
                        >
                            12M
                        </Button>
                        <Button
                            variant={timeRange === 'All Time' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeRange('All Time')}
                            className="h-7 text-xs"
                        >
                            All
                        </Button>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <Button
                            variant={period === 'Weekly' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setPeriod('Weekly')}
                            className="h-7 text-xs"
                        >
                            Weekly
                        </Button>
                        <Button
                            variant={period === 'Monthly' ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setPeriod('Monthly')}
                            className="h-7 text-xs"
                        >
                            Monthly
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        {viewType === 'Bar' ? (
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 4 }}
                                />
                                <Legend />
                                <Bar dataKey="csp" name="Short Puts" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="cc" name="Covered Calls" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="stocks" name="Stocks" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : (
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="cumulative"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCumulative)"
                                    name="Cumulative P&L"
                                />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
