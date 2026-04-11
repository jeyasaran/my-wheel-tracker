import { useState } from 'react';
import { useTradeStore, type NavEntry } from '../../hooks/useTradeStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, LineChart, PlusCircle, TrendingUp, TrendingDown, Minus, Pencil } from 'lucide-react';
import { format, parse } from 'date-fns';

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) =>
    `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;

export default function NAVTracker() {
    const { brokers, navEntries, addNavEntry, deleteNavEntry } = useTradeStore();

    // Form state
    const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
    const [brokerId, setBrokerId] = useState('');
    const [navValue, setNavValue] = useState('');
    const [cashIn, setCashIn] = useState('');
    const [cashOut, setCashOut] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [editingMonthYear, setEditingMonthYear] = useState<string | null>(null);

    // Always pick the first broker if nothing explicitly selected
    const resolvedBrokerId = brokerId || (brokers.length > 0 ? brokers[0].id : '');

    const handleAdd = async () => {
        setError(null);
        setSuccess(false);

        if (!monthYear) { setError('Please select a month.'); return; }
        if (!resolvedBrokerId) { setError('No broker found. Please add a broker under Settings → Brokers first.'); return; }
        const navNum = parseFloat(navValue);
        if (!navValue || isNaN(navNum) || navNum < 0) { setError('Please enter a valid NAV value (0 or more).'); return; }

        setIsSubmitting(true);
        try {
            const existing = navEntries.find(e => e.monthYear === monthYear && e.brokerId === resolvedBrokerId);
            const entry: NavEntry = {
                id: existing?.id ?? uuid(),
                monthYear,
                brokerId: resolvedBrokerId,
                navValue: navNum,
                cashIn: parseFloat(cashIn) || 0,
                cashOut: parseFloat(cashOut) || 0,
            };
            await addNavEntry(entry);
            setNavValue('');
            setCashIn('');
            setCashOut('');
            setEditingMonthYear(null);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to save. Please ensure the server has been restarted after the latest update.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (ids: string[]) => {
        try {
            await Promise.all(ids.map(id => deleteNavEntry(id)));
        } catch (e: any) {
            setError(e?.message ?? 'Failed to delete entry.');
        }
    };

    const handleEdit = (row: (typeof computedRows)[number]) => {
        // Find the first broker entry for this month to populate the broker selector
        const firstEntry = navEntries.find(e => e.monthYear === row.monthYear);
        if (firstEntry) setBrokerId(firstEntry.brokerId);
        setMonthYear(row.monthYear);
        // Sum of broker NAVs for the primary broker; use entire row sumBrokers for single-broker setups
        const brokerEntry = navEntries.find(e => e.monthYear === row.monthYear && e.brokerId === (firstEntry?.brokerId ?? ''));
        setNavValue(brokerEntry ? String(brokerEntry.navValue) : String(row.sumBrokers));
        setCashIn(row.cashIn > 0 ? String(row.cashIn) : '');
        setCashOut(row.cashOut > 0 ? String(row.cashOut) : '');
        setEditingMonthYear(row.monthYear);
        setError(null);
        setSuccess(false);
        // Scroll to form
        document.getElementById('nav-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // --- Build table rows ---
    const sorted = [...navEntries].sort((a, b) => a.monthYear.localeCompare(b.monthYear));
    const activeBrokerIds = [...new Set(sorted.map(e => e.brokerId))];
    const activeBrokers = activeBrokerIds
        .map(id => brokers.find(b => b.id === id))
        .filter(Boolean) as typeof brokers;

    // Group by month
    const monthMap = new Map<string, { label: string; brokerNavs: Record<string, number>; cashIn: number; cashOut: number; entryIds: string[] }>();
    sorted.forEach(e => {
        if (!monthMap.has(e.monthYear)) {
            monthMap.set(e.monthYear, {
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

    const sortedRows = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b));

    const computedRows = sortedRows.map(([monthYear, row], i) => {
        const sumBrokers = activeBrokerIds.reduce((s, bid) => s + (row.brokerNavs[bid] ?? 0), 0);
        const netCash = row.cashIn - row.cashOut;
        const adjStart = sumBrokers + netCash;
        const prev = i > 0 ? sortedRows[i - 1][1] : null;

        let capitalGrowthAct: number | null = null;
        let capitalGrowthExp: number | null = null;
        let netGrowthRate: number | null = null;

        if (prev) {
            const prevSum = activeBrokerIds.reduce((s, bid) => s + (prev.brokerNavs[bid] ?? 0), 0);
            const prevAdj = prevSum + (prev.cashIn - prev.cashOut);
            capitalGrowthAct = sumBrokers;
            capitalGrowthExp = prevAdj * 1.025;
            netGrowthRate = prevAdj > 0 ? (sumBrokers / prevAdj) - 1 : null;
        }

        return { monthYear, ...row, sumBrokers, netCash, adjStart, capitalGrowthAct, capitalGrowthExp, netGrowthRate };
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

            {/* Banners */}
            {error && (
                <div className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}
            {success && (
                <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 text-sm font-medium">
                    ✅ Entry saved successfully!
                </div>
            )}

            {/* Form — NO <form> wrapper to avoid HTML5 validation blocking submit */}
            <Card id="nav-entry-form" className={`p-6 transition-all ${editingMonthYear ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}>
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    {editingMonthYear
                        ? <><Pencil className="w-4 h-4 text-amber-500" /> Edit Entry — {format(parse(editingMonthYear, 'yyyy-MM', new Date()), 'MMM yyyy')}</>
                        : <><PlusCircle className="w-4 h-4 text-blue-500" /> Add Monthly NAV Entry</>
                    }
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    {/* Month */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</label>
                        <Input
                            type="month"
                            value={monthYear}
                            onChange={e => setMonthYear(e.target.value)}
                        />
                    </div>
                    {/* Broker */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Broker</label>
                        <select
                            value={resolvedBrokerId}
                            onChange={e => setBrokerId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                            {brokers.length === 0
                                ? <option value="">No brokers – add one first</option>
                                : brokers.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))
                            }
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
                    {/* Cash Out + button */}
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
                            <Button
                                type="button"
                                onClick={handleAdd}
                                disabled={isSubmitting}
                                className={`whitespace-nowrap ${editingMonthYear ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                            >
                                {isSubmitting ? 'Saving…' : editingMonthYear ? 'Update' : 'Add'}
                            </Button>
                            {editingMonthYear && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingMonthYear(null);
                                        setNavValue('');
                                        setCashIn('');
                                        setCashOut('');
                                        setError(null);
                                    }}
                                    className="whitespace-nowrap"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                {sortedRows.length === 0 ? (
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
                                    <th className="px-4 py-3 text-right" colSpan={2}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {computedRows.map(row => (
                                    <tr key={row.monthYear} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap font-black text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 z-10">{row.label}</td>
                                        {activeBrokers.map(b => (
                                            <td key={b.id} className="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                                                {row.brokerNavs[b.id] != null ? fmt(row.brokerNavs[b.id]) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                                            {row.cashIn > 0 ? fmt(row.cashIn) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                                            {row.cashOut > 0 ? fmt(row.cashOut) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold ${row.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(row.netCash)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-black text-gray-900 dark:text-gray-100 border-l border-gray-100 dark:border-gray-800">{fmt(row.adjStart)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold text-gray-700 dark:text-gray-300">
                                            {row.capitalGrowthAct != null ? fmt(row.capitalGrowthAct) : <span className="text-gray-300 dark:text-gray-600 text-xs italic">—</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold text-gray-500">
                                            {row.capitalGrowthExp != null ? fmt(row.capitalGrowthExp) : <span className="text-gray-300 dark:text-gray-600 text-xs italic">—</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums">
                                            {row.netGrowthRate != null ? (
                                                <span className={`inline-flex items-center gap-1 font-black text-sm ${row.netGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {row.netGrowthRate >= 0.025 ? <TrendingUp className="w-3.5 h-3.5" /> : row.netGrowthRate >= 0 ? <Minus className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                    {fmtPct(row.netGrowthRate)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-gray-600 text-xs italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(row)}
                                                    className={`transition-colors p-1 rounded ${
                                                        editingMonthYear === row.monthYear
                                                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                            : 'text-gray-300 hover:text-amber-500 dark:text-gray-600 dark:hover:text-amber-400'
                                                    }`}
                                                    title="Edit entries for this month"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(row.entryIds)}
                                                    className="text-gray-300 hover:text-rose-500 dark:text-gray-600 dark:hover:text-rose-400 transition-colors p-1 rounded"
                                                    title="Delete all entries for this month"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
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
