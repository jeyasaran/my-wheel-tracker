import { useMemo } from 'react';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlData {
    ticker: string;
    ccPremium: number;
    cspPremium: number;
    totalPremium: number;
    posPl: number;
    totalPl: number;
}

export default function LeadersLaggards() {
    const { trades, stockPositions } = useTradeStore();

    const data = useMemo(() => {
        const grouped = new Map<string, PlData>();

        const getGroup = (symbol: string) => {
            if (!grouped.has(symbol)) {
                grouped.set(symbol, {
                    ticker: symbol,
                    ccPremium: 0,
                    cspPremium: 0,
                    totalPremium: 0,
                    posPl: 0,
                    totalPl: 0,
                });
            }
            return grouped.get(symbol)!;
        };

        // 1. Process Options (CCs and CSPs)
        trades.forEach(t => {
            const group = getGroup(t.symbol);
            const premiumCollected = (t.premiumPrice || 0) * 100 * t.contracts;
            const closeCost = (t.closePrice || 0) * 100 * t.contracts;

            let pnl = 0;
            if (t.status === 'OPEN') {
                pnl = premiumCollected; // Simple approximation for open
            } else {
                if (t.strategy === 'Vert') {
                    pnl = premiumCollected + closeCost;
                } else {
                    pnl = t.side === 'BUY' ? (closeCost - premiumCollected) : (premiumCollected - closeCost);
                }
            }

            if (t.type === 'Call') {
                group.ccPremium += pnl;
            } else if (t.type === 'Put') {
                group.cspPremium += pnl;
            }

            group.totalPremium += pnl;
            group.totalPl += pnl;
        });

        // 2. Process Stocks (Position P/L)
        stockPositions.forEach(pos => {
            const group = getGroup(pos.symbol);

            let pnl = 0;
            if (pos.status === 'CLOSED') {
                pnl = ((pos.sellPrice || 0) - pos.buyPrice) * pos.quantity;
            } else {
                // If Open, we ideally need currentPrice. Since we don't store it here easily, 
                // we'll rely only on realized for this card or 0 if open without current quote.
                // Assuming we want realized + premiums for consistency with standard wheeling:
                pnl = 0; // Keeping it strictly realized for stocks here unless integrated with real-time API
            }

            group.posPl += pnl;
            group.totalPl += pnl;
        });

        const allData = Array.from(grouped.values()).filter(d => d.totalPremium > 0 || d.posPl !== 0);

        // Sort by Total P/L descending
        allData.sort((a, b) => b.totalPl - a.totalPl);

        // Leaders: Top 5
        const leaders = allData.slice(0, 5);

        // Laggards: Bottom 5, strictly those with negative or lowest P/L
        // We reverse it to show the absolute worst at the top of the laggards list
        const laggards = [...allData].reverse().slice(0, 5).filter(d => !leaders.includes(d));

        return { leaders, laggards };
    }, [trades, stockPositions]);

    const formatCurrency = (val: number, removeSign = false) => {
        if (val === 0) return '-';
        const absVal = Math.abs(val);
        const prefix = !removeSign && val < 0 ? '$-' : '$';

        if (absVal >= 1000) return prefix + (absVal / 1000).toFixed(1) + 'K';
        return prefix + absVal.toFixed(0);
    };

    if (data.leaders.length === 0 && data.laggards.length === 0) return null;

    const renderTable = (items: PlData[], title: string, isLaggard: boolean) => (
        <div className="w-full xl:w-1/2 p-4">
            <h3 className={cn(
                "text-base font-semibold mb-3",
                isLaggard ? "text-red-400" : "text-yellow-500"
            )}>
                {title}
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 border-b border-gray-800/50">
                        <tr>
                            <th className="py-2.5 font-medium">Ticker</th>
                            <th className="px-3 py-2.5 font-medium text-right">CC</th>
                            <th className="px-3 py-2.5 font-medium text-right">CSP</th>
                            <th className="px-3 py-2.5 font-medium text-right">Premiums</th>
                            <th className="px-3 py-2.5 font-medium text-right">Pos P/L</th>
                            <th className="py-2.5 font-medium text-right">Total P/L</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {items.map((row) => (
                            <tr key={row.ticker} className="hover:bg-gray-800/30 transition-colors">
                                <td className="py-3 font-medium">{row.ticker}</td>
                                <td className="px-3 py-3 text-right text-[#10b981]">{formatCurrency(row.ccPremium, true)}</td>
                                <td className="px-3 py-3 text-right text-[#10b981]">{formatCurrency(row.cspPremium, true)}</td>
                                <td className="px-3 py-3 text-right text-[#10b981]">{formatCurrency(row.totalPremium, true)}</td>
                                <td className={cn("px-3 py-3 text-right", row.posPl < 0 ? "text-red-400" : row.posPl > 0 ? "text-[#10b981]" : "text-gray-500")}>
                                    {formatCurrency(row.posPl)}
                                </td>
                                <td className={cn("py-3 text-right font-bold", row.totalPl < 0 ? "text-red-400" : "text-[#10b981]")}>
                                    {formatCurrency(row.totalPl)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <Card className="bg-[#111318] border-gray-800 text-gray-100 shadow-xl overflow-hidden rounded-xl">
            <CardHeader className="pb-0 pt-5 px-6">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Leaders & Laggards - By P/L
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-gray-800/50">
                {renderTable(data.leaders, 'Leaders', false)}
                {renderTable(data.laggards, 'Laggards', true)}
            </CardContent>
        </Card>
    );
}
