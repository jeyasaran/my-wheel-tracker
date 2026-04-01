import { useMemo } from 'react';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Trophy } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface PremiumLeader {
    ticker: string;
    trades: number;
    contracts: number;
    avgDte: number;
    annualizedRoc: number;
    premiums: number;
}

export default function LeadersByPremium() {
    const { trades } = useTradeStore();

    const leaderData = useMemo(() => {
        const optionTrades = trades.filter(t => t.type === 'Call' || t.type === 'Put');
        const grouped = new Map<string, PremiumLeader>();

        optionTrades.forEach(trade => {
            if (!grouped.has(trade.symbol)) {
                grouped.set(trade.symbol, {
                    ticker: trade.symbol,
                    trades: 0,
                    contracts: 0,
                    avgDte: 0,
                    annualizedRoc: 0,
                    premiums: 0,
                });
            }

            const group = grouped.get(trade.symbol)!;
            group.trades += 1;
            group.contracts += trade.contracts;

            // Calculate premium collected
            const premiumCollected = (trade.premiumPrice || 0) * 100 * trade.contracts;
            group.premiums += premiumCollected;

            // DTE calculation
            if (trade.expirationDate && trade.openDate) {
                const dte = Math.max(1, differenceInDays(parseISO(trade.expirationDate), parseISO(trade.openDate)));
                // We'll accumulate sum and average later
                group.avgDte += dte;
            }
        });

        const result: PremiumLeader[] = [];

        // Calculate ROC and Finalize Averages
        grouped.forEach((data, symbol) => {
            // Average DTE
            data.avgDte = data.trades > 0 ? Math.round(data.avgDte / data.trades) : 0;

            const symbolTrades = optionTrades.filter(t => t.symbol === symbol);

            let totalIncome = 0;
            let totalCollateral = 0;

            symbolTrades.forEach(t => {
                const premium = (t.premiumPrice || 0) * 100 * t.contracts;
                const closeCost = (t.closePrice || 0) * 100 * t.contracts;
                let pnl = 0;

                if (t.status === 'OPEN') {
                    pnl = premium;
                } else {
                    if (t.strategy === 'Vert') {
                        pnl = premium + closeCost;
                    } else {
                        pnl = t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost);
                    }
                }

                totalIncome += pnl;
                totalCollateral += (t.strikePrice * 100 * t.contracts);
            });

            // ROC = Total Premium / Total Collateral
            // Annualized = ROC * (365 / Avg DTE)
            if (totalCollateral > 0 && data.avgDte > 0) {
                const roc = totalIncome / totalCollateral;
                data.annualizedRoc = roc * (365 / data.avgDte) * 100;
            } else {
                data.annualizedRoc = 0;
            }

            result.push(data);
        });

        // Sort by Premium descending and take top 5
        return result.sort((a, b) => b.premiums - a.premiums).slice(0, 5);
    }, [trades]);

    if (leaderData.length === 0) return null;

    const formatCurrency = (val: number) => {
        if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'K';
        return '$' + val.toFixed(0);
    };

    return (
        <Card className="shadow-sm border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-4 pt-5 px-6 border-b border-gray-100 dark:border-gray-800/50">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Leaders - By Premium
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800/50">
                            <tr>
                                <th className="px-6 py-3 font-medium">Ticker</th>
                                <th className="px-6 py-3 font-medium text-right">Trades</th>
                                <th className="px-6 py-3 font-medium text-right">Contracts</th>
                                <th className="px-6 py-3 font-medium text-right">Avg DTE</th>
                                <th className="px-6 py-3 font-medium text-right">Annualized ROC</th>
                                <th className="px-6 py-3 font-medium text-right">Premiums</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {leaderData.map((row) => (
                                <tr key={row.ticker} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-3.5 font-medium">{row.ticker}</td>
                                    <td className="px-6 py-3.5 text-right text-gray-700 dark:text-gray-300">{row.trades}</td>
                                    <td className="px-6 py-3.5 text-right text-gray-700 dark:text-gray-300">{row.contracts}</td>
                                    <td className="px-6 py-3.5 text-right text-gray-700 dark:text-gray-300">{row.avgDte}d</td>
                                    <td className="px-6 py-3.5 text-right font-medium text-[#10b981]">
                                        {row.annualizedRoc > 0 ? '+' : ''}{row.annualizedRoc.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-3.5 text-right font-medium text-[#10b981]">
                                        {formatCurrency(row.premiums)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
