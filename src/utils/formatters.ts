import { RiskLevel } from '../types/change';

export function formatRiskLevel(level: RiskLevel): {
  label: string;
  badgeClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
} {
  switch (level) {
    case 'LOW':
      return {
        label: 'Low Risk',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        textClass: 'text-emerald-700',
        bgClass: 'bg-emerald-500',
        borderClass: 'border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    case 'MEDIUM':
      return {
        label: 'Medium Risk',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        textClass: 'text-amber-700',
        bgClass: 'bg-amber-500',
        borderClass: 'border-amber-200',
        dotClass: 'bg-amber-500',
      };
    case 'HIGH':
      return {
        label: 'High Risk',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        textClass: 'text-orange-700',
        bgClass: 'bg-orange-500',
        borderClass: 'border-orange-200',
        dotClass: 'bg-orange-500',
      };
    case 'CRITICAL':
      return {
        label: 'Critical Risk',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        textClass: 'text-red-700',
        bgClass: 'bg-red-500',
        borderClass: 'border-red-200',
        dotClass: 'bg-red-500',
      };
  }
}

export function formatDeploymentStatus(status: string): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'MONITORING':
      return {
        label: 'Monitoring Telemetry',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-600 animate-pulse',
      };
    case 'PROMOTING':
      return {
        label: 'Promoting Traffic',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dotClass: 'bg-indigo-600 animate-pulse',
      };
    case 'PROMOTED':
      return {
        label: '100% Promoted',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-600',
      };
    case 'PAUSED':
      return {
        label: 'Rollout Paused',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-600',
      };
    case 'ROLLING_BACK':
      return {
        label: 'Rolling Back',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-600 animate-pulse',
      };
    case 'ROLLED_BACK':
      return {
        label: 'Rolled Back',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-600',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-600',
      };
    case 'ABORTED':
      return {
        label: 'Aborted',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500',
      };
    case 'QUEUED':
      return {
        label: 'Queued',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        dotClass: 'bg-slate-400',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
}

export function formatPercent(val: number, decimals: number = 1): string {
  return `${val.toFixed(decimals)}%`;
}

export function formatLatency(ms: number): string {
  return `${Math.round(ms)}ms`;
}
