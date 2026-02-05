import { NextRequest, NextResponse } from 'next/server';
import { getStockChart } from '@/lib/api/krx';

// GET /api/stock/chart?symbol=005930&period=day&count=120
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const period = (searchParams.get('period') || 'day') as 'day' | 'week' | 'month' | 'year';
  const count = Number(searchParams.get('count') || 120);

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  const chart = await getStockChart(symbol, period, count);
  return NextResponse.json({ chart });
}
