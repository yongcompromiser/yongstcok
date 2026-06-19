import { NextRequest, NextResponse } from 'next/server';
import { getHormuzHistory } from '@/lib/api/chokepoint';
import type { Period } from '@/lib/api/economyHistory';

const VALID_PERIODS = ['1M', '3M', '6M', '1Y', '3Y', '5Y'] as const;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const rawPeriod = sp.get('period') || '1Y';
  const period: Period = VALID_PERIODS.includes(rawPeriod as Period) ? (rawPeriod as Period) : '1Y';

  try {
    const data = await getHormuzHistory(period);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Chokepoint API error:', error);
    return NextResponse.json({ error: '호르무즈 통행량 데이터를 불러올 수 없습니다.' }, { status: 500 });
  }
}
