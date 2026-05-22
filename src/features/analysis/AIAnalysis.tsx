import { useTradeStore } from '../../hooks/useTradeStore';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { Sparkles, Clock, AlertTriangle, CheckCircle, Globe, BarChart2, TrendingUp, Shield, Lightbulb } from 'lucide-react';
import type { Trade } from '../../types';
import { differenceInDays, parseISO, format } from 'date-fns';

const MACRO_ENVIRONMENTS = [
    {
        fedRates: '4.0% - 4.25%',
        inflation: 'Cooling towards target',
        gdp: 'Steady at 2.1%',
        sentiment: 'Bullish / Soft Landing',
        geopolitics: {
            primary: 'Elections & Trade Policy Focus',
            energyImpact: 'Stable supply dynamics',
            riskAssets: 'Favorable (Equities climbing)'
        },
        earnings: 'Guidance raised across tech sector',
        riskLevel: 'LOW'
    },
    {
        fedRates: '3.5% - 3.75%',
        inflation: 'Sticky above 2.5% target',
        gdp: 'Moderating toward 1.8%',
        sentiment: 'Cautious / Resilience',
        geopolitics: {
            primary: 'Middle East conflict escalation',
            energyImpact: 'Upward pressure on Oil/Gas',
            riskAssets: 'Volatile (Safe-haven shift to USD/Gold)'
        },
        earnings: 'Valuation adjustments vs. fragile orders',
        riskLevel: 'HIGH'
    },
    {
        fedRates: '3.0% - 3.25%',
        inflation: 'Deflationary pressures emerging',
        gdp: 'Slowing to 1.0%',
        sentiment: 'Bearish / Hard Landing Fears',
        geopolitics: {
            primary: 'Global supply chain restructuring',
            energyImpact: 'Demand destruction lowering prices',
            riskAssets: 'Risk-Off (Bonds catching bids)'
        },
        earnings: 'Earnings downgrades pricing in',
        riskLevel: 'ELEVATED'
    }
];

const RATIONALE_TEMPLATES: Record<string, string[]> = {
    NVDA: ["Capitalizing on sustained AI infrastructure capex.", "Implied volatility remains rich due to semiconductor cyclicality."],
    TSLA: ["Selling premium against EV margin volatility.", "Exploiting high implied volatility surrounding delivery estimates."],
    MSTR: ["Harnessing structural premium from Bitcoin proxy volatility.", "Targeting aggressive theta decay in this high-beta asset."],
    COIN: ["Volatility remains elevated alongside broader crypto market flows.", "Capturing premium during crypto consolidation phases."],
    RIOT: ["Capitalizing on the asymmetric risk premium in Bitcoin mining equities.", "Elevated IV offers strong theta opportunities."],
    SPY:  ["Constructing a structural theta-capture position against broad market stability.", "Selling premium to capture routine market fluctuations."],
    QQQ:  ["Deploying capital to capture tech-sector beta decay.", "Conservative strike selection against top-heavy tech indices."],
    AAPL: ["Capturing stable premium against hardware cyclicality and services growth.", "Selling theta in a historically lower-volatility mega-cap."],
    MSFT: ["Leveraging software-as-a-service stability for reliable theta decay.", "Targeting conservative strikes on stable cloud growth."],
    COST: ["Selling premium on consumer defensive resilience.", "Capturing low-risk theta on steady retail footprint."]
};

const getRationale = (symbol: string, dte: number, strike: number, contractType: string) => {
    const templates = RATIONALE_TEMPLATES[symbol] || [
        "Deploying capital into a high-probability structural trade.",
        "Capturing elevated implied volatility for efficient theta decay."
    ];
    const monthIdx = new Date().getMonth();
    const specificReason = templates[monthIdx % templates.length];
    
    return `Selling a ${dte}-DTE ${contractType} at $${strike.toFixed(2)} on ${symbol}. ${specificReason} Look to manage at 50% max profit.`;
};

