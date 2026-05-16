import { useMemo } from 'react';
import { useTradeStore } from './useTradeStore';
import { parseISO, format, isSameMonth, subMonths } from 'date-fns';

export interface MonthlyReportData {
    monthYear: string;
    
    // Executive Summary
    totalRealizedPremium: number;
    navChange: number;
    navChangePercentage: number;
    winRate: number;
    totalTradesClosed: number;
    totalProfitableTrades: number;
    
    // Options Strategy Breakdown
    premiumByStrategy: {
        CSP: number;
        CC: number;
        Vert: number;
        Other: number;
    };
    assignmentRate: number;
    topTickers: { symbol: string; premium: number }[];
    
    // Capital & Positions
    totalAccountValue: number;
    capitalDeployed: number;
    capitalUtilization: number;
    endingStockValue: number;
    endingUnrealizedPnL: number;
}

export function useMonthlyReport(selectedDate: Date): MonthlyReportData {
    const { trades, stockPositions, navEntries } = useTradeStore();

    return useMemo(() => {
        const monthYear = format(selectedDate, 'yyyy-MM');
        
        // 1. Filter trades closed in this month
        const closedTrades = trades.filter(t => 
            (t.status === 'CLOSED' || t.status === 'EXPIRED' || t.status === 'ASSIGNED' || t.status === 'CALLED_AWAY') && 
            t.closeDate && 
            isSameMonth(parseISO(t.closeDate), selectedDate)
        );

        const getTradePnL = (t: typeof trades[0]) => {
            const premium = (t.premiumPrice || 0) * t.contracts * 100;
            const cost = (t.closePrice || 0) * t.contracts * 100;
            if (t.strategy === 'Vert') return premium + cost;
            return t.side === 'BUY' ? (cost - premium) : (premium - cost);
        };

        // --- Executive Summary Calculations ---
        const totalRealizedPremium = closedTrades.reduce((sum, t) => sum + getTradePnL(t), 0);

        let totalProfitableTrades = 0;
        closedTrades.forEach(t => {
            if (getTradePnL(t) > 0) totalProfitableTrades++;
        });

        const winRate = closedTrades.length > 0 ? (totalProfitableTrades / closedTrades.length) * 100 : 0;

        // --- NAV Calculations ---
        const currentNavEntries = navEntries.filter((n: any) => n.monthYear === monthYear);
        const previousMonthDate = subMonths(selectedDate, 1);
        const previousMonthYear = format(previousMonthDate, 'yyyy-MM');
        const previousNavEntries = navEntries.filter((n: any) => n.monthYear === previousMonthYear);

        // Sum across all brokers for the month
        const currentNav = currentNavEntries.reduce((sum, n) => sum + (n.navValue || 0), 0);
        const previousNav = previousNavEntries.reduce((sum, n) => sum + (n.navValue || 0), 0);
        
        // Accurate NAV Change accounting for cash ins/outs
        // NAV Change = (Current NAV - Cash In + Cash Out) - Previous NAV
        const cashIn = currentNavEntries.reduce((sum, n) => sum + (n.cashIn || 0), 0);
        const cashOut = currentNavEntries.reduce((sum, n) => sum + (n.cashOut || 0), 0);
        const adjustedCurrentNav = currentNav - cashIn + cashOut;
        
        const navChange = previousNav > 0 ? adjustedCurrentNav - previousNav : 0;
        const navChangePercentage = previousNav > 0 ? (navChange / previousNav) * 100 : 0;

        // --- Options Strategy Breakdown ---
        const premiumByStrategy = { CSP: 0, CC: 0, Vert: 0, Other: 0 };
        
        closedTrades.forEach(t => {
            const netPremium = getTradePnL(t);
            if (t.strategy === 'CSP') premiumByStrategy.CSP += netPremium;
            else if (t.strategy === 'CC') premiumByStrategy.CC += netPremium;
            else if (t.strategy === 'Vert') premiumByStrategy.Vert += netPremium;
            else premiumByStrategy.Other += netPremium;
        });

        const shortPuts = closedTrades.filter(t => t.strategy === 'CSP' || (t.type === 'Put' && t.side === 'SELL'));
        const assignedPuts = shortPuts.filter(t => t.status === 'ASSIGNED');
        const assignmentRate = shortPuts.length > 0 ? (assignedPuts.length / shortPuts.length) * 100 : 0;

        const tickerPremiums: Record<string, number> = {};
        closedTrades.forEach(t => {
            const netPremium = getTradePnL(t);
            tickerPremiums[t.symbol] = (tickerPremiums[t.symbol] || 0) + netPremium;
        });
        
        const topTickers = Object.entries(tickerPremiums)
            .map(([symbol, premium]) => ({ symbol, premium }))
            .sort((a, b) => b.premium - a.premium)
            .slice(0, 5);

        // --- Capital & Positions Details (End of Month Snapshot) ---
        // Open positions or positions closed *after* this month
        const activePositions = stockPositions.filter(p => {
            const posOpenDate = parseISO(p.openDate);
            // Must have been opened by end of this month
            if (posOpenDate > new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)) return false;
            
            // Must still be open, or closed in a future month
            if (p.status === 'CLOSED' && p.closeDate) {
                const posCloseDate = parseISO(p.closeDate);
                if (posCloseDate <= new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)) return false;
            }
            return true;
        });

        // Open trades active during this month
        const activeTrades = trades.filter(t => {
            const tradeOpenDate = parseISO(t.openDate);
            if (tradeOpenDate > new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)) return false;
            
            if (t.status !== 'OPEN' && t.closeDate) {
                const tradeCloseDate = parseISO(t.closeDate);
                if (tradeCloseDate <= new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)) return false;
            }
            return true;
        });

        let endingStockValue = 0;
        let capitalDeployedInOptions = 0;

        activePositions.forEach(p => {
            endingStockValue += p.buyPrice * p.quantity;
        });

        activeTrades.forEach(t => {
            if (t.strategy === 'CSP' || (t.type === 'Put' && t.side === 'SELL' && t.strategy !== 'Vert')) {
                capitalDeployedInOptions += t.strikePrice * t.contracts * 100;
            } else if (t.strategy === 'Vert') {
                // Appropriate collateral for spread
                const leg2 = t.leg2StrikePrice || t.strikePrice;
                const collateral = Math.abs(t.strikePrice - leg2) * t.contracts * 100;
                capitalDeployedInOptions += collateral;
            }
        });

        const capitalDeployed = endingStockValue + capitalDeployedInOptions;
        const capitalUtilization = currentNav > 0 ? (capitalDeployed / currentNav) * 100 : 0;
        
        // Simplified unrealized PnL based on Last Close from API (if we had historical prices we could be exact)
        // For this we'll just track the cost basis vs current for simplicity, 
        // since historical stock prices aren't easily available per month in the current schema
        const endingUnrealizedPnL = 0; // Requires historical quote data, leaving 0 for now or could estimate.

        return {
            monthYear,
            totalRealizedPremium,
            navChange,
            navChangePercentage,
            winRate,
            totalTradesClosed: closedTrades.length,
            totalProfitableTrades,
            premiumByStrategy,
            assignmentRate,
            topTickers,
            totalAccountValue: currentNav,
            capitalDeployed,
            capitalUtilization,
            endingStockValue,
            endingUnrealizedPnL
        };
    }, [trades, stockPositions, navEntries, selectedDate]);
}
