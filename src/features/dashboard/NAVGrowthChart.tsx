import { useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parse, subMonths, isAfter, startOfMonth } from 'date-fns';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

type TimeRange = '3 Months' | '6 Months' | '12 Months' | 'YTD' | 'All Time';

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
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                ${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const BROKER_PALETTE = [
    '#3B82F6', // Blue
    '#F97316', // Orange
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#10B981', // Emerald
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#6366F1', // Indigo
];

export default function NAVGrowthChart() {
    const { brokers, navEntries } = useTradeStore();
    const [timeRange, setTimeRange] = useState<TimeRange>('All Time');

    const chartData = useMemo(() => {
        if (!navEntries || navEntries.length === 0) return [];

        // 1. Sort and process entries exactly like in NAVTracker
        const sorted = [...navEntries].sort((a, b) => a.monthYear.localeCompare(b.monthYear));
        const activeBrokerIds = [...new Set(sorted.map(e => e.brokerId))];

        const monthMap = new Map<string, { monthYear: string; label: string; dateObj: Date; brokerNavs: Record<string, number>; cashIn: number; cashOut: number; netCash: number; adjStart: number }>();
        
        sorted.forEach(e => {
            if (!monthMap.has(e.monthYear)) {
                monthMap.set(e.monthYear, {
                    monthYear: e.monthYear,
                    label: format(parse(e.monthYear, 'yyyy-MM', new Date()), 'MMM-yy'),
                    dateObj: parse(e.monthYear, 'yyyy-MM', new Date()),
                    brokerNavs: {},
                    cashIn: 0,
                    cashOut: 0,
                    netCash: 0,
                    adjStart: 0
                });
            }
            const row = monthMap.get(e.monthYear)!;
            row.brokerNavs[e.brokerId] = e.navValue;
            row.cashIn += e.cashIn;
            row.cashOut += e.cashOut;
        });

        const sortedMonthData = Array.from(monthMap.values()).sort((a, b) => a.monthYear.localeCompare(b.monthYear));
        
        const computed: any[] = [];
        let cumulativeTargetGrowth: number | null = null;

        sortedMonthData.forEach((row, i) => {
            const sumBrokers = activeBrokerIds.reduce((s, bid) => s + (row.brokerNavs[bid] ?? 0), 0);
            const netCash = row.cashIn - row.cashOut;
            const adjStart = sumBrokers + netCash;
            const prev = i > 0 ? computed[i - 1] : null;

            if (i === 0) {
                cumulativeTargetGrowth = null;
            } else if (i === 1) {
                cumulativeTargetGrowth = prev.adjStart * 1.02;
            } else {
                cumulativeTargetGrowth = ((prev.targetGrowth || 0) + prev.netCash) * 1.02;
            }

            const dataPoint: any = {
                date: row.label,
                dateObj: row.dateObj,
                netCash,
                adjStart,
                targetGrowth: i === 0 ? null : cumulativeTargetGrowth
            };

            // Add each broker's value as a data point
            activeBrokerIds.forEach(bid => {
                const bName = brokers.find(b => b.id === bid)?.name || 'Unknown';
                dataPoint[bName] = row.brokerNavs[bid] || 0;
            });

            computed.push(dataPoint);
        });

        // 2. Filter by Time Range
        let filtered = computed;
        const now = new Date();
        if (timeRange === '3 Months') {
            const cutoff = subMonths(now, 3);
            filtered = computed.filter(d => isAfter(d.dateObj, cutoff));
        } else if (timeRange === '6 Months') {
            const cutoff = subMonths(now, 6);
            filtered = computed.filter(d => isAfter(d.dateObj, cutoff));
        } else if (timeRange === '12 Months') {
            const cutoff = subMonths(now, 12);
            filtered = computed.filter(d => isAfter(d.dateObj, cutoff));
        } else if (timeRange === 'YTD') {
            const cutoff = startOfMonth(new Date(now.getFullYear(), 0, 1));
            filtered = computed.filter(d => !isAfter(cutoff, d.dateObj));
        }

        return filtered;
    }, [navEntries, brokers, timeRange]);

    const activeBrokersList = useMemo(() => {
        const brokerSet = new Set<string>();
        chartData.forEach(entry => {
            Object.keys(entry).forEach(key => {
                if (!['date', 'dateObj', 'netCash', 'adjStart', 'targetGrowth'].includes(key)) {
                    brokerSet.add(key);
                }
            });
        });
        return Array.from(brokerSet).sort();
    }, [chartData]);

    if (!navEntries || navEntries.length === 0) return null;

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-normal text-muted-foreground">NAV Tracker Growth</CardTitle>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {(['3 Months', '6 Months', '12 Months', 'YTD', 'All Time'] as TimeRange[]).map((range) => (
                        <Button
                            key={range}
                            variant={timeRange === range ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setTimeRange(range)}
                            className="h-7 text-xs px-3"
                        >
                            {range === 'All Time' ? 'All' : range.replace(' Months', 'M')}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
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
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {activeBrokersList.map((brokerName, index) => (
                                <Line
                                    key={brokerName}
                                    type="monotone"
                                    dataKey={brokerName}
                                    stroke={BROKER_PALETTE[index % BROKER_PALETTE.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    connectNulls
                                />
                            ))}
                            <Line
                                type="monotone"
                                dataKey="targetGrowth"
                                name="Target (24% Annual)"
                                stroke="#F59E0B"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
