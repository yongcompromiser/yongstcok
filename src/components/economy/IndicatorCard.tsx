'use client';

import { cn } from '@/lib/utils';

interface IndicatorCardProps {
  name: string;
  value: string | number;
  change?: number;
  changePercent?: number;
  unit?: string;
  date?: string;
}

export function IndicatorCard({
  name,
  value,
  change,
  changePercent,
  unit,
  date,
}: IndicatorCardProps) {
  const hasChange = change != null && change !== 0;
  const isPositive = (change ?? 0) > 0;

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-xs text-muted-foreground truncate">{name}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums">
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hasChange && (
        <div className="flex items-center gap-1 text-xs">
          <span
            className={cn(
              'font-medium tabular-nums',
              isPositive ? 'text-red-500' : 'text-blue-500'
            )}
          >
            {isPositive ? '+' : ''}
            {change!.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          {changePercent != null && (
            <span
              className={cn(
                'tabular-nums',
                isPositive ? 'text-red-500' : 'text-blue-500'
              )}
            >
              ({isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          )}
        </div>
      )}
      {date && (
        <span className="text-[10px] text-muted-foreground">{date}</span>
      )}
    </div>
  );
}
