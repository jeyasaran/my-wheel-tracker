import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useTradeStore } from '../../hooks/useTradeStore';
import type { StockPosition } from '../../types';

interface PositionFormProps {
    onClose: () => void;
    initialData?: StockPosition;
}

export function PositionForm({ onClose, initialData }: PositionFormProps) {
    const { addPosition, updatePosition, brokers } = useTradeStore();
    const [formData, setFormData] = useState({
        symbol: '',
        openDate: new Date().toISOString().split('T')[0],
        buyPrice: '',
        quantity: '',
        notes: '',
        brokerId: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                symbol: initialData.symbol,
                openDate: initialData.openDate,
                buyPrice: initialData.buyPrice.toString(),
                quantity: initialData.quantity.toString(),
                notes: initialData.notes || '',
                brokerId: initialData.brokerId || ''
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const positionData: StockPosition = {
            id: initialData?.id || crypto.randomUUID(),
            symbol: formData.symbol.toUpperCase(),
            openDate: formData.openDate,
            buyPrice: parseFloat(formData.buyPrice),
            quantity: parseFloat(formData.quantity),
            notes: formData.notes,
            brokerId: formData.brokerId || undefined
        };

        if (initialData) {
            updatePosition(initialData.id, positionData);
        } else {
            addPosition(positionData);
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Broker (Optional)</label>
                <select
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-transparent text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.brokerId}
                    onChange={e => setFormData({ ...formData, brokerId: e.target.value })}
                >
                    <option value="">None</option>
                    {brokers.map(broker => (
                        <option key={broker.id} value={broker.id}>{broker.name}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ticker</label>
                    <input
                        type="text"
                        required
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.symbol}
                        onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                        placeholder="AAPL"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Opened Date</label>
                    <input
                        type="date"
                        required
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.openDate}
                        onChange={e => setFormData({ ...formData, openDate: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Buy Price</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full rounded-md border border-gray-300 dark:border-gray-700 pl-7 p-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.buyPrice}
                            onChange={e => setFormData({ ...formData, buyPrice: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Quantity</label>
                    <input
                        type="number"
                        step="1"
                        required
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="100"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                <textarea
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                />
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit">{initialData ? 'Update Position' : 'Add Position'}</Button>
            </div>
        </form>
    );
}
