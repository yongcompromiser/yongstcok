import { NextRequest, NextResponse } from 'next/server';
import { getMarketTopStocks, getMarketIndex } from '@/lib/api/krx';

// GET /api/stock/market → 시장 현황 (지수 + 상승/하락 TOP)
export async function GET(request: NextRequest) {
  // KOSPI + KOSDAQ 순차 조회 후 합산 (등락률 정렬)
  const [index, kospiRise, kosdaqRise, kospiFall, kosdaqFall] = await Promise.all([
    getMarketIndex(),
    getMarketTopStocks('KOSPI', 'rise', 5),
    getMarketTopStocks('KOSDAQ', 'rise', 5),
    getMarketTopStocks('KOSPI', 'fall', 5),
    getMarketTopStocks('KOSDAQ', 'fall', 5),
  ]);

  // 합산 → 등락률 기준 정렬 → 중복 제거 → 상위 5개
  const mergeAndSort = (
    a: typeof kospiRise,
    b: typeof kosdaqRise,
    dir: 'rise' | 'fall'
  ) => {
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
      )
      .slice(0, 5);
  };

  return NextResponse.json({
    index,
    topRise: mergeAndSort(kospiRise, kosdaqRise, 'rise'),
    topFall: mergeAndSort(kospiFall, kosdaqFall, 'fall'),
  });
}
