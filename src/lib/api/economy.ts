import {
  FearGreedData,
  ExchangeRate,
  CommodityPrice,
  FredIndicator,
} from '@/types/stock';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ── Fear & Greed Index (alternative.me) ──

export async function getFearGreedIndex(): Promise<FearGreedData | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json.data?.[0];
    if (!d) return null;
    return {
      value: parseInt(d.value, 10),
      classification: d.value_classification,
      timestamp: d.timestamp,
    };
  } catch (e) {
    console.error('getFearGreedIndex error:', e);
    return null;
  }
}

// ── FRED API ──

const FRED_SERIES: { id: string; name: string; unit: string }[] = [
  { id: 'FEDFUNDS', name: '연방기금금리', unit: '%' },
  { id: 'DGS10', name: '미국 10년 국채', unit: '%' },
  { id: 'DGS2', name: '미국 2년 국채', unit: '%' },
  { id: 'T10Y2Y', name: '장단기 스프레드(10Y-2Y)', unit: '%' },
  { id: 'CPIAUCSL', name: '미국 CPI', unit: '% (YoY)' },
  { id: 'UNRATE', name: '미국 실업률', unit: '%' },
];

export async function getFredSeries(): Promise<FredIndicator[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  const results: FredIndicator[] = [];

  await Promise.all(
    FRED_SERIES.map(async (series) => {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return;
        const json = await res.json();
        const obs = json.observations?.[0];
        if (!obs || obs.value === '.') return;
        results.push({
          seriesId: series.id,
          name: series.name,
          value: parseFloat(obs.value),
          date: obs.date,
          unit: series.unit,
        });
      } catch (e) {
        console.error(`FRED ${series.id} error:`, e);
      }
    })
  );

  return results;
}

