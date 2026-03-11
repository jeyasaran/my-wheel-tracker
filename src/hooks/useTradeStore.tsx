import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Trade, TradeMetrics, CashTransaction, StockPosition, Broker } from '../types';
import { fetchLastClosePrice } from '../services/marketService';

const STORAGE_KEY = 'wheel-trades-v1';
const TRANSACTIONS_STORAGE_KEY = 'wheel-transactions-v1';
const POSITIONS_STORAGE_KEY = 'wheel-positions-v1';
const BROKERS_STORAGE_KEY = 'wheel-brokers-v1';

export interface TradeContextType {
    trades: Trade[];
    addTrade: (trade: Trade) => void;
    updateTrade: (id: string, updates: Partial<Trade>) => void;
    deleteTrade: (id: string) => void;
    archiveTrade: (id: string) => void;
    restoreTrade: (id: string) => void;
    metrics: TradeMetrics;
    marketPrices: Record<string, number>;
    refreshPrices: () => Promise<void>;
    transactions: CashTransaction[];
    addTransaction: (transaction: CashTransaction) => void;
    deleteTransaction: (id: string) => void;
    cashBalance: number;
    stockPositions: StockPosition[];
    addPosition: (position: StockPosition) => void;
    updatePosition: (id: string, updates: Partial<StockPosition>) => void;
    deletePosition: (id: string) => void;
    closePosition: (id: string, sellPrice: number, closeDate: string) => void;
    brokers: Broker[];
    addBroker: (broker: Broker) => void;
    updateBroker: (id: string, updates: Partial<Broker>) => void;
    deleteBroker: (id: string) => void;
    resetAllData: () => Promise<void>;
    loading: boolean;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

const tradesKey = STORAGE_KEY;
const transKey = TRANSACTIONS_STORAGE_KEY;
const posKey = POSITIONS_STORAGE_KEY;
const brokersKey = BROKERS_STORAGE_KEY;

let migrationLock = false;

export function TradeProvider({ children }: { children: ReactNode }) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [stockPositions, setStockPositions] = useState<StockPosition[]>([]);
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tradesRes, transRes, posRes, brokersRes] = await Promise.all([
                fetch('./api/trades'),
                fetch('./api/transactions'),
                fetch('./api/positions'),
                fetch('./api/brokers')
            ]);

            const fetchedTrades = await tradesRes.json();
            const fetchedTrans = await transRes.json();
            const fetchedPos = await posRes.json();
            const fetchedBrokers = await brokersRes.json();

            // --- Migration Logic ---
            // If the database is empty but localStorage has data, migrate it!
            if (fetchedTrades.length === 0 && fetchedTrans.length === 0 && fetchedPos.length === 0 && fetchedBrokers.length === 0) {
                if (migrationLock) return; // Already migrating or migrated in this session

                const localTrades = JSON.parse(window.localStorage.getItem(tradesKey) || '[]');
                const localTrans = JSON.parse(window.localStorage.getItem(transKey) || '[]');
                const localPos = JSON.parse(window.localStorage.getItem(posKey) || '[]');
                const localBrokers = JSON.parse(window.localStorage.getItem(brokersKey) || '[]');

                if (localTrades.length > 0 || localTrans.length > 0 || localPos.length > 0 || localBrokers.length > 0) {
                    migrationLock = true;
                    console.log('Migrating data from localStorage to database...');

                    // Clean up localStorage EARLY to avoid repeating migration in parallel calls
                    window.localStorage.removeItem(tradesKey);
                    window.localStorage.removeItem(transKey);
                    window.localStorage.removeItem(posKey);
                    window.localStorage.removeItem(brokersKey);

                    // Migrate Brokers first due to foreign keys
                    for (const b of localBrokers) await fetch('./api/brokers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
                    for (const t of localTrades) await fetch('./api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
                    for (const p of localPos) await fetch('./api/positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
                    for (const tr of localTrans) await fetch('./api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tr) });

                    migrationLock = false;
                    // Re-fetch now that migration is complete
                    return fetchData();
                }
            }

            setTrades(fetchedTrades);
            setTransactions(fetchedTrans);
            setStockPositions(fetchedPos);
            setBrokers(fetchedBrokers);
        } catch (error) {
            console.error('Error fetching data from API', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshPrices = async () => {
        const uniqueSymbols = Array.from(new Set([
            ...trades.map(t => t.symbol),
            ...stockPositions.map(p => p.symbol)
        ]));
        const pricePromises = uniqueSymbols.map(async (symbol) => {
            const price = await fetchLastClosePrice(symbol);
            return { symbol, price };
        });

        const results = await Promise.all(pricePromises);
        const newPrices: Record<string, number> = {};
        results.forEach(({ symbol, price }) => {
            newPrices[symbol] = price;
        });
        setMarketPrices(newPrices);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!loading) {
            refreshPrices();
        }
    }, [trades.length, stockPositions.length, loading]);

    const addTrade = async (trade: Trade) => {
        const newTrade = { ...trade, isArchived: false };
        try {
            await fetch('./api/trades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTrade)
            });
            setTrades(prev => [newTrade, ...prev]);
        } catch (error) {
            console.error('Error adding trade', error);
        }
    };

    const updateTrade = async (id: string, updates: Partial<Trade>) => {
        try {
            await fetch(`./api/trades/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            setTrades(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        } catch (error) {
            console.error('Error updating trade', error);
        }
    };

    const archiveTrade = (id: string) => updateTrade(id, { isArchived: true });
    const restoreTrade = (id: string) => updateTrade(id, { isArchived: false });

    const deleteTrade = async (id: string) => {
        try {
            await fetch(`./api/trades/${id}`, { method: 'DELETE' });
            setTrades(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting trade', error);
        }
    };

    const resetAllData = async () => {
        try {
            // Clear DB
            await Promise.all([
                fetch('./api/trades', { method: 'DELETE' }),
                fetch('./api/positions/all', { method: 'DELETE' }).catch(() => { }), // We'll add these endpoints
                fetch('./api/transactions/all', { method: 'DELETE' }).catch(() => { }),
                fetch('./api/brokers/all', { method: 'DELETE' }).catch(() => { })
            ]);

            // Clear localStorage
            window.localStorage.removeItem(tradesKey);
            window.localStorage.removeItem(transKey);
            window.localStorage.removeItem(posKey);
            window.localStorage.removeItem(brokersKey);

            // Clear State
            setTrades([]);
            setTransactions([]);
            setStockPositions([]);
            setBrokers([]);

            console.log('Successfully reset all data.');
        } catch (error) {
            console.error('Error resetting all data', error);
        }
    };

    const addTransaction = async (transaction: CashTransaction) => {
        try {
            await fetch('./api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transaction)
            });
            setTransactions(prev => [transaction, ...prev]);
        } catch (error) {
            console.error('Error adding transaction', error);
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            await fetch(`./api/transactions/${id}`, { method: 'DELETE' });
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting transaction', error);
        }
    };

    const addPosition = async (position: StockPosition) => {
        try {
            await fetch('./api/positions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(position)
            });
            setStockPositions(prev => [position, ...prev]);
        } catch (error) {
            console.error('Error adding position', error);
        }
    };

    const updatePosition = async (id: string, updates: Partial<StockPosition>) => {
        try {
            await fetch(`./api/positions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            setStockPositions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        } catch (error) {
            console.error('Error updating position', error);
        }
    };

    const deletePosition = async (id: string) => {
        try {
            await fetch(`./api/positions/${id}`, { method: 'DELETE' });
            setStockPositions(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting position', error);
        }
    };

    const closePosition = (id: string, sellPrice: number, closeDate: string) => {
        updatePosition(id, { status: 'CLOSED', sellPrice, closeDate });
    };

    const addBroker = async (broker: Broker) => {
        try {
            await fetch('./api/brokers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(broker)
            });
            setBrokers(prev => [broker, ...prev]);
        } catch (error) {
            console.error('Error adding broker', error);
        }
    };

    const updateBroker = async (id: string, updates: Partial<Broker>) => {
        try {
            await fetch(`./api/brokers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            setBrokers(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
        } catch (error) {
            console.error('Error updating broker', error);
        }
    };

    const deleteBroker = async (id: string) => {
        try {
            await fetch(`./api/brokers/${id}`, { method: 'DELETE' });
            setBrokers(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting broker', error);
        }
    };

    const cashBalance = transactions.reduce((sum, t) => {
        return t.type === 'DEPOSIT' ? sum + t.amount : sum - t.amount;
    }, 0);

    const activeTrades = trades.filter(t => !t.isArchived);

    const metrics: TradeMetrics = {
        totalPremium: activeTrades.reduce((sum, t) => sum + ((t.premiumPrice || 0) * t.contracts * 100), 0),
        totalPnL: (() => {
            const tradesPnL = activeTrades.reduce((sum, t) => {
                if (t.status === 'OPEN') return sum;
                const openingValue = (t.premiumPrice || 0) * t.contracts * 100;
                const closingValue = (t.closePrice || 0) * t.contracts * 100;
                return sum + (openingValue - closingValue);
            }, 0);

            const stocksPnL = stockPositions.filter(p => p.status === 'CLOSED').reduce((sum, p) => {
                return sum + ((p.sellPrice || 0) - p.buyPrice) * p.quantity;
            }, 0);

            return tradesPnL + stocksPnL;
        })(),
        winRate: (() => {
            const closedTrades = activeTrades.filter(t => t.status !== 'OPEN');
            const closedStocks = stockPositions.filter(p => p.status === 'CLOSED');

            const totalClosed = closedTrades.length + closedStocks.length;
            if (totalClosed === 0) return 0;

            const tradeWins = closedTrades.filter(t => {
                const totalPremium = (t.premiumPrice || 0) * t.contracts * 100;
                const costToClose = t.closePrice ? t.closePrice * t.contracts * 100 : 0;
                return totalPremium > costToClose;
            }).length;

            const stockWins = closedStocks.filter(p => (p.sellPrice || 0) > p.buyPrice).length;

            return ((tradeWins + stockWins) / totalClosed) * 100;
        })(),
        activeTradesCount: activeTrades.filter(t => t.status === 'OPEN').length,
    };

    return (
        <TradeContext.Provider value={{
            trades,
            addTrade,
            updateTrade,
            deleteTrade,
            archiveTrade,
            restoreTrade,
            metrics,
            marketPrices,
            refreshPrices,
            transactions,
            addTransaction,
            deleteTransaction,
            cashBalance,
            stockPositions,
            addPosition,
            updatePosition,
            deletePosition,
            closePosition,
            brokers,
            addBroker,
            updateBroker,
            deleteBroker,
            resetAllData,
            loading
        }}>
            {children}
        </TradeContext.Provider>
    );
}

export const useTradeStore = () => {
    const context = useContext(TradeContext);
    if (context === undefined) {
        throw new Error('useTradeStore must be used within a TradeProvider');
    }
    return context;
};
