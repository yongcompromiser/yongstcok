'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { createChart, IChartApi, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CandleData } from '@/types/stock';

type Period = 'day' | 'week' | 'month' | 'year';

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '일봉', value: 'day' },
  { label: '주봉', value: 'week' },
  { label: '월봉', value: 'month' },
  { label: '년봉', value: 'year' },
];

// 클라이언트에서 직접 Naver API 호출 (서버사이드 차단 우회)
async function fetchChartData(symbol: string, period: Period): Promise<CandleData[]> {
  try {
    // 먼저 우리 API 시도
    const res = await fetch(`/api/stock/chart?symbol=${symbol}&period=${period}&count=120`);
    if (res.ok) {
      const data = await res.json();
      if (data.chart && data.chart.length > 0) {
        return data.chart;
      }
    }

    // API가 빈 결과 반환 시 직접 Naver 호출 (CORS 허용된 경우만)
    const naverRes = await fetch(
      `https://m.stock.naver.com/api/stock/${symbol}/chart?timeframe=${period}&count=120`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        mode: 'cors',
      }
    );

    if (naverRes.ok) {
      const naverData = await naverRes.json();
      return (naverData || []).map((item: any) => ({
        time: item.localDate || item.dt,
        open: Number(item.openPrice || item.o),
        high: Number(item.highPrice || item.h),
        low: Number(item.lowPrice || item.l),
        close: Number(item.closePrice || item.c),
        volume: Number(item.accumulatedTradingVolume || item.v),
      }));
    }

    return [];
  } catch (error) {
    console.error('fetchChartData error:', error);
    return [];
  }
}

export default function StockChart({ symbol }: { symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [period, setPeriod] = useState<Period>('day');
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const loadChart = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchChartData(symbol, period);
    setChartData(data);
    setIsLoading(false);
  }, [symbol, period]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  useEffect(() => {
    if (!chartContainerRef.current || !chartData || chartData.length === 0) return;

    // 기존 차트 제거
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { color: isDark ? '#0a0a0a' : '#ffffff' },
        textColor: isDark ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
        horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: isDark ? '#374151' : '#e5e7eb',
      },
      timeScale: {
        borderColor: isDark ? '#374151' : '#e5e7eb',
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    // 캔들스틱 시리즈
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    });

    const candleData = chartData.map((d) => ({
      time: d.time as string,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeries.setData(candleData);

    // 볼륨 시리즈
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData = chartData.map((d) => ({
      time: d.time as string,
      value: d.volume,
      color: d.close >= d.open
        ? isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.4)'
        : isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.4)',
    }));

    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();

    // 리사이즈 핸들링
    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartData, isDark]);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-1 mb-3">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : chartData && chartData.length > 0 ? (
          <div ref={chartContainerRef} className="w-full" />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            차트 데이터가 없습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}
