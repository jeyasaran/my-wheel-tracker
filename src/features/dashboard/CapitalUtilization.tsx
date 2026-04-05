import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { InfoTooltip } from '../../components/ui/Tooltip';

interface CapitalUtilizationProps {
    utilization: number; // 0 to 100
}

export default function CapitalUtilization({ utilization }: CapitalUtilizationProps) {
    const data = [
        { value: utilization },
        { value: Math.max(0, 100 - utilization) }
    ];

    const getStatusColor = (val: number) => {
        if (val < 50) return '#10B981'; // emerald-500
        if (val < 80) return '#F59E0B'; // amber-500
        return '#EF4444'; // red-500
    };

    const getStatusText = (val: number) => {
        if (val < 50) return 'Conservative';
        if (val < 80) return 'Balanced';
        return 'Aggressive';
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    Capital Utilization
                    <InfoTooltip content="Calculated as (Total Allocated Capital / Net Liquidity). Allocated capital includes the cash required for CSP collateral and the adjusted cost basis of all open stock positions." />
                </h3>
            </div>

            <div className="relative flex-1 flex flex-col items-center justify-center min-h-[180px]">
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="80%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={getStatusColor(utilization)} />
                            <Cell fill="#f3f4f6" className="dark:fill-gray-800" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-3xl font-black tracking-tight">{Math.round(utilization)}%</span>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${utilization >= 80 ? 'text-red-500' : 'text-gray-400'}`}>
                        {getStatusText(utilization)}
                    </p>
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-800/50">
                <div className="flex justify-between text-xs text-gray-400 font-medium">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: '50%' }} />
                    <div className="h-full bg-amber-500" style={{ width: '30%' }} />
                    <div className="h-full bg-red-500" style={{ width: '20%' }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Recommended utilization: 50% - 80%
                </p>
            </div>
        </div>
    );
}
