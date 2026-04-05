import { useState } from 'react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import AccountOverview from './AccountOverview';
import LastMonthEarnings from './LastMonthEarnings';
import EfficiencyStats from './EfficiencyStats';
import PerformanceAnalytics from './PerformanceAnalytics';
import TickerConcentration from './TickerConcentration';
import CapitalUtilization from './CapitalUtilization';
import StrategyEfficiency from './StrategyEfficiency';
import IncomeChart from './IncomeChart';
import BrokerIncomeChart from './BrokerIncomeChart';
import WeeklyMetrics from './WeeklyMetrics';

export default function Dashboard() {
    const [weekOffset, setWeekOffset] = useState(0);
    const [monthOffset, setMonthOffset] = useState(1);
    const stats = useDashboardStats(weekOffset, monthOffset);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h2>
            </div>

            {/* Top Row: Account Overview */}
            <AccountOverview
                totalPnL={stats.accountOverview.totalPnL}
                accountValue={stats.accountOverview.accountValue}
                availableCash={stats.accountOverview.availableCash}
                ccCollateral={stats.accountOverview.ccCollateral}
                cspCollateral={stats.accountOverview.cspCollateral}
            />

            {/* Performance Analytics & Capital Utilization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PerformanceAnalytics performance={stats.performance} />
                </div>
                <div className="lg:col-span-1">
                    <CapitalUtilization utilization={stats.utilizationPercent} />
                </div>
            </div>

            {/* Risk & Strategy Efficiency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TickerConcentration
                    data={stats.tickerConcentration}
                    totalAccountValue={stats.accountOverview.accountValue}
                />
                <StrategyEfficiency data={stats.strategyPerformance} />
            </div>

            {/* Weekly Metrics */}
            <WeeklyMetrics
                data={stats.weekly}
                onPrevClick={() => setWeekOffset(prev => prev + 1)}
                onNextClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                disableNext={weekOffset === 0}
            />

            {/* Historical Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LastMonthEarnings
                    pnl={stats.lastMonth.pnl}
                    count={stats.lastMonth.count}
                    trades={stats.lastMonth.trades}
                    monthOffset={monthOffset}
                    setMonthOffset={setMonthOffset}
                />
                <EfficiencyStats csp={stats.efficiency.csp} cc={stats.efficiency.cc} />
            </div>

            {/* Charts */}
            <div className="space-y-6">
                <IncomeChart />
                <BrokerIncomeChart />
            </div>
        </div>
    );
}
