import { useMemo } from 'react';
import { subMonths, isSameMonth, parseISO, startOfWeek, endOfWeek, subWeeks, isWithinInterval, format, getDay, differenceInDays } from 'date-fns';
import { useTradeStore } from './useTradeStore';

export function useDashboardStats(weekOffset: number = 0, monthOffset: number = 1) {
    const { trades, stockPositions, cashBalance } = useTradeStore();

    return useMemo(() => {
        const now = new Date();
        const twelveMonthsAgo = subMonths(now, 12);
        const targetMonth = subMonths(now, monthOffset);

        // Filter: Active (Closed) Trades for P&L
        const closedTrades = trades.filter(t =>
            t.status !== 'OPEN' && t.closeDate
        );

        // --- Account Overview (All Time) ---
        const totalPnL = closedTrades.reduce((sum, t) => {
            const premium = (t.premiumPrice || 0) * t.contracts * 100;
            const cost = (t.closePrice || 0) * t.contracts * 100;
            let tradePnl = 0;
            if (t.strategy === 'Vert') {
                tradePnl = premium + cost;
            } else {
                tradePnl = t.side === 'BUY' ? (cost - premium) : (premium - cost);
            }
            return sum + tradePnl;
        }, 0) + stockPositions.filter(p => p.status === 'CLOSED').reduce((sum, p) => {
            return sum + ((p.sellPrice || 0) - p.buyPrice) * p.quantity;
        }, 0);

        // --- Collateral & Account Value ---
        const openTrades = trades.filter(t => t.status === 'OPEN');
        const openStocks = stockPositions.filter(p => !p.status || p.status === 'OPEN');

        // 1. CSP Collateral: Strike * 100 * Contracts
        const cspCollateral = openTrades.filter(t => t.type === 'Put').reduce((sum, t) => {
            return sum + (t.strikePrice * 100 * t.contracts);
        }, 0);

        // Helper to match exactly how PositionsList.tsx classifies "Wheel" vs "Long"
        const getLinkedCCs = (pos: typeof openStocks[0]) => {
            const expectedContracts = Math.floor((pos.quantity < 100 && pos.quantity > 0 && pos.quantity <= 50 ? pos.quantity * 100 : pos.quantity) / 100);
            return trades.filter(t => {
                if (t.type !== 'Call') return false;
                if (pos.brokerId && t.brokerId !== pos.brokerId) return false;
                if (t.contracts !== expectedContracts) return false;
                if (t.positionId) return t.positionId === pos.id;
                return t.symbol === pos.symbol && new Date(t.openDate) >= new Date(pos.openDate!);
            });
        };

        // 2. CC Cash Tied Up: Sum of all "Wheel" position basis
        const wheelPositions = openStocks.filter(pos => getLinkedCCs(pos).length > 0);
        const ccCollateral = wheelPositions.reduce((sum, p) => sum + (p.buyPrice * p.quantity), 0);

        // 3. Total Open Stock Basis (CC + Longs)
        const totalOpenStockBasis = openStocks.reduce((sum, p) => sum + (p.buyPrice * p.quantity), 0);

        // Account Value = Cash Ledger Balance + Realized P&L
        const accountValue = cashBalance + totalPnL;

        // Available Cash = Account Value - (CSP + Total Open Stock Basis)
        const totalCommitted = cspCollateral + totalOpenStockBasis;
        const availableCash = accountValue - totalCommitted;

        const totalCollateral = ccCollateral + cspCollateral;


        const lastMonthTrades = closedTrades.filter(t =>
            isSameMonth(parseISO(t.openDate), targetMonth)
        );
        const lastMonthStocks = stockPositions.filter(p =>
            p.status === 'CLOSED' && isSameMonth(parseISO(p.openDate), targetMonth)
        );

        const lastMonthTradePnL = lastMonthTrades.reduce((sum, t) => {
            const premium = (t.premiumPrice || 0) * t.contracts * 100;
            const cost = (t.closePrice || 0) * t.contracts * 100;
            let tradePnl = 0;
            if (t.strategy === 'Vert') {
                tradePnl = premium + cost;
            } else {
                tradePnl = t.side === 'BUY' ? (cost - premium) : (premium - cost);
            }
            return sum + tradePnl;
        }, 0);

        const lastMonthStockPnL = lastMonthStocks.reduce((sum, p) => {
            return sum + ((p.sellPrice || 0) - p.buyPrice) * p.quantity;
        }, 0);

        const lastMonthPnL = lastMonthTradePnL + lastMonthStockPnL;

        // --- Efficiency Stats (Last 12 Months) ---
        const recentTrades = closedTrades.filter(t =>
            new Date(t.closeDate!) >= twelveMonthsAgo
        );

        const calculateEfficiency = (tradeList: typeof trades) => {
            if (tradeList.length === 0) return { avgReturn: 0, winRate: 0, count: 0 };
            // Win Rate
            const tradeWins = tradeList.filter(t => {
                const premium = (t.premiumPrice || 0) * 100 * t.contracts;
                const closeCost = (t.closePrice || 0) * 100 * t.contracts;
                let pnl = 0;
                if (t.strategy === 'Vert') {
                    pnl = premium + closeCost;
                } else {
                    pnl = t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost);
                }
                return pnl > 0;
            }).length;

            const stockWins = stockPositions.filter(p =>
                p.status === 'CLOSED' && (p.sellPrice || 0) > p.buyPrice
            ).length;

            const totalClosed = tradeList.length + stockPositions.filter(p => p.status === 'CLOSED').length;
            if (totalClosed === 0) return { avgReturn: 0, winRate: 0, count: 0 };

            return {
                count: totalClosed,
                winRate: ((tradeWins + stockWins) / totalClosed) * 100
            };
        };

        const calculateStats = (type: 'Put' | 'Call') => {
            const typeTrades = recentTrades.filter(t => t.type === type);
            if (typeTrades.length === 0) return { avgReturn: 0, winRate: 0, count: 0 };

            let totalIncome = 0;
            let totalCapDays = 0;
            let totalDaysHeld = 0;

            typeTrades.forEach(t => {
                const premium = (t.premiumPrice || 0) * 100 * t.contracts;
                const closeCost = (t.closePrice || 0) * 100 * t.contracts;
                let pnl = 0;
                if (t.strategy === 'Vert') {
                    pnl = premium + closeCost;
                } else {
                    pnl = t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost);
                }
                totalIncome += pnl;

                const collateral = t.strikePrice * 100 * t.contracts;
                const days = Math.max(1, differenceInDays(parseISO(t.closeDate!), parseISO(t.openDate)));

                totalCapDays += collateral * days;
                totalDaysHeld += days;
            });

            const avgCapital = totalDaysHeld > 0 ? totalCapDays / totalDaysHeld : 0;
            const avgReturn = avgCapital > 0 ? (totalIncome / avgCapital) * 100 : 0;

            const { winRate } = calculateEfficiency(typeTrades);

            return {
                avgReturn,
                count: typeTrades.length,
                winRate
            };
        };

        const calculateWeeklyStats = () => {
            const currentWeekStart = startOfWeek(subWeeks(now, weekOffset), { weekStartsOn: 1 });
            const currentWeekEnd = endOfWeek(subWeeks(now, weekOffset), { weekStartsOn: 1 });
            const prevWeekStart = startOfWeek(subWeeks(now, weekOffset + 1), { weekStartsOn: 1 });
            const prevWeekEnd = endOfWeek(subWeeks(now, weekOffset + 1), { weekStartsOn: 1 });

            const currentWeekTrades = closedTrades.filter(t =>
                isWithinInterval(parseISO(t.openDate), { start: currentWeekStart, end: currentWeekEnd })
            );
            const currentWeekStocks = stockPositions.filter(p =>
                p.status === 'CLOSED' && p.openDate && isWithinInterval(parseISO(p.openDate), { start: currentWeekStart, end: currentWeekEnd })
            );

            const prevWeekTrades = closedTrades.filter(t =>
                isWithinInterval(parseISO(t.openDate), { start: prevWeekStart, end: prevWeekEnd })
            );
            const prevWeekStocks = stockPositions.filter(p =>
                p.status === 'CLOSED' && p.openDate && isWithinInterval(parseISO(p.openDate), { start: prevWeekStart, end: prevWeekEnd })
            );

            const getPnL = (tradeList: typeof trades, stockList: typeof stockPositions) => {
                const tradePnL = tradeList.reduce((sum, t) => {
                    if (t.strategy === 'Vert') {
                        return sum + ((t.premiumPrice * t.contracts * 100) + ((t.closePrice || 0) * t.contracts * 100));
                    }
                    return sum + (t.side === 'BUY'
                        ? (((t.closePrice || 0) * t.contracts * 100) - (t.premiumPrice * t.contracts * 100))
                        : ((t.premiumPrice * t.contracts * 100) - ((t.closePrice || 0) * t.contracts * 100)));
                }, 0);
                const stockPnL = stockList.reduce((sum, p) => {
                    return sum + ((p.sellPrice || 0) - p.buyPrice) * p.quantity;
                }, 0);
                return tradePnL + stockPnL;
            };

            const currentWeekPnL = getPnL(currentWeekTrades, currentWeekStocks);
            const prevWeekPnL = getPnL(prevWeekTrades, prevWeekStocks);

            const winRateStats = (() => {
                const wins = currentWeekTrades.filter(t => {
                    let pnl = 0;
                    if (t.strategy === 'Vert') {
                        pnl = ((t.premiumPrice * t.contracts * 100) + ((t.closePrice || 0) * t.contracts * 100));
                    } else {
                        pnl = t.side === 'BUY'
                            ? (((t.closePrice || 0) * t.contracts * 100) - (t.premiumPrice * t.contracts * 100))
                            : ((t.premiumPrice * t.contracts * 100) - ((t.closePrice || 0) * t.contracts * 100));
                    }
                    return pnl > 0;
                }).length + currentWeekStocks.filter(p => (p.sellPrice || 0) > p.buyPrice).length;

                const total = currentWeekTrades.length + currentWeekStocks.length;
                return total > 0 ? (wins / total) * 100 : 0;
            })();

            const overallWinRate = (() => {
                const wins = closedTrades.filter(t => {
                    let pnl = 0;
                    if (t.strategy === 'Vert') {
                        pnl = (t.premiumPrice + (t.closePrice || 0)) * t.contracts * 100;
                    } else {
                        pnl = t.side === 'BUY'
                            ? (((t.closePrice || 0) * t.contracts * 100) - (t.premiumPrice * t.contracts * 100))
                            : ((t.premiumPrice * t.contracts * 100) - ((t.closePrice || 0) * t.contracts * 100));
                    }
                    return pnl > 0;
                }).length + stockPositions.filter(p => p.status === 'CLOSED' && (p.sellPrice || 0) > p.buyPrice).length;

                const total = closedTrades.length + stockPositions.filter(p => p.status === 'CLOSED').length;
                return total > 0 ? (wins / total) * 100 : 0;
            })();

            const dailyBreakdown = Array(7).fill(0).map((_, i) => ({
                day: format(new Date(currentWeekStart.getTime() + (i * 24 * 60 * 60 * 1000)), 'EEE'),
                pnl: 0,
                count: 0,
                date: format(new Date(currentWeekStart.getTime() + (i * 24 * 60 * 60 * 1000)), 'yyyy-MM-dd')
            }));

            currentWeekTrades.forEach(t => {
                const dayIndex = getDay(parseISO(t.openDate));
                const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                if (adjustedIndex >= 0 && adjustedIndex < 7) {
                    let pnl = 0;
                    if (t.strategy === 'Vert') {
                        pnl = (t.premiumPrice + (t.closePrice || 0)) * t.contracts * 100;
                    } else {
                        pnl = t.side === 'BUY'
                            ? (((t.closePrice || 0) * t.contracts * 100) - (t.premiumPrice * t.contracts * 100))
                            : ((t.premiumPrice * t.contracts * 100) - ((t.closePrice || 0) * t.contracts * 100));
                    }
                    dailyBreakdown[adjustedIndex].pnl += pnl;
                    dailyBreakdown[adjustedIndex].count += 1;
                }
            });

            currentWeekStocks.forEach(p => {
                const dayIndex = getDay(parseISO(p.openDate));
                const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                if (adjustedIndex >= 0 && adjustedIndex < 7) {
                    const pnl = ((p.sellPrice || 0) - p.buyPrice) * p.quantity;
                    dailyBreakdown[adjustedIndex].pnl += pnl;
                    dailyBreakdown[adjustedIndex].count += 1;
                }
            });

            const tradingDays = dailyBreakdown.filter(d => d.count > 0).length;
            const avgDailyPnL = tradingDays > 0 ? currentWeekPnL / tradingDays : 0;
            const bestDay = Math.max(...dailyBreakdown.map(d => d.pnl));
            const worstDay = Math.min(...dailyBreakdown.map(d => d.pnl));

            return {
                weekNumber: format(currentWeekStart, 'w'),
                year: format(currentWeekStart, 'yyyy'),
                currentWeekPnL,
                prevWeekPnL,
                winRate: winRateStats,
                overallWinRate,
                avgDailyPnL,
                tradingDays,
                dailyBreakdown,
                bestDay: isFinite(bestDay) ? bestDay : 0,
                worstDay: isFinite(worstDay) ? worstDay : 0,
                transactions: [
                    ...currentWeekTrades.map(t => ({ ...t, displayType: 'Option' })),
                    ...currentWeekStocks.map(s => ({ ...s, displayType: 'Stock' }))
                ].sort((a: any, b: any) => b.closeDate!.localeCompare(a.closeDate!))
            };
        };


        const overallPerformance = (() => {
            const allWinners = closedTrades.filter(t => {
                const premium = (t.premiumPrice || 0) * 100 * t.contracts;
                const closeCost = (t.closePrice || 0) * 100 * t.contracts;
                let pnl = 0;
                if (t.strategy === 'Vert') {
                    pnl = premium + closeCost;
                } else {
                    pnl = t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost);
                }
                return pnl > 0;
            }).length + stockPositions.filter(p => p.status === 'CLOSED' && (p.sellPrice || 0) > p.buyPrice).length;

            const totalClosed = closedTrades.length + stockPositions.filter(p => p.status === 'CLOSED').length;
            const winRate = totalClosed > 0 ? (allWinners / totalClosed) * 100 : 0;

            // Profit Factor: Sum(Profits) / Abs(Sum(Losses))
            let grossProfit = 0;
            let grossLoss = 0;

            closedTrades.forEach(t => {
                const premium = (t.premiumPrice || 0) * 100 * t.contracts;
                const closeCost = (t.closePrice || 0) * 100 * t.contracts;
                let pnl = 0;
                if (t.strategy === 'Vert') {
                    pnl = premium + closeCost;
                } else {
                    pnl = t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost);
                }
                if (pnl > 0) grossProfit += pnl;
                else grossLoss += Math.abs(pnl);
            });

            stockPositions.filter(p => p.status === 'CLOSED').forEach(p => {
                const pnl = ((p.sellPrice || 0) - p.buyPrice) * p.quantity;
                if (pnl > 0) grossProfit += pnl;
                else grossLoss += Math.abs(pnl);
            });

            const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 0);

            // Projected 30-day Income
            const next30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
            const projectedIncome = openTrades
                .filter(t => t.expirationDate && parseISO(t.expirationDate) <= next30Days)
                .reduce((sum, t) => sum + (t.premiumPrice * 100 * t.contracts), 0);

            // Avg Trade Duration
            const durations = [
                ...closedTrades.map(t => differenceInDays(parseISO(t.closeDate!), parseISO(t.openDate))),
                ...stockPositions.filter(p => p.status === 'CLOSED').map(p => differenceInDays(parseISO(p.closeDate!), parseISO(p.openDate!)))
            ];
            const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

            return {
                winRate,
                profitFactor,
                projectedIncome,
                avgDuration,
                totalClosed
            };
        })();

        const strategyPerformance = (() => {
            const stats = {
                CSP: { pnl: 0, wins: 0, total: 0 },
                CC: { pnl: 0, wins: 0, total: 0 },
                Vert: { pnl: 0, wins: 0, total: 0 }
            };

            closedTrades.forEach(t => {
                const strat = (t.strategy as keyof typeof stats) || (t.type === 'Put' ? 'CSP' : 'CC');
                if (!stats[strat]) return;

                const premium = (t.premiumPrice || 0) * 100 * t.contracts;
                const closeCost = (t.closePrice || 0) * 100 * t.contracts;
                let tradePnl = 0;
                if (t.strategy === 'Vert') {
                    tradePnl = premium + closeCost;
                } else {
                    tradePnl = t.side === 'BUY' ? (closeCost - premium) : (premium - closeCost);
                }

                stats[strat].pnl += tradePnl;
                stats[strat].total += 1;
                if (tradePnl > 0) stats[strat].wins += 1;
            });

            return Object.entries(stats).map(([name, data]) => ({
                name,
                pnl: data.pnl,
                winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
                count: data.total
            }));
        })();


        const tickerConcentration = (() => {
            const symbols = new Map<string, number>();

            // Option Exposure
            openTrades.forEach(t => {
                let allocated = 0;
                if (t.side === 'BUY') {
                    allocated = (t.premiumPrice || 0) * 100 * (t.contracts || 1);
                } else {
                    if (t.type === 'Put') {
                        // CSP requires strike collateral
                        allocated = (t.strikePrice || 0) * 100 * (t.contracts || 1);
                    } else if (t.strategy === 'Vert') {
                        // Spreads require margin (simplified to 1 strike diff for now or max loss)
                        // For now we don't have strike2, so we'll leave as is or ignore
                        allocated = 0;
                    }
                    // Covered Calls (type === 'Call') are 0 because stock is already counted below
                }
                if (allocated > 0) {
                    symbols.set(t.symbol, (symbols.get(t.symbol) || 0) + allocated);
                }
            });

            // Stock Exposure
            stockPositions.filter(p => p.status === 'OPEN').forEach(p => {
                const basis = p.buyPrice * p.quantity;
                symbols.set(p.symbol, (symbols.get(p.symbol) || 0) + basis);
            });

            return Array.from(symbols.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);
        })();

        const totalAllocatedCapital = Array.from(tickerConcentration.values()).reduce((sum, item: any) => sum + item.value, 0);

        const utilizationPercent = accountValue > 0
            ? (totalAllocatedCapital / accountValue) * 100
            : 0;

        return {
            accountOverview: {
                totalPnL,
                accountValue,
                availableCash,
                totalCollateral,
                ccCollateral,
                cspCollateral
            },
            lastMonth: {
                pnl: lastMonthPnL,
                count: lastMonthTrades.length + lastMonthStocks.length,
                trades: [
                    ...lastMonthTrades.map(t => ({ ...t, displayType: 'Option' })),
                    ...lastMonthStocks.map(s => ({ ...s, displayType: 'Stock' }))
                ].sort((a: any, b: any) => b.openDate.localeCompare(a.openDate))
            },
            efficiency: {
                csp: calculateStats('Put'),
                cc: calculateStats('Call')
            },
            weekly: calculateWeeklyStats(),
            performance: overallPerformance,
            tickerConcentration,
            strategyPerformance,
            utilizationPercent
        };
    }, [trades, stockPositions, cashBalance, weekOffset, monthOffset]);
}
