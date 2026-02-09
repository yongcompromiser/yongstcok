import { NextRequest, NextResponse } from 'next/server';
import { getMarketTopStocks, getMarketIndex, TopStock } from '@/lib/api/krx';

// 합산 → 등락률 기준 정렬 → 중복 제거
function mergeAndSort(
  a: TopStock[],
  b: TopStock[],
  dir: 'rise' | 'fall'
): TopStock[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((s) => {
      if (!s.symbol || seen.has(s.symbol)) return false;
      seen.add(s.symbol);
      return true;
    })
    .sort((x, y) =>
      dir === 'rise'
        ? y.changePercent - x.changePercent
        : x.changePercent - y.changePercent
    );
}

// GET /api/stock/market
// 기존: → { index, topRise, topFall }
// 신규: ?type=rise&page=1 → { stocks, page, hasMore }
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'rise' | 'fall' | null;
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  // 페이지네이션 모드: type이 지정된 경우
  if (type === 'rise' || type === 'fall') {
    const perPage = 10;

    const [kospiResult, kosdaqResult] = await Promise.all([
      getMarketTopStocks('KOSPI', type, perPage, page),
      getMarketTopStocks('KOSDAQ', type, perPage, page),
    ]);

    const merged = mergeAndSort(kospiResult.stocks, kosdaqResult.stocks, type);
    const stocks = merged.slice(0, perPage);
    const hasMore = kospiResult.hasMore || kosdaqResult.hasMore;

    return NextResponse.json({ stocks, page, hasMore });
  }

  // 기존 동작: 시장 지수 + 상승/하락 TOP 5
  const [index, kospiRise, kosdaqRise, kospiFall, kosdaqFall] = await Promise.all([
    getMarketIndex(),
    getMarketTopStocks('KOSPI', 'rise', 5),
    getMarketTopStocks('KOSDAQ', 'rise', 5),
    getMarketTopStocks('KOSPI', 'fall', 5),
    getMarketTopStocks('KOSDAQ', 'fall', 5),
  ]);

  return NextResponse.json({
    index,
    topRise: mergeAndSort(kospiRise.stocks, kosdaqRise.stocks, 'rise').slice(0, 5),
    topFall: mergeAndSort(kospiFall.stocks, kosdaqFall.stocks, 'fall').slice(0, 5),
  });
}
