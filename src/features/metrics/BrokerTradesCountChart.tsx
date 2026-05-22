import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTradeStore } from '../../hooks/useTradeStore';
import { startOfMonth, subMonths, format } from 'date-fns';
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

const getBrokerColor = (brokerName: string, sortedBrokers: string[]) => {
    if (brokerName === 'Unassigned') return '#9CA3AF';
    const idx = sortedBrokers.indexOf(brokerName);
    return BROKER_PALETTE[idx % BROKER_PALETTE.length];
};

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
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function BrokerTradesCountChart() {
    const { trades, brokers } = useTradeStore();

    const { chartData, activeBrokers } = useMemo(() => {
        // Look back exactly 3 calendar months
        const cutoffDate = startOfMonth(subMonths(new Date(), 2));

        // Filter for Options (Put/Call) sold in the past 3 months
        const soldOptions = trades.filter(t => 
            (t.type === 'Call' || t.type === 'Put') && 
            t.side === 'SELL' && 
            new Date(t.openDate) >= cutoffDate
        );

        // Group by Month, then by Broker
        const monthlyData = new Map<string, any>();
        const brokerSet = new Set<string>();

        // Initialize months map with 0 counts to ensure empty months still show
        for (let i = 2; i >= 0; i--) {
            const date = startOfMonth(subMonths(new Date(), i));
            const key = date.toISOString();
            monthlyData.set(key, { 
                month: format(date, 'MMM yyyy'),
                dateObj: date,
            });
        }

        soldOptions.forEach(t => {
            const date = startOfMonth(new Date(t.openDate));
            const key = date.toISOString();
            
            const brokerId = t.brokerId || '__unassigned__';
            const brokerName = brokers.find(b => b.id === brokerId)?.name || 'Unassigned';
            
            brokerSet.add(brokerName);

            if (monthlyData.has(key)) {
                const entry = monthlyData.get(key);
                entry[brokerName] = (entry[brokerName] || 0) + 1;
            }
        });

        // Convert map to array and sort by date
        const data = Array.from(monthlyData.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        const sortedBrokers = Array.from(brokerSet).sort();

        return { chartData: data, activeBrokers: sortedBrokers };
    }, [trades, brokers]);

    if (activeBrokers.length === 0) {
        return null;
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground flex items-center justify-between">
                    Options Sold by Broker (Past 3 Months)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                            <XAxis 
                                dataKey="month" 
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
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                            {activeBrokers.map(brokerName => (
                                <Bar 
                                    key={brokerName}
                                    dataKey={brokerName} 
                                    name={brokerName}
                                    fill={getBrokerColor(brokerName, activeBrokers)}
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={40}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
