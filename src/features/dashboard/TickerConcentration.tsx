import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart } from 'lucide-react';

interface TickerExposure {
    name: string;
    value: number;
    [key: string]: any;
}

interface TickerConcentrationProps {
    data: TickerExposure[];
    totalAccountValue: number;
}

const COLORS = [
    '#3B82F6', // blue-500
    '#6366F1', // indigo-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#64748B', // slate-500
];

const CustomizedContent = (props: any) => {
    const { x, y, width, height, index, name, value, totalAccountValue } = props;
    const percentage = ((value / totalAccountValue) * 100).toFixed(1);

    if (width < 40 || height < 40) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: COLORS[index % COLORS.length],
                    stroke: '#fff',
                    strokeWidth: 2,
                    strokeOpacity: 0.2,
                }}
            />
            <text
                x={x + width / 2}
                y={y + height / 2 - 5}
                textAnchor="middle"
                fill="#fff"
                fontSize={12}
                fontWeight="bold"
            >
                {name}
            </text>
            <text
                x={x + width / 2}
                y={y + height / 2 + 12}
                textAnchor="middle"
                fill="#fff"
                fontSize={10}
                opacity={0.8}
            >
                {percentage}%
            </text>
        </g>
    );
};

export default function TickerConcentration({ data, totalAccountValue }: TickerConcentrationProps) {
    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm h-[300px] flex flex-col items-center justify-center text-gray-500 italic">
                No open positions to display risk distribution.
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-500" />
                    Ticker Concentration & Risk
                </h3>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    By Capital Deployed
                </span>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={data}
                        dataKey="value"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        content={<CustomizedContent totalAccountValue={totalAccountValue} />}
                    >
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    const percentage = ((item.value / totalAccountValue) * 100).toFixed(1);
                                    return (
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-xl">
                                            <p className="font-bold text-sm mb-1">{item.name}</p>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-gray-500">Basis: <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</span></p>
                                                <p className="text-xs text-gray-500">Weight: <span className="font-medium text-gray-900 dark:text-gray-100">{percentage}%</span></p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
