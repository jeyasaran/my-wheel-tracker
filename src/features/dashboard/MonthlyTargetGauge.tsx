import { useMemo } from 'react';
import { format, subMonths, isSameMonth, parseISO } from 'date-fns';
import { useTradeStore } from '../../hooks/useTradeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Target } from 'lucide-react';

// ── Gauge constants ──────────────────────────────────────────────────────────
const CX   = 160;
const CY   = 140;
const R    = 90;
const SW   = 16;
const CIRC    = 2 * Math.PI * R;          // full circle circumference
const ARC_LEN = CIRC * (270 / 360);       // 270° arc
const GAP_LEN = CIRC - ARC_LEN;           // 90° gap at bottom
// SVG circles start at 3-o'clock; rotate 135° so arc begins at 7:30 (225° from top)
const ROT = `rotate(135 ${CX} ${CY})`;

/** Convert an angle (degrees clockwise from top) + radius to SVG xy */
function pt(degFromTop: number, r: number) {
    const rad = (degFromTop - 90) * (Math.PI / 180);
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
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
        const prevMonth  = subMonths(now, 1);
        const prevKey    = format(prevMonth, 'yyyy-MM');

        const prevNAV = (navEntries || [])
            .filter(e => e.monthYear === prevKey)
            .reduce((s, e) => s + e.navValue, 0);

        const target = prevNAV * 0.025;

        const monthTrades = trades.filter(
            t => t.status !== 'OPEN' && t.closeDate && isSameMonth(parseISO(t.openDate), now)
        );
        const monthStocks = stockPositions.filter(
            p => p.status === 'CLOSED' && p.openDate && isSameMonth(parseISO(p.openDate), now)
        );

        const earned =
            monthTrades.reduce((s, t) => {
                const p = (t.premiumPrice || 0) * t.contracts * 100;
                const c = (t.closePrice  || 0) * t.contracts * 100;
                return s + (t.strategy === 'Vert' ? p + c : t.side === 'BUY' ? c - p : p - c);
            }, 0) +
            monthStocks.reduce((s, p) => s + ((p.sellPrice || 0) - p.buyPrice) * p.quantity, 0);

        const pct = target > 0 ? (earned / target) * 100 : 0;

        return {
            earned, target, pct,
            prevMonthLabel:    format(prevMonth, 'MMM yyyy'),
            currentMonthLabel: format(now,       'MMMM yyyy'),
        };
    }, [trades, stockPositions, navEntries]);

    const { earned, target, pct, prevMonthLabel, currentMonthLabel } = data;
    const color       = gaugeColor(pct);
    const displayPct  = Math.min(pct, 100);       // cap at 100 for fill length
    const progressLen = ARC_LEN * displayPct / 100;

    // Tick marks at 25 / 50 / 75 / 100 %
    const filledAngle = 225 + (displayPct / 100) * 270;
    const ticks = [25, 50, 75, 100].map(t => {
        const angle = 225 + (t / 100) * 270;
        return {
            t,
            inner: pt(angle, R - SW / 2 - 4),
            outer: pt(angle, R + SW / 2 + 4),
            filled: angle <= filledAngle,
        };
    });

    // End-point label positions (slightly outside arc)
    const startPt = pt(225, R + SW / 2 + 10);
    const endPt   = pt(135, R + SW / 2 + 10);

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
                    <svg viewBox="0 0 320 210" className="w-full max-w-[280px]">
                        <defs>
                            <filter id="mtGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="0" stdDeviation="5"
                                    floodColor={color} floodOpacity="0.55" />
                            </filter>
                        </defs>

                        {/* ── Background track ── */}
                        <circle
                            cx={CX} cy={CY} r={R}
                            fill="none"
                            stroke="#374151"
                            strokeWidth={SW}
                            strokeLinecap="round"
                            strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
                            transform={ROT}
                        />

                        {/* ── Progress arc (same circle, same rotation) ── */}
                        {progressLen > 0 && (
                            <circle
                                cx={CX} cy={CY} r={R}
                                fill="none"
                                stroke={color}
                                strokeWidth={SW}
                                strokeLinecap="round"
                                strokeDasharray={`${progressLen} ${CIRC}`}
                                transform={ROT}
                                filter="url(#mtGlow)"
                            />
                        )}

                        {/* ── Tick marks ── */}
                        {ticks.map(({ t, inner, outer, filled }) => (
                            <line
                                key={t}
                                x1={inner.x} y1={inner.y}
                                x2={outer.x} y2={outer.y}
                                stroke={filled ? color : '#4B5563'}
                                strokeWidth={2}
                            />
                        ))}

                        {/* ── $0 label (start of arc) ── */}
                        <text
                            x={startPt.x} y={startPt.y}
                            textAnchor="middle" fontSize="10" fill="#6B7280" fontFamily="inherit"
                        >$0</text>

                        {/* ── Target label (end of arc) ── */}
                        <text
                            x={endPt.x} y={endPt.y}
                            textAnchor="middle" fontSize="10" fill="#6B7280" fontFamily="inherit"
                        >
                            ${target >= 1000 ? `${(target / 1000).toFixed(1)}k` : target.toFixed(0)}
                        </text>

                        {/* ── Centre: big percentage ── */}
                        <text
                            x={CX} y={CY - 8}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="44" fontWeight="800" fill={color} fontFamily="inherit"
                        >
                            {Math.round(pct)}%
                        </text>

                        {/* ── Sub-label ── */}
                        <text
                            x={CX} y={CY + 30}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="12" fill="#9CA3AF" fontFamily="inherit"
                        >
                            of monthly target
                        </text>

                        {/* ── Target-achieved badge ── */}
                        {pct >= 100 && (
                            <text
                                x={CX} y={CY + 52}
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
