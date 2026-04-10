import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, '../dist')));

// --- Brokers ---
app.get('/api/brokers', (req, res) => {
    db.all('SELECT * FROM brokers ORDER BY dateAdded DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/brokers', (req, res) => {
    const { id, name, dateAdded, notes } = req.body;
    db.run('INSERT OR IGNORE INTO brokers (id, name, dateAdded, notes) VALUES (?, ?, ?, ?)',
        [id, name, dateAdded, notes],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, dateAdded, notes });
        }
    );
});

app.patch('/api/brokers/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const sql = `UPDATE brokers SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.run(sql, [...values, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/brokers/:id', (req, res) => {
    db.run('DELETE FROM brokers WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/brokers', (req, res) => {
    db.run('DELETE FROM brokers', [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, count: this.changes });
    });
});

// --- Trades ---
app.get('/api/trades', (req, res) => {
    db.all('SELECT * FROM trades ORDER BY openDate DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // SQL doesn't have booleans, convert isArchived back to boolean
        const trades = rows.map(r => ({ ...r, isArchived: !!r.isArchived }));
        res.json(trades);
    });
});

app.post('/api/trades', (req, res) => {
    const { id, symbol, side, type, strategy, strikePrice, premiumPrice, contracts, openDate, expirationDate, status, notes, positionId, brokerId, closeDate, closePrice, isArchived } = req.body;
    const query = `
        INSERT INTO trades (id, symbol, side, type, strategy, strikePrice, premiumPrice, contracts, openDate, expirationDate, status, notes, positionId, brokerId, closeDate, closePrice, isArchived)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol, side, type, strikePrice, premiumPrice, contracts, openDate, expirationDate, brokerId)
        DO UPDATE SET
            status = excluded.status,
            strategy = excluded.strategy,
            notes = excluded.notes,
            positionId = CASE WHEN excluded.positionId != '' THEN excluded.positionId ELSE trades.positionId END,
            closeDate = excluded.closeDate,
            closePrice = excluded.closePrice,
            isArchived = excluded.isArchived
    `;
    db.run(query,
        [
            id,
            symbol,
            side,
            type,
            strategy || '',
            strikePrice || 0,
            premiumPrice || 0,
            contracts || 1,
            openDate,
            expirationDate || '',
            status,
            notes || '',
            positionId || '',
            brokerId || '',
            closeDate || '',
            closePrice || 0,
            isArchived ? 1 : 0
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json(req.body);
        }
    );
});

app.patch('/api/trades/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (updates.isArchived !== undefined) {
        updates.isArchived = updates.isArchived ? 1 : 0;
    }
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const sql = `UPDATE trades SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.run(sql, [...values, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/trades/:id', (req, res) => {
    db.run('DELETE FROM trades WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/trades', (req, res) => {
    db.run('DELETE FROM trades', [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, count: this.changes });
    });
});

// --- Positions ---
app.get('/api/positions', (req, res) => {
    db.all('SELECT * FROM positions ORDER BY openDate DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/positions', (req, res) => {
    const { id, symbol, openDate, buyPrice, quantity, notes, status, sellPrice, closeDate, brokerId } = req.body;
    db.run('INSERT OR IGNORE INTO positions (id, symbol, openDate, buyPrice, quantity, notes, status, sellPrice, closeDate, brokerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, symbol, openDate, buyPrice, quantity, notes, status, sellPrice, closeDate, brokerId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json(req.body);
        }
    );
});

app.patch('/api/positions/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const sql = `UPDATE positions SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.run(sql, [...values, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/positions/:id', (req, res) => {
    db.run('DELETE FROM positions WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/positions', (req, res) => {
    db.run('DELETE FROM positions', [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, count: this.changes });
    });
});

// --- Transactions ---
app.get('/api/transactions', (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/transactions', (req, res) => {
    const { id, type, amount, date, notes } = req.body;
    db.run('INSERT OR IGNORE INTO transactions (id, type, amount, date, notes) VALUES (?, ?, ?, ?, ?)',
        [id, type, amount, date, notes],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json(req.body);
        }
    );
});

