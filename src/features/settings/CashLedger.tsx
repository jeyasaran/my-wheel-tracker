import { useState } from 'react';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Trash2, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CashTransaction } from '../../types';

export default function CashLedger() {
    const { transactions, addTransaction, deleteTransaction, cashBalance } = useTradeStore();

    // Form state
    const [type, setType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
        if (!date) return;

        const newTransaction: CashTransaction = {
            id: crypto.randomUUID(),
            date,
            type,
            amount: Number(amount),
            description: description.trim() || undefined
        };

        addTransaction(newTransaction);

        // Reset form
        setAmount('');
        setDescription('');
        // Keep date and type as is for convenience
    };

    // Calculate running balance for display
    // Sort transactions by date descending for the list, 
    // but for running balance we might need to calculate it properly.
    // The sketch shows "Balance" column. 
    // Usually ledger is chronological. The sketch lists Jan 02 then Jan 15.
    // Let's sort by date ascending to calculate running balance, then reverse for display?
    // Or just display in reverse order (newest first) but calculate balance?

    // Let's sort all transactions by date ascending first
    const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
        // If dates are same, maybe use ID or verify creation order? 
        // For now date is enough.
    );

    // Calculate balances
    let runningBalance = 0;
    const transactionsWithBalance = sortedTransactions.map(t => {
        if (t.type === 'DEPOSIT') {
            runningBalance += t.amount;
        } else {
            runningBalance -= t.amount;
        }
        return { ...t, balance: runningBalance };
    });

    // Reverse for display (newest top)
    const displayTransactions = [...transactionsWithBalance].reverse();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Cash Ledger</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Track your cash ledger and view transaction history
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Current Balance Card */}
                <Card className="p-6 md:col-span-1 border-blue-100 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                ${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                </Card>

                {/* Transaction Form */}
                <Card className="p-6 md:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Type Toggle */}
                            <div className="flex rounded-md shadow-sm" role="group">
                                <button
                                    type="button"
                                    onClick={() => setType('DEPOSIT')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border rounded-l-lg transition-colors focus:z-10 focus:ring-2 focus:ring-blue-500",
                                        type === 'DEPOSIT'
                                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                            : "bg-white text-gray-900 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                                    )}
                                >
                                    Deposit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('WITHDRAWAL')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg transition-colors focus:z-10 focus:ring-2 focus:ring-blue-500",
                                        type === 'WITHDRAWAL'
                                            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                            : "bg-white text-gray-900 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                                    )}
                                >
                                    Withdrawal
                                </button>
                            </div>

                            {/* Amount Input */}
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-7"
                                    required
                                />
                            </div>

                            {/* Date Input */}
                            <div className="relative w-full md:w-40">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                                </div>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            {/* Notes Input */}
                            <div className="flex-1 w-full">
                                <textarea
                                    className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-900"
                                    placeholder="Notes (Optional)"
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            {/* Add Button */}
                            <Button type="submit" className="w-full md:w-auto self-end md:self-center h-[42px] px-8">
                                Add
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>

            {/* Transaction History */}
            <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Transaction History</h3>
                <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Type</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Description</th>
                                    <th className="px-6 py-3 whitespace-nowrap text-right">Amount</th>
                                    <th className="px-6 py-3 whitespace-nowrap text-right">Balance</th>
                                    <th className="px-6 py-3 whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {displayTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    displayTransactions.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 font-medium">
                                                {transaction.date}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={transaction.type === 'DEPOSIT' ? 'secondary' : 'default'} className={transaction.type === 'WITHDRAWAL' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300' : ''}>
                                                    {transaction.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                {transaction.description || '-'}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 whitespace-nowrap text-right font-medium",
                                                transaction.type === 'DEPOSIT' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                            )}>
                                                {transaction.type === 'DEPOSIT' ? '+' : '-'}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-gray-100 font-semibold">
                                                ${transaction.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => deleteTransaction(transaction.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    title="Delete Transaction"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
