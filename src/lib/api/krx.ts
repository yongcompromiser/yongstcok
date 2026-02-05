// KRX / 네이버 금융 비공식 API를 통한 주식 데이터 조회
// Next.js API Route (서버사이드)에서만 호출

import { StockPrice, Stock, CandleData } from '@/types/stock';

const NAVER_STOCK_API = 'https://m.stock.naver.com/api';
const KRX_API = 'https://data-dbg.krx.co.kr/svc/apis';

// 개별 종목 시세 조회
export async function getStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const res = await fetch(
      `${NAVER_STOCK_API}/stock/${symbol}/basic`,
      { next: { revalidate: 30 } } // 30초 캐시
    );
    if (!res.ok) return null;

    const data = await res.json();

    return {
      symbol,
      price: Number(data.closePrice?.replace(/,/g, '') || 0),
      change: Number(data.compareToPreviousClosePrice?.replace(/,/g, '') || 0),
      changePercent: Number(data.fluctuationsRatio || 0),
      volume: Number(data.accumulatedTradingVolume?.replace(/,/g, '') || 0),
      high: Number(data.highPrice?.replace(/,/g, '') || 0),
      low: Number(data.lowPrice?.replace(/,/g, '') || 0),
      open: Number(data.openPrice?.replace(/,/g, '') || 0),
      prevClose: Number(data.previousClosePrice?.replace(/,/g, '') || 0),
      marketCap: Number(data.marketCap?.replace(/,/g, '') || 0),
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
    const res = await fetch(
      `${NAVER_STOCK_API}/stock/${symbol}/basic`,
      { next: { revalidate: 3600 } } // 1시간 캐시
    );
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

// 종목 검색
export async function searchStocks(query: string): Promise<Stock[]> {
  try {
    const res = await fetch(
      `${NAVER_STOCK_API}/search?query=${encodeURIComponent(query)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const items = data.result?.d || data.result?.items || [];

    return items
      .filter((item: any) => item.nation === 'KOR' || item.marketType === 'stock')
      .slice(0, 10)
      .map((item: any) => ({
        symbol: item.code || item.itemCode,
        name: item.name || item.stockName,
        market: 'KR' as const,
        sector: item.sectorName,
      }));
  } catch (error) {
    console.error('searchStocks error:', error);
    return [];
  }
}

// 주가 차트 데이터 (일봉)
export async function getStockChart(
  symbol: string,
  period: 'day' | 'week' | 'month' | 'year' = 'day',
  count: number = 120
): Promise<CandleData[]> {
  try {
    const timeframe = period === 'day' ? 'day' : period === 'week' ? 'week' : period === 'month' ? 'month' : 'day';
    const res = await fetch(
      `${NAVER_STOCK_API}/stock/${symbol}/chart?timeframe=${timeframe}&count=${count}`,
      { next: { revalidate: 300 } } // 5분 캐시
    );
    if (!res.ok) return [];

    const data = await res.json();

    return (data || []).map((item: any) => ({
      time: item.localDate,
      open: Number(item.openPrice),
      high: Number(item.highPrice),
      low: Number(item.lowPrice),
      close: Number(item.closePrice),
      volume: Number(item.accumulatedTradingVolume),
    }));
  } catch (error) {
    console.error('getStockChart error:', error);
    return [];
  }
}

// 시장 전체 시세 (코스피/코스닥 상위 종목)
export async function getMarketTopStocks(
  market: 'KOSPI' | 'KOSDAQ' = 'KOSPI',
  type: 'rise' | 'fall' | 'volume' = 'rise',
  count: number = 5
): Promise<{ symbol: string; name: string; price: number; change: number; changePercent: number }[]> {
  try {
    const sortType = type === 'rise' ? 'rise' : type === 'fall' ? 'fall' : 'accumulatedTradingVolume';
    const res = await fetch(
      `${NAVER_STOCK_API}/domestic/stock/ranking/${sortType}?sospiCategory=${market}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const stocks = data.stocks || [];

    return stocks.slice(0, count).map((item: any) => ({
      symbol: item.itemCode || item.code,
      name: item.stockName || item.name,
      price: Number(item.closePrice?.replace(/,/g, '') || 0),
      change: Number(item.compareToPreviousClosePrice?.replace(/,/g, '') || 0),
      changePercent: Number(item.fluctuationsRatio || 0),
    }));
  } catch (error) {
    console.error('getMarketTopStocks error:', error);
    return [];
  }
}

// 시장 지수 (코스피, 코스닥)
export async function getMarketIndex(): Promise<{
  kospi: { value: number; change: number; changePercent: number };
  kosdaq: { value: number; change: number; changePercent: number };
} | null> {
  try {
    const [kospiRes, kosdaqRes] = await Promise.all([
      fetch(`${NAVER_STOCK_API}/index/KOSPI/basic`, { next: { revalidate: 60 } }),
      fetch(`${NAVER_STOCK_API}/index/KOSDAQ/basic`, { next: { revalidate: 60 } }),
    ]);

    if (!kospiRes.ok || !kosdaqRes.ok) return null;

    const [kospiData, kosdaqData] = await Promise.all([
      kospiRes.json(),
      kosdaqRes.json(),
    ]);

    return {
      kospi: {
        value: Number(kospiData.closePrice?.replace(/,/g, '') || 0),
        change: Number(kospiData.compareToPreviousClosePrice?.replace(/,/g, '') || 0),
        changePercent: Number(kospiData.fluctuationsRatio || 0),
      },
      kosdaq: {
        value: Number(kosdaqData.closePrice?.replace(/,/g, '') || 0),
        change: Number(kosdaqData.compareToPreviousClosePrice?.replace(/,/g, '') || 0),
        changePercent: Number(kosdaqData.fluctuationsRatio || 0),
      },
    };
  } catch (error) {
    console.error('getMarketIndex error:', error);
    return null;
  }
}
