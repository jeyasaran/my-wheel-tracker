import { useState } from 'react';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PositionForm } from './PositionForm';
import { TradeForm } from '../trades/TradeForm';
import { Input } from '../../components/ui/Input';
import { Plus, Edit2, Trash2, ArrowRightLeft, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import type { StockPosition, Trade } from '../../types';

export default function PositionsList() {
    const { stockPositions, trades, marketPrices, brokers, deletePosition, closePosition } = useTradeStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<StockPosition | undefined>(undefined);
    const [tradeDefaults, setTradeDefaults] = useState<Partial<Trade> | undefined>(undefined);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'Wheel' | 'Long' | 'Closed'>('Wheel');
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
    const [positionToClose, setPositionToClose] = useState<StockPosition | undefined>(undefined);
    const [closePrice, setClosePrice] = useState('');
    const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isCloseTradeModalOpen, setIsCloseTradeModalOpen] = useState(false);
    const [closingTrade, setClosingTrade] = useState<Trade | undefined>(undefined);

    const getLinkedCCs = (pos: StockPosition) => {
        const expectedContracts = Math.floor(pos.quantity / 100);
        return trades.filter(t => {
            if (t.type !== 'Call') return false;

            // Broker must match if set on the position
            if (pos.brokerId && t.brokerId !== pos.brokerId) return false;

            // Contracts must match the position's lot size
            if (t.contracts !== expectedContracts) return false;

            // Primary link: Explicitly linked via positionId
            if (t.positionId) {
                return t.positionId === pos.id;
            }
            // Fallback link: Matching symbol opened AFTER position (for older/unlinked trades)
            return t.symbol === pos.symbol && new Date(t.openDate) >= new Date(pos.openDate);
        });
    };

    const openPositions = stockPositions.filter(pos => pos.status !== 'CLOSED');
    const closedPositions = stockPositions.filter(pos => pos.status === 'CLOSED');
    const wheelPositions = openPositions.filter(pos => getLinkedCCs(pos).length > 0);
    const longPositions = openPositions.filter(pos => getLinkedCCs(pos).length === 0);

    const displayedPositions =
        activeTab === 'Wheel' ? wheelPositions :
            activeTab === 'Long' ? longPositions :
                closedPositions;

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const handleEdit = (position: StockPosition) => {
        setEditingPosition(position);
        setIsModalOpen(true);
    };

    const handleTrade = (position: StockPosition) => {
        setTradeDefaults({
            symbol: position.symbol,
            type: 'Call', // Assume selling CC against position
            strategy: 'CC',
            side: 'SELL',
            positionId: position.id
        });
        setIsTradeModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this position?')) {
            deletePosition(id);
        }
    };

    const handleCloseTrade = (trade: Trade) => {
        setClosingTrade(trade);
        setIsCloseTradeModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingPosition(undefined);
        setIsModalOpen(true);
    };

    const handleClosePosition = () => {
        if (positionToClose && closePrice) {
            closePosition(positionToClose.id, parseFloat(closePrice), closeDate);
            setIsClosingModalOpen(false);
            setPositionToClose(undefined);
            setClosePrice('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Positions</h2>
                <Button onClick={handleAddNew}>
                    <Plus className="mr-2 h-4 w-4" /> Add Position
                </Button>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-800">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('Wheel')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'Wheel'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        Wheel ({wheelPositions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('Long')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'Long'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        Long ({longPositions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('Closed')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'Closed'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        Closed ({closedPositions.length})
                    </button>
                </nav>
            </div>

            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th className="w-10 px-6 py-3"></th>
                                <th className="px-4 py-3">Ticker</th>
                                <th className="px-4 py-3">Opened</th>
                                {activeTab === 'Closed' && <th className="px-4 py-3">Closed</th>}
                                <th className="px-4 py-3">Qty</th>
                                <th className="px-4 py-3">Buy Price</th>
                                {activeTab !== 'Closed' ? (
                                    <>
                                        <th className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                Adj. Cost <HelpCircle className="h-3 w-3 text-gray-400" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3">Mkt Value</th>
                                        <th className="px-4 py-3">P&L</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-4 py-3">Sell Price</th>
                                        <th className="px-4 py-3">Realized P&L</th>
                                    </>
                                )}
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedPositions.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                        No active {activeTab.toLowerCase()} positions.
                                    </td>
                                </tr>
                            ) : (
                                displayedPositions.map((pos) => {
                                    const currentPrice = marketPrices[pos.symbol];

                                    // Linked CC Trades
                                    const linkedTrades = getLinkedCCs(pos);

                                    // Calculate Total Effective Premium (Credit) from CCs
                                    // If OPEN: Use full premium
                                    // If CLOSED: Use Realized PnL (Premium - BuyBackCost)
                                    const totalCredit = linkedTrades.reduce((sum, t) => {
                                        const premium = t.premiumPrice * t.contracts * 100;
                                        if (t.status === 'OPEN') {
                                            return sum + (t.side === 'BUY' ? -premium : premium);
                                        } else {
                                            const closeCost = (t.closePrice || 0) * t.contracts * 100;
                                            return sum + (t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost));
                                        }
                                    }, 0);

                                    // Calculations
                                    const totalCost = pos.buyPrice * pos.quantity;
                                    const adjustedCostTotal = totalCost - totalCredit;
                                    const adjustedCostPerShare = adjustedCostTotal / pos.quantity;

                                    const marketValue = currentPrice ? currentPrice * pos.quantity : 0;
                                    const pnl = currentPrice ? (currentPrice - adjustedCostPerShare) * pos.quantity : 0;
                                    const pnlPercent = currentPrice ? ((currentPrice - adjustedCostPerShare) / adjustedCostPerShare) * 100 : 0;

                                    const isExpanded = expandedRows.has(pos.id);

                                    return (
                                        <>
                                            <tr key={pos.id} className={`border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => toggleRow(pos.id)}
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 font-medium">{pos.symbol}</td>
                                                <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{pos.openDate}</td>
                                                {activeTab === 'Closed' && <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{pos.closeDate}</td>}
                                                <td className="px-4 py-4 whitespace-nowrap">{pos.quantity}</td>
                                                <td className="px-4 py-4 whitespace-nowrap">${pos.buyPrice.toFixed(2)}</td>
                                                {activeTab !== 'Closed' ? (
                                                    <>
                                                        <td className="px-4 py-4 font-medium text-blue-600 dark:text-blue-400">
                                                            ${adjustedCostPerShare.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-4 font-medium">
                                                            {currentPrice ? `$${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '...'}
                                                        </td>
                                                        <td className={`px-4 py-4 font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {currentPrice ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-base font-bold">{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</span>
                                                                    <span className="text-xs opacity-80 font-normal mt-0.5">{pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
                                                                </div>
                                                            ) : '...'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-4 py-4 font-medium">${(pos.sellPrice || 0).toFixed(2)}</td>
                                                        <td className={`px-4 py-4 font-medium ${((pos.sellPrice || 0) - pos.buyPrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            <div className="flex flex-col">
                                                                <span className="text-base font-bold">{((pos.sellPrice || 0) - pos.buyPrice) >= 0 ? '+' : ''}{(((pos.sellPrice || 0) - pos.buyPrice) * pos.quantity).toFixed(2)}</span>
                                                                <span className="text-xs opacity-80 font-normal mt-0.5">{((pos.sellPrice || 0) - pos.buyPrice) >= 0 ? '+' : ''}{(((pos.sellPrice || 0) - pos.buyPrice) / pos.buyPrice * 100).toFixed(2)}%</span>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-4 py-4 text-right space-x-2">
                                                    {activeTab !== 'Closed' && (
                                                        <>
                                                            <Button variant="ghost" size="sm" onClick={() => handleTrade(pos)} title="Sell Option">
                                                                <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setPositionToClose(pos);
                                                                    setClosePrice(currentPrice?.toString() || '');
                                                                    setIsClosingModalOpen(true);
                                                                }}
                                                                title="Sell to Close"
                                                            >
                                                                <span className="text-blue-600 font-bold px-1">STC</span>
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(pos)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(pos.id)} className="text-red-500 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                                                    <td colSpan={9} className="px-6 py-4 whitespace-nowrap">
                                                        <div className="pl-10 space-y-4">
                                                            <div className="text-sm">
                                                                <span className="font-semibold text-gray-600 dark:text-gray-400">Total Premium: </span>
                                                                <span className="font-bold text-green-600">${totalCredit.toFixed(2)}</span>
                                                            </div>

                                                            {linkedTrades.length > 0 ? (
                                                                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                                    <table className="w-full text-xs text-left">
                                                                        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase">
                                                                            <tr>
                                                                                <th className="px-4 py-2">Type</th>
                                                                                <th className="px-4 py-2">Strike</th>
                                                                                <th className="px-4 py-2">Contracts</th>
                                                                                <th className="px-4 py-2">Broker</th>
                                                                                <th className="px-4 py-2">Open Date</th>
                                                                                <th className="px-4 py-2">Close Date</th>
                                                                                <th className="px-4 py-2">Premium</th>
                                                                                <th className="px-4 py-2">Realized PnL</th>
                                                                                <th className="px-4 py-2 text-right">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {linkedTrades.map(trade => {
                                                                                const tradePremium = trade.premiumPrice * trade.contracts * 100;
                                                                                const closeCost = trade.closePrice ? trade.closePrice * trade.contracts * 100 : 0;
                                                                                const realizedPnl = trade.status !== 'OPEN' ? tradePremium - closeCost : null;

                                                                                return (
                                                                                    <tr key={trade.id} className="border-b dark:border-gray-700 last:border-0 bg-white dark:bg-gray-900">
                                                                                        <td className="px-4 py-2">
                                                                                            <span className="font-medium">Covered Call</span>
                                                                                        </td>
                                                                                        <td className="px-4 py-2">${trade.strikePrice}</td>
                                                                                        <td className="px-4 py-2">
                                                                                            {Math.floor(pos.quantity / 100)}
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                                                                                            {brokers.find(b => b.id === (trade.brokerId ?? pos.brokerId))?.name ?? '—'}
                                                                                        </td>
                                                                                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">{trade.openDate}</td>
                                                                                        <td className="px-4 py-2">{trade.closeDate || '—'}</td>
                                                                                        <td className="px-4 py-2 font-medium text-green-600">
                                                                                            ${tradePremium.toFixed(2)}
                                                                                        </td>
                                                                                        <td className={`px-4 py-2 font-medium ${realizedPnl && realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                                            {realizedPnl !== null ? `$${realizedPnl.toFixed(2)}` : '—'}
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-right">
                                                                                            {trade.status === 'OPEN' && (
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-2 py-1 h-auto text-xs"
                                                                                                    onClick={() => handleCloseTrade(trade)}
                                                                                                >
                                                                                                    Close
                                                                                                </Button>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500 italic">No covered calls sold against this position.</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPosition ? "Edit Position" : "New Position"}
            >
                <PositionForm
                    initialData={editingPosition}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>
            <Modal
                isOpen={isTradeModalOpen}
                onClose={() => setIsTradeModalOpen(false)}
                title="New Trade"
            >
                <TradeForm
                    defaultValues={tradeDefaults}
                    onClose={() => setIsTradeModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isCloseTradeModalOpen}
                onClose={() => setIsCloseTradeModalOpen(false)}
                title="Close Trade"
            >
                <TradeForm
                    initialData={closingTrade}
                    mode="close"
                    onClose={() => setIsCloseTradeModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isClosingModalOpen}
                onClose={() => setIsClosingModalOpen(false)}
                title={`Sell to Close: ${positionToClose?.symbol}`}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sell Price</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={closePrice}
                                onChange={(e) => setClosePrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Close Date</label>
                            <Input
                                type="date"
                                value={closeDate}
                                onChange={(e) => setCloseDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                            Closing this position will move it to the <strong>Closed</strong> tab.
                            Linked covered calls will remain in their current state.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsClosingModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleClosePosition}
                            disabled={!closePrice}
                        >
                            Confirm Sell to Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
