import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'wheel_tracker.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Brokers table
        db.run(`CREATE TABLE IF NOT EXISTS brokers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            dateAdded TEXT NOT NULL,
            notes TEXT,
            UNIQUE(name)
        )`);

        // Trades table
        db.run(`CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL,
            type TEXT NOT NULL,
            strategy TEXT NOT NULL DEFAULT '',
            strikePrice REAL NOT NULL DEFAULT 0,
            premiumPrice REAL NOT NULL DEFAULT 0,
            contracts INTEGER NOT NULL DEFAULT 1,
            openDate TEXT NOT NULL,
            expirationDate TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            positionId TEXT NOT NULL DEFAULT '',
            brokerId TEXT NOT NULL DEFAULT '',
            closeDate TEXT NOT NULL DEFAULT '',
            closePrice REAL NOT NULL DEFAULT 0,
            isArchived INTEGER DEFAULT 0,
            FOREIGN KEY (brokerId) REFERENCES brokers (id),
            UNIQUE(symbol, side, type, strikePrice, premiumPrice, contracts, openDate, expirationDate, brokerId)
        )`);

        // Migration: add strategy column if missing
        db.all("PRAGMA table_info(trades)", [], (err, columns) => {
            if (err) return;
            const hasStrategy = columns.some(c => c.name === 'strategy');
            if (!hasStrategy) {
                console.log('Migrating: adding strategy column to trades...');
                db.run("ALTER TABLE trades ADD COLUMN strategy TEXT NOT NULL DEFAULT ''", [], (err) => {
                    if (err) {
                        console.error('Migration error (add strategy):', err.message);
                        return;
                    }
                    // Backfill strategy from old type values, then rename type
                    db.run("UPDATE trades SET strategy = 'CSP' WHERE type = 'CSP'");
                    db.run("UPDATE trades SET strategy = 'CC' WHERE type = 'CC'");
                    db.run("UPDATE trades SET type = 'Put' WHERE type = 'CSP'");
                    db.run("UPDATE trades SET type = 'Call' WHERE type = 'CC'", [], () => {
                        console.log('Migration complete: strategy column added and type values updated.');
                    });
                });
            }
        });

        // Positions table
        db.run(`CREATE TABLE IF NOT EXISTS positions (
            id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            openDate TEXT NOT NULL,
            buyPrice REAL NOT NULL,
            quantity REAL NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'OPEN',
            sellPrice REAL,
            closeDate TEXT,
            brokerId TEXT,
            FOREIGN KEY (brokerId) REFERENCES brokers (id),
            UNIQUE(symbol, openDate, buyPrice, quantity)
        )`);

        // Transactions table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            notes TEXT,
            UNIQUE(type, amount, date)
        )`);
    });
}

export default db;
