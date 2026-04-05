import type { ReactNode } from 'react';
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
    children: ReactNode;
    content: ReactNode | string;
}

export function Tooltip({ children, content }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="absolute z-50 w-64 p-2 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg dark:bg-gray-800 -top-2 left-full ml-2 transform -translate-y-1/2">
                    <div className="absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
                    {content}
                </div>
            )}
        </div>
    );
}

export function InfoTooltip({ content }: { content: ReactNode | string }) {
    return (
        <Tooltip content={content}>
            <HelpCircle className="w-4 h-4 ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
        </Tooltip>
    );
}
