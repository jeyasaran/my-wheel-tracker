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
    avgDelta: number; // For now we'll mock or leave blank unless we have delta data
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
                    avgDelta: 0, // Placeholder as delta isn't in the schema natively
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

            // To calculate Annualized ROC, we need collateral and days held per ticker.
            // A simplified approximation based on the trades for this ticker:
            const symbolTrades = optionTrades.filter(t => t.symbol === symbol);

            let totalIncome = 0;
            let totalCapDays = 0;
            let totalDaysHeld = 0;

            symbolTrades.forEach(t => {
                const premium = (t.premiumPrice || 0) * 100 * t.contracts;
                const closeCost = (t.closePrice || 0) * 100 * t.contracts;
                let pnl = 0;

                // If Open, Unrealized PnL is premium. If Closed, it's (premium - closeCost)
                if (t.status === 'OPEN') {
                    pnl = premium; // Simplification for open trades
                } else {
                    if (t.strategy === 'Vert') {
                        pnl = premium + closeCost;
                    } else {
                        pnl = t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost);
                    }
                }

                totalIncome += pnl;

                const collateral = t.strikePrice * 100 * t.contracts;
                const endDate = t.status === 'OPEN' ? new Date().toISOString() : t.closeDate;
                const days = Math.max(1, differenceInDays(parseISO(endDate!), parseISO(t.openDate)));

                totalCapDays += collateral * days;
                totalDaysHeld += days;
            });

            const avgCapital = totalDaysHeld > 0 ? totalCapDays / totalDaysHeld : 0;

            // Find overall period
            if (symbolTrades.length > 0) {
                const sortedTrades = [...symbolTrades].sort((a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime());
                const firstOpen = sortedTrades[0].openDate;
                // find last close or today
                let lastClose = sortedTrades[0].openDate;
                sortedTrades.forEach(t => {
                    const end = t.status === 'OPEN' ? new Date().toISOString() : (t.closeDate || t.openDate);
                    if (new Date(end) > new Date(lastClose)) lastClose = end;
                });
                const periodDays = Math.max(1, differenceInDays(parseISO(lastClose), parseISO(firstOpen)));
                data.annualizedRoc = avgCapital > 0 ? (totalIncome / avgCapital) * (365 / periodDays) * 100 : 0;
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
        <Card className="bg-[#111318] border-gray-800 text-gray-100 shadow-xl overflow-hidden rounded-xl">
            <CardHeader className="pb-4 pt-5 px-6 border-b border-gray-800/50">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Leaders - By Premium
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 bg-gray-900/40 border-b border-gray-800/50">
                            <tr>
                                <th className="px-6 py-3 font-medium">Ticker</th>
                                <th className="px-6 py-3 font-medium text-right">Trades</th>
                                <th className="px-6 py-3 font-medium text-right">Contracts</th>
                                <th className="px-6 py-3 font-medium text-right">Avg DTE</th>
                                <th className="px-6 py-3 font-medium text-right">Avg Delta</th>
                                <th className="px-6 py-3 font-medium text-right">Annualized ROC</th>
                                <th className="px-6 py-3 font-medium text-right">Premiums</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {leaderData.map((row) => (
                                <tr key={row.ticker} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-3.5 font-medium">{row.ticker}</td>
                                    <td className="px-6 py-3.5 text-right text-gray-300">{row.trades}</td>
                                    <td className="px-6 py-3.5 text-right text-gray-300">{row.contracts}</td>
                                    <td className="px-6 py-3.5 text-right text-gray-300">{row.avgDte}d</td>
                                    <td className="px-6 py-3.5 text-right text-gray-300">-</td>
                                    <td className="px-6 py-3.5 text-right text-[#10b981] font-medium">
                                        {row.annualizedRoc > 0 ? '+' : ''}{row.annualizedRoc.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-[#10b981] font-medium">
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
