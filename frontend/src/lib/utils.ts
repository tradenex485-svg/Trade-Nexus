import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 2)}%`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getPrioritizationColor(status: string): string {
  switch (status) {
    case 'Monitor':
      return 'text-green-400 bg-green-500/10 border-green-500/30';
    case 'Validate':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'Remediate':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'Breached':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'Exemption Breached':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }
}
