import { TrendingUp, Target, Clock, Calendar } from 'lucide-react';
import { InfoTooltip } from '../../components/ui/Tooltip';

interface PerformanceAnalyticsProps {
    performance: {
        winRate: number;
        profitFactor: number;
        projectedIncome: number;
        avgDuration: number;
        totalClosed: number;
    }
}

export default function PerformanceAnalytics({ performance }: PerformanceAnalyticsProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const metrics = [
        {
            label: 'Win Rate',
            value: `${performance.winRate.toFixed(1)}%`,
            subValue: `${performance.totalClosed} Total Trades`,
            icon: Target,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            label: 'Profit Factor',
            value: performance.profitFactor >= 99.9 ? '∞' : performance.profitFactor.toFixed(2),
            subValue: 'Gross Profit / Gross Loss',
            icon: TrendingUp,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20'
        },
        {
            label: 'Projected Income (30D)',
            value: formatCurrency(performance.projectedIncome),
            subValue: 'Estimated Option Premium',
            icon: Calendar,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20'
        },
        {
            label: 'Avg Trade Duration',
            value: `${Math.round(performance.avgDuration)} Days`,
            subValue: 'Time from Open to Close',
            icon: Clock,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20'
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Performance Analytics
                <InfoTooltip content="A high-level summary of your trading performance over the selected period. Win rate is the percentage of profitable trades. Profit factor is the ratio of gross profit to gross loss." />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="flex flex-col">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${m.bgColor}`}>
                                <m.icon className={`w-5 h-5 ${m.color}`} />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{m.label}</span>
                        </div>
                        <div className="flex flex-col pl-11">
                            <span className="text-2xl font-bold tracking-tight">{m.value}</span>
                            <span className="text-xs text-gray-400 mt-1">{m.subValue}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
