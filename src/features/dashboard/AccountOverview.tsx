import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

interface AccountOverviewProps {
    totalPnL: number;
    accountValue: number;
    availableCash: number;
    ccCollateral: number;
    cspCollateral: number;
}

export default function AccountOverview({
    totalPnL,
    accountValue,
    availableCash,
    ccCollateral,
    cspCollateral
}: AccountOverviewProps) {
    const formatK = (val: number) => {
        if (Math.abs(val) >= 1000) {
            return `${(val / 1000).toFixed(1)}k`;
        }
        return val.toFixed(0);
    };
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Account Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Value</p>
                        <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-50">
                            ${accountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Net Liquidity
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Cash</p>
                        <h3 className={`text-2xl font-bold mt-1 ${availableCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            CC: ${formatK(ccCollateral)} | CSP: ${formatK(cspCollateral)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Trading P&L</p>
                        <h3 className={`text-2xl font-bold mt-1 ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Realized All Time
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
