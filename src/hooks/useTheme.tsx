import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeSettings {
    mode: ThemeMode;
    isAutomatic: boolean;
    isSmart: boolean;
    smartStart: string; // HH:mm
    smartEnd: string;   // HH:mm
}

interface ThemeContextType extends ThemeSettings {
    setMode: (mode: ThemeMode) => void;
    setIsAutomatic: (isAuto: boolean) => void;
    setIsSmart: (isSmart: boolean) => void;
    setSmartRange: (start: string, end: string) => void;
}

const STORAGE_KEY = 'wheel-tracker-theme-v1';

const DEFAULT_SETTINGS: ThemeSettings = {
    mode: 'dark',
    isAutomatic: true,
    isSmart: false,
    smartStart: '18:00',
    smartEnd: '06:00',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<ThemeSettings>(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Error reading theme from localStorage', error);
            return DEFAULT_SETTINGS;
        }
    });

    const [resolvedMode, setResolvedMode] = useState<ThemeMode>(settings.mode);

    useEffect(() => {
        const updateTheme = () => {
            let newMode: ThemeMode = settings.mode;

            if (settings.isAutomatic) {
                newMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            } else if (settings.isSmart) {
                const now = new Date();
                const [startH, startM] = settings.smartStart.split(':').map(Number);
                const [endH, endM] = settings.smartEnd.split(':').map(Number);

                const startTime = new Date();
                startTime.setHours(startH, startM, 0);

                const endTime = new Date();
                endTime.setHours(endH, endM, 0);

                const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
                const startInMinutes = startH * 60 + startM;
                const endInMinutes = endH * 60 + endM;

                if (startInMinutes < endInMinutes) {
                    // Normal range (e.g., 08:00 to 18:00) -> Dark during range? 
                    // Usually "Smart" means dark at night.
                    // Let's assume the user defines the DARK period.
                    if (currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes) {
                        newMode = 'dark';
                    } else {
                        newMode = 'light';
                    }
                } else {
                    // Overnight range (e.g., 18:00 to 06:00)
                    if (currentTimeInMinutes >= startInMinutes || currentTimeInMinutes < endInMinutes) {
                        newMode = 'dark';
                    } else {
                        newMode = 'light';
                    }
                }
            }

            setResolvedMode(newMode);

            // Apply theme to document
            if (newMode === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
            }
        };

        updateTheme();

        // Listen for system theme changes if in automatic mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => {
            if (settings.isAutomatic) updateTheme();
        };

        mediaQuery.addEventListener('change', listener);

        // Periodic check for smart theme (every minute)
        let interval: any;
        if (settings.isSmart) {
            interval = setInterval(updateTheme, 60000);
        }

        return () => {
            mediaQuery.removeEventListener('change', listener);
            if (interval) clearInterval(interval);
        };
    }, [settings]);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const setMode = (mode: ThemeMode) => setSettings(s => ({ ...s, mode, isAutomatic: false, isSmart: false }));
    const setIsAutomatic = (isAutomatic: boolean) => setSettings(s => ({ ...s, isAutomatic, isSmart: isAutomatic ? false : s.isSmart }));
    const setIsSmart = (isSmart: boolean) => setSettings(s => ({ ...s, isSmart, isAutomatic: isSmart ? false : s.isAutomatic }));
    const setSmartRange = (smartStart: string, smartEnd: string) => setSettings(s => ({ ...s, smartStart, smartEnd }));

    return (
        <ThemeContext.Provider value={{
            ...settings,
            mode: resolvedMode, // Use the resolved mode for the UI
            setMode,
            setIsAutomatic,
            setIsSmart,
            setSmartRange
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
