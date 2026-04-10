import { useState, useEffect } from 'react';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, LineChart, PlusCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parse } from 'date-fns';

interface NavEntry {
    id: string;
    monthYear: string; // "YYYY-MM"
    brokerId: string;
    navValue: number;
    cashIn: number;
    cashOut: number;
}

interface MonthRow {
    monthYear: string;
    label: string;
    brokerNavs: Record<string, number>; // brokerId -> navValue
    cashIn: number;
    cashOut: number;
    entryIds: string[];
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) =>
    `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;

export default function NAVTracker() {
    const { brokers } = useTradeStore();
    const [entries, setEntries] = useState<NavEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
    const [brokerId, setBrokerId] = useState('');
    const [navValue, setNavValue] = useState('');
    const [cashIn, setCashIn] = useState('');
    const [cashOut, setCashOut] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchEntries();
    }, []);

    useEffect(() => {
        if (brokers.length > 0 && !brokerId) {
            setBrokerId(brokers[0].id);
        }
    }, [brokers]);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const res = await fetch('./api/nav-entries');
            const data = await res.json();
            setEntries(data);
        } catch (e) {
            console.error('Failed to fetch NAV entries', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!monthYear || !brokerId || !navValue) return;
        setIsSubmitting(true);

        // Check if an entry already exists for this month+broker to update it
        const existing = entries.find(en => en.monthYear === monthYear && en.brokerId === brokerId);
        const payload: NavEntry = {
            id: existing?.id ?? crypto.randomUUID(),
            monthYear,
            brokerId,
            navValue: Number(navValue),
            cashIn: Number(cashIn) || 0,
            cashOut: Number(cashOut) || 0,
        };

        try {
            await fetch('./api/nav-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            await fetchEntries();
            setNavValue('');
            setCashIn('');
            setCashOut('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        await fetch(`./api/nav-entries/${id}`, { method: 'DELETE' });
        await fetchEntries();
    };

    // --- Build table rows ---
    // Get all unique brokerIds that have entries
    const activeBrokerIds = [...new Set(entries.map(e => e.brokerId))];
    const activeBrokers = activeBrokerIds
        .map(id => brokers.find(b => b.id === id))
        .filter(Boolean) as typeof brokers;

    // Group entries by monthYear, sort chronologically
    const monthMap = new Map<string, MonthRow>();
    entries.forEach(e => {
        if (!monthMap.has(e.monthYear)) {
            monthMap.set(e.monthYear, {
                monthYear: e.monthYear,
                label: format(parse(e.monthYear, 'yyyy-MM', new Date()), 'MMM-yy'),
                brokerNavs: {},
                cashIn: 0,
                cashOut: 0,
                entryIds: [],
            });
        }
        const row = monthMap.get(e.monthYear)!;
        row.brokerNavs[e.brokerId] = e.navValue;
        row.cashIn += e.cashIn;
        row.cashOut += e.cashOut;
        row.entryIds.push(e.id);
    });

    const sortedRows = [...monthMap.values()].sort((a, b) => a.monthYear.localeCompare(b.monthYear));

    // Compute derived columns
    const computedRows = sortedRows.map((row, i) => {
        const sumBrokers = activeBrokerIds.reduce((s, bid) => s + (row.brokerNavs[bid] ?? 0), 0);
        const netCash = row.cashIn - row.cashOut;
        const adjStart = sumBrokers + netCash;
        const prevRow = i > 0 ? sortedRows[i - 1] : null;

        let capitalGrowthAct: number | null = null;
        let capitalGrowthExp: number | null = null;
        let netGrowthRate: number | null = null;

        if (prevRow && i > 0) {
            const prevSumBrokers = activeBrokerIds.reduce((s, bid) => s + (prevRow.brokerNavs[bid] ?? 0), 0);
            const prevNetCash = prevRow.cashIn - prevRow.cashOut;
            const prevAdjStart = prevSumBrokers + prevNetCash;

            capitalGrowthAct = sumBrokers;
            capitalGrowthExp = prevAdjStart * 1.025;
            netGrowthRate = prevAdjStart > 0 ? (sumBrokers / prevAdjStart) - 1 : null;
        }

        return { ...row, sumBrokers, netCash, adjStart, capitalGrowthAct, capitalGrowthExp, netGrowthRate };
    });

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <LineChart className="w-8 h-8 text-blue-600" />
                    NAV Tracker
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Record end-of-month net asset value per broker and track capital growth over time.
                </p>
            </div>

            {/* Form */}
            <Card className="p-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-blue-500" />
                    Add Monthly NAV Entry
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    {/* Month */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</label>
                        <Input
                            type="month"
                            value={monthYear}
                            onChange={e => setMonthYear(e.target.value)}
                            required
                        />
                    </div>
                    {/* Broker */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Broker</label>
                        <select
                            value={brokerId}
                            onChange={e => setBrokerId(e.target.value)}
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                            {brokers.length === 0 && <option value="">No brokers configured</option>}
                            {brokers.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* NAV Value */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NAV Value ($)</label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 25000"
                            value={navValue}
                            onChange={e => setNavValue(e.target.value)}
                            required
                        />
                    </div>
                    {/* Cash In */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash-In ($)</label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={cashIn}
                            onChange={e => setCashIn(e.target.value)}
                        />
                    </div>
                    {/* Cash Out */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash-Out ($)</label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={cashOut}
                                onChange={e => setCashOut(e.target.value)}
                            />
                            <Button type="submit" disabled={isSubmitting} className="whitespace-nowrap">
                                {isSubmitting ? '...' : 'Add'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Card>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading NAV data...</div>
                ) : sortedRows.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <LineChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No entries yet. Add your first monthly NAV above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10">Month</th>
                                    {activeBrokers.map(b => (
                                        <th key={b.id} className="px-4 py-3 whitespace-nowrap text-right text-blue-500">{b.name}</th>
                                    ))}
                                    <th className="px-4 py-3 whitespace-nowrap text-right text-emerald-500">Cash-In</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right text-rose-500">Cash-Out</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Net Cash</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right border-l border-gray-100 dark:border-gray-800">Adj Start</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Cap Growth Actual</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Cap Growth Exp (2.5%)</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Net Growth Rate</th>
                                    <th className="px-4 py-3 text-right">Del</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {computedRows.map((row) => (
                                    <tr key={row.monthYear} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                        {/* Month */}
                                        <td className="px-4 py-3 whitespace-nowrap font-black text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 z-10">
                                            {row.label}
                                        </td>
                                        {/* Per-broker NAV */}
                                        {activeBrokers.map(b => (
                                            <td key={b.id} className="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                                                {row.brokerNavs[b.id] != null ? fmt(row.brokerNavs[b.id]) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                            </td>
                                        ))}
                                        {/* Cash In/Out */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                                            {row.cashIn > 0 ? fmt(row.cashIn) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                                            {row.cashOut > 0 ? fmt(row.cashOut) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </td>
                                        {/* Net Cash */}
                                        <td className={`px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold ${row.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {fmt(row.netCash)}
                                        </td>
                                        {/* Adj Start */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-black text-gray-900 dark:text-gray-100 border-l border-gray-100 dark:border-gray-800">
                                            {fmt(row.adjStart)}
                                        </td>
                                        {/* Capital Growth Actual */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold text-gray-700 dark:text-gray-300">
                                            {row.capitalGrowthAct != null ? fmt(row.capitalGrowthAct) : <span className="text-gray-300 dark:text-gray-600 text-xs">N/A (first row)</span>}
                                        </td>
                                        {/* Capital Growth Expected */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold text-gray-500">
                                            {row.capitalGrowthExp != null ? fmt(row.capitalGrowthExp) : <span className="text-gray-300 dark:text-gray-600 text-xs">N/A (first row)</span>}
                                        </td>
                                        {/* Net Growth Rate */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums">
                                            {row.netGrowthRate != null ? (
                                                <span className={`inline-flex items-center gap-1 font-black text-sm ${row.netGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {row.netGrowthRate >= 0.025 ? <TrendingUp className="w-3.5 h-3.5" /> : row.netGrowthRate >= 0 ? <Minus className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                    {fmtPct(row.netGrowthRate)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600 text-xs">N/A (first row)</span>
                                            )}
                                        </td>
                                        {/* Delete */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => row.entryIds.forEach(id => handleDelete(id))}
                                                className="text-gray-300 hover:text-rose-500 dark:text-gray-600 dark:hover:text-rose-400 transition-colors p-1"
                                                title="Delete all entries for this month"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
