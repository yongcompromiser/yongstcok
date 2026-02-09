import { NextRequest, NextResponse } from 'next/server';
import {
  getFredHistory,
  getYahooHistory,
  getEcosHistory,
  getFearGreedHistory,
} from '@/lib/api/economyHistory';
import type { Period } from '@/lib/api/economyHistory';

const VALID_PERIODS = ['1M', '3M', '6M', '1Y', '3Y', '5Y'] as const;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const source = sp.get('source');
  const rawPeriod = sp.get('period') || '1Y';
  const period: Period = VALID_PERIODS.includes(rawPeriod as Period) ? (rawPeriod as Period) : '1Y';

  try {
    switch (source) {
      case 'fred': {
        const id = sp.get('id');
        if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
        const data = await getFredHistory(id, period);
        return NextResponse.json({ data });
      }
      case 'yahoo': {
        const ticker = sp.get('ticker');
        if (!ticker) return NextResponse.json({ error: 'ticker 필요' }, { status: 400 });
        const data = await getYahooHistory(ticker, period);
        return NextResponse.json({ data });
      }
      case 'ecos': {
        const stat = sp.get('stat');
        const item = sp.get('item');
        const freq = sp.get('freq') || 'M';
        if (!stat || !item) return NextResponse.json({ error: 'stat, item 필요' }, { status: 400 });
        const data = await getEcosHistory(stat, item, freq, period);
        return NextResponse.json({ data });
      }
      case 'fng': {
        const data = await getFearGreedHistory(period);
        return NextResponse.json({ data });
      }
      default:
        return NextResponse.json({ error: 'source 필요: fred, yahoo, ecos, fng' }, { status: 400 });
    }
  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json({ error: '차트 데이터를 불러올 수 없습니다.' }, { status: 500 });
  }
}
