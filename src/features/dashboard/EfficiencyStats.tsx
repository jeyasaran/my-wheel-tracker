import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { HelpCircle } from 'lucide-react';

interface Stats {
    avgReturn: number;
    count: number;
}

interface EfficiencyStatsProps {
    csp: Stats;
    cc: Stats;
}

export default function EfficiencyStats({ csp, cc }: EfficiencyStatsProps) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Efficiency Stats (Last 12m)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-8">
                    {/* CSP Stats */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2 border-gray-100 dark:border-gray-800">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">CSP</span>
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Put</span>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                Avg Return <HelpCircle className="h-3 w-3" />
                            </p>
                            <p className={`text-2xl font-bold mt-1 ${csp.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {csp.avgReturn > 0 ? '+' : ''}{csp.avgReturn.toFixed(2)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Total Trades</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{csp.count}</p>
                        </div>
                    </div>

                    {/* CC Stats */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2 border-gray-100 dark:border-gray-800">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">CC</span>
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Call</span>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                Avg Return <HelpCircle className="h-3 w-3" />
                            </p>
                            <p className={`text-2xl font-bold mt-1 ${cc.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {cc.avgReturn > 0 ? '+' : ''}{cc.avgReturn.toFixed(2)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Total Trades</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{cc.count}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
