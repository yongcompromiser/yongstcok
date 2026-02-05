import { NextRequest, NextResponse } from 'next/server';
import { getMarketTopStocks, getMarketIndex } from '@/lib/api/krx';

// GET /api/stock/market → 시장 현황 (지수 + 상승/하락 TOP)
export async function GET(request: NextRequest) {
  const [index, topRise, topFall] = await Promise.all([
    getMarketIndex(),
    getMarketTopStocks('KOSPI', 'rise', 5),
    getMarketTopStocks('KOSPI', 'fall', 5),
  ]);

  return NextResponse.json({
    index,
    topRise,
    topFall,
  });
}