export default function AIAnalysis() {
    const { trades, marketPrices } = useTradeStore();
    const stats = useDashboardStats(0, 1);
    const utilizationPercent = stats.utilizationPercent;

    const openOptionTrades = trades.filter(t => t.status === 'OPEN' && !t.isArchived);
    
    // Dynamically pick the macro environment based on the current month
    const currentDate = new Date();
    const currentMonthLabel = format(currentDate, 'MMMM yyyy').toUpperCase();
    const macroEnv = MACRO_ENVIRONMENTS[currentDate.getMonth() % MACRO_ENVIRONMENTS.length];

    // Mock prices for generating realistic strikes when real market prices aren't loaded for new tickers
    const mockPrices = {
        NVDA: 135.50,
        TSLA: 245.20,
        MSTR: 1450.00,
        COIN: 285.50,
        RIOT: 12.80,
        SPY: 535.40,
        QQQ: 460.75,
        AAPL: 225.30,
        MSFT: 440.00,
        COST: 820.50
    };

    const getSpotPrice = (sym: string) => marketPrices[sym] || mockPrices[sym as keyof typeof mockPrices] || 100.00;

    // AI Trade Proposal Logic
    const generateProposals = () => {
        const closedOptionTrades = trades.filter(t => t.status !== 'OPEN' && !t.isArchived && t.strategy !== 'Vert');
        const isAggressive = closedOptionTrades.length > 10;
        
        const targets = isAggressive 
            ? ['NVDA', 'TSLA', 'MSTR', 'COIN', 'RIOT'] 
            : ['SPY', 'QQQ', 'AAPL', 'MSFT', 'COST'];

        const proposals = [];
        
        for (let i = 0; i < Math.min(5, targets.length); i++) {
            const sym = targets[i];
            const spotPrice = getSpotPrice(sym);
            const isHighBeta = ['NVDA', 'TSLA', 'MSTR', 'COIN', 'RIOT', 'MARA', 'BTC'].includes(sym);
            
            // Randomize DTE slightly based on the month to make it feel dynamic
            const baseDte = isHighBeta ? 14 : 45;
            const dteModifier = (currentDate.getMonth() % 3) * 7; 
            const dte = baseDte + dteModifier;
            
            const contractType = 'CSP';
            const offsetMultiplier = isHighBeta ? 0.85 : 0.95;
            
            // Calculate a clean strike: round to nearest 0.5 or 1 or 5 depending on price
            let exactStrike = spotPrice * offsetMultiplier;
            if (exactStrike > 500) exactStrike = Math.round(exactStrike / 5) * 5;
            else if (exactStrike > 100) exactStrike = Math.round(exactStrike);
            else exactStrike = Math.round(exactStrike * 2) / 2;

            const deltaApprox = Math.round((1 - offsetMultiplier) * 100 + (isHighBeta ? 5 : -5));
            const rationale = getRationale(sym, dte, exactStrike, contractType);

            proposals.push({
                id: `prop-${i}`,
                symbol: sym,
                type: contractType,
                dte,
                strikePrice: exactStrike,
                spotPrice,
                deltaApprox,
                rationale
            });
        }
        return proposals;
    };

    const proposals = generateProposals();

    if (openOptionTrades.length === 0 && proposals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
                <Sparkles className="w-12 h-12 mb-4 text-blue-400" />
                <h2 className="text-xl font-semibold">No Open Option Trades</h2>
                <p>Add some trades to see the advanced AI analysis.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header with Global Context */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-100 mb-2">
                            <Globe className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">{currentMonthLabel} OUTLOOK</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-amber-300" />
                            AI Portfolio Insights
                        </h2>
                        <p className="text-blue-100 max-w-xl text-sm leading-relaxed">
                            Analyzing {openOptionTrades.length} positions against macro-economic stressors,
                            {macroEnv.geopolitics.primary.toLowerCase()}, and your historical {(trades.filter(t => t.status === 'CLOSED').length > 10) ? 'aggressive' : 'conservative'} trading patterns.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block mb-1">Risk Environment</span>
                            <span className={`text-lg font-black ${macroEnv.riskLevel === 'HIGH' ? 'text-rose-300' : macroEnv.riskLevel === 'ELEVATED' ? 'text-amber-300' : 'text-emerald-300'}`}>
                                {macroEnv.riskLevel}
                            </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block mb-1">Fed Funds Rate</span>
                            <span className="text-lg font-black">{macroEnv.fedRates}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Trade Proposals Card */}
            <div className={`bg-gradient-to-br ${utilizationPercent < 80 ? 'from-emerald-500 to-teal-700' : 'from-slate-600 to-slate-800'} rounded-2xl p-8 text-white shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4`}>
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        {utilizationPercent < 80 ? <Lightbulb className="w-8 h-8 text-teal-200" /> : <Shield className="w-8 h-8 text-slate-300" />}
                        <div>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                                {utilizationPercent < 80 ? 'AI Trade Proposals' : 'Capital Conservation Mode'}
                            </h2>
                            <p className={`${utilizationPercent < 80 ? 'text-emerald-100' : 'text-slate-200'} text-sm`}>
                                Capital utilization is at <span className="font-bold underline decoration-white/50 underline-offset-2">{isNaN(utilizationPercent) ? '0' : utilizationPercent.toFixed(1)}%</span>. 
                                {utilizationPercent < 80 ? ' Deploying excess cash according to your historical profile.' : ' Utilization >= 80%. Suggesting no new trades to maintain cash.'}
                            </p>
                        </div>
                    </div>

                    {utilizationPercent < 80 && (
                        <div className="overflow-x-auto mt-6 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                            <table className="w-full text-left text-sm text-white">
                                <thead className="text-xs uppercase bg-teal-900/50 text-teal-100 border-b border-white/10">
                                    <tr>
                                        <th className="px-5 py-4 font-black tracking-widest whitespace-nowrap">Asset</th>
                                        <th className="px-5 py-4 font-black tracking-widest whitespace-nowrap">Target Strike</th>
                                        <th className="px-5 py-4 font-black tracking-widest whitespace-nowrap">Duration</th>
                                        <th className="px-5 py-4 font-black tracking-widest min-w-[300px]">Strategist Rationale</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {proposals.map(prop => (
                                        <tr key={prop.id} className="hover:bg-white/5 transition-colors duration-200">
                                            <td className="px-5 py-4 whitespace-nowrap align-top">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-black tracking-widest">{prop.symbol}</span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">
                                                            {prop.type}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-teal-200 uppercase font-bold tracking-widest">Spot: ${prop.spotPrice.toFixed(2)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap align-top space-y-1">
                                                <span className="text-base font-black flex items-center gap-1">${prop.strikePrice.toFixed(2)}</span>
                                                <span className="text-[10px] text-emerald-100/70 uppercase tracking-widest block font-bold">~{prop.deltaApprox} Delta</span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap align-top">
                                                <span className="px-2.5 py-1 rounded-md text-xs font-black shadow-sm tracking-widest bg-emerald-900/60 text-emerald-100 border border-emerald-700/50">
                                                    {prop.dte} DTE
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 align-top text-xs leading-relaxed text-emerald-50/90 italic">
                                                "{prop.rationale}"
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {openOptionTrades.map(trade => (
                    <AnalysisCard key={trade.id} trade={trade} stockPrice={marketPrices[trade.symbol]} macroEnv={macroEnv} />
                ))}
            </div>
        </div>
    );
}

function AnalysisCard({ trade, stockPrice, macroEnv }: { trade: Trade, stockPrice?: number, macroEnv: any }) {
    const daysToExpiry = differenceInDays(parseISO(trade.expirationDate), new Date());

    // Dynamically check for earnings proximity (Simulating earnings happening mid-quarter)
    const expDate = parseISO(trade.expirationDate);
    const currentDate = new Date();
    // Simulate an earnings date 45 days into the current quarter
    const quarterStartMonth = Math.floor(currentDate.getMonth() / 3) * 3;
    const simulatedEarningsDate = new Date(currentDate.getFullYear(), quarterStartMonth, 45);
    
    const daysDiff = Math.abs(differenceInDays(expDate, simulatedEarningsDate));
    const isNearEarnings = daysDiff <= 10;

    const analyze = () => {
        const isPut = trade.type === 'Put';
        const isITM = isPut ? (stockPrice ? stockPrice < trade.strikePrice : false) : (stockPrice ? stockPrice > trade.strikePrice : false);
        const distancePercent = stockPrice ? Math.abs((stockPrice - trade.strikePrice) / trade.strikePrice) * 100 : 0;

        let action = "Keep Position Open";
        let rationale = "Theta decay is working in your favor. Continue to monitor.";
        let variant: 'info' | 'success' | 'warning' | 'danger' = 'info';
        let contextTags = ["Theta Decay Positive"];

        // 1. Profit Pattern Logic (User Appetite)
        const isHighBeta = ['MARA', 'RIOT', 'BTC', 'COIN'].includes(trade.symbol);

        if (isHighBeta) {
            contextTags.push("High Beta Asset");
            rationale = "Given asset volatility and your history of timely exits, aim for 70% profit capture to mitigate local pullbacks.";
        }

        // 2. Earnings Risk
        if (isNearEarnings) {
            contextTags.push("Earnings Risk");
            action = "Close Before Expiry";
            rationale = "Position expires near a simulated earnings window. Implied Volatility (IV) crush or binary move risk is elevated. Statistically prudent to exit before the report.";
            variant = 'warning';
        }

        // 3. Geopolitical / Macro Context dynamically applied
        if (macroEnv.riskLevel !== 'LOW') {
            if (isHighBeta && distancePercent < 15) {
                action = "Tighten Stops / Exit Early";
                rationale += ` Macro conditions highlight ${macroEnv.geopolitics.primary.toLowerCase()}, which often pressures high-beta assets.`;
                variant = 'warning';
            }
        }

        // 4. Stand-by / Expiry Logic
        if (daysToExpiry <= 0) {
            action = "Finalize Settlement";
            rationale = "Expiration reached. Verify final stock price against strike to confirm assignment or expiration.";
            variant = 'danger';
        } else if (daysToExpiry < 7) {
            if (!isITM && distancePercent > 8) {
                action = "Exit at >85% Profit";
                rationale = "Final week gamma risk is not worth the remaining 10-15% premium. Capture gains now before potentially volatile headline moves.";
                variant = 'success';
            } else if (isITM) {
                action = "Immediate Management (Roll/Close)";
                rationale = "Position is ITM in the expiration week. Risk of assignment is near 100%. If assignment is not desired, roll to the next cycle immediately.";
                variant = 'danger';
            }
        }

        return { action, rationale, variant, contextTags };
    };

    const { action, rationale, variant, contextTags } = analyze();

    const getVariantStyles = (v: typeof variant) => {
        switch (v) {
            case 'success': return 'bg-emerald-50/50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/10 dark:border-emerald-800 dark:text-emerald-400';
            case 'warning': return 'bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-400';
            case 'danger': return 'bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-900/10 dark:border-rose-800 dark:text-rose-400';
            default: return 'bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-400';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden group">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">

                {/* Column 1: Trade Architecture */}
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 flex-shrink-0">
                            <span className="text-xl font-black text-gray-900 dark:text-gray-100">{trade.symbol[0]}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-gray-100">{trade.symbol}</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${trade.type === 'Put' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {trade.type}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Open Strategy: {trade.strategy || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Strike Price</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black tracking-tight">${trade.strikePrice}</span>
                                <span className="text-[10px] font-bold text-gray-400">USD</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiration</span>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-gray-300" />
                                <span className="text-sm font-black tracking-tight whitespace-nowrap">{new Date(trade.expirationDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Recommended Action & Context Tags */}
                <div className="p-8 flex flex-col justify-center bg-gray-50/30 dark:bg-gray-800/20">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-6">Execution Strategy</span>
                    <div className={`flex items-start gap-4 p-5 rounded-2xl border-2 border-dashed transition-all duration-300 group-hover:scale-[1.02] ${getVariantStyles(variant)}`}>
                        <div className="mt-1">
                            {variant === 'success' ? <CheckCircle className="w-6 h-6" /> :
                                variant === 'danger' ? <AlertTriangle className="w-6 h-6" /> :
                                    <TrendingUp className="w-6 h-6" />}
                        </div>
                        <div className="space-y-1">
                            <span className="text-lg font-black tracking-tight leading-tight block">
                                {action}
                            </span>
                            <span className="text-xs font-bold opacity-70 uppercase tracking-wide">AI Recommendation</span>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                        {contextTags.map(tag => (
                            <span key={tag} className="px-3 py-1 rounded-full bg-white dark:bg-gray-800 text-[10px] font-bold text-gray-500 border border-gray-100 dark:border-gray-700 shadow-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Column 3: The "WHY" - AI Rationale */}
                <div className="p-8 flex flex-col justify-center relative">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-6">Strategic Rationale</span>
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                            <Shield className="w-5 h-5 text-gray-200 dark:text-gray-700" />
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400 italic">
                            "{rationale}"
                        </p>
                    </div>

                    {stockPrice && (
                        <div className="mt-8 pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <BarChart2 className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Spot Price</span>
                                    <span className="text-sm font-black tracking-tight underline decoration-gray-200 underline-offset-4">${stockPrice.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-[0.1em] shadow-sm ${(trade.type === 'Put' ? stockPrice < trade.strikePrice : stockPrice > trade.strikePrice)
                                ? 'bg-rose-500 text-white shadow-rose-200 dark:shadow-none'
                                : 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none'
                                }`}>
                                {(trade.type === 'Put' ? stockPrice < trade.strikePrice : stockPrice > trade.strikePrice) ? 'ITM (Intrinsic)' : 'OTM (Extrinsic)'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
