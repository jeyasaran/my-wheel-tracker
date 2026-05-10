import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Calendar, ListChecks, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { subMonths, format, getMonth, getYear } from 'date-fns';

interface LastMonthEarningsProps {
    pnl: number;
    count: number;
    trades?: any[];
    monthOffset?: number;
    setMonthOffset?: (val: number) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LastMonthEarnings({ pnl, count, trades = [], monthOffset = 1, setMonthOffset }: LastMonthEarningsProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const now = new Date();
    const targetDate = subMonths(now, monthOffset);
    const [pickerYear, setPickerYear] = useState(getYear(targetDate));

    // Close picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setIsPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Reset to last month when component unmounts
    useEffect(() => {
        return () => {
            if (setMonthOffset) setMonthOffset(1);
        };
    }, [setMonthOffset]);

    const title = monthOffset === 1
        ? "Last Month Earnings"
        : `${format(targetDate, 'MMMM yyyy')} Earnings`;

    const handlePrevMonth = () => {
        if (setMonthOffset) setMonthOffset(monthOffset + 1);
    };

    const handleNextMonth = () => {
        if (setMonthOffset && monthOffset > 1) setMonthOffset(monthOffset - 1);
    };

    const handleMonthSelect = (monthIndex: number) => {
        const nowYear = getYear(now);
        const nowMonth = getMonth(now);
        const offset = (nowYear - pickerYear) * 12 + (nowMonth - monthIndex);
        if (offset >= 1 && setMonthOffset) {
            setMonthOffset(offset);
        }
        setIsPickerOpen(false);
    };

    const isMonthSelectable = (monthIndex: number) => {
        const nowYear = getYear(now);
        const nowMonth = getMonth(now);
        const offset = (nowYear - pickerYear) * 12 + (nowMonth - monthIndex);
        return offset >= 1; // at least 1 month in the past (can't pick current month)
    };

    const isMonthSelected = (monthIndex: number) => {
        return getMonth(targetDate) === monthIndex && getYear(targetDate) === pickerYear;
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
                            {/* Calendar icon - opens month picker */}
                            <div className="relative" ref={pickerRef}>
                                <button
                                    onClick={() => { setPickerYear(getYear(targetDate)); setIsPickerOpen(v => !v); }}
                                    className="px-2 py-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-x border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Pick Month"
                                >
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                </button>
                                {isPickerOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 w-64 animate-in fade-in zoom-in-95 duration-150">
                                        {/* Year navigation */}
                                        <div className="flex items-center justify-between mb-3">
                                            <button
                                                onClick={() => setPickerYear(y => y - 1)}
                                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <ChevronLeft className="h-4 w-4 text-gray-500" />
                                            </button>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{pickerYear}</span>
                                            <button
                                                onClick={() => setPickerYear(y => Math.min(y + 1, getYear(now)))}
                                                disabled={pickerYear >= getYear(now)}
                                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight className="h-4 w-4 text-gray-500" />
                                            </button>
                                        </div>
                                        {/* Month grid */}
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {MONTHS.map((m, idx) => {
                                                const selectable = isMonthSelectable(idx);
                                                const selected = isMonthSelected(idx);
                                                return (
                                                    <button
                                                        key={m}
                                                        onClick={() => selectable && handleMonthSelect(idx)}
                                                        disabled={!selectable}
                                                        className={`
                                                            py-1.5 rounded-lg text-xs font-semibold transition-colors
                                                            ${selected
                                                                ? 'bg-blue-600 text-white shadow-sm'
                                                                : selectable
                                                                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300'
                                                                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                            }
                                                        `}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* Reset link */}
                                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-center">
                                            <button
                                                onClick={() => { if (setMonthOffset) setMonthOffset(1); setIsPickerOpen(false); }}
                                                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                                            >
                                                Reset to Last Month
                                            </button>
                                        </div>
                                    </div>
                                )}
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
