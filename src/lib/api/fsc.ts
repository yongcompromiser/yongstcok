import { ShortSellingItem, StockRankItem } from '@/types/stock';

const BASE = 'https://apis.data.go.kr/1160100/service';

// 최근 영업일 구하기 (주말 건너뛰기, 최대 7일 전까지)
function getRecentBusinessDates(count: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  // 오늘 데이터가 아직 없을 수 있으니 어제부터 시작
  d.setDate(d.getDate() - 1);
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

// 공통 fetch + 날짜 폴백
async function fetchWithDateFallback<T>(
  buildUrl: (date: string) => string,
  parseItems: (items: any[]) => T[],
): Promise<{ data: T[]; date: string }> {
  const dates = getRecentBusinessDates(5);

  for (const date of dates) {
    try {
      const url = buildUrl(date);
      const res = await fetch(url, { next: { revalidate: 1800 } });
      if (!res.ok) continue;
      const json = await res.json();
      const items = json.response?.body?.items?.item;
      if (items && Array.isArray(items) && items.length > 0) {
        return { data: parseItems(items), date };
      }
    } catch {
      continue;
    }
  }

  return { data: [], date: '' };
}

// ═══════════════════════════════════════
// 거래량 상위 / 거래대금 상위
// ═══════════════════════════════════════

export async function getStockRanking(
  sortBy: 'volume' | 'tradingValue' = 'volume',
  numOfRows = 20,
): Promise<{ data: StockRankItem[]; date: string }> {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) return { data: [], date: '' };

  return fetchWithDateFallback<StockRankItem>(
    (date) => {
      const params = new URLSearchParams({
        serviceKey: apiKey,
        resultType: 'json',
        numOfRows: String(numOfRows),
        pageNo: '1',
        basDt: date,
      });
      return `${BASE}/GetStockSecuritiesInfoService/getStockPriceInfo?${params}`;
    },
    (items) => {
      const parsed = items.map((item: any) => ({
        date: item.basDt || '',
        stockCode: item.srtnCd || '',
        stockName: item.itmsNm || '',
        market: item.mrktCtg || '',
        price: parseInt(item.clpr) || 0,
        change: parseInt(item.vs) || 0,
        changePercent: parseFloat(item.fltRt) || 0,
        volume: parseInt(item.trqu) || 0,
        tradingValue: parseInt(item.trPrc) || 0,
        marketCap: parseInt(item.mrktTotAmt) || 0,
      }));

      // 정렬
      if (sortBy === 'volume') {
        parsed.sort((a: StockRankItem, b: StockRankItem) => b.volume - a.volume);
      } else {
        parsed.sort((a: StockRankItem, b: StockRankItem) => b.tradingValue - a.tradingValue);
      }
      return parsed.slice(0, numOfRows);
    },
  );
}

// ═══════════════════════════════════════
// 공매도 현황
// ═══════════════════════════════════════

export async function getShortSellingTop(
  numOfRows = 20,
): Promise<{ data: ShortSellingItem[]; date: string }> {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) return { data: [], date: '' };

  return fetchWithDateFallback<ShortSellingItem>(
    (date) => {
      const params = new URLSearchParams({
        serviceKey: apiKey,
        resultType: 'json',
        numOfRows: '100',
        pageNo: '1',
        basDt: date,
      });
      return `${BASE}/GetShortSellingInfoService/getShortSellingInfo?${params}`;
    },
    (items) => {
      const parsed = items
        .map((item: any) => {
          const shortVol = parseInt(item.cvsrtnDlQty) || 0;
          const totalVol = parseInt(item.trdQty) || 0;
          return {
            date: item.basDt || '',
            stockCode: item.srtnCd || '',
            stockName: item.itmsNm || '',
            market: item.mrktCtg || '',
            shortVolume: shortVol,
            shortAmount: parseInt(item.cvsrtnDlAmt) || 0,
            totalVolume: totalVol,
            shortRatio: totalVol > 0 ? (shortVol / totalVol) * 100 : 0,
          };
        })
        .filter((item: ShortSellingItem) => item.shortVolume > 0);

      // 공매도 비중 내림차순
      parsed.sort((a: ShortSellingItem, b: ShortSellingItem) => b.shortRatio - a.shortRatio);
      return parsed.slice(0, numOfRows);
    },
  );
}
