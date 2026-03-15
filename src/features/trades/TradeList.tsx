import { useState, useRef, useEffect, useMemo } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TradeForm } from './TradeForm';
import { ImportTradeModal } from './ImportTradeModal';
import { Plus, Trash2, Edit2, Upload, Filter, Info, ArrowUp, ArrowDown, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Trade } from '../../types';

export default function TradeList() {
    const { trades, archiveTrade, marketPrices, brokers, refreshPrices } = useTradeStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState<Trade | undefined>(undefined);
    const [closingTrade, setClosingTrade] = useState<Trade | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
    const [tradeToArchive, setTradeToArchive] = useState<string | null>(null);
    const [isPriceInfoOpen, setIsPriceInfoOpen] = useState(false);
    const [isYieldInfoOpen, setIsYieldInfoOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [groupByBroker, setGroupByBroker] = useState(false);

    const notificationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshPrices();
    }, []); // Refresh on mount (navigation)

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' }; // Default to asc for dates
        });
    };

    // Filter states
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['Put', 'Call']);
    const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
    const [selectedExps, setSelectedExps] = useState<string[]>([]);
    const [isExpFilterOpen, setIsExpFilterOpen] = useState(false);
    const [initializedExps, setInitializedExps] = useState(false);

    // Filter refs
    const typeFilterRef = useRef<HTMLDivElement>(null);
    const expFilterRef = useRef<HTMLDivElement>(null);

    // Derived data
    const allActiveTrades = useMemo(() => trades.filter(t => !t.isArchived), [trades]);
    const openTrades = useMemo(() => allActiveTrades.filter(t => t.status === 'OPEN'), [allActiveTrades]);
    const closedTrades = useMemo(() => allActiveTrades.filter(t => t.status !== 'OPEN'), [allActiveTrades]);
    const uniqueExps = useMemo(() => Array.from(new Set(openTrades.map(t => t.expirationDate))).sort(), [openTrades]);

    // Assignment risk: open trades that are ITM and expiring within 7 days
    const atRiskTrades = useMemo(() => {
        return openTrades.filter(trade => {
            const daysToExp = differenceInCalendarDays(parseISO(trade.expirationDate), new Date());
            if (daysToExp > 7 || daysToExp < 0) return false;

            const currentPrice = marketPrices[trade.symbol];
            if (!currentPrice || !trade.strikePrice) return false;

            // ITM check: for Put, current price < strike; for Call, current price > strike
            if (trade.type === 'Put') {
                return currentPrice < trade.strikePrice;
            } else {
                return currentPrice > trade.strikePrice;
            }
        }).map(trade => {
            const daysToExp = differenceInCalendarDays(parseISO(trade.expirationDate), new Date());
            const currentPrice = marketPrices[trade.symbol]!;
            const moneyness = trade.type === 'Put'
                ? ((currentPrice - trade.strikePrice) / trade.strikePrice) * 100
                : ((trade.strikePrice - currentPrice) / trade.strikePrice) * 100;
            return { ...trade, daysToExp, moneyness, currentPrice };
        }).sort((a, b) => a.daysToExp - b.daysToExp);
    }, [openTrades, marketPrices]);

    // Synchronize selectedExps with uniqueExps to handle adding/removing trades
    const lastUniqueExps = useRef<string[]>([]);
    useEffect(() => {
        if (uniqueExps.length === 0) {
            if (initializedExps) {
                setSelectedExps([]);
                lastUniqueExps.current = [];
            }
            return;
        }

        if (!initializedExps) {
            setSelectedExps(uniqueExps);
            setInitializedExps(true);
            lastUniqueExps.current = uniqueExps;
            return;
        }

        const added = uniqueExps.filter(e => !lastUniqueExps.current.includes(e));
        const removed = lastUniqueExps.current.filter(e => !uniqueExps.includes(e));

        if (added.length > 0 || removed.length > 0) {
            setSelectedExps(prev => {
                // If every previous unique exp was in selectedExps, we were in "Select All" mode
                const wasSelectAll = lastUniqueExps.current.length > 0 &&
                    lastUniqueExps.current.every(e => prev.includes(e));

                if (wasSelectAll) {
                    return uniqueExps;
                }

                // Otherwise (Filtered mode), just remove stale dates
                return prev.filter(e => uniqueExps.includes(e));
            });
            lastUniqueExps.current = uniqueExps;
        }
    }, [uniqueExps, initializedExps]);

    // Handle click outside for filter popovers and notification dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (typeFilterRef.current && !typeFilterRef.current.contains(event.target as Node)) {
                setIsTypeFilterOpen(false);
            }
            if (expFilterRef.current && !expFilterRef.current.contains(event.target as Node)) {
                setIsExpFilterOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOpenTrades = useMemo(() => {
        return openTrades.filter(t => {
            const matchesType = selectedTypes.includes(t.type);
            const matchesExp = !initializedExps ? true : selectedExps.includes(t.expirationDate);
            return matchesType && matchesExp;
        });
    }, [openTrades, selectedTypes, selectedExps, initializedExps]);

    const sortedTrades = useMemo(() => {
        let trades = activeTab === 'open' ? filteredOpenTrades : closedTrades;

        if (sortConfig) {
            trades = [...trades].sort((a, b) => {
                if (sortConfig.key === 'openDate') {
                    // Ascending: Oldest first (default logic usually implies A-Z or 0-9)
                    // For dates: 'asc' = Oldest to Newest. 'desc' = Newest to Oldest.
                    const dateA = new Date(a.openDate).getTime();
                    const dateB = new Date(b.openDate).getTime();
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                }
                return 0;
            });
        }
        return trades;
    }, [activeTab, filteredOpenTrades, closedTrades, sortConfig]);

    const displayTrades = sortedTrades;

    // Group trades by broker when toggle is on
    const groupedByBroker = useMemo(() => {
        const groups = new Map<string, { name: string; trades: typeof displayTrades }>();
        displayTrades.forEach(trade => {
            const brokerId = trade.brokerId || '__unassigned__';
            const brokerName = brokers.find(b => b.id === brokerId)?.name ?? 'Unassigned';
            if (!groups.has(brokerId)) groups.set(brokerId, { name: brokerName, trades: [] });
            groups.get(brokerId)!.trades.push(trade);
        });
        // Sort: named brokers alphabetically first, Unassigned last
        return Array.from(groups.entries())
            .sort(([aId, a], [bId, b]) => {
                if (aId === '__unassigned__') return 1;
                if (bId === '__unassigned__') return -1;
                return a.name.localeCompare(b.name);
            })
            .map(([, group]) => group);
    }, [displayTrades, brokers]);

    const toggleType = (type: string) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const toggleSelectAllTypes = () => {
        if (selectedTypes.length === 2) {
            setSelectedTypes([]);
        } else {
            setSelectedTypes(['Put', 'Call']);
        }
    };

    const toggleExp = (exp: string) => {
        setSelectedExps(prev =>
            prev.includes(exp)
                ? prev.filter(e => e !== exp)
                : [...prev, exp]
        );
    };

    const toggleSelectAllExps = () => {
        if (selectedExps.length === uniqueExps.length) {
            setSelectedExps([]);
        } else {
            setSelectedExps(uniqueExps);
        }
    };

    const handleEdit = (trade: Trade) => {
        setEditingTrade(trade);
        setIsModalOpen(true);
    };

    const handleClose = (trade: Trade) => {
        setClosingTrade(trade);
        setIsCloseModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingTrade(undefined);
        setIsModalOpen(true);
    };

    const handleImport = () => {
        setIsImportModalOpen(true);
    };

    const handleArchive = (id: string) => {
        if (!id) return;
        setTradeToArchive(id);
    };

    const confirmArchive = () => {
        if (tradeToArchive) {
            archiveTrade(tradeToArchive);
            setTradeToArchive(null);
        }
    };

    const calculateMoneyness = (trade: Trade) => {
        const currentPrice = marketPrices[trade.symbol];
        if (!currentPrice || !trade.strikePrice) return null;

        let val = 0;
        if (trade.type === 'Put') {
            val = (currentPrice - trade.strikePrice) / trade.strikePrice;
        } else {
            // Call
            val = (trade.strikePrice - currentPrice) / trade.strikePrice;
        }
        return val * 100;
    };

    const calculateAnnualizedYield = (trade: Trade) => {
        if (!trade.strikePrice || !trade.premiumPrice) return 0;
        const rawYield = trade.premiumPrice / trade.strikePrice;
        const daysToExpiry = differenceInCalendarDays(parseISO(trade.expirationDate), parseISO(trade.openDate));
        const days = Math.max(1, daysToExpiry);
        const annualized = rawYield * (365 / days);
        return annualized * 100;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Trades</h2>
                <div className="flex items-center space-x-2">
                    {/* Notification Bell */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className={cn(
                                "relative p-2 rounded-lg transition-all duration-200",
                                atRiskTrades.length > 0
                                    ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600"
                                    : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
                            )}
                            title="Assignment Risk Alerts"
                        >
                            <Bell className={cn("h-5 w-5", atRiskTrades.length > 0 && "animate-[wiggle_1s_ease-in-out]")} />
                            {atRiskTrades.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                        {atRiskTrades.length}
                                    </span>
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {isNotificationOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-amber-100 dark:bg-amber-900/40 rounded-md">
                                            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assignment Risk Alerts</h3>
                                    </div>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {atRiskTrades.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <div className="text-gray-400 dark:text-gray-500 mb-2">
                                                <Bell className="h-8 w-8 mx-auto opacity-40" />
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No assignment risks detected</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All trades are looking safe</p>
                                        </div>
                                    ) : (
                                        atRiskTrades.map(trade => (
                                            <div
                                                key={trade.id}
                                                className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{trade.symbol}</span>
                                                            <Badge variant={trade.type === 'Put' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                                                {trade.type}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                ${trade.strikePrice} strike
                                                            </span>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                                                            <span className="text-xs text-red-500 font-medium">
                                                                {trade.moneyness.toFixed(1)}% ITM
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                                                            trade.daysToExp <= 1
                                                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                                                : trade.daysToExp <= 3
                                                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                                                        )}>
                                                            {trade.daysToExp === 0 ? 'Today' : trade.daysToExp === 1 ? '1 day' : `${trade.daysToExp} days`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {atRiskTrades.length > 0 && (
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                                            ITM trades expiring within 7 days
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <Button variant="outline" onClick={handleImport}>
                        <Upload className="mr-2 h-4 w-4" /> Import CSV
                    </Button>
                    <Button onClick={handleAddNew}>
                        <Plus className="mr-2 h-4 w-4" /> New Trade
                    </Button>
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-800">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('open')}
                        className={cn(
                            activeTab === 'open'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors'
                        )}
                    >
                        Open Trades
                        <span className={cn(
                            "ml-2 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800",
                            activeTab === 'open' ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-600 dark:text-gray-400"
                        )}>
                            {openTrades.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('closed')}
                        className={cn(
                            activeTab === 'closed'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors'
                        )}
                    >
                        Closed Trades
                        <span className={cn(
                            "ml-2 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800",
                            activeTab === 'closed' ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-600 dark:text-gray-400"
                        )}>
                            {closedTrades.length}
                        </span>
                    </button>
                </nav>
            </div>

            {/* Broker grouping toggle */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Group by:</span>
                <button
                    onClick={() => setGroupByBroker(prev => !prev)}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        groupByBroker
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600"
                    )}
                >
                    Broker
                </button>
            </div>

            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th
                                    className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                                    onClick={() => handleSort('openDate')}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Opened</span>
                                        {sortConfig?.key === 'openDate' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                                        ) : (
                                            <ArrowUp className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 py-3 whitespace-nowrap">Symbol</th>
                                <th className="px-4 py-3 whitespace-nowrap">Strategy</th>
                                <th className="px-4 py-3 whitespace-nowrap">Side</th>
                                <th className="px-4 py-3 whitespace-nowrap relative">
                                    <div className="flex items-center space-x-1">
                                        <span>Type</span>
                                        {activeTab === 'open' && (
                                            <div className="relative" ref={typeFilterRef}>
                                                <button
                                                    onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
                                                    className={cn(
                                                        "p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                                                        selectedTypes.length < 2 && "text-blue-600 dark:text-blue-400"
                                                    )}
                                                >
                                                    <Filter className="h-3.5 w-3.5" />
                                                </button>

                                                {isTypeFilterOpen && (
                                                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-3 normal-case tracking-normal">
                                                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Filter by Type</div>
                                                        <div className="space-y-2">
                                                            <label className="flex items-center space-x-3 cursor-pointer group">
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-gray-600 transition-all checked:bg-blue-600 checked:border-blue-600"
                                                                        checked={selectedTypes.length === 2}
                                                                        onChange={toggleSelectAllTypes}
                                                                    />
                                                                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                                                        </svg>
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Select All</span>
                                                            </label>

                                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

                                                            <label className="flex items-center space-x-3 cursor-pointer group">
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 dark:border-gray-600 transition-all checked:bg-blue-600 checked:border-blue-600"
                                                                        checked={selectedTypes.includes('Call')}
                                                                        onChange={() => toggleType('Call')}
                                                                    />
                                                                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                                                        </svg>
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Call</span>
                                                            </label>

                                                            <label className="flex items-center space-x-3 cursor-pointer group">
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 dark:border-gray-600 transition-all checked:bg-blue-600 checked:border-blue-600"
                                                                        checked={selectedTypes.includes('Put')}
                                                                        onChange={() => toggleType('Put')}
                                                                    />
                                                                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                                                        </svg>
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Put</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 py-3 whitespace-nowrap">Strike</th>
                                {activeTab === 'open' && (
                                    <th className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center space-x-1">
                                            <span>Last Close</span>
                                            <button
                                                onClick={() => setIsPriceInfoOpen(true)}
                                                className="text-blue-500 hover:text-blue-600 transition-colors"
                                            >
                                                <Info className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </th>
                                )}
                                {activeTab === 'open' && <th className="px-4 py-3 whitespace-nowrap">Moneyness</th>}
                                {activeTab === 'open' && (
                                    <th className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center space-x-1">
                                            <span>Ann. Yield</span>
                                            <button
                                                onClick={() => setIsYieldInfoOpen(true)}
                                                className="text-blue-500 hover:text-blue-600 transition-colors"
                                            >
                                                <Info className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </th>
                                )}
                                <th className="px-4 py-3 whitespace-nowrap">{activeTab === 'open' ? 'Prem.' : 'Realized PnL'}</th>
                                <th className="px-4 py-3 whitespace-nowrap relative">
                                    <div className="flex items-center space-x-1">
                                        <span>Exp.</span>
                                        {activeTab === 'open' && (
                                            <div className="relative" ref={expFilterRef}>
                                                <button
                                                    onClick={() => setIsExpFilterOpen(!isExpFilterOpen)}
                                                    className={cn(
                                                        "p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                                                        selectedExps.length < uniqueExps.length && "text-blue-600 dark:text-blue-400"
                                                    )}
                                                >
                                                    <Filter className="h-3.5 w-3.5" />
                                                </button>

                                                {isExpFilterOpen && uniqueExps.length > 0 && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-3 normal-case tracking-normal">
                                                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Filter by Expiration</div>
                                                        <div className="max-h-60 overflow-y-auto space-y-2">
                                                            <label className="flex items-center space-x-3 cursor-pointer group">
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-gray-600 transition-all checked:bg-blue-600 checked:border-blue-600"
                                                                        checked={selectedExps.length === uniqueExps.length}
                                                                        onChange={toggleSelectAllExps}
                                                                    />
                                                                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                                                        </svg>
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Select All</span>
                                                            </label>

                                                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

                                                            {uniqueExps.map(exp => (
                                                                <label key={exp} className="flex items-center space-x-3 cursor-pointer group">
                                                                    <div className="relative flex items-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 dark:border-gray-600 transition-all checked:bg-blue-600 checked:border-blue-600"
                                                                            checked={selectedExps.includes(exp)}
                                                                            onChange={() => toggleExp(exp)}
                                                                        />
                                                                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                                                            </svg>
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">{exp}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayTrades.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        No {activeTab} trades found.
                                    </td>
                                </tr>
                            ) : groupByBroker ? (
                                groupedByBroker.map(group => (
                                    <>
                                        {/* Broker section header */}
                                        <tr key={`broker-header-${group.name}`} className="bg-blue-50/60 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30">
                                            <td colSpan={9} className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">{group.name}</span>
                                                    <span className="text-xs text-blue-500 dark:text-blue-500 bg-blue-100 dark:bg-blue-900/30 rounded-full px-2 py-0.5">{group.trades.length} trade{group.trades.length !== 1 ? 's' : ''}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {group.trades.map((trade) => (
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
                                                <td className="px-6 py-4 whitespace-nowrap">${trade.strikePrice}</td>
                                                {activeTab === 'open' && (
                                                    <td className="px-4 py-4 text-gray-500">
                                                        {marketPrices[trade.symbol] ? `$${marketPrices[trade.symbol].toFixed(2)}` : '...'}
                                                    </td>
                                                )}
                                                {activeTab === 'open' && (
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        {(() => {
                                                            const moneyness = calculateMoneyness(trade);
                                                            if (moneyness === null) return <span className="text-gray-400">...</span>;
                                                            const isPos = moneyness >= 0;
                                                            return (
                                                                <span className={isPos ? "text-green-600" : "text-red-600"}>
                                                                    {isPos ? "+" : ""}{moneyness.toFixed(2)}%
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                )}
                                                {activeTab === 'open' && (
                                                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                                                        {calculateAnnualizedYield(trade).toFixed(2)}%
                                                    </td>
                                                )}
                                                <td className={cn(
                                                    "px-6 py-4 font-medium whitespace-nowrap",
                                                    activeTab === 'open' ? "text-green-600" : (
                                                        (() => {
                                                            let pnl = 0;
                                                            if (trade.strategy === 'Vert') {
                                                                pnl = (trade.premiumPrice + (trade.closePrice || 0)) * trade.contracts * 100;
                                                            } else {
                                                                pnl = trade.side === 'BUY'
                                                                    ? ((trade.closePrice || 0) - trade.premiumPrice) * trade.contracts * 100
                                                                    : (trade.premiumPrice - (trade.closePrice || 0)) * trade.contracts * 100;
                                                            }
                                                            return pnl >= 0 ? "text-green-600" : "text-red-600";
                                                        })()
                                                    )
                                                )}>
                                                    {activeTab === 'open' ? (
                                                        trade.side === 'BUY'
                                                            ? `-$${(trade.premiumPrice * trade.contracts * 100).toFixed(2)}`
                                                            : `+$${(trade.premiumPrice * trade.contracts * 100).toFixed(2)}`
                                                    ) : (
                                                        (() => {
                                                            let pnl = 0;
                                                            if (trade.strategy === 'Vert') {
                                                                pnl = (trade.premiumPrice + (trade.closePrice || 0)) * trade.contracts * 100;
                                                            } else {
                                                                pnl = trade.side === 'BUY'
                                                                    ? ((trade.closePrice || 0) - trade.premiumPrice) * trade.contracts * 100
                                                                    : (trade.premiumPrice - (trade.closePrice || 0)) * trade.contracts * 100;
                                                            }
                                                            return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
                                                        })()
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{trade.expirationDate}</span>
                                                        {trade.status === 'OPEN' && (
                                                            <span className="text-xs text-gray-500 font-normal">
                                                                ({differenceInCalendarDays(parseISO(trade.expirationDate), new Date())}d)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge
                                                        variant={
                                                            trade.status === 'OPEN' ? 'default' :
                                                                trade.status === 'CLOSED' ? 'success' :
                                                                    trade.status === 'ASSIGNED' ? 'warning' : 'error'
                                                        }
                                                    >
                                                        {trade.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {trade.status === 'OPEN' && (
                                                            <Button variant="ghost" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-2 py-1 h-auto text-sm" onClick={() => handleClose(trade)}>
                                                                Close
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(trade)}>
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleArchive(trade.id)} className="text-red-500 hover:text-red-600" title="Archive Trade">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                ))
                            ) : (
                                displayTrades.map((trade) => (
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
                                        <td className="px-6 py-4 whitespace-nowrap">${trade.strikePrice}</td>
                                        {activeTab === 'open' && (
                                            <td className="px-4 py-4 text-gray-500">
                                                {marketPrices[trade.symbol] ? `$${marketPrices[trade.symbol].toFixed(2)}` : '...'}
                                            </td>
                                        )}
                                        {activeTab === 'open' && (
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {(() => {
                                                    const moneyness = calculateMoneyness(trade);
                                                    if (moneyness === null) return <span className="text-gray-400">...</span>;
                                                    const isPos = moneyness >= 0;
                                                    return (
                                                        <span className={isPos ? "text-green-600" : "text-red-600"}>
                                                            {isPos ? "+" : ""}{moneyness.toFixed(2)}%
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                        {activeTab === 'open' && (
                                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                                                {calculateAnnualizedYield(trade).toFixed(2)}%
                                            </td>
                                        )}
                                        <td className={cn(
                                            "px-6 py-4 font-medium whitespace-nowrap",
                                            activeTab === 'open' ? "text-green-600" : (
                                                (() => {
                                                    let pnl = 0;
                                                    if (trade.strategy === 'Vert') {
                                                        pnl = (trade.premiumPrice + (trade.closePrice || 0)) * trade.contracts * 100;
                                                    } else {
                                                        pnl = trade.side === 'BUY'
                                                            ? ((trade.closePrice || 0) - trade.premiumPrice) * trade.contracts * 100
                                                            : (trade.premiumPrice - (trade.closePrice || 0)) * trade.contracts * 100;
                                                    }
                                                    return pnl >= 0 ? "text-green-600" : "text-red-600";
                                                })()
                                            )
                                        )}>
                                            {activeTab === 'open' ? (
                                                trade.side === 'BUY'
                                                    ? `-$${(trade.premiumPrice * trade.contracts * 100).toFixed(2)}`
                                                    : `+$${(trade.premiumPrice * trade.contracts * 100).toFixed(2)}`
                                            ) : (
                                                (() => {
                                                    let pnl = 0;
                                                    if (trade.strategy === 'Vert') {
                                                        pnl = (trade.premiumPrice + (trade.closePrice || 0)) * trade.contracts * 100;
                                                    } else {
                                                        pnl = trade.side === 'BUY'
                                                            ? ((trade.closePrice || 0) - trade.premiumPrice) * trade.contracts * 100
                                                            : (trade.premiumPrice - (trade.closePrice || 0)) * trade.contracts * 100;
                                                    }
                                                    return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
                                                })()
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span>{trade.expirationDate}</span>
                                                {trade.status === 'OPEN' && (
                                                    <span className="text-xs text-gray-500 font-normal">
                                                        ({differenceInCalendarDays(parseISO(trade.expirationDate), new Date())}d)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <Badge
                                                variant={
                                                    trade.status === 'OPEN' ? 'default' :
                                                        trade.status === 'CLOSED' ? 'success' :
                                                            trade.status === 'ASSIGNED' ? 'warning' : 'error'
                                                }
                                            >
                                                {trade.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {trade.status === 'OPEN' && (
                                                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-2 py-1 h-auto text-sm" onClick={() => handleClose(trade)}>
                                                        Close
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(trade)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleArchive(trade.id)} className="text-red-500 hover:text-red-600" title="Archive Trade">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTrade ? "Edit Trade" : "New Trade"}
            >
                <TradeForm
                    initialData={editingTrade}
                    mode={editingTrade ? 'edit' : 'create'}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
                title="Close Trade"
            >
                <TradeForm
                    initialData={closingTrade}
                    mode="close"
                    onClose={() => setIsCloseModalOpen(false)}
                />
            </Modal>

            <ImportTradeModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />

            <Modal
                isOpen={!!tradeToArchive}
                onClose={() => setTradeToArchive(null)}
                title="Confirm Archive"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Are you sure you want to archive this trade? It will be moved to the Archive list and will no longer count towards your active metrics.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setTradeToArchive(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmArchive}>
                            Archive Trade
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isPriceInfoOpen}
                onClose={() => setIsPriceInfoOpen(false)}
                title=""
                className="max-w-md"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                            <Info className="h-5 w-5 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">About Last Close Prices</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Prices shown are from the most recent market close, not real-time quotes.
                    </p>
                </div>
            </Modal>

            <Modal
                isOpen={isYieldInfoOpen}
                onClose={() => setIsYieldInfoOpen(false)}
                title="Understanding Annualized Yield"
                className="max-w-xl"
            >
                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-lg mb-2">What is Annualized Yield?</h4>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            Annualized Yield normalizes each trade's raw yield to a yearly rate.
                            This makes yields comparable across different holding periods.
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <h5 className="font-medium mb-3">Formula:</h5>
                        <code className="text-sm bg-black/5 dark:bg-white/10 px-2 py-1 rounded block w-fit mb-3">
                            Annualized Yield = Raw Yield × (365 / Days to Expiration)
                        </code>
                        <p className="text-sm text-gray-500">
                            Days to Expiration is calculated from the trade's open date to its expiration date.
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                        <h5 className="font-medium mb-3">Example:</h5>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p>Trade A: 2% yield over 7 days = <span className="font-medium">2% × (365/7) = 104.3% annualized</span></p>
                            <p>Trade B: 3% yield over 30 days = <span className="font-medium">3% × (365/30) = 36.5% annualized</span></p>
                            <p className="mt-3 text-gray-500 italic">
                                Even though Trade B has a higher raw yield, Trade A generates returns faster when annualized.
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
