import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';

interface StrategyStat {
    name: string;
    pnl: number;
    winRate: number;
    count: number;
}

interface StrategyEfficiencyProps {
    data: StrategyStat[];
}

export default function StrategyEfficiency({ data }: StrategyEfficiencyProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
            signDisplay: 'always',
        }).format(val);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                Strategy Efficiency
            </h3>

            <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={50}
                            style={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-xl">
                                            <p className="font-bold text-sm mb-1">{item.name}</p>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-gray-500">Total P/L: <span className={`font-medium ${item.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(item.pnl)}</span></p>
                                                <p className="text-xs text-gray-500">Win Rate: <span className="font-medium text-gray-900 dark:text-gray-100">{item.winRate.toFixed(1)}%</span></p>
                                                <p className="text-xs text-gray-500">Trades: <span className="font-medium text-gray-900 dark:text-gray-100">{item.count}</span></p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={24}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6">
                {data.map((s, i) => (
                    <div key={i} className="flex flex-col p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/20">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">{s.name} WR</span>
                        <div className="flex items-center gap-1">
                            <TrendingUp className={`w-3 h-3 ${s.winRate >= 50 ? 'text-green-500' : 'text-amber-500'}`} />
                            <span className="text-sm font-black">{Math.round(s.winRate)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
