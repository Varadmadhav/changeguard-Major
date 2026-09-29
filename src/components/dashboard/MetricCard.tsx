import React, { ReactNode } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number; // e.g. -12
    isGood: boolean;
    label?: string;
  };
  subtitle?: string;
  icon?: ReactNode;
  highlight?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  subtitle,
  icon,
  highlight = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200/80 rounded-card p-4 shadow-card flex flex-col justify-between transition-all hover:border-slate-300',
        highlight && 'border-blue-200 bg-blue-50/20',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="my-2 flex items-baseline gap-2.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium font-mono',
              trend.isGood ? 'text-emerald-700' : 'text-rose-700'
            )}
          >
            {trend.value < 0 ? (
              <TrendingDown size={13} />
            ) : trend.value > 0 ? (
              <TrendingUp size={13} />
            ) : (
              <Minus size={13} />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      {subtitle && (
        <span className="text-[11px] text-slate-400 truncate">{subtitle}</span>
      )}
    </div>
  );
};
