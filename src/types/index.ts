export type OptionType = 'Put' | 'Call';
export type TradeStatus = 'OPEN' | 'CLOSED' | 'ASSIGNED' | 'EXPIRED';
export type Strategy = 'CSP' | 'CC' | 'Vert';

export interface Trade {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    type: OptionType;
    strategy?: Strategy;
    strikePrice: number;
    premiumPrice: number; // Price per share (e.g., 0.25)
    contracts: number;
    openDate: string; // ISO Date
    expirationDate: string; // ISO Date
    closeDate?: string; // ISO Date
    closePrice?: number; // Cost to close 
    status: TradeStatus;
    notes?: string;
    isArchived?: boolean;
    positionId?: string;
    brokerId?: string;
}

export interface TradeMetrics {
    totalPremium: number;
    totalPnL: number;
    winRate: number;
    activeTradesCount: number;
}

export interface CashTransaction {
    id: string;
    date: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    description?: string;
}

export interface StockPosition {
    id: string;
    symbol: string;
    openDate: string;
    buyPrice: number;
    quantity: number;
    notes?: string;
    status?: 'OPEN' | 'CLOSED';
    closeDate?: string;
    sellPrice?: number;
    brokerId?: string;
}

export interface Broker {
    id: string;
    name: string;
    dateAdded: string;
    notes?: string;
}
