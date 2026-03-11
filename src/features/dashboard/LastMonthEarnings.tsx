import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Calendar, ListChecks, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { subMonths, format } from 'date-fns';

interface LastMonthEarningsProps {
    pnl: number;
    count: number;
    trades?: any[]; // optional if not yet passed from everywhere, though we passed it from Dashboard
    monthOffset?: number;
    setMonthOffset?: (val: number) => void;
}

export default function LastMonthEarnings({ pnl, count, trades = [], monthOffset = 1, setMonthOffset }: LastMonthEarningsProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Reset to last month when component unmounts
    useEffect(() => {
        return () => {
            if (setMonthOffset) setMonthOffset(1);
        };
    }, [setMonthOffset]);

    const targetDate = subMonths(new Date(), monthOffset);
    const title = monthOffset === 1
        ? "Last Month Earnings"
        : `${format(targetDate, 'MMMM yyyy')} Earnings`;

    const handlePrevMonth = () => {
        if (setMonthOffset) setMonthOffset(monthOffset + 1);
    };

    const handleNextMonth = () => {
        if (setMonthOffset && monthOffset > 1) setMonthOffset(monthOffset - 1);
    };

    return (
        <>
            <Card className="h-full">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="View Breakdown"
                        >
                            <ListChecks className="h-4 w-4 text-gray-500" />
                        </button>
                        <div className="flex items-center border rounded-md border-gray-200 dark:border-gray-700">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-md transition-colors" title="Previous Month">
                                <ChevronLeft className="h-4 w-4 text-gray-500" />
                            </button>
                            <div className="px-2 py-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-x border-gray-200 dark:border-gray-700" title="Selected Month">
                                <Calendar className="h-4 w-4 text-gray-400" />
                            </div>
                            <button onClick={handleNextMonth} disabled={monthOffset <= 1} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Next Month">
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mt-2">
                        <h3 className={`text-3xl font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${pnl.toFixed(2)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Total from {count} closed trades
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={monthOffset === 1 ? "Last Month Trades Breakdown" : `${format(targetDate, 'MMMM yyyy')} Trades Breakdown`}
                className="max-w-3xl"
            >
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium">Ticker</th>
                                <th className="px-4 py-3 font-medium">Strategy</th>
                                <th className="px-4 py-3 text-right font-medium">Realized PnL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {trades.map((t, idx) => {
                                let tradePnl = 0;
                                if (t.displayType === 'Stock') {
                                    tradePnl = ((t.sellPrice || 0) - t.buyPrice) * t.quantity;
                                } else {
                                    if (t.strategy === 'Vert') {
                                        tradePnl = (t.premiumPrice + (t.closePrice || 0)) * t.contracts * 100;
                                    } else {
                                        tradePnl = t.side === 'BUY'
                                            ? (((t.closePrice || 0) * t.contracts * 100) - (t.premiumPrice * t.contracts * 100))
                                            : ((t.premiumPrice * t.contracts * 100) - ((t.closePrice || 0) * t.contracts * 100));
                                    }
                                }

                                return (
                                    <tr key={t.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-500">{t.openDate}</td>
                                        <td className="px-4 py-3 font-medium">{t.symbol}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline">{t.displayType === 'Stock' ? 'Shares' : (t.strategy === 'Vert' ? 'Vert' : t.strategy || t.type)}</Badge>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${tradePnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {trades.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                        No closed trades last month.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </>
    );
}
