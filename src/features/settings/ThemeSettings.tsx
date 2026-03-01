import { useTheme } from '../../hooks/useTheme';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Moon, Sun, Monitor, Clock, Check } from 'lucide-react';

export default function ThemeSettings() {
    const {
        mode,
        isAutomatic,
        isSmart,
        smartStart,
        smartEnd,
        setMode,
        setIsAutomatic,
        setIsSmart,
        setSmartRange
    } = useTheme();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight">Theme Settings</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Customize how the application looks and feels
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="h-5 w-5" />
                            Theme Selection
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant={!isAutomatic && !isSmart && mode === 'light' ? 'primary' : 'outline'}
                                onClick={() => setMode('light')}
                                className="flex-1 min-w-[120px]"
                            >
                                <Sun className="mr-2 h-4 w-4" />
                                Light
                            </Button>
                            <Button
                                variant={!isAutomatic && !isSmart && mode === 'dark' ? 'primary' : 'outline'}
                                onClick={() => setMode('dark')}
                                className="flex-1 min-w-[120px]"
                            >
                                <Moon className="mr-2 h-4 w-4" />
                                Dark
                            </Button>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-medium">Automatic</div>
                                    <div className="text-xs text-gray-500">Follow system theme preferences</div>
                                </div>
                                <button
                                    onClick={() => setIsAutomatic(!isAutomatic)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isAutomatic ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutomatic ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-medium">Smart Theme</div>
                                    <div className="text-xs text-gray-500">Automatically switch at specific times</div>
                                </div>
                                <button
                                    onClick={() => setIsSmart(!isSmart)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSmart ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSmart ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {isSmart && (
                    <Card className="animate-in fade-in slide-in-from-left-2 transition-all">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Smart Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Dark Mode Start</label>
                                    <Input
                                        type="time"
                                        value={smartStart}
                                        onChange={(e) => setSmartRange(e.target.value, smartEnd)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Dark Mode End</label>
                                    <Input
                                        type="time"
                                        value={smartEnd}
                                        onChange={(e) => setSmartRange(smartStart, e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                    The application will automatically switch to <strong>Dark Mode</strong> between {smartStart} and {smartEnd}, and use <strong>Light Mode</strong> otherwise.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Card className="max-w-md">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${mode === 'dark' ? 'bg-gray-800 text-yellow-400' : 'bg-blue-50 text-blue-600'}`}>
                            {mode === 'dark' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                        </div>
                        <div>
                            <div className="text-sm font-semibold">Active Theme</div>
                            <div className="text-lg font-bold capitalize flex items-center gap-2">
                                {mode} Mode
                                <Check className="h-4 w-4 text-green-500" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
