import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Calendar as CalendarIcon, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonthlyReport } from '../../hooks/useMonthlyReport';
import { format, subMonths, addMonths } from 'date-fns';
import { ReportStrategyBreakdown } from './ReportStrategyBreakdown';
import { ReportPositions } from './ReportPositions';

export function ReportsPage() {
    const [selectedDate, setSelectedDate] = useState(() => subMonths(new Date(), 1)); // Default to last month
    const [showPicker, setShowPicker] = useState(false);

    const reportData = useMonthlyReport(selectedDate);
    
    // Quick navigation controls
    const navigateMonth = (direction: 'prev' | 'next') => {
        setSelectedDate(current => 
            direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
        );
    };

    const handleExport = () => {
        window.print(); // Simple PDF export fallback via browser
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Portfolio Reports</h1>
                
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <button 
                            onClick={() => navigateMonth('prev')}
                            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-l-lg transition-colors border-r border-gray-200 dark:border-gray-700"
                        >
                            <ChevronLeft className="h-4 w-4 text-gray-500" />
                        </button>
                        
                        <div className="relative">
                            <button
                                onClick={() => setShowPicker(!showPicker)}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[160px] justify-center"
                            >
                                <CalendarIcon className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-sm">
                                    {format(selectedDate, 'MMMM yyyy')}
                                </span>
                            </button>
                            
                            {/* We could mount the exact same Month/Year grid picker here if we wanted, for simplicity just leaving the buttons for now */}
                        </div>

                        <button 
                            onClick={() => navigateMonth('next')}
                            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-r-lg transition-colors border-l border-gray-200 dark:border-gray-700"
                        >
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>

                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export PDF</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Realized Premium</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${reportData.totalRealizedPremium >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {reportData.totalRealizedPremium >= 0 ? "+" : "-"}${Math.abs(reportData.totalRealizedPremium).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">NAV Change</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${reportData.navChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {reportData.navChange >= 0 ? "+" : "-"}${Math.abs(reportData.navChange).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <p className={`text-xs mt-1 font-medium ${reportData.navChangePercentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {reportData.navChangePercentage >= 0 ? "+" : "-"}{Math.abs(reportData.navChangePercentage).toFixed(2)}% vs Prev Month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Win Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.winRate.toFixed(1)}%</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {reportData.totalProfitableTrades} of {reportData.totalTradesClosed} trades
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Assignment Rate (CSP)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.assignmentRate.toFixed(1)}%</div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Detailed sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <ReportStrategyBreakdown data={reportData} />
                </div>
                <div>
                    <ReportPositions data={reportData} />
                </div>
            </div>

        </div>
    );
}