app.delete('/api/transactions/:id', (req, res) => {
    db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/transactions', (req, res) => {
    db.run('DELETE FROM transactions', [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, count: this.changes });
    });
});


app.get('/api/stock-history', async (req, res) => {
    const { symbol, period1, period2 } = req.query;
    if (!symbol || !period1 || !period2) {
        return res.status(400).json({ error: 'symbol, period1, and period2 are required' });
    }
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            }
        });
        if (!response.ok) {
            return res.status(502).json({ error: `Yahoo Finance returned ${response.status}` });
        }
        const json = await response.json();
        const result = json?.chart?.result?.[0];
        if (!result) {
            return res.status(502).json({ error: 'No data returned from Yahoo Finance' });
        }

        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        const data = timestamps.map((ts, i) => {
            const close = closes[i];
            if (close == null) return null;
            const date = new Date(ts * 1000);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return { date: `${yyyy}-${mm}-${dd}`, close: Number(close.toFixed(2)) };
        }).filter(Boolean);

        res.json(data);
    } catch (err) {
        console.error(`Stock history fetch error for ${symbol}:`, err);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

app.get('/api/spy-history', async (req, res) => {
    const { period1, period2 } = req.query;
    if (!period1 || !period2) {
        return res.status(400).json({ error: 'period1 and period2 are required' });
    }
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&period1=${period1}&period2=${period2}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            }
        });
        if (!response.ok) {
            return res.status(502).json({ error: `Yahoo Finance returned ${response.status}` });
        }
        const json = await response.json();
        const result = json?.chart?.result?.[0];
        if (!result) {
            return res.status(502).json({ error: 'No data returned from Yahoo Finance' });
        }

        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        // Find the first valid closing price to use as baseline (0%)
        let basePrice = null;
        for (const c of closes) {
            if (c != null) { basePrice = c; break; }
        }

        if (basePrice === null) {
            return res.json([]);
        }

        const data = timestamps.map((ts, i) => {
            const close = closes[i];
            if (close == null) return null;
            const date = new Date(ts * 1000);
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return {
                date: `${yyyy}/${mm}/${dd}`,
                returnPct: Number((((close - basePrice) / basePrice) * 100).toFixed(2)),
            };
        }).filter(Boolean);

        res.json(data);
    } catch (err) {
        console.error('SPY fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch SPY data' });
    }
});

app.get('/api/current-price', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) {
        return res.status(400).json({ error: 'symbol is required' });
    }
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            }
        });
        if (!response.ok) {
            return res.status(502).json({ error: `Yahoo Finance returned ${response.status}` });
        }
        const json = await response.json();
        const result = json?.chart?.result?.[0];
        if (!result || !result.meta || result.meta.regularMarketPrice === undefined) {
            return res.status(502).json({ error: 'No data returned from Yahoo Finance' });
        }

        res.json({ price: result.meta.regularMarketPrice });
    } catch (err) {
        console.error(`Current price fetch error for ${symbol}:`, err);
        res.status(500).json({ error: 'Failed to fetch current price data' });
    }
});

// --- NAV Entries ---
app.get('/api/nav-entries', (req, res) => {
    db.all('SELECT * FROM nav_entries ORDER BY monthYear ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/nav-entries', (req, res) => {
    const { id, monthYear, brokerId, navValue, cashIn, cashOut } = req.body;
    db.run(
        `INSERT INTO nav_entries (id, monthYear, brokerId, navValue, cashIn, cashOut)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(monthYear, brokerId) DO UPDATE SET
           navValue = excluded.navValue,
           cashIn = excluded.cashIn,
           cashOut = excluded.cashOut`,
        [id, monthYear, brokerId, navValue ?? 0, cashIn ?? 0, cashOut ?? 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, monthYear, brokerId, navValue, cashIn, cashOut });
        }
    );
});

app.delete('/api/nav-entries/:id', (req, res) => {
    db.run('DELETE FROM nav_entries WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Catch-all route for SPA: serve index.html for any request that doesn't match an API route
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
