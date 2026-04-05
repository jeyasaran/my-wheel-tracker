const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/Users/saravananj/Documents/GoogleAG/options-wheel-tracker/server/wheel_tracker.db');

db.all("SELECT * FROM trades", (err, trades) => {
    db.all("SELECT * FROM positions", (err, stockPositions) => {
        const openTrades = trades.filter(t => t.status === 'OPEN');
        const openStocks = stockPositions.filter(p => !p.status || p.status === 'OPEN');

        const tiedStockIds = new Set();
        const ccCollateral = openTrades.filter(t => t.type === 'Call').reduce((sum, t) => {
            const ticker = (t.symbol || '').trim().toUpperCase();
            const matchingStocks = openStocks.filter(s => (s.symbol || '').trim().toUpperCase() === ticker);
            
            if (matchingStocks.length > 0) {
                let tradeBasis = 0;
                let contractsToCover = t.contracts;
                for (const stock of matchingStocks) {
                    if (contractsToCover <= 0) break;
                    const isLotBased = stock.quantity < 100 && stock.quantity === t.contracts;
                    const sharesAvailable = isLotBased ? stock.quantity * 100 : stock.quantity;
                    const availableContracts = Math.floor(sharesAvailable / 100);
                    
                    const covering = Math.min(contractsToCover, availableContracts);
                    if (covering > 0) {
                        tradeBasis += (covering * 100 * stock.buyPrice);
                        contractsToCover -= covering;
                        tiedStockIds.add(stock.id);
                    }
                }
                if (tradeBasis === 0) {
                    tradeBasis = t.contracts * 100 * matchingStocks[0].buyPrice;
                    tiedStockIds.add(matchingStocks[0].id);
                }
                console.log(`Call for ${ticker}: contracts=${t.contracts}, tradeBasis=${tradeBasis}`);
                return sum + tradeBasis;
            }
            return sum;
        }, 0);

        console.log("Total CC Collateral:", ccCollateral);
        
        const cspCollateral = openTrades.filter(t => t.type === 'Put').reduce((sum, t) => {
            return sum + (t.strikePrice * 100 * t.contracts);
        }, 0);
        console.log("Total CSP:", cspCollateral);
        
    });
});
