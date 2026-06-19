import { NextResponse } from 'next/server';
import { getMarketIndex } from '@/lib/api/krx';

// GET /api/stock/market → 시장 지수
export async function GET() {
  const index = await getMarketIndex();

  return NextResponse.json({ index });
}
