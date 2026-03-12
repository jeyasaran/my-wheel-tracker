const CACHE_KEY = 'options_wheel_market_cache';
const CACHE_TTL = 900000; // 15 minutes (15 * 60 * 1000)
const API_KEY_STORAGE_KEY = 'massive_api_key';

// Rate limiting: 5 requests per minute
const MAX_REQUESTS_PER_MINUTE = 5;
const requestHistory: number[] = [];

const canMakeRequest = (): boolean => {
    const now = Date.now();
    // Remove requests older than 1 minute
    while (requestHistory.length > 0 && requestHistory[0] < now - 60000) {
        requestHistory.shift();
    }
    return requestHistory.length < MAX_REQUESTS_PER_MINUTE;
};

const recordRequest = () => {
    requestHistory.push(Date.now());
};

const getApiKey = () => localStorage.getItem(API_KEY_STORAGE_KEY);

interface PolygonPrevResponse {
    results: [{
        c: number; // close price
    }];
    status: string;
}

interface CacheEntry {
    price: number;
    timestamp: number;
}

const DEFAULT_MOCK_PRICES: Record<string, number> = {
    'AAPL': 242.50,
    'MSFT': 428.10,
    'GOOGL': 192.30,
    'AMZN': 201.10,
    'TSLA': 405.20,
    'NVDA': 142.80,
    'AMD': 158.40,
    'MARA': 22.15,
    'RIOT': 13.40,
    'TQQQ': 82.60,
    'SPY': 602.30,
    'QQQ': 521.15,
};

export const verifyConnection = async (key: string): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=${key}`);
        if (response.ok) {
            return { success: true, message: 'Successfully connected to Massive API' };
        }
        const data = await response.json();
        return { success: false, message: data.error || 'Connection failed' };
    } catch (error) {
        return { success: false, message: 'Network error occurred' };
    }
};

export const fetchLastClosePrice = async (symbol: string): Promise<number> => {
    // 1. Check Cache
    const cachedData = localStorage.getItem(CACHE_KEY);
    let cache: Record<string, CacheEntry> = {};
    let existingEntry: CacheEntry | null = null;

    if (cachedData) {
        try {
            cache = JSON.parse(cachedData);
            existingEntry = cache[symbol] || null;

            // If data is fresh (less than 15 mins old), return it immediately
            if (existingEntry && (Date.now() - existingEntry.timestamp < CACHE_TTL)) {
                return existingEntry.price;
            }
        } catch (e) {
            console.error('Error parsing market cache', e);
        }
    }

    // 2. Fetch from Massive API (Polygon) if key exists and rate limit allowed
    const apiKey = getApiKey();
    if (apiKey && canMakeRequest()) {
        try {
            recordRequest();
            const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`);
            if (response.ok) {
                const data: PolygonPrevResponse = await response.json();
                if (data.results && data.results.length > 0 && data.results[0].c > 0) {
                    const price = data.results[0].c;
                    // Update cache
                    cache[symbol] = { price, timestamp: Date.now() };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                    return price;
                }
            }
        } catch (error) {
            console.error(`Error fetching price for ${symbol}`, error);
        }
    }

    // 3. Fetch from our backend Yahoo Finance proxy (no API key needed)
    try {
        const response = await fetch(`./api/current-price?symbol=${symbol}`);
        if (response.ok) {
            const data = await response.json();
            if (data.price) {
                const price = Number(data.price.toFixed(2));
                // Update cache
                cache[symbol] = { price, timestamp: Date.now() };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                return price;
            }
        }
    } catch (error) {
        console.error(`Error fetching proxy price for ${symbol}`, error);
    }

    // 4. Final Fallback Logic:
    // If we have STALE data (more than 15 mins old), return it instead of mock prices
    if (existingEntry) {
        return existingEntry.price;
    }

    // Only fallback to static mock prices if NO cached data exists and APIs fail completely
    const basePrice = DEFAULT_MOCK_PRICES[symbol] || 150.00;
    return Number(basePrice.toFixed(2));
};
