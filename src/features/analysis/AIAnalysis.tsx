import { useTradeStore } from '../../hooks/useTradeStore';
import { Sparkles, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Trade } from '../../types';
import { differenceInDays, parseISO } from 'date-fns';

export default function AIAnalysis() {
    const { trades, marketPrices } = useTradeStore();

    // Only analyze open option trades
    const openOptionTrades = trades.filter(t => t.status === 'OPEN' && !t.isArchived);

    if (openOptionTrades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
                <Sparkles className="w-12 h-12 mb-4 text-blue-400" />
                <h2 className="text-xl font-semibold">No Open Option Trades</h2>
                <p>Add some trades to see the AI analysis.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">AI Portfolio Analysis</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {openOptionTrades.map(trade => (
                    <AnalysisCard key={trade.id} trade={trade} stockPrice={marketPrices[trade.symbol]} />
                ))}
            </div>
        </div>
    );
}

function AnalysisCard({ trade, stockPrice }: { trade: Trade, stockPrice?: number }) {
    const daysToExpiry = differenceInDays(parseISO(trade.expirationDate), new Date());

    const analyze = () => {
        const isPut = trade.type === 'Put';
        const isITM = isPut ? (stockPrice ? stockPrice < trade.strikePrice : false) : (stockPrice ? stockPrice > trade.strikePrice : false);
        const distancePercent = stockPrice ? Math.abs((stockPrice - trade.strikePrice) / trade.strikePrice) * 100 : 0;

        // --- Recommendation Logic ---
        let action = "Keep Position Open";
        let rationale = "Theta decay is working in your favor. Continue to monitor.";
        let variant: 'info' | 'success' | 'warning' = 'info';

        if (daysToExpiry <= 0) {
            action = "Expire or Close Immediately";
            rationale = "Trade has reached or passed expiration. Verify assignment or expiration status.";
            variant = 'warning';
        } else if (daysToExpiry < 7) {
            if (!isITM && distancePercent > 5) {
                action = "Close Early (Lock Profit)";
                rationale = "High probability of expiring OTM, but gamma risk increases drastically in the final week. Lock in 90%+ profit if possible.";
                variant = 'success';
            } else if (isITM) {
                action = "Close or Roll Position";
                rationale = "Position is currently ITM with less than 7 days left. Consider rolling to avoid assignment or closing to mitigate further loss.";
                variant = 'warning';
            }
        } else if (daysToExpiry < 21) {
            if (!isITM && distancePercent > 10) {
                action = "Exit at 50-75% Profit";
                rationale = "Theta decay is accelerating. If you have reached your profit target, it's statistically better to close and redeploy capital.";
                variant = 'success';
            }
        }

        if (stockPrice && isITM) {
            action = daysToExpiry < 14 ? "Aggressive Management" : "Monitor Closely";
            rationale = `Position is ${isPut ? 'below' : 'above'} strike by ${distancePercent.toFixed(1)}%. Risk of assignment is elevated.`;
            variant = 'warning';
        }

        return { action, rationale, variant };
    };

    const { action, rationale, variant } = analyze();

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
                {/* Column 1: Details */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-black tracking-tighter text-blue-600 dark:text-blue-500 underline decoration-2 underline-offset-4 decoration-blue-200 dark:decoration-blue-900">
                            {trade.symbol}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${trade.type === 'Put' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                            {trade.type}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">STRIKE</span>
                            <span className="text-lg font-bold tabular-nums tracking-tight underline decoration-gray-100 dark:decoration-gray-800 underline-offset-4 decoration-2">
                                ${trade.strikePrice.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">EXPIRY</span>
                            <span className="text-sm font-bold tabular-nums tracking-tight whitespace-nowrap">
                                {new Date(trade.expirationDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex flex-col col-span-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">DAYS TO EXPIRY</span>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className={`text-sm font-black tracking-tight ${daysToExpiry < 7 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {daysToExpiry} Days Remaining
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Recommended Action */}
                <div className="p-6 flex flex-col justify-center bg-gray-50/30 dark:bg-gray-800/10">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-4 block">RECOMMENDED ACTION</span>
                    <div className={`flex items-start gap-4 p-4 rounded-xl border border-dashed ${variant === 'success' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800 dark:text-emerald-400' :
                        variant === 'warning' ? 'bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-400' :
                            'bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-400'
                        }`}>
                        <div className="mt-0.5">
                            {variant === 'success' ? <CheckCircle className="w-5 h-5" /> :
                                variant === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                                    <Sparkles className="w-5 h-5" />}
                        </div>
                        <span className="text-base font-black tracking-tight leading-6">
                            {action}
                        </span>
                    </div>
                </div>

                {/* Column 3: Rationale */}
                <div className="p-6 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-4 block">AI RATIONALE</span>
                    <div className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gray-100 dark:bg-gray-800 rounded-full" />
                        <p className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400 italic pl-3">
                            "{rationale}"
                        </p>
                    </div>
                    {stockPrice && (
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800/50">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Price</span>
                                <span className="text-sm font-black tabular-nums tracking-tight">${stockPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Moneyness</span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-widest ${(trade.type === 'Put' ? stockPrice < trade.strikePrice : stockPrice > trade.strikePrice)
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/20'
                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                    }`}>
                                    {(trade.type === 'Put' ? stockPrice < trade.strikePrice : stockPrice > trade.strikePrice) ? 'ITM' : 'OTM'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
