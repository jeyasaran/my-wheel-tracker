import { useState, useEffect, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getUnixTime, parseISO, subMonths } from 'date-fns';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { cn } from '../../lib/utils';

// Distinct color palette for position lines
const LINE_COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#14B8A6', // teal
    '#6366F1', // indigo
];

interface PricePoint {
    date: string;
    close: number;
}

interface TickerGroup {
    symbol: string;
    avgBuyPrice: number;
    totalQuantity: number;
    earliestOpenDate: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-xl">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-tight">{label}</p>
                <div className="space-y-1.5">
                    {payload
                        .filter((entry: any) => entry.value != null)
                        .sort((a: any, b: any) => b.value - a.value)
                        .map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{entry.name}</span>
                                </div>
                                <span className={cn(
                                    "text-sm font-bold",
                                    entry.value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(2)}%
                                </span>
                            </div>
                        ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function PositionPnLChart() {
    const { stockPositions, trades } = useTradeStore();
    const [priceData, setPriceData] = useState<Record<string, PricePoint[]>>({});
    const [loading, setLoading] = useState(false);

    // Replicate the "Long" filter from PositionsList:
    // Long positions = open positions with NO linked covered calls
    const getLinkedCCs = (pos: { id: string; symbol: string; openDate: string; quantity: number; brokerId?: string }) => {
        const expectedContracts = Math.floor(pos.quantity / 100);
        return trades.filter(t => {
            if (t.type !== 'Call') return false;
            if (pos.brokerId && t.brokerId !== pos.brokerId) return false;
            if (t.contracts !== expectedContracts) return false;
            if (t.positionId) return t.positionId === pos.id;
            return t.symbol === pos.symbol && new Date(t.openDate) >= new Date(pos.openDate);
        });
    };

    // Group LONG-ONLY positions by ticker with weighted-average cost basis
    const tickerGroups = useMemo<TickerGroup[]>(() => {
        const openPositions = stockPositions.filter(p => p.status !== 'CLOSED');
        const longPositions = openPositions.filter(pos => getLinkedCCs(pos).length === 0);
        const groups = new Map<string, { totalCost: number; totalQty: number; earliestDate: string }>();

        longPositions.forEach(pos => {
            const existing = groups.get(pos.symbol);
            if (existing) {
                existing.totalCost += pos.buyPrice * pos.quantity;
                existing.totalQty += pos.quantity;
                if (pos.openDate < existing.earliestDate) {
                    existing.earliestDate = pos.openDate;
                }
            } else {
                groups.set(pos.symbol, {
                    totalCost: pos.buyPrice * pos.quantity,
                    totalQty: pos.quantity,
                    earliestDate: pos.openDate,
                });
            }
        });

        return Array.from(groups.entries()).map(([symbol, data]) => ({
            symbol,
            avgBuyPrice: data.totalCost / data.totalQty,
            totalQuantity: data.totalQty,
            earliestOpenDate: data.earliestDate,
        }));
    }, [stockPositions, trades]);

    // Fetch historical prices for all tickers
    useEffect(() => {
        if (tickerGroups.length === 0) return;

        const fetchAll = async () => {
            setLoading(true);
            const now = new Date();
            const period2 = getUnixTime(now);
            const newPriceData: Record<string, PricePoint[]> = {};

            await Promise.all(
                tickerGroups.map(async (group) => {
                    try {
                        // Fetch from earliest open date, but at most 12 months
                        const openDate = parseISO(group.earliestOpenDate);
                        const twelveMonthsAgo = subMonths(now, 12);
                        const startDate = openDate > twelveMonthsAgo ? openDate : twelveMonthsAgo;
                        const period1 = getUnixTime(startDate);

                        const response = await fetch(
                            `./api/stock-history?symbol=${encodeURIComponent(group.symbol)}&period1=${period1}&period2=${period2}`
                        );
                        if (response.ok) {
                            const data = await response.json();
                            if (Array.isArray(data)) {
                                newPriceData[group.symbol] = data;
                            }
                        }
                    } catch (err) {
                        console.error(`Failed to fetch history for ${group.symbol}`, err);
                    }
                })
            );

            setPriceData(newPriceData);
            setLoading(false);
        };

        fetchAll();
    }, [tickerGroups]);

    // Build chart data: merge all tickers into a unified date axis
    const chartData = useMemo(() => {
        if (tickerGroups.length === 0) return [];

        // Collect all unique dates
        const dateSet = new Set<string>();
        Object.values(priceData).forEach(prices => {
            prices.forEach(p => dateSet.add(p.date));
        });

        const allDates = Array.from(dateSet).sort();
        if (allDates.length === 0) return [];

        // Build price lookup maps
        const priceMaps = new Map<string, Map<string, number>>();
        Object.entries(priceData).forEach(([symbol, prices]) => {
            const map = new Map<string, number>();
            prices.forEach(p => map.set(p.date, p.close));
            priceMaps.set(symbol, map);
        });

        // Generate chart rows
        return allDates.map(date => {
            const row: Record<string, any> = { date };
            tickerGroups.forEach(group => {
                const priceMap = priceMaps.get(group.symbol);
                const close = priceMap?.get(date);
                if (close != null) {
                    row[group.symbol] = Number((((close - group.avgBuyPrice) / group.avgBuyPrice) * 100).toFixed(2));
                }
            });
            return row;
        });
    }, [tickerGroups, priceData]);

    // Compute current P&L % for each ticker (latest data point)
    const currentPnL = useMemo(() => {
        const result: Record<string, number> = {};
        tickerGroups.forEach(group => {
            const prices = priceData[group.symbol];
            if (prices && prices.length > 0) {
                const lastClose = prices[prices.length - 1].close;
                result[group.symbol] = Number((((lastClose - group.avgBuyPrice) / group.avgBuyPrice) * 100).toFixed(2));
            }
        });
        return result;
    }, [tickerGroups, priceData]);

    if (tickerGroups.length === 0) {
        return null; // No open positions, don't render
    }

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-normal text-muted-foreground">Position P&L Analysis</CardTitle>
                    <div className="flex flex-wrap gap-3 mt-1">
                        {tickerGroups.map((group, idx) => {
                            const pnl = currentPnL[group.symbol];
                            return (
                                <div key={group.symbol} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }} />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.symbol}</span>
                                    {pnl != null && (
                                        <span className={cn(
                                            "text-sm font-bold",
                                            pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                        )}>
                                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="flex items-center gap-3 text-gray-400">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading price history...</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tickFormatter={(val) => {
                                        const parts = val.split('-');
                                        return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
                                    }}
                                    interval="preserveStartEnd"
                                    minTickGap={50}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}%`}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>}
                                />
                                {/* Zero reference line */}
                                <CartesianGrid strokeDasharray="0" horizontal={false} vertical={false} />
                                {tickerGroups.map((group, idx) => (
                                    <Line
                                        key={group.symbol}
                                        type="monotone"
                                        dataKey={group.symbol}
                                        name={group.symbol}
                                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                                        strokeWidth={2}
                                        dot={false}
                                        connectNulls
                                        isAnimationActive={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
