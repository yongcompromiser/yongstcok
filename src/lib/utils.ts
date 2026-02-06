import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 한국 원화 포맷 (억/조 자동 변환)
export function formatKRW(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '-';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_0000_0000_0000) {
    return `${sign}${(abs / 1_0000_0000_0000).toFixed(1)}조`;
  }
  if (abs >= 1_0000_0000) {
    return `${sign}${(abs / 1_0000_0000).toFixed(0)}억`;
  }
  if (abs >= 1_0000) {
    return `${sign}${(abs / 1_0000).toFixed(0)}만`;
  }
  return `${sign}${abs.toLocaleString()}`;
}

// 퍼센트 포맷 (소수점 2자리)
export function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// 숫자 포맷 (천단위 콤마)
export function formatNumber(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '-';
  return value.toLocaleString();
}

// 배수 포맷 (PER, PBR 등)
export function formatMultiple(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '-';
  return value.toFixed(2);
}
