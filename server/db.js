import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'wheel_tracker.db');

if (process.env.DB_PATH) {
    const packagedDbPath = join(__dirname, 'wheel_tracker.db');
    const legacyDbPath = '/data/wheel_tracker.db';

    // 1. If /share DB doesn't exist, check if /data DB exists (Migration)
    if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
        console.log(`Migrating existing database from ${legacyDbPath} to ${dbPath}`);
        fs.mkdirSync(dirname(dbPath), { recursive: true });
        fs.copyFileSync(legacyDbPath, dbPath);
    }
    // 2. If still doesn't exist, seed from packaged database
    else if (!fs.existsSync(dbPath) && fs.existsSync(packagedDbPath)) {
        console.log(`Seeding initial database from ${packagedDbPath} to ${dbPath}`);
        fs.mkdirSync(dirname(dbPath), { recursive: true });
        fs.copyFileSync(packagedDbPath, dbPath);
    }
}

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

        // Positions table — defensive initialization handling all possible migration states
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='positions'", [], (err, posRow) => {
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='positions_new'", [], (err2, newRow) => {
                
                if (!posRow && newRow) {
                    // positions was dropped but positions_new was left behind by a broken migration
                    console.log('Recovery: renaming orphaned positions_new to positions...');
                    db.run('ALTER TABLE positions_new RENAME TO positions', [], (err) => {
                        if (err) console.error('Recovery error:', err.message);
                        else console.log('Recovery complete: positions table restored.');
                    });

                } else if (!posRow && !newRow) {
                    // Fresh install — create the positions table from scratch
                    db.run(`CREATE TABLE positions (
                        id TEXT PRIMARY KEY,
                        symbol TEXT NOT NULL,
                        openDate TEXT NOT NULL,
                        buyPrice REAL NOT NULL,
                        quantity REAL NOT NULL,
                        notes TEXT,
                        status TEXT DEFAULT 'OPEN',
                        sellPrice REAL,
                        closeDate TEXT,
                        brokerId TEXT
                    )`, [], (err) => {
                        if (err) console.error('Error creating positions table:', err.message);
                    });

                } else if (posRow && newRow) {
                    // Both tables exist — drop the orphaned positions_new and keep going
                    console.log('Cleanup: dropping orphaned positions_new table...');
                    db.run('DROP TABLE positions_new', [], (err) => {
                        if (err) console.error('Cleanup error:', err.message);
                        else maybeRemoveUniqueConstraint();
                    });

                } else if (posRow) {
                    // Normal case — positions table exists, check if constraint needs removing
                    maybeRemoveUniqueConstraint();
                }

                function maybeRemoveUniqueConstraint() {
                    db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='positions'", [], (err, row) => {
                        if (err || !row) return;
                        if (!row.sql.includes('UNIQUE(symbol')) return; // Already clean
                        console.log('Migration: removing UNIQUE constraint from positions table...');
                        db.run(`CREATE TABLE positions_new (
                            id TEXT PRIMARY KEY,
                            symbol TEXT NOT NULL,
                            openDate TEXT NOT NULL,
                            buyPrice REAL NOT NULL,
                            quantity REAL NOT NULL,
                            notes TEXT,
                            status TEXT DEFAULT 'OPEN',
                            sellPrice REAL,
                            closeDate TEXT,
                            brokerId TEXT
                        )`, [], (err) => {
                            if (err) { console.error('Migration error (create positions_new):', err.message); return; }
                            db.run('INSERT INTO positions_new SELECT id, symbol, openDate, buyPrice, quantity, notes, status, sellPrice, closeDate, brokerId FROM positions', [], (err) => {
                                if (err) { console.error('Migration error (copy positions):', err.message); return; }
                                db.run('DROP TABLE positions', [], (err) => {
                                    if (err) { console.error('Migration error (drop positions):', err.message); return; }
                                    db.run('ALTER TABLE positions_new RENAME TO positions', [], (err) => {
                                        if (err) { console.error('Migration error (rename):', err.message); return; }
                                        console.log('Migration complete: positions UNIQUE constraint removed.');
                                    });
                                });
                            });
                        });
                    });
                }
            });
        });

        // Transactions table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            notes TEXT,
            UNIQUE(type, amount, date)
        )`);

        // NAV Entries table
        db.run(`CREATE TABLE IF NOT EXISTS nav_entries (
            id TEXT PRIMARY KEY,
            monthYear TEXT NOT NULL,
            brokerId TEXT NOT NULL,
            navValue REAL NOT NULL DEFAULT 0,
            cashIn REAL NOT NULL DEFAULT 0,
            cashOut REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (brokerId) REFERENCES brokers (id),
            UNIQUE(monthYear, brokerId)
        )`);
    });
}

export default db;
