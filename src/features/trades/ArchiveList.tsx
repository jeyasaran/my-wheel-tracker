import { useTradeStore } from '../../hooks/useTradeStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RotateCcw, Trash2 } from 'lucide-react';

export default function ArchiveList() {
    const { trades, restoreTrade, deleteTrade } = useTradeStore();

    // Filter only archived trades
    const archivedTrades = trades.filter(t => t.isArchived);

    const handleRestore = (id: string) => {
        if (confirm('Restore this trade to active list?')) {
            restoreTrade(id);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Permanently delete this trade? This cannot be undone.')) {
            deleteTrade(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Archived Trades</h2>
            </div>

            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Opened</th>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Strategy</th>
                                <th className="px-4 py-3">Side</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Strike</th>
                                <th className="px-4 py-3">Prem.</th>
                                <th className="px-4 py-3">Exp.</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {archivedTrades.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        No archived trades.
                                    </td>
                                </tr>
                            ) : (
                                archivedTrades.map((trade) => (
                                    <tr key={trade.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{trade.openDate}</td>
                                        <td className="px-4 py-4 font-medium">{trade.symbol}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <Badge variant="outline">{trade.strategy === 'Vert' ? 'Vert' : trade.strategy || '—'}</Badge>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <Badge variant={trade.side === 'BUY' ? 'secondary' : 'default'}>
                                                {trade.side || 'SELL'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <Badge variant="outline">{trade.type}</Badge>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">${trade.strikePrice}</td>
                                        <td className="px-4 py-4 text-green-600 font-medium">+${(trade.premiumPrice * trade.contracts * 100).toFixed(2)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">{trade.expirationDate}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <Badge variant="outline">{trade.status}</Badge>
                                        </td>
                                        <td className="px-4 py-4 text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleRestore(trade.id)} title="Restore">
                                                <RotateCcw className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(trade.id)} title="Permanently Delete">
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
