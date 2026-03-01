import { useState, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { useTradeStore } from '../../hooks/useTradeStore';
import type { Trade, OptionType, TradeStatus, Strategy } from '../../types';
import { parseISO, format, isValid } from 'date-fns';
import Papa from 'papaparse';

interface ImportTradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ImportTradeModal({ isOpen, onClose }: ImportTradeModalProps) {
    const { addTrade, brokers } = useTradeStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setSuccessMsg(null);
        }
    };

    const mapStatus = (status: string): TradeStatus => {
        const s = status.trim().toUpperCase();
        if (s === 'OPENED') return 'OPEN';
        if (s === 'OPEN') return 'OPEN';
        if (s === 'CLOSED') return 'CLOSED';
        if (s === 'ASSIGNED') return 'ASSIGNED';
        if (s === 'EXPIRED') return 'EXPIRED';
        return 'OPEN';
    };

    const mapSide = (side: string): 'BUY' | 'SELL' => {
        const s = side.trim().toUpperCase();
        return s === 'BUY' ? 'BUY' : 'SELL';
    };

    const parseDate = (dateStr: string): string | null => {
        if (!dateStr || dateStr.trim() === '') return null;
        const parsed = parseISO(dateStr.trim());
        if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
        return null;
    };

    const parseNumeric = (val: string): number => {
        if (!val) return 0;
        const cleaned = val.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleImport = async () => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            // Parse with header:false to manually handle validation and header skipping
            const results = Papa.parse(content, { header: false, skipEmptyLines: true });
            const rows = results.data as string[][];

            const importedTrades: Trade[] = [];
            let errorRows = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                // Minimum expected columns for a basic trade row
                if (row.length < 5) continue;

                const [openDate, symbol, side, type, strategy, strike, expirationDate, premium, qty, status, closedDate, closingCost] = row;

                // Heuristic to skip header row
                if (i === 0 && symbol.toLowerCase().includes('symbol')) continue;

                const strikeVal = parseNumeric(strike);
                const symbolVal = symbol.trim();

                // Validation: Must have a symbol and a non-zero strike price
                if (!symbolVal || !strikeVal) {
                    errorRows++;
                    continue;
                }

                const openDateVal = parseDate(openDate) || new Date().toISOString().split('T')[0];
                const expirationDateVal = parseDate(expirationDate) || openDateVal;

                const rawType = type.trim().toUpperCase();
                const mappedType: OptionType = (rawType === 'CSP' || rawType === 'PUT') ? 'Put' : (rawType === 'CC' || rawType === 'CALL') ? 'Call' : 'Put';

                // Use explicit strategy from CSV if provided, otherwise derive from type
                const rawStrategy = (strategy || '').trim().toUpperCase();
                let finalStrategy: Strategy;
                if (rawStrategy === 'CSP' || rawStrategy === 'CC' || rawStrategy === 'VERT' || rawStrategy === 'VERTICALS') {
                    finalStrategy = rawStrategy === 'VERT' || rawStrategy === 'VERTICALS' ? 'Vert' : rawStrategy as Strategy;
                } else {
                    finalStrategy = (rawType === 'CSP' || rawType === 'PUT') ? 'CSP' : (rawType === 'CC' || rawType === 'CALL') ? 'CC' : 'CSP';
                }

                const trade: Trade = {
                    id: crypto.randomUUID(),
                    openDate: openDateVal,
                    symbol: symbolVal.toUpperCase(),
                    side: mapSide(side),
                    type: mappedType,
                    strategy: finalStrategy,
                    strikePrice: strikeVal,
                    premiumPrice: parseNumeric(premium),
                    contracts: Math.round(parseNumeric(qty)) || 1,
                    status: mapStatus(status),
                    expirationDate: expirationDateVal,
                    closeDate: parseDate(closedDate) || undefined,
                    closePrice: closingCost ? parseNumeric(closingCost) : undefined,
                    brokerId: selectedBrokerId || undefined,
                };

                importedTrades.push(trade);
            }

            if (importedTrades.length === 0) {
                setError("No valid trades found in file. Ensure the columns follow the required format.");
                return;
            }

            // Save trades
            for (const trade of importedTrades) {
                await addTrade(trade);
            }

            setSuccessMsg(`Successfully imported ${importedTrades.length} trades.${errorRows > 0 ? ` (${errorRows} rows skipped due to invalid data)` : ''}`);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => onClose(), 2000);
        };
        reader.readAsText(file);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Trades (CSV)">
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-sm text-blue-800 dark:text-blue-200">
                    <div className="flex items-start">
                        <FileText className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold mb-2">CSV Format Guidelines</p>
                            <p className="mb-2 text-xs">Required Header Order:</p>
                            <code className="block bg-black/10 dark:bg-black/30 p-2 rounded mb-2 text-[10px] break-all">
                                Opened, Symbol, Side, Type, Strategy, Strike, Expiration, Premium, Qty, Status, [Closed Date], [Closing Cost]
                            </code>
                            <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                                <li><strong>Required:</strong> Symbol and a valid Strike price.</li>
                                <li><strong>Dates:</strong> YYYY-MM-DD format preferred.</li>
                                <li><strong>Type:</strong> Put or Call.</li>
                                <li><strong>Strategy:</strong> CSP, CC, or Vert. If left blank, auto-derived from Type.</li>
                                <li><strong>Status:</strong> Opened, Closed, Assigned, or Expired.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Target Broker (Optional)</label>
                    <select
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-transparent text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={selectedBrokerId}
                        onChange={e => setSelectedBrokerId(e.target.value)}
                    >
                        <option value="">None</option>
                        {brokers.map(broker => (
                            <option key={broker.id} value={broker.id}>{broker.name}</option>
                        ))}
                    </select>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-10 w-10 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {file ? file.name : "Click to upload CSV"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {file ? `${(file.size / 1024).toFixed(1)} KB` : "Max file size: 5MB"}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md flex items-start text-red-800 dark:text-red-200 text-sm whitespace-pre-wrap">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md flex items-center text-green-800 dark:text-green-200 text-sm">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        {successMsg}
                    </div>
                )}

                <div className="flex justify-end space-x-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleImport} disabled={!file || !!successMsg}>
                        Import Trades
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
