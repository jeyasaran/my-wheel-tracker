import { useState, useMemo, useEffect } from 'react';
import { useTradeStore } from '../../hooks/useTradeStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { subMonths, format, parseISO, startOfDay, differenceInDays, startOfYear, getUnixTime } from 'date-fns';
import { Info, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import PositionPnLChart from './PositionPnLChart';
import LeadersByPremium from './LeadersByPremium';
import LeadersLaggards from './LeadersLaggards';

type TimeRange = '1m' | '3m' | '6m' | 'ytd' | '12m' | 'all';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
    '1m': '1M',
    '3m': '3M',
    '6m': '6M',
    'ytd': 'YTD',
    '12m': '12M',
    'all': 'All',
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-xl">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => {
                        const isUser = entry.dataKey === 'userReturns';
                        const color = isUser ? '#00bfff' : '#f97316';
                        const name = isUser ? 'Portfolio' : 'S&P 500';
                        return (
                            <div key={index} className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                                </div>
                                <span className="text-sm font-bold" style={{ color }}>
                                    {entry.value >= 0 ? '+' : ''}{(entry.value).toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

const CustomLabel = (props: any) => {
    const { x, y, value, index, maxIdx, minIdx, color } = props;
    if (index === maxIdx || index === minIdx) {
        const isMax = index === maxIdx;
        const dy = isMax ? -10 : 18;
        return (
            <text x={x} y={y} dy={dy} fill={color} fontSize={11} textAnchor="middle" fontWeight="bold">
                {value >= 0 ? '+' : ''}{Number(value).toFixed(2)}%
            </text>
        );
    }
    return null;
};

interface SpyDataPoint {
    date: string;
    returnPct: number;
}

export default function Metrics() {
    const { trades, stockPositions, cashBalance } = useTradeStore();
    const [timeRange, setTimeRange] = useState<TimeRange>('ytd');
    const [spyData, setSpyData] = useState<SpyDataPoint[]>([]);

    useEffect(() => {
        const now = new Date();
        let startDate: Date;
        if (timeRange === '1m') startDate = subMonths(now, 1);
        else if (timeRange === '3m') startDate = subMonths(now, 3);
        else if (timeRange === '6m') startDate = subMonths(now, 6);
        else if (timeRange === 'ytd') startDate = startOfYear(now);
        else if (timeRange === '12m') startDate = subMonths(now, 12);
        else startDate = new Date(2010, 0, 1);

        const period1 = getUnixTime(startDate);
        const period2 = getUnixTime(now);

        fetch(`./api/spy-history?period1=${period1}&period2=${period2}`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setSpyData(data); else setSpyData([]); })
            .catch(() => setSpyData([]));
    }, [timeRange]);

    const spyMap = useMemo(() => {
        const map = new Map<string, number>();
        spyData.forEach(d => map.set(d.date, d.returnPct));
        return map;
    }, [spyData]);

    const stats = useMemo(() => {
        // 1. Gather all closed items
        const closedTrades = trades.filter(t => t.status !== 'OPEN' && t.closeDate);
        const closedStocks = stockPositions.filter(p => p.status === 'CLOSED' && p.closeDate);

        const allClosed = [
            ...closedTrades.map(t => ({ ...t, displayType: 'Option' })),
            ...closedStocks.map(s => ({ ...s, displayType: 'Stock' }))
        ];

        // Combine P&L of all time to find initial balance for RoR
        let totalAllTimePnL = 0;
        allClosed.forEach(item => {
            if (item.displayType === 'Stock') {
                const stock = item as any;
                totalAllTimePnL += ((stock.sellPrice || 0) - stock.buyPrice) * stock.quantity;
            } else {
                const trade = item as any;
                const premium = (trade.premiumPrice || 0) * trade.contracts * 100;
                const costToClose = (trade.closePrice || 0) * trade.contracts * 100;
                if (trade.strategy === 'Vert') {
                    totalAllTimePnL += premium + costToClose;
                } else {
                    totalAllTimePnL += trade.side === 'BUY' ? (costToClose - premium) : (premium - costToClose);
                }
            }
        });

        const currentAccountValue = cashBalance + totalAllTimePnL;
        const initialAccountValue = Math.max(currentAccountValue - totalAllTimePnL, 1000);

        // 2. Filter by Time Range
        let cutoffDate: Date;
        const now = new Date();
        if (timeRange === '1m') cutoffDate = subMonths(now, 1);
        else if (timeRange === '3m') cutoffDate = subMonths(now, 3);
        else if (timeRange === '6m') cutoffDate = subMonths(now, 6);
        else if (timeRange === 'ytd') cutoffDate = startOfYear(now);
        else if (timeRange === '12m') cutoffDate = subMonths(now, 12);
        else cutoffDate = new Date(0); // 'all'

        const filtered = allClosed.filter(item => new Date(item.closeDate!) >= cutoffDate);
        filtered.sort((a, b) => new Date(a.closeDate!).getTime() - new Date(b.closeDate!).getTime());

        // 3. Group by Day
        const dailyData = new Map<string, { date: Date, pnl: number }>();
        filtered.forEach(item => {
            const date = startOfDay(parseISO(item.closeDate!));
            const key = date.toISOString();

            let pnl = 0;
            if (item.displayType === 'Stock') {
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

            if (!dailyData.has(key)) {
                dailyData.set(key, { date, pnl: 0 });
            }
            dailyData.get(key)!.pnl += pnl;
        });

        const sortedDays = Array.from(dailyData.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

        // 4. Generate Chart Data (user line starts at 0%)
        let cumulativePnl = 0;

        const chartSeries = sortedDays.map((day, idx) => {
            cumulativePnl += day.pnl;
            const userReturnPct = idx === 0 ? 0 : (cumulativePnl / initialAccountValue) * 100;
            const dateStr = format(day.date, 'yyyy/MM/dd');
            // Use real SPY data from map; fall back to 0 if not available
            const spyReturn = spyMap.get(dateStr) ?? 0;

            return {
                date: dateStr,
                dateObj: day.date,
                dailyPnl: day.pnl,
                cumulativePnl,
                userReturns: Number(userReturnPct.toFixed(2)),
                spyReturns: spyReturn,
            };
        });

        if (chartSeries.length === 0) {
            chartSeries.push({
                date: format(now, 'yyyy/MM/dd'),
                dateObj: now,
                dailyPnl: 0,
                cumulativePnl: 0,
                userReturns: 0,
                spyReturns: 0
            });
        }

        // 5. Calculate KPIs
        const finalPnl = chartSeries[chartSeries.length - 1].cumulativePnl;
        const totalReturnPct = chartSeries[chartSeries.length - 1].userReturns;
        const spyReturnPct = chartSeries[chartSeries.length - 1].spyReturns;

        const firstDate = chartSeries[0].dateObj;
        const lastDate = chartSeries[chartSeries.length - 1].dateObj;
        const daysActive = Math.max(differenceInDays(lastDate, firstDate), 1);
        const annualizedRoR = (totalReturnPct / daysActive) * 365;

        let maxDrawdown = 0;
        let peakReturn = 0;
        let sumDailyReturns = 0;
        const dailyReturns: number[] = [];

        chartSeries.forEach(d => {
            if (d.userReturns > peakReturn) peakReturn = d.userReturns;
            const drawdown = d.userReturns - peakReturn;
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;

            const dailyRetPct = (d.dailyPnl / initialAccountValue) * 100;
            dailyReturns.push(dailyRetPct);
            sumDailyReturns += dailyRetPct;
        });

        const avgDailyReturn = sumDailyReturns / Math.max(dailyReturns.length, 1);
        const variance = dailyReturns.reduce((acc, val) => acc + Math.pow(val - avgDailyReturn, 2), 0) / Math.max(dailyReturns.length, 1);
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev === 0 ? 0 : (avgDailyReturn / stdDev) * Math.sqrt(252);

        // Calculate label indices for the chart
        const userMaxIdx = chartSeries.length > 0
            ? chartSeries.reduce((iMax, x, i, arr) => x.userReturns > arr[iMax].userReturns ? i : iMax, 0)
            : -1;
        const userMinIdx = chartSeries.length > 0
            ? chartSeries.reduce((iMin, x, i, arr) => x.userReturns < arr[iMin].userReturns ? i : iMin, 0)
            : -1;
        const spyMaxIdx = chartSeries.length > 0
            ? chartSeries.reduce((iMax, x, i, arr) => x.spyReturns > arr[iMax].spyReturns ? i : iMax, 0)
            : -1;
        const spyMinIdx = chartSeries.length > 0
            ? chartSeries.reduce((iMin, x, i, arr) => x.spyReturns < arr[iMin].spyReturns ? i : iMin, 0)
            : -1;

        return {
            chartData: chartSeries,
            finalPnl,
            totalReturnPct,
            spyReturnPct,
            annualizedRoR,
            maxDrawdown,
            sharpeRatio: Math.max(sharpeRatio, 0),
            userMaxIdx,
            userMinIdx,
            spyMaxIdx,
            spyMinIdx,
        };
    }, [trades, stockPositions, cashBalance, timeRange, spyMap]);

    const startDate = stats.chartData.length > 0 ? stats.chartData[0].date : '';
    const endDate = stats.chartData.length > 0 ? stats.chartData[stats.chartData.length - 1].date : '';

    return (
        <>
            <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-[#111318] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
                {/* === TOP METRICS === */}
                <div className="px-6 pt-6 pb-5">
                    {/* Row 1: P&L label + RoR label */}
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[13px] text-gray-500 dark:text-gray-400">Est. Total P&L</span>
                        <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                            <div className="w-3 h-0.5 bg-[#00bfff]"></div>
                            <span>RoR(TWR)</span>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            <Info className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                    </div>

                    {/* Row 2: P&L value + RoR value */}
                    <div className="flex justify-between items-end mb-5">
                        <div className={cn("text-4xl font-bold tracking-tight", stats.finalPnl >= 0 ? "text-[#10b981]" : "text-red-500")}>
                            {stats.finalPnl >= 0 ? '' : '-'}{Math.abs(stats.finalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={cn("text-4xl font-bold tracking-tight", stats.totalReturnPct >= 0 ? "text-[#10b981]" : "text-red-500")}>
                            {stats.totalReturnPct >= 0 ? '+' : ''}{stats.totalReturnPct.toFixed(2)}%
                        </div>
                    </div>

                    {/* Row 3: Secondary metrics labels */}
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-0.5 bg-[#f97316] flex-shrink-0"></div>
                            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md px-2 py-0.5">
                                <select className="bg-transparent text-[12px] text-gray-600 dark:text-gray-300 outline-none appearance-none cursor-pointer pr-3">
                                    <option>S&P 500</option>
                                </select>
                                <ChevronDown className="w-3 h-3 -ml-2 pointer-events-none text-gray-400 flex-shrink-0" />
                            </div>
                        </div>
                        <div className="text-[12px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            Ann. RoR est
                            <Info className="w-3 h-3 text-gray-400" />
                        </div>
                        <div className="text-[12px] text-gray-500 dark:text-gray-400">Max. drawdown</div>
                        <div className="text-[12px] text-gray-500 dark:text-gray-400">Sharpe Ratio</div>
                    </div>

                    {/* Row 4: Secondary metrics values */}
                    <div className="flex justify-between items-start">
                        <div className={cn("text-[15px] font-semibold", stats.spyReturnPct >= 0 ? "text-[#10b981]" : "text-red-500")}>
                            {stats.spyReturnPct >= 0 ? '+' : ''}{stats.spyReturnPct.toFixed(2)}%
                        </div>
                        <div className={cn("text-[15px] font-semibold", stats.annualizedRoR >= 0 ? "text-[#10b981]" : "text-red-500")}>
                            {stats.annualizedRoR >= 0 ? '+' : ''}{stats.annualizedRoR.toFixed(2)}%
                        </div>
                        <div className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">
                            {stats.maxDrawdown >= 0 ? '' : '-'}{Math.abs(stats.maxDrawdown).toFixed(2)}%
                        </div>
                        <div className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">
                            {stats.sharpeRatio.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* === DIVIDER === */}
                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* === CHART === */}
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.chartData} margin={{ top: 40, right: 30, left: 30, bottom: 10 }}>
                            <defs>
                                <linearGradient id="colorUserFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00bfff" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#00bfff" stopOpacity={0.03} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="0" />
                            <XAxis dataKey="date" hide={true} />
                            <YAxis hide={true} domain={['auto', 'auto']} />
                            <RechartsTooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="linear"
                                dataKey="spyReturns"
                                stroke="#f97316"
                                strokeWidth={1.5}
                                fill="none"
                                isAnimationActive={false}
                                label={{
                                    content: <CustomLabel
                                        maxIdx={stats.spyMaxIdx}
                                        minIdx={stats.spyMinIdx}
                                        color="#f97316"
                                    />
                                }}
                            />
                            <Area
                                type="linear"
                                dataKey="userReturns"
                                stroke="#00bfff"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorUserFill)"
                                isAnimationActive={false}
                                label={{
                                    content: <CustomLabel
                                        maxIdx={stats.userMaxIdx}
                                        minIdx={stats.userMinIdx}
                                        color="#00bfff"
                                    />
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* === DIVIDER === */}
                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* === FOOTER: dates === */}
                <div className="flex justify-between items-center px-6 py-3 text-[12px] text-gray-400 dark:text-gray-500">
                    <span>{startDate}</span>
                    <span>{endDate}</span>
                </div>

                {/* === TIME RANGE BUTTONS === */}
                <div className="flex justify-center items-center gap-1 px-6 pb-5">
                    {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={cn(
                                "px-4 py-1.5 text-xs rounded-full font-medium transition-all",
                                timeRange === r
                                    ? "bg-blue-600 text-white shadow"
                                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            {TIME_RANGE_LABELS[r]}
                        </button>
                    ))}
                </div>
            </div>

            {/* === POSITION P&L CHART === */}
            <div className="mt-6">
                <PositionPnLChart />
            </div>

            {/* === LEADERS AND LAGGARDS === */}
            <div className="mt-6 flex flex-col gap-6">
                <LeadersByPremium />
                <LeadersLaggards />
            </div>
        </>
    );
}
