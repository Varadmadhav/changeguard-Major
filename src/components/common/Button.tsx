import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'sm',
      loading = false,
      icon,
      iconPosition = 'left',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-subtle border border-transparent font-medium active:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
      secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-subtle font-medium active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1',
      outline: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium active:bg-slate-200',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-subtle border border-transparent font-medium active:bg-rose-800 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent font-medium',
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-subtle border border-transparent font-medium active:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500',
    };

    const sizeStyles = {
      xs: 'text-xs px-2.5 py-1 rounded-[6px] gap-1.5',
      sm: 'text-xs px-3 py-1.5 rounded-[6px] gap-1.5 font-medium',
      md: 'text-sm px-4 py-2 rounded-[8px] gap-2 font-medium',
      lg: 'text-sm px-5 py-2.5 rounded-[8px] gap-2 font-medium',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-all outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
