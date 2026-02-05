import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice, getStockInfo, searchStocks } from '@/lib/api/krx';

// GET /api/stock?symbol=005930 → 시세 조회
// GET /api/stock?q=삼성 → 종목 검색
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const query = searchParams.get('q');

  // 종목 검색
  if (query) {
    const results = await searchStocks(query);
    return NextResponse.json({ results });
  }

  // 개별 종목 시세
  if (symbol) {
    const [price, info] = await Promise.all([
      getStockPrice(symbol),
      getStockInfo(symbol),
    ]);

    if (!price || !info) {
      return NextResponse.json(
        { error: '종목 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ stock: info, price });
  }

  return NextResponse.json(
    { error: 'symbol 또는 q 파라미터가 필요합니다.' },
    { status: 400 }
  );
}
