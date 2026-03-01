import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Key, Eye, EyeOff, Save, FlaskConical, RefreshCw, AlertCircle, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { verifyConnection } from '../../services/marketService';
import { useTradeStore } from '../../hooks/useTradeStore';

export default function MassiveSettings() {
    const { refreshPrices, resetAllData } = useTradeStore();
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const savedKey = localStorage.getItem('massive_api_key');
        if (savedKey) {
            setApiKey(savedKey);
            setIsSaved(true);
            setStatus('success');
            setMessage('API key is set and ready for market data requests');
        }
    }, []);

    const handleSave = () => {
        if (!apiKey.trim()) {
            setStatus('error');
            setMessage('Please enter a valid API key');
            return;
        }
        localStorage.setItem('massive_api_key', apiKey);
        setIsSaved(true);
        setStatus('success');
        setMessage('API key saved successfully');
    };

    const handleTest = async () => {
        if (!apiKey.trim()) {
            setStatus('error');
            setMessage('Please enter an API key to test');
            return;
        }

        setStatus('testing');
        setMessage('Testing connection to Massive API...');

        const result = await verifyConnection(apiKey);

        if (result.success) {
            setStatus('success');
            setMessage(result.message);
        } else {
            setStatus('error');
            setMessage(result.message);
        }
    };

    const handleUpdateAll = async () => {
        setStatus('testing');
        setMessage('Refreshing all market prices...');
        await refreshPrices();
        setStatus('success');
        setMessage('All market prices updated successfully');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight">Massive</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Configure your Massive API key for live market data
                </p>
            </div>

            <Card className="max-w-2xl">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Key className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-lg">Massive API Configuration</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                            <a
                                href="https://polygon.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                            >
                                <AlertCircle className="h-3 w-3" />
                                Get your free API key from Polygon.io
                            </a>
                        </div>
                        <div className="relative group">
                            <Input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setIsSaved(false);
                                }}
                                placeholder="********************************"
                                className="pr-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowKey(!showKey)}
                            className="text-xs"
                        >
                            {showKey ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            className="bg-sky-400 hover:bg-sky-500 text-white border-none shadow-sm text-xs"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save API Key
                        </Button>
                    </div>

                    {status !== 'idle' && (
                        <div className={cn(
                            "rounded-xl border p-4 flex gap-4 transition-all animate-in fade-in slide-in-from-top-2",
                            status === 'success' ? "border-green-500/20 bg-green-50/50 dark:bg-green-900/10" :
                                status === 'error' ? "border-red-500/20 bg-red-50/50 dark:bg-red-900/10" :
                                    "border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/10"
                        )}>
                            <div className="flex-shrink-0 mt-0.5">
                                {status === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                                    status === 'error' ? <XCircle className="h-5 w-5 text-red-500" /> :
                                        <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                            </div>
                            <div className="space-y-1">
                                <h4 className={cn(
                                    "font-semibold text-sm",
                                    status === 'success' ? "text-green-700 dark:text-green-400" :
                                        status === 'error' ? "text-red-700 dark:text-red-400" :
                                            "text-blue-700 dark:text-blue-400"
                                )}>
                                    {status === 'success' ? 'Configured' : status === 'error' ? 'Connection Failed' : 'Validating Connection...'}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
                                    {message}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTest}
                            disabled={status === 'testing' || !apiKey}
                            className="border-gray-200 dark:border-gray-800"
                        >
                            <FlaskConical className="mr-2 h-4 w-4" />
                            Test Connection
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleUpdateAll}
                            disabled={status === 'testing' || !isSaved}
                            className="bg-sky-400 hover:bg-sky-500 text-white border-none shadow-sm"
                        >
                            <RefreshCw className={cn("mr-2 h-4 w-4", status === 'testing' && "animate-spin")} />
                            Update All
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="max-w-2xl border-red-100 dark:border-red-900/30">
                <CardHeader className="border-b border-red-50 dark:border-red-900/10 pb-4 bg-red-50/30 dark:bg-red-900/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-lg text-red-900 dark:text-red-100">Danger Zone</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Bulk Data Management</h4>
                        <p className="text-xs text-gray-500">Permanently delete all your trades from the database. This action cannot be undone.</p>
                    </div>
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                if (confirm("ARE YOU SURE? This will permanently delete EVERYTHING (Trades, Positions, Brokers, and local backups). This action cannot be undone.")) {
                                    await resetAllData();
                                }
                            }}
                            className="text-red-600 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900/50"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Factory Reset (Delete Everything)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
