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

// 종목 검색 (네이버 자동완성 → KRX 캐시 → 로컬 fallback)
export async function searchStocks(query: string): Promise<Stock[]> {
  try {
    // 1. 네이버 자동완성 API (Vercel 서버에서 정상 동작)
    try {
      const res = await fetch(
        `${NAVER_AC}/ac?q=${encodeURIComponent(query)}&target=stock&st=111&r_lt=111&r_format=json`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const items = data?.items?.[0] || [];
        if (Array.isArray(items) && items.length > 0) {
          const results: Stock[] = items
            .filter((item: any[]) => item[0] && item[1])
            .map((item: any[]) => ({
              symbol: String(item[0]).padStart(6, '0'),
              name: item[1] as string,
              market: 'KR' as const,
            }));
          if (results.length > 0) return results.slice(0, 15);
        }
      }
    } catch {
      // 네이버 API 실패 시 fallback으로 진행
    }

    // 2. KRX 캐시 fallback (2,600+개 전체 종목)
    try {
      const { searchKrxStocks } = await import('@/lib/krxStockCache');
      const krxResults = await searchKrxStocks(query);
      if (krxResults.length > 0) {
        return krxResults.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          market: 'KR' as const,
        }));
      }
    } catch {
      // KRX 캐시 실패 시 로컬 fallback으로 진행
    }

    // 3. 로컬 리스트 최종 fallback
    const { searchLocalStocks } = await import('@/lib/stockList');
    return searchLocalStocks(query).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      market: 'KR' as const,
    }));
  } catch (error) {
    console.error('searchStocks error:', error);
    return [];
  }
}

// 주가 차트 데이터 (Yahoo Finance)
export async function getStockChart(
  symbol: string,
  period: 'day' | 'week' | 'month' | 'year' = 'day',
  count: number = 120
): Promise<CandleData[]> {
  // Yahoo Finance 기간/간격 매핑
  const periodMap: Record<string, { range: string; interval: string }> = {
    day: { range: '6mo', interval: '1d' },
    week: { range: '2y', interval: '1wk' },
    month: { range: '5y', interval: '1mo' },
    year: { range: '10y', interval: '1mo' },
  };

  const { range, interval } = periodMap[period];
  const yahooSymbol = `${symbol}.KS`; // KOSPI: .KS, KOSDAQ: .KQ

  // KOSDAQ 종목 판별 (간이)
  const kosdaqPrefixes = ['0', '1', '2', '3', '4', '9'];
  const isKosdaq = symbol.length === 6 && kosdaqPrefixes.includes(symbol[0]) === false;
  const trySymbols = [yahooSymbol, `${symbol}.KQ`];

  for (const sym of trySymbols) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=${range}&interval=${interval}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          next: { revalidate: 300 },
        }
      );
      if (!res.ok) continue;
      const data = await res.json();

      const result = data?.chart?.result?.[0];
      if (!result?.timestamp || !result?.indicators?.quote?.[0]) continue;

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      const candles: CandleData[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] == null) continue;
        candles.push({
          time: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
          open: Math.round(quote.open[i]),
          high: Math.round(quote.high[i]),
          low: Math.round(quote.low[i]),
          close: Math.round(quote.close[i]),
          volume: quote.volume[i] || 0,
        });
      }

      if (candles.length > 0) return candles;
    } catch (error) {
      console.error(`getStockChart error (${sym}):`, error);
    }
  }
  return [];
}

// ETN/ETF 등 파생상품 필터
function isDerivativeProduct(symbol: string, name: string): boolean {
  // ETN 코드 (5xxxxx)
  if (symbol.length === 6 && symbol[0] === '5') return true;
  // 이름 기반 필터
  if (/ETN|ETF|레버리지|인버스|선물/i.test(name)) return true;
  return false;
}

// 시장 상승/하락 TOP (ETN/ETF 제외)
export async function getMarketTopStocks(
  market: 'KOSPI' | 'KOSDAQ' = 'KOSPI',
  type: 'rise' | 'fall' = 'rise',
  count: number = 5
): Promise<{ symbol: string; name: string; price: number; change: number; changePercent: number }[]> {
  const fetchSize = count + 40; // 파생상품(ETN/ETF) 필터링 여유분

  // 순차 시도: 첫 성공 결과 사용 (원래 작동하던 패턴 유지)
  const urls = [
    `${NAVER_API}/domestic/ranking/riseFall?sospiCategory=${market}&isRise=${type === 'rise'}&page=1&pageSize=${fetchSize}`,
    `${NAVER_API}/domestic/ranking/${type}?sospiCategory=${market}&page=1&pageSize=${fetchSize}`,
    `${NAVER_API}/stocks/${type === 'rise' ? 'up' : 'down'}?page=1&pageSize=${fetchSize}`,
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
        const mapped = stocks.map((item: any) => ({
          symbol: item.itemCode || item.cd || item.code || item.stockCode || '',
          name: item.stockName || item.nm || item.name || '',
          price: parseNum(item.closePrice || item.nv || item.price),
          change: parseNum(item.compareToPreviousClosePrice || item.cv || item.change),
          changePercent: parseFloat(item.fluctuationsRatio || item.cr || item.changePercent) || 0,
        }));

        // ETN/ETF 파생상품 제외
        const filtered = mapped.filter((s: any) => !isDerivativeProduct(s.symbol, s.name));
        return (filtered.length > 0 ? filtered : mapped).slice(0, count);
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
