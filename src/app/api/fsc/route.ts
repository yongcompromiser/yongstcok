import { NextRequest, NextResponse } from 'next/server';
import { getStockRanking, getShortSellingTop } from '@/lib/api/fsc';

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');

  try {
    switch (type) {
      case 'volume': {
        const result = await getStockRanking('volume');
        return NextResponse.json(result);
      }
      case 'trading_value': {
        const result = await getStockRanking('tradingValue');
        return NextResponse.json(result);
      }
      case 'short_selling': {
        const result = await getShortSellingTop();
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { error: 'type 파라미터 필요: volume, trading_value, short_selling' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('FSC API error:', error);
    return NextResponse.json(
      { error: '금융위원회 데이터를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
