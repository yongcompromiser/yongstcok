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

// 종목 검색 (로컬 + Yahoo Finance)
export async function searchStocks(query: string): Promise<Stock[]> {
  try {
    // 로컬 검색
    const { searchLocalStocks } = await import('@/lib/stockList');
    const localResults = searchLocalStocks(query).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      market: 'KR' as const,
    }));

    // Yahoo Finance 검색 (보조)
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const yahooResults = (data.quotes || [])
          .filter((q: any) => q.exchange === 'KSC' || q.exchange === 'KOE')
          .map((q: any) => ({
            symbol: (q.symbol || '').replace(/\.(KS|KQ)$/, ''),
            name: q.shortname || q.longname || '',
            market: 'KR' as const,
          }));

        // 병합 (로컬 우선, 중복 제거)
        const seen = new Set(localResults.map((r) => r.symbol));
        for (const yr of yahooResults) {
          if (!seen.has(yr.symbol) && yr.symbol) {
            seen.add(yr.symbol);
            localResults.push(yr);
          }
        }
      }
    } catch {
      // Yahoo 실패해도 로컬 결과 반환
    }

    return localResults.slice(0, 15);
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
