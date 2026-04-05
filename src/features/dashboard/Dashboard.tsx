import { useState } from 'react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import AccountOverview from './AccountOverview';
import LastMonthEarnings from './LastMonthEarnings';
import EfficiencyStats from './EfficiencyStats';
import PerformanceAnalytics from './PerformanceAnalytics';
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
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            {/* Top Row: Account Overview */}
            <div className="grid gap-6">
                <AccountOverview
                    totalPnL={stats.accountOverview.totalPnL}
                    accountValue={stats.accountOverview.accountValue}
                    availableCash={stats.accountOverview.availableCash}
                    ccCollateral={stats.accountOverview.ccCollateral}
                    cspCollateral={stats.accountOverview.cspCollateral}
                />
            </div>

            {/* Performance Analytics */}
            <div className="grid gap-6">
                <PerformanceAnalytics performance={stats.performance} />
            </div>

            {/* Weekly Metrics */}
            <div className="grid gap-6">
                <WeeklyMetrics
                    data={stats.weekly}
                    onPrevClick={() => setWeekOffset(prev => prev + 1)}
                    onNextClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                    disableNext={weekOffset === 0}
                />
            </div>

            {/* Middle Row: Last Month & Efficiency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LastMonthEarnings
                    pnl={stats.lastMonth.pnl}
                    count={stats.lastMonth.count}
                    trades={stats.lastMonth.trades}
                    monthOffset={monthOffset}
                    setMonthOffset={setMonthOffset}
                />
                <EfficiencyStats csp={stats.efficiency.csp} cc={stats.efficiency.cc} />
            </div>

            <div className="grid gap-6">
                <IncomeChart />
                <BrokerIncomeChart />
            </div>
        </div>
    );
}