// ── 네이버 금융 환율 ──

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  try {
    const res = await fetch(
      'https://m.stock.naver.com/front-api/marketIndex/productList?category=exchange&reutersCode=FX_USDKRW,FX_EURKRW,FX_JPYKRW,FX_CNYKRW',
      {
        headers: { 'User-Agent': UA },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return await getExchangeRatesFallback();
    const json = await res.json();
    const items = json.result || [];
    if (items.length === 0) return await getExchangeRatesFallback();

    return items.map((item: any) => {
      const code = (item.reutersCode || '').replace('FX_', '').replace('KRW', '');
      return {
        currency: code || item.name,
        rate: parseFloat(item.closePrice) || 0,
        change: parseFloat(item.compareToPreviousClosePrice) || 0,
        changePercent: parseFloat(item.fluctuationsRatio) || 0,
      };
    });
  } catch (e) {
    console.error('getExchangeRates error:', e);
    return await getExchangeRatesFallback();
  }
}

async function getExchangeRatesFallback(): Promise<ExchangeRate[]> {
  const pairs = [
    { code: 'USD', reuters: 'FX_USDKRW' },
    { code: 'EUR', reuters: 'FX_EURKRW' },
    { code: 'JPY', reuters: 'FX_JPYKRW' },
    { code: 'CNY', reuters: 'FX_CNYKRW' },
  ];

  const results: ExchangeRate[] = [];

  await Promise.all(
    pairs.map(async ({ code, reuters }) => {
      try {
        const res = await fetch(
          `https://m.stock.naver.com/front-api/marketIndex/productDetail?reutersCode=${reuters}`,
          { headers: { 'User-Agent': UA }, next: { revalidate: 300 } }
        );
        if (!res.ok) return;
        const json = await res.json();
        const d = json.result;
        if (!d) return;
        results.push({
          currency: code,
          rate: parseFloat(d.closePrice) || 0,
          change: parseFloat(d.compareToPreviousClosePrice) || 0,
          changePercent: parseFloat(d.fluctuationsRatio) || 0,
        });
      } catch {
        // skip
      }
    })
  );

  return results;
}

// ── 네이버 금융 원자재 ──

export async function getCommodityPrices(): Promise<CommodityPrice[]> {
  try {
    const res = await fetch(
      'https://m.stock.naver.com/front-api/marketIndex/productList?category=worldCommodity&reutersCode=OILCL1,CMDT_GC,CMDT_SI',
      {
        headers: { 'User-Agent': UA },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return await getCommodityPricesFallback();
    const json = await res.json();
    const items = json.result || [];
    if (items.length === 0) return await getCommodityPricesFallback();

    return items.map((item: any) => ({
      name: mapCommodityName(item.reutersCode || item.name),
      price: parseFloat(item.closePrice) || 0,
      change: parseFloat(item.compareToPreviousClosePrice) || 0,
      changePercent: parseFloat(item.fluctuationsRatio) || 0,
      unit: mapCommodityUnit(item.reutersCode),
    }));
  } catch (e) {
    console.error('getCommodityPrices error:', e);
    return await getCommodityPricesFallback();
  }
}

async function getCommodityPricesFallback(): Promise<CommodityPrice[]> {
  const commodities = [
    { code: 'OILCL1', name: 'WTI 유가', unit: 'USD/bbl' },
    { code: 'CMDT_GC', name: '금', unit: 'USD/oz' },
    { code: 'CMDT_SI', name: '은', unit: 'USD/oz' },
  ];

  const results: CommodityPrice[] = [];

  await Promise.all(
    commodities.map(async ({ code, name, unit }) => {
      try {
        const res = await fetch(
          `https://m.stock.naver.com/front-api/marketIndex/productDetail?reutersCode=${code}`,
          { headers: { 'User-Agent': UA }, next: { revalidate: 300 } }
        );
        if (!res.ok) return;
        const json = await res.json();
        const d = json.result;
        if (!d) return;
        results.push({
          name,
          price: parseFloat(d.closePrice) || 0,
          change: parseFloat(d.compareToPreviousClosePrice) || 0,
          changePercent: parseFloat(d.fluctuationsRatio) || 0,
          unit,
        });
      } catch {
        // skip
      }
    })
  );

  return results;
}

function mapCommodityName(code: string): string {
  const map: Record<string, string> = {
    OILCL1: 'WTI 유가',
    CMDT_GC: '금',
    CMDT_SI: '은',
  };
  return map[code] || code;
}

function mapCommodityUnit(code: string): string {
  const map: Record<string, string> = {
    OILCL1: 'USD/bbl',
    CMDT_GC: 'USD/oz',
    CMDT_SI: 'USD/oz',
  };
  return map[code] || '';
}

// ── 한국은행 ECOS ──

const ECOS_ITEMS: { statCode: string; itemCode: string; name: string; unit: string }[] = [
  { statCode: '722Y001', itemCode: '0101000', name: '한국 기준금리', unit: '%' },
  { statCode: '901Y009', itemCode: '0', name: '소비자물가 상승률', unit: '% (YoY)' },
];

export async function getEcosSeries(): Promise<FredIndicator[]> {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) return [];

  const results: FredIndicator[] = [];

  await Promise.all(
    ECOS_ITEMS.map(async ({ statCode, itemCode, name, unit }) => {
      try {
        const endDate = new Date().toISOString().slice(0, 7).replace('-', '');
        const startYear = new Date().getFullYear() - 1;
        const startDate = `${startYear}01`;
        const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1/${statCode}/M/${startDate}/${endDate}/${itemCode}`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return;
        const json = await res.json();
        const row = json.StatisticSearch?.row?.[0];
        if (!row) return;
        results.push({
          seriesId: `${statCode}_${itemCode}`,
          name,
          value: parseFloat(row.DATA_VALUE) || 0,
          date: row.TIME || '',
          unit,
        });
      } catch (e) {
        console.error(`ECOS ${statCode} error:`, e);
      }
    })
  );

  return results;
}
