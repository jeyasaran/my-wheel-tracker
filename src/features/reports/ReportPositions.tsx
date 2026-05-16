import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import type { MonthlyReportData } from '../../hooks/useMonthlyReport';
import { Briefcase, Activity } from 'lucide-react';

interface Props {
    data: MonthlyReportData;
}

export function ReportPositions({ data }: Props) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-500" />
                    Capital Efficiency & Positions (Month-End)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    
                    {/* Capital Utilization Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Activity className="w-3 h-3 text-blue-500"/>
                                Capital Utilized
                            </p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {data.capitalUtilization.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Avg. efficiency ratio
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Briefcase className="w-3 h-3 text-purple-500"/>
                                Capital Deployed
                            </p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                ${data.capitalDeployed.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Total risk assumed
                            </p>
                        </div>
                    </div>

                    {/* Stock Value Breakdown */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Stock Holdings</h4>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total Stock Value</span>
                                <span className="font-medium text-gray-900 dark:text-white">${data.endingStockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total Options Collateral</span>
                                <span className="font-medium text-gray-900 dark:text-white">${(data.capitalDeployed - data.endingStockValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* PnL Indicator - Simplified for now as full historical quotes aren't available */}
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total Account Value (NAV)</span>
                                <span className="font-bold text-gray-900 dark:text-white">${data.totalAccountValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
