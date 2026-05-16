import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import type { MonthlyReportData } from '../../hooks/useMonthlyReport';
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

interface Props {
    data: MonthlyReportData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'];

export function ReportStrategyBreakdown({ data }: Props) {
    const strategyData = [
        { name: 'Cash Secured Puts', value: data.premiumByStrategy.CSP },
        { name: 'Covered Calls', value: data.premiumByStrategy.CC },
        { name: 'Verticals', value: data.premiumByStrategy.Vert },
        { name: 'Other', value: data.premiumByStrategy.Other }
    ].filter(item => item.value > 0);

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-blue-500" />
                    Strategy Breakdown & Top Performers
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Strategy Pie Chart */}
                    <div className="h-[250px]">
                        {strategyData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                     <Pie
                                         data={strategyData}
                                         cx="50%"
                                         cy="50%"
                                         innerRadius={60}
                                         outerRadius={80}
                                         paddingAngle={5}
                                         dataKey="value"
                                     >
                                         {strategyData.map((_, index) => (
                                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                         ))}
                                     </Pie>
                                     <Tooltip 
                                         formatter={(value: any) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                                         contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                     />
                                     <Legend verticalAlign="bottom" height={36}/>
                                 </PieChart>
                             </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                                No trades closed this month to chart.
                            </div>
                        )}
                    </div>

                    {/* Top Tickers List */}
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Top Generating Tickers
                        </h4>
                        {data.topTickers.length > 0 ? (
                            <div className="space-y-3">
                                {data.topTickers.map((ticker, i) => (
                                    <div key={ticker.symbol} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 font-medium">
                                                {ticker.symbol}
                                            </span>
                                            {i === 0 && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Top Earner</span>}
                                        </div>
                                        <span className="font-medium text-green-600 dark:text-green-400">
                                            ${ticker.premium.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-400 text-sm italic py-2">
                                No closed trades.
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
