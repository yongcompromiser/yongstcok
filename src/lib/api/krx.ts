import { StockPrice, Stock, CandleData } from '@/types/stock';

const NAVER_API = 'https://m.stock.naver.com/api';
const NAVER_AC = 'https://ac.stock.naver.com';

// 개별 종목 시세 조회
export async function getStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const res = await fetch(`${NAVER_API}/stock/${symbol}/basic`, {
      next: { revalidate: 30 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      symbol,
      price: parseNum(data.closePrice),
      change: parseNum(data.compareToPreviousClosePrice),
      changePercent: parseFloat(data.fluctuationsRatio) || 0,
      volume: parseNum(data.accumulatedTradingVolume),
      high: parseNum(data.highPrice),
      low: parseNum(data.lowPrice),
      open: parseNum(data.openPrice),
      prevClose: parseNum(data.previousClosePrice),
      marketCap: parseNum(data.marketCap),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('getStockPrice error:', error);
    return null;
  }
}

// 종목 기본 정보 조회
export async function getStockInfo(symbol: string): Promise<Stock | null> {
  try {
    const res = await fetch(`${NAVER_API}/stock/${symbol}/basic`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      symbol,
      name: data.stockName || '',
      market: 'KR',
      sector: data.sectorName || undefined,
      industry: data.industryName || undefined,
    };
  } catch (error) {
    console.error('getStockInfo error:', error);
    return null;
  }
}

// 종목 검색 (네이버 자동완성)
export async function searchStocks(query: string): Promise<Stock[]> {
  try {
    // 방법 1: 네이버 자동완성 API
    const res = await fetch(
      `${NAVER_AC}/ac?q=${encodeURIComponent(query)}&target=stock&st=111&r_lt=111&r_format=json`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const items = data?.items?.[0] || [];
      return items.slice(0, 10).map((item: any[]) => ({
        symbol: item[0]?.[0] || '',
        name: item[1]?.[0] || '',
        market: 'KR' as const,
      }));
    }

    // 방법 2: 네이버 검색 API (fallback)
    const res2 = await fetch(
      `${NAVER_API}/search?query=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res2.ok) {
      const data2 = await res2.json();
      const items = data2?.result?.d || data2?.result?.items || data2?.result?.stock || [];
      return items.slice(0, 10).map((item: any) => ({
        symbol: item.code || item.itemCode || item.reutersCode || '',
        name: item.name || item.stockName || '',
        market: 'KR' as const,
      }));
    }

    return [];
  } catch (error) {
    console.error('searchStocks error:', error);
    return [];
  }
}

// 주가 차트 데이터
export async function getStockChart(
  symbol: string,
  period: 'day' | 'week' | 'month' | 'year' = 'day',
  count: number = 120
): Promise<CandleData[]> {
  try {
    const now = new Date();
    const endTime = formatDateKRX(now);
    const startDate = new Date(now);
    if (period === 'year') startDate.setFullYear(now.getFullYear() - 5);
    else if (period === 'month') startDate.setFullYear(now.getFullYear() - 2);
    else startDate.setMonth(now.getMonth() - 6);
    const startTime = formatDateKRX(startDate);

    const res = await fetch(
      `${NAVER_API}/stock/${symbol}/chart?timeframe=${period}&count=${count}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data || []).map((item: any) => ({
      time: item.localDate || item.dt,
      open: Number(item.openPrice || item.o),
      high: Number(item.highPrice || item.h),
      low: Number(item.lowPrice || item.l),
      close: Number(item.closePrice || item.c),
      volume: Number(item.accumulatedTradingVolume || item.v),
    }));
  } catch (error) {
    console.error('getStockChart error:', error);
    return [];
  }
}

// 시장 상승/하락 TOP
export async function getMarketTopStocks(
  market: 'KOSPI' | 'KOSDAQ' = 'KOSPI',
  type: 'rise' | 'fall' = 'rise',
  count: number = 5
): Promise<{ symbol: string; name: string; price: number; change: number; changePercent: number }[]> {
  // 여러 엔드포인트 시도
  const urls = [
    `${NAVER_API}/domestic/ranking/${type === 'rise' ? 'riseFall' : 'riseFall'}?sospiCategory=${market}&isRise=${type === 'rise'}&page=1&pageSize=${count}`,
    `${NAVER_API}/domestic/ranking/${type}?sospiCategory=${market}&page=1&pageSize=${count}`,
    `${NAVER_API}/stocks/${type === 'rise' ? 'up' : 'down'}?page=1&pageSize=${count}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const stocks = data.stocks || data.datas || data.result || data || [];

      if (Array.isArray(stocks) && stocks.length > 0) {
        return stocks.slice(0, count).map((item: any) => ({
          symbol: item.itemCode || item.cd || item.code || item.stockCode || '',
          name: item.stockName || item.nm || item.name || '',
          price: parseNum(item.closePrice || item.nv || item.price),
          change: parseNum(item.compareToPreviousClosePrice || item.cv || item.change),
          changePercent: parseFloat(item.fluctuationsRatio || item.cr || item.changePercent) || 0,
        }));
      }
    } catch {
      continue;
    }
  }

  console.error('getMarketTopStocks: all endpoints failed');
  return [];
}

// 시장 지수 (코스피, 코스닥)
export async function getMarketIndex(): Promise<{
  kospi: { value: number; change: number; changePercent: number };
  kosdaq: { value: number; change: number; changePercent: number };
} | null> {
  try {
    const [kospiRes, kosdaqRes] = await Promise.all([
      fetch(`${NAVER_API}/index/KOSPI/basic`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      }),
      fetch(`${NAVER_API}/index/KOSDAQ/basic`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      }),
    ]);

    if (!kospiRes.ok || !kosdaqRes.ok) return null;

    const [kospi, kosdaq] = await Promise.all([kospiRes.json(), kosdaqRes.json()]);

    return {
      kospi: {
        value: parseFloat(kospi.closePrice?.replace(/,/g, '') || kospi.now || '0'),
        change: parseFloat(kospi.compareToPreviousClosePrice?.replace(/,/g, '') || kospi.change || '0'),
        changePercent: parseFloat(kospi.fluctuationsRatio || kospi.changePercent || '0'),
      },
      kosdaq: {
        value: parseFloat(kosdaq.closePrice?.replace(/,/g, '') || kosdaq.now || '0'),
        change: parseFloat(kosdaq.compareToPreviousClosePrice?.replace(/,/g, '') || kosdaq.change || '0'),
        changePercent: parseFloat(kosdaq.fluctuationsRatio || kosdaq.changePercent || '0'),
      },
    };
  } catch (error) {
    console.error('getMarketIndex error:', error);
    return null;
  }
}

// 유틸
function parseNum(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return Number(String(val).replace(/,/g, '')) || 0;
}

function formatDateKRX(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}
