import { useMemo } from 'react';
import { format, subMonths, isSameMonth, parseISO } from 'date-fns';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Target } from 'lucide-react';

// ── Gauge geometry ──────────────────────────────────────────────────────────
const CX = 160;
const CY = 150;
const R = 108;
const SW = 20;          // stroke width
const START = 225;      // degrees (clockwise from 12 o'clock)
const SWEEP = 270;      // total degrees of arc

function polar(angleDeg: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function arc(startDeg: number, endDeg: number): string {
    if (Math.abs(endDeg - startDeg) < 0.01) return '';
    const s = polar(startDeg);
    const e = polar(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function gaugeColor(pct: number): string {
    if (pct >= 100) return '#10B981';
    if (pct >= 80)  return '#3B82F6';
    if (pct >= 50)  return '#F59E0B';
    return '#EF4444';
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MonthlyTargetGauge() {
    const { trades, stockPositions, navEntries } = useTradeStore();

    const data = useMemo(() => {
        const now = new Date();
        const prevMonth = subMonths(now, 1);
        const prevKey = format(prevMonth, 'yyyy-MM');

        // Previous month total NAV (sum across all brokers)
        const prevNAV = (navEntries || [])
            .filter(e => e.monthYear === prevKey)
            .reduce((s, e) => s + e.navValue, 0);

        const target = prevNAV * 0.025;

        // Current month realized P&L
        const monthTrades = trades.filter(
            t => t.status !== 'OPEN' && t.closeDate && isSameMonth(parseISO(t.openDate), now)
        );
        const monthStocks = stockPositions.filter(
            p => p.status === 'CLOSED' && p.openDate && isSameMonth(parseISO(p.openDate), now)
        );

        const earned = monthTrades.reduce((s, t) => {
            const p = (t.premiumPrice || 0) * t.contracts * 100;
            const c = (t.closePrice || 0) * t.contracts * 100;
            return s + (t.strategy === 'Vert' ? p + c : t.side === 'BUY' ? c - p : p - c);
        }, 0) + monthStocks.reduce((s, p) => s + ((p.sellPrice || 0) - p.buyPrice) * p.quantity, 0);

        const pct = target > 0 ? (earned / target) * 100 : 0;

        return {
            earned,
            target,
            pct,
            prevMonthLabel: format(prevMonth, 'MMM yyyy'),
            currentMonthLabel: format(now, 'MMMM yyyy'),
        };
    }, [trades, stockPositions, navEntries]);

    const { earned, target, pct, prevMonthLabel, currentMonthLabel } = data;
    const color = gaugeColor(pct);

    // Visual cap at 120% so needle doesn't overflow
    const displayPct = Math.min(pct, 120);
    const progressEnd = START + (displayPct / 100) * SWEEP;
    const bgPath = arc(START, START + SWEEP);
    const fgPath = displayPct > 0 ? arc(START, progressEnd) : '';

    // Tick marks at 25 / 50 / 75 / 100 %
    const ticks = [25, 50, 75, 100].map(t => {
        const angle = START + (t / 100) * SWEEP;
        const inner = { x: CX + (R - SW / 2 - 6) * Math.cos((angle - 90) * Math.PI / 180), y: CY + (R - SW / 2 - 6) * Math.sin((angle - 90) * Math.PI / 180) };
        const outer = { x: CX + (R + SW / 2 + 6) * Math.cos((angle - 90) * Math.PI / 180), y: CY + (R + SW / 2 + 6) * Math.sin((angle - 90) * Math.PI / 180) };
        return { inner, outer, label: `${t}%`, angle };
    });

    // Label positions (outside arc)
    const startLabel = polar(START);
    const endLabel   = polar(START + SWEEP);

    if (!target) {
        return (
            <Card className="w-full h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-normal text-muted-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Monthly Target
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 dark:text-gray-500">
                        <Target className="w-8 h-8 opacity-30" />
                        <p className="text-sm">No NAV data for {prevMonthLabel}</p>
                        <p className="text-xs">Add NAV entries to track your target</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full h-full">
            <CardHeader className="pb-0">
                <CardTitle className="text-base font-normal text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Monthly Target — {currentMonthLabel}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
                <div className="flex flex-col items-center">
                    {/* SVG Gauge */}
                    <svg viewBox="0 0 320 230" className="w-full max-w-[280px]">
                        <defs>
                            <filter id="mtGlow">
                                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={color} floodOpacity="0.5" />
                            </filter>
                        </defs>

                        {/* Background track */}
                        <path
                            d={bgPath}
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth={SW}
                            strokeLinecap="round"
                            className="dark:stroke-gray-700"
                        />

                        {/* Progress arc */}
                        {fgPath && (
                            <path
                                d={fgPath}
                                fill="none"
                                stroke={color}
                                strokeWidth={SW}
                                strokeLinecap="round"
                                filter="url(#mtGlow)"
                            />
                        )}

                        {/* Tick marks */}
                        {ticks.map(({ inner, outer, label, angle }) => (
                            <g key={label}>
                                <line
                                    x1={inner.x} y1={inner.y}
                                    x2={outer.x} y2={outer.y}
                                    stroke={angle <= progressEnd ? color : '#D1D5DB'}
                                    strokeWidth={2}
                                    className={angle > progressEnd ? 'dark:stroke-gray-600' : ''}
                                />
                            </g>
                        ))}

                        {/* $0 label */}
                        <text
                            x={startLabel.x - 16} y={startLabel.y + 14}
                            textAnchor="middle" fontSize="11" fill="#9CA3AF" fontFamily="inherit"
                        >$0</text>

                        {/* Target label */}
                        <text
                            x={endLabel.x + 16} y={endLabel.y + 14}
                            textAnchor="middle" fontSize="11" fill="#9CA3AF" fontFamily="inherit"
                        >
                            ${target >= 1000 ? `${(target / 1000).toFixed(1)}k` : target.toFixed(0)}
                        </text>

                        {/* Center: big percentage */}
                        <text
                            x={CX} y={CY - 14}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="46" fontWeight="800" fill={color} fontFamily="inherit"
                        >
                            {Math.round(pct)}%
                        </text>

                        {/* Sub-label */}
                        <text
                            x={CX} y={CY + 26}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="12" fill="#9CA3AF" fontFamily="inherit"
                        >
                            of monthly target
                        </text>

                        {/* Status badge */}
                        {pct >= 100 && (
                            <text
                                x={CX} y={CY + 48}
                                textAnchor="middle" dominantBaseline="middle"
                                fontSize="13" fontWeight="600" fill="#10B981" fontFamily="inherit"
                            >
                                🎉 Target achieved!
                            </text>
                        )}
                    </svg>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3 w-full mt-1">
                        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Earned This Month</p>
                            <p className={`text-base font-bold ${earned >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                {earned >= 0 ? '+' : ''}${Math.abs(earned).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Target (2.5% × {prevMonthLabel} NAV)</p>
                            <p className="text-base font-bold text-gray-700 dark:text-gray-200">
                                ${target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full mt-3">
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1.5">
                            <span>{pct < 100 ? `${(100 - pct).toFixed(1)}% remaining` : `+${(pct - 100).toFixed(1)}% over target`}</span>
                            <span style={{ color }}>{Math.round(pct)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-2 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
