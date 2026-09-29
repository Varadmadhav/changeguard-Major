import React from 'react';
import { RiskLevel } from '../../types/change';
import { ShieldCheck, AlertTriangle, AlertOctagon, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  size = 'sm',
  showScore = false,
  className,
}) => {
  const config = {
    LOW: {
      label: 'LOW RISK',
      icon: ShieldCheck,
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconColor: 'text-emerald-600',
      dotColor: 'bg-emerald-500',
    },
    MEDIUM: {
      label: 'MEDIUM RISK',
      icon: AlertTriangle,
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      iconColor: 'text-amber-600',
      dotColor: 'bg-amber-500',
    },
    HIGH: {
      label: 'HIGH RISK',
      icon: ShieldAlert,
      classes: 'bg-orange-50 text-orange-900 border-orange-300 font-semibold',
      iconColor: 'text-orange-600',
      dotColor: 'bg-orange-500',
    },
    CRITICAL: {
      label: 'CRITICAL RISK',
      icon: AlertOctagon,
      classes: 'bg-rose-50 text-rose-900 border-rose-300 font-bold animate-pulse',
      iconColor: 'text-rose-600',
      dotColor: 'bg-rose-600',
    },
  }[level];

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border tracking-wide uppercase',
        config.classes,
        sizeClasses,
        className
      )}
    >
      <Icon size={iconSizes} className={cn('shrink-0', config.iconColor)} />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="font-mono text-[10px] opacity-80 border-l border-current pl-1.5 ml-0.5">
          {score}/100
        </span>
      )}
    </span>
  );
};
