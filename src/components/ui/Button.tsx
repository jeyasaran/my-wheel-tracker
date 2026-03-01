import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
                    {
                        'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
                        'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700': variant === 'secondary',
                        'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
                        'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800': variant === 'ghost',
                        'border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800': variant === 'outline',
                        'h-8 px-3 text-sm': size === 'sm',
                        'h-10 px-4 py-2': size === 'md',
                        'h-12 px-6': size === 'lg',
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button };
