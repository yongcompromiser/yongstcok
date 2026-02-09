// KRX 상장종목 전체 캐시 (data.go.kr 금융위원회_KRX상장종목정보 API)
// corpCodeCache.ts와 동일 패턴: 모듈 레벨 cache + 24h TTL + loading promise

import { StockItem } from './stockList';

const BASE = 'https://apis.data.go.kr/1160100/service/GetKrxListedInfoService/getItemInfo';

let cache: StockItem[] | null = null;
let cacheTime = 0;
let loading: Promise<void> | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cacheTime < CACHE_TTL;
}

// 최근 영업일 목록 (주말/공휴일 대비 fallback)
function getRecentBusinessDates(count: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() - 1); // 어제부터 (오늘 데이터 미생성 가능)
  while (dates.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}${mm}${dd}`);
    }
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

async function loadKrxStocks(): Promise<void> {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    throw new Error('DATA_GO_KR_API_KEY가 설정되지 않았습니다.');
  }

  const dates = getRecentBusinessDates(7);

  for (const date of dates) {
    try {
      const params = new URLSearchParams({
        serviceKey: apiKey,
        resultType: 'json',
        numOfRows: '3000',
        pageNo: '1',
        basDt: date,
      });

      const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 86400 } });
      if (!res.ok) continue;

      const json = await res.json();
      const items = json.response?.body?.items?.item;
      if (!items || !Array.isArray(items) || items.length === 0) continue;

      // KONEX 제외, symbol 기준 중복 제거
      const seen = new Set<string>();
      const stocks: StockItem[] = [];

      for (const item of items) {
        const mrkt = item.mrktCtg as string;
        if (mrkt !== 'KOSPI' && mrkt !== 'KOSDAQ') continue;

        const symbol = (item.srtnCd as string)?.trim().replace(/^A/, '');
        const name = (item.itmsNm as string)?.trim();
        if (!symbol || !name || seen.has(symbol)) continue;

        seen.add(symbol);
        stocks.push({
          symbol,
          name,
          market: mrkt as 'KOSPI' | 'KOSDAQ',
        });
      }

      if (stocks.length === 0) continue;

      cache = stocks;
      cacheTime = Date.now();
      console.log(`[krxStockCache] ${stocks.length}개 종목 로드 완료 (basDt: ${date})`);
      return;
    } catch {
      continue;
    }
  }

  throw new Error('KRX 종목 정보를 가져올 수 없습니다 (모든 날짜 실패).');
}

// 전체 종목 리스트 반환
export async function getAllKrxStocks(): Promise<StockItem[]> {
  if (!isCacheValid()) {
    if (!loading) {
      loading = loadKrxStocks()
        .catch((err) => {
          console.error('[krxStockCache] 로드 실패:', err);
        })
        .finally(() => {
          loading = null;
        });
    }
    await loading;
  }

  return cache ?? [];
}

// KRX 캐시에서 검색
export async function searchKrxStocks(query: string): Promise<StockItem[]> {
  const stocks = await getAllKrxStocks();
  if (stocks.length === 0) return [];

  const q = query.toLowerCase().trim();
  return stocks
    .filter((s) => s.name.toLowerCase().includes(q) || s.symbol.includes(q))
    .slice(0, 15);
}
