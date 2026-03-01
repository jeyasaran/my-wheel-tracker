import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Building2, Plus, Trash2, Calendar, FileText } from 'lucide-react';
import type { Broker } from '../../types';

export default function BrokerSettings() {
    const { brokers, addBroker, deleteBroker } = useTradeStore();
    const [name, setName] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const newBroker: Broker = {
            id: crypto.randomUUID(),
            name: name.trim(),
            dateAdded: new Date().toISOString().split('T')[0],
            notes: notes.trim() || undefined
        };

        addBroker(newBroker);
        setName('');
        setNotes('');
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete broker "${name}"? Existing trades associated with this broker will still exist but will lose their broker reference.`)) {
            deleteBroker(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight">Brokers</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Manage your brokerage accounts for trade association
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add Broker Form */}
                <Card className="lg:col-span-1">
                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <CardTitle className="text-lg">Add New Broker</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Broker Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Charles Schwab, Fidelity"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Account details, login tips, etc."
                                />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Broker
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Broker List */}
                <Card className="lg:col-span-2">
                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <CardTitle className="text-lg">Your Brokers</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b dark:border-gray-800">
                                    <tr>
                                        <th className="px-4 py-4">Name</th>
                                        <th className="px-4 py-4">Date Added</th>
                                        <th className="px-4 py-4">Notes</th>
                                        <th className="px-4 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brokers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                                No brokers added yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        brokers.map((broker) => (
                                            <tr key={broker.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="font-medium flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{broker.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-gray-500 flex items-center gap-2 whitespace-nowrap">
                                                        <Calendar className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                                        {broker.dateAdded}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-gray-500 max-w-[200px] truncate">
                                                        {broker.notes ? (
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                                                <span className="truncate">{broker.notes}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(broker.id, broker.name)}
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
