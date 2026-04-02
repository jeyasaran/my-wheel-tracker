import { useState, useEffect } from 'react';
import type { Trade, OptionType, Strategy } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTradeStore } from '../../hooks/useTradeStore';

type TradeFormMode = 'create' | 'edit' | 'close';
type CloseOutcome = 'BTC' | 'EXPIRED' | 'ASSIGNED' | 'ROLLED';

interface TradeFormProps {
    initialData?: Trade;
    defaultValues?: Partial<Trade>;
    mode?: TradeFormMode;
    onClose: () => void;
}

export function TradeForm({ initialData, defaultValues, mode = 'create', onClose }: TradeFormProps) {
    const { addTrade, updateTrade, addPosition, brokers } = useTradeStore();

    // Determine initial outcome if closing
    const [outcome, setOutcome] = useState<CloseOutcome>('BTC');

    // Local state for vertical spread legs
    const [vertData, setVertData] = useState({
        leg1Strike: '',
        leg2Strike: '',
        leg1Premium: '',
        leg2Premium: ''
    });

    const [vertCloseData, setVertCloseData] = useState({
        leg1Strike: '',
        leg2Strike: '',
        leg1ClosePrice: '',
        leg2ClosePrice: ''
    });

    const [formData, setFormData] = useState<Partial<Trade>>({
        symbol: defaultValues?.symbol || '',
        side: defaultValues?.side || 'SELL',
        type: defaultValues?.type || 'Put',
        strategy: defaultValues?.strategy || 'CSP',
        strikePrice: defaultValues?.strikePrice || 0,
        premiumPrice: defaultValues?.premiumPrice || 0,
        contracts: defaultValues?.contracts || 1,
        openDate: new Date().toISOString().split('T')[0],
        expirationDate: '',
        status: 'OPEN',
        notes: '',
        positionId: defaultValues?.positionId || '',
        brokerId: defaultValues?.brokerId || '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);

            // Extract legs from notes for 'Vert' strategy (used for edit/close)
            if (initialData.strategy === 'Vert' && initialData.notes) {
                const openMatch = initialData.notes.match(/Leg 1: \$([\d.]+) \(([\d.]+)\), Leg 2: \$([\d.]+) \(([\d.]+)\)/);
                if (openMatch) {
                    setVertData({
                        leg1Strike: openMatch[1],
                        leg1Premium: openMatch[2],
                        leg2Strike: openMatch[3],
                        leg2Premium: openMatch[4]
                    });
                    setVertCloseData(prev => ({ ...prev, leg1Strike: openMatch[1], leg2Strike: openMatch[3] }));
                }

                const closeMatch = initialData.notes.match(/Closed - Leg 1: \$([\d.]+), Leg 2: \$([\d.]+)/);
                if (closeMatch) {
                    setVertCloseData(prev => ({
                        ...prev,
                        leg1ClosePrice: closeMatch[1],
                        leg2ClosePrice: closeMatch[2]
                    }));
                }
            }
        }
    }, [initialData]);

    // Auto-calculate net premium for Vertical spreads
    useEffect(() => {
        if (formData.strategy === 'Vert' && (mode === 'create' || mode === 'edit')) {
            const s1 = Number(vertData.leg1Strike) || 0;
            const p1 = Number(vertData.leg1Premium) || 0;
            const p2 = Number(vertData.leg2Premium) || 0;
            const netPremium = p1 - p2;

            setFormData(prev => {
                if (prev.strikePrice !== s1 || prev.premiumPrice !== netPremium) {
                    return { ...prev, strikePrice: s1, premiumPrice: netPremium };
                }
                return prev;
            });
        }
    }, [vertData, formData.strategy, mode]);

    // Auto-calculate net close price for Verticals
    useEffect(() => {
        if (formData.strategy === 'Vert' && (mode === 'close' || mode === 'edit')) {
            const p1 = Number(vertCloseData.leg1ClosePrice) || 0;
            const p2 = Number(vertCloseData.leg2ClosePrice) || 0;
            const netClose = p2 - p1;

            setFormData(prev => {
                if (prev.closePrice !== netClose) {
                    return { ...prev, closePrice: netClose };
                }
                return prev;
            });
        }
    }, [vertCloseData.leg1ClosePrice, vertCloseData.leg2ClosePrice, formData.strategy, mode, formData.status]);

    // Handle Outcome Changes
    useEffect(() => {
        if (mode === 'close' && outcome === 'EXPIRED' && formData.expirationDate) {
            setFormData(prev => ({
                ...prev,
                closeDate: prev.expirationDate, // Auto-set close date to expiration
                closePrice: 0, // Expired worthless = 0 cost to close
                status: 'EXPIRED'
            }));
        } else if (mode === 'close' && outcome === 'BTC') {
            setFormData(prev => ({
                ...prev,
                status: 'CLOSED',
                closeDate: prev.closeDate || new Date().toISOString().split('T')[0],
                closePrice: prev.closePrice !== undefined ? prev.closePrice : 0
            }));
        } else if (mode === 'close' && outcome === 'ASSIGNED') {
            setFormData(prev => ({
                ...prev,
                status: 'ASSIGNED',
                closeDate: prev.closeDate || prev.expirationDate || new Date().toISOString().split('T')[0],
                closePrice: 0 // Assignment doesn't cost anything out of pocket for the option leg; premium is 100% profit
            }));
        }
        // TODO: Handle ROLLED later
    }, [outcome, mode, formData.expirationDate, formData.strikePrice]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.symbol || !formData.expirationDate || !formData.strikePrice) {
            alert("Please fill in required fields (Symbol, Strike, Expiration)");
            return;
        }

        if (mode === 'close') {
            if ((outcome === 'BTC' || outcome === 'ASSIGNED') && (formData.closePrice === undefined || formData.closePrice === null || !formData.closeDate)) {
                alert(`Please enter ${outcome === 'BTC' ? 'Close' : 'Assignment'} Price and Date`);
                return;
            }
            if (formData.closeDate && formData.expirationDate && new Date(formData.closeDate) > new Date(formData.expirationDate)) {
                alert("Close Date cannot be after Expiration Date");
                return;
            }
        }

        if (mode === 'close' && outcome === 'EXPIRED') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Parse expiration date (assuming YYYY-MM-DD from input type="date")
            const expDate = new Date(formData.expirationDate + 'T00:00:00');

            if (today < expDate) {
                alert("Cannot mark trade as Expired before the expiration date passes.");
                return;
            }
        }

        let finalNotes = formData.notes || '';
        if (formData.strategy === 'Vert') {
            // Strip out auto-generated vertically spread notes to rebuild them
            finalNotes = finalNotes.replace(/Vertical Spread - Leg 1: \$[\d.]+ \([\d.]+\), Leg 2: \$[\d.]+ \([\d.]+\)\n?/, '');
            finalNotes = finalNotes.replace(/Closed - Leg 1: \$[\d.]+, Leg 2: \$[\d.]+\n?/, '');
            finalNotes = finalNotes.trim();

            const openInfo = vertData.leg2Strike ? `Vertical Spread - Leg 1: $${vertData.leg1Strike} (${vertData.leg1Premium}), Leg 2: $${vertData.leg2Strike} (${vertData.leg2Premium})` : '';
            const isClosing = (mode === 'close' && outcome === 'BTC') || ((mode === 'edit' || mode === 'create') && formData.status === 'CLOSED');
            const closeInfo = (isClosing && vertCloseData.leg1ClosePrice) ? `Closed - Leg 1: $${vertCloseData.leg1ClosePrice}, Leg 2: $${vertCloseData.leg2ClosePrice}` : '';

            const generatedNotes = [openInfo, closeInfo].filter(Boolean).join('\n');
            finalNotes = finalNotes ? `${finalNotes}\n${generatedNotes}` : generatedNotes;
        }

        const tradeData = {
            ...formData,
            notes: finalNotes,
            id: initialData?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
            symbol: formData.symbol?.toUpperCase(),
            strikePrice: Number(formData.strikePrice),
            premiumPrice: Number(formData.premiumPrice),
            contracts: Number(formData.contracts),
            closePrice: formData.closePrice ? Number(formData.closePrice) : undefined,
            status: mode === 'close' ? (outcome === 'BTC' ? 'CLOSED' : outcome === 'EXPIRED' ? 'EXPIRED' : outcome === 'ASSIGNED' ? 'ASSIGNED' : 'CLOSED') : formData.status,
            positionId: formData.positionId,
            brokerId: formData.brokerId || undefined,
            strategy: formData.strategy,
        } as Trade;

        if (initialData) {
            updateTrade(initialData.id, tradeData);
        } else {
            addTrade(tradeData);
        }

        // --- Auto-create position for assigned puts ---
        if (mode === 'close' && outcome === 'ASSIGNED' && formData.type === 'Put') {
            addPosition({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
                symbol: formData.symbol?.toUpperCase() || '',
                openDate: formData.closeDate || formData.expirationDate || new Date().toISOString().split('T')[0],
                buyPrice: Number(formData.strikePrice),
                quantity: Number(formData.contracts) * 100,
                notes: `Assigned from put trade on ${formData.closeDate || formData.expirationDate}`,
                brokerId: formData.brokerId || undefined,
            });
        }
        onClose();
    };

    const isReadOnly = mode === 'close';

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1 space-y-2">
                    <label className="text-sm font-medium">Broker (Optional)</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 disabled:opacity-50"
                        value={formData.brokerId || ''}
                        onChange={(e) => setFormData({ ...formData, brokerId: e.target.value })}
                        disabled={isReadOnly}
                    >
                        <option value="">None</option>
                        {brokers.map(broker => (
                            <option key={broker.id} value={broker.id}>{broker.name}</option>
                        ))}
                    </select>
                </div>
                {mode === 'close' ? (
                    <div className="col-span-1 space-y-2">
                        <label className="text-sm font-medium">Outcome</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950"
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value as CloseOutcome)}
                        >
                            <option value="BTC">Buy to Close / Sell to Close</option>
                            <option value="EXPIRED">Expired Worthless</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="ROLLED">Rolled (Coming Soon)</option>
                        </select>
                    </div>
                ) : (
                    <div className="col-span-1 space-y-2">
                        <label className="text-sm font-medium">Strategy</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 disabled:opacity-50"
                            value={formData.strategy || 'CSP'}
                            onChange={(e) => {
                                const newStrategy = e.target.value as Strategy;
                                setFormData(prev => {
                                    let newType = prev.type;
                                    if (newStrategy === 'CSP') newType = 'Put';
                                    if (newStrategy === 'CC') newType = 'Call';
                                    // 'Vert' keeps the previous type selection
                                    return { ...prev, strategy: newStrategy, type: newType };
                                });
                            }}
                            disabled={isReadOnly}
                        >
                            <option value="CSP">Cash Secured Put</option>
                            <option value="CC">Covered Call</option>
                            <option value="Vert">Verticals</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3 space-y-2">
                    <label className="text-sm font-medium">Side</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 disabled:opacity-50"
                        value={formData.side || 'SELL'}
                        onChange={(e) => setFormData({ ...formData, side: e.target.value as 'BUY' | 'SELL' })}
                        disabled={isReadOnly}
                    >
                        <option value="SELL">Sell</option>
                        <option value="BUY">Buy</option>
                    </select>
                </div>
                <div className="col-span-4 space-y-2">
                    <label className="text-sm font-medium">Symbol</label>
                    <Input
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                        placeholder="AMD"
                        required
                        disabled={isReadOnly}
                        autoFocus={!isReadOnly}
                    />
                </div>
                <div className="col-span-5 space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 disabled:opacity-50"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as OptionType })}
                        disabled={isReadOnly}
                    >
                        <option value="Put">Put</option>
                        <option value="Call">Call</option>
                    </select>
                </div>
            </div>

            {formData.strategy === 'Vert' && (mode === 'create' || mode === 'edit') ? (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Leg 1 */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Leg 1 (Short)</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Strike ($)</label>
                                <Input
                                    type="number" step="0.5"
                                    value={vertData.leg1Strike}
                                    onChange={(e) => setVertData({ ...vertData, leg1Strike: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Premium ($)</label>
                                <Input
                                    type="number" step="0.01"
                                    value={vertData.leg1Premium}
                                    onChange={(e) => setVertData({ ...vertData, leg1Premium: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Leg 2 */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Leg 2 (Long)</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Strike ($)</label>
                                <Input
                                    type="number" step="0.5"
                                    value={vertData.leg2Strike}
                                    onChange={(e) => setVertData({ ...vertData, leg2Strike: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Premium ($)</label>
                                <Input
                                    type="number" step="0.01"
                                    value={vertData.leg2Premium}
                                    onChange={(e) => setVertData({ ...vertData, leg2Premium: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Strike ($)</label>
                        <Input
                            type="number"
                            step="0.5"
                            value={formData.strikePrice || ''}
                            onChange={(e) => setFormData({ ...formData, strikePrice: parseFloat(e.target.value) })}
                            required
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Premium ($)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.premiumPrice || ''}
                            onChange={(e) => setFormData({ ...formData, premiumPrice: parseFloat(e.target.value) })}
                            required
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Contracts</label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.contracts || ''}
                        onChange={(e) => setFormData({ ...formData, contracts: parseFloat(e.target.value) })}
                        required
                        disabled={isReadOnly}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Open Date</label>
                    <Input
                        type="date"
                        value={formData.openDate}
                        onChange={(e) => setFormData({ ...formData, openDate: e.target.value })}
                        required
                        disabled={isReadOnly}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Expiration</label>
                    <Input
                        type="date"
                        value={formData.expirationDate}
                        onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                        required
                        disabled={isReadOnly}
                    />
                </div>
            </div>

            {formData.strategy === 'Vert' && (mode === 'create' || mode === 'edit') && (
                <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 pb-2">
                    Net Premium: <span className={`ml-2 font-bold ${(formData.premiumPrice || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>${(formData.premiumPrice || 0).toFixed(2)}</span>
                </div>
            )}

            {/* View Close Data when Editing a Closed Trade */}
            {mode === 'edit' && formData.status === 'CLOSED' && (
                <>
                    {formData.strategy === 'Vert' ? (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Close Vertical Spread</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Leg 1 (Short) {vertCloseData.leg1Strike && `($${vertCloseData.leg1Strike})`} Close ($)
                                    </label>
                                    <Input
                                        type="number" step="0.01"
                                        value={vertCloseData.leg1ClosePrice}
                                        onChange={(e) => setVertCloseData({ ...vertCloseData, leg1ClosePrice: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Leg 2 (Long) {vertCloseData.leg2Strike && `($${vertCloseData.leg2Strike})`} Close ($)
                                    </label>
                                    <Input
                                        type="number" step="0.01"
                                        value={vertCloseData.leg2ClosePrice}
                                        onChange={(e) => setVertCloseData({ ...vertCloseData, leg2ClosePrice: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-3 mt-1">
                                <div className="space-y-2 flex flex-col justify-end">
                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 pb-2">
                                        Net Close Price: <span className={`ml-2 font-bold ${(formData.closePrice || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {(formData.closePrice || 0) < 0 ? '-' : ''}${(Math.abs(formData.closePrice || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Close Date</label>
                                    <Input
                                        type="date"
                                        value={formData.closeDate || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Close Price ($)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.closePrice === undefined ? '' : formData.closePrice}
                                    onChange={(e) => setFormData({ ...formData, closePrice: e.target.value ? parseFloat(e.target.value) : 0 })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Close Date</label>
                                <Input
                                    type="date"
                                    value={formData.closeDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    )}
                </>
            )}

            {mode === 'close' && outcome === 'BTC' && (
                <>
                    {formData.strategy === 'Vert' ? (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Close Vertical Spread</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Leg 1 */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Leg 1 (Short) {vertCloseData.leg1Strike && `($${vertCloseData.leg1Strike})`} Close ($)
                                    </label>
                                    <Input
                                        type="number" step="0.01"
                                        value={vertCloseData.leg1ClosePrice}
                                        onChange={(e) => setVertCloseData({ ...vertCloseData, leg1ClosePrice: e.target.value })}
                                        required
                                    />
                                </div>
                                {/* Leg 2 */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Leg 2 (Long) {vertCloseData.leg2Strike && `($${vertCloseData.leg2Strike})`} Close ($)
                                    </label>
                                    <Input
                                        type="number" step="0.01"
                                        value={vertCloseData.leg2ClosePrice}
                                        onChange={(e) => setVertCloseData({ ...vertCloseData, leg2ClosePrice: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-3 mt-1">
                                <div className="space-y-2 flex flex-col justify-end">
                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 pb-2">
                                        Net Close Price: <span className={`ml-2 font-bold ${(formData.closePrice || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {(formData.closePrice || 0) < 0 ? '-' : ''}${(Math.abs(formData.closePrice || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Close Date</label>
                                    <Input
                                        type="date"
                                        value={formData.closeDate || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Close Price ($)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.closePrice === undefined ? '' : formData.closePrice}
                                    onChange={(e) => setFormData({ ...formData, closePrice: e.target.value ? parseFloat(e.target.value) : 0 })}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Close Date</label>
                                <Input
                                    type="date"
                                    value={formData.closeDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
            {mode === 'close' && outcome === 'ASSIGNED' && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                    <div className="col-span-2 space-y-2">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800/30">
                            <strong>Assignment Info:</strong> The premium of <strong>${((formData.premiumPrice || 0) * (formData.contracts || 0) * 100).toLocaleString()}</strong> will be fully realized as profit. A new stock position will be opened at the strike price of <strong>${formData.strikePrice}</strong>.
                        </div>
                    </div>
                    <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">Assignment Date</label>
                        <Input
                            type="date"
                            value={formData.closeDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                            required
                        />
                    </div>
                </div>
            )}
            {mode === 'close' && outcome === 'EXPIRED' && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    Trade will be marked as Expired on <strong>{formData.expirationDate}</strong> with $0 closing cost.
                </div>
            )}


            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit">
                    {mode === 'close' ? 'Close Trade' : initialData ? 'Save Changes' : 'Add Trade'}
                </Button>
            </div>
        </form>
    );
}

