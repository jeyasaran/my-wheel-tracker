import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTradeStore } from '../../hooks/useTradeStore';
import { startOfMonth, subMonths } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-xl animate-in zoom-in-95 duration-200">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-tight">{label}</p>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Options Sold</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {payload[0].value}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function BrokerTradesCountChart() {
    const { trades, brokers } = useTradeStore();

    const chartData = useMemo(() => {
        // We want to look back exactly 3 calendar months (including the current month)
        const cutoffDate = startOfMonth(subMonths(new Date(), 2));

        // Filter for Options (Put/Call) sold in the past 3 months
        const soldOptions = trades.filter(t => 
            (t.type === 'Call' || t.type === 'Put') && 
            t.side === 'SELL' && 
            new Date(t.openDate) >= cutoffDate
        );

        // Group by broker
        const brokerCounts = new Map<string, number>();

        soldOptions.forEach(t => {
            const brokerId = t.brokerId || '__unassigned__';
            const brokerName = brokers.find(b => b.id === brokerId)?.name || 'Unassigned';
            
            brokerCounts.set(brokerName, (brokerCounts.get(brokerName) || 0) + 1);
        });

        // Convert to array for Recharts and sort by count descending
        const data = Array.from(brokerCounts.entries()).map(([name, count]) => ({
            name,
            count
        })).sort((a, b) => b.count - a.count);

        return data;
    }, [trades, brokers]);

    if (chartData.length === 0) {
        return null; // Don't show the chart if there's no data
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground flex items-center justify-between">
                    Options Sold by Broker (Past 3 Months)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                allowDecimals={false}
                            />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.5 }} />
                            <Bar 
                                dataKey="count" 
                                radius={[4, 4, 0, 0]}
                                maxBarSize={60}
                            >
                                {chartData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={BROKER_PALETTE[index % BROKER_PALETTE.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
