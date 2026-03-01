import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                {
                    'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100': variant === 'default',
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300': variant === 'secondary',
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': variant === 'success',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': variant === 'warning',
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': variant === 'error',
                    'text-gray-900 border border-gray-200 dark:text-gray-100 dark:border-gray-800': variant === 'outline',
                },
                className
            )}
            {...props}
        />
    );
}
