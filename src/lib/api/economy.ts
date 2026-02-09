import {
  FearGreedData,
  ExchangeRate,
  CommodityPrice,
  FredIndicator,
} from '@/types/stock';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// 네이버/Yahoo 숫자 파싱 (콤마 제거)
function parseNum(v: any): number {
  if (v == null) return 0;
  return parseFloat(String(v).replace(/,/g, '')) || 0;
}

// ════════════════════════════════════════════
// 카테고리 정의
// ════════════════════════════════════════════

export type EconomyCategory =
  | 'sentiment'
  | 'rates'
  | 'exchange'
  | 'commodities'
  | 'us_economy'
  | 'korea';

// ════════════════════════════════════════════
// Fear & Greed Index (alternative.me)
// ════════════════════════════════════════════

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

// ════════════════════════════════════════════
// FRED API - 카테고리별 시리즈
// ════════════════════════════════════════════

interface FredSeriesDef {
  id: string;
  name: string;
  unit: string;
}

const FRED_SENTIMENT: FredSeriesDef[] = [
  { id: 'VIXCLS', name: 'VIX (공포지수)', unit: '' },
  { id: 'SP500', name: 'S&P 500', unit: '' },
];

const FRED_RATES: FredSeriesDef[] = [
  { id: 'FEDFUNDS', name: '연방기금금리', unit: '%' },
  { id: 'DGS3MO', name: '미국 3개월 국채', unit: '%' },
  { id: 'DGS1', name: '미국 1년 국채', unit: '%' },
  { id: 'DGS2', name: '미국 2년 국채', unit: '%' },
  { id: 'DGS5', name: '미국 5년 국채', unit: '%' },
  { id: 'DGS10', name: '미국 10년 국채', unit: '%' },
  { id: 'DGS30', name: '미국 30년 국채', unit: '%' },
  { id: 'T10Y2Y', name: '장단기 스프레드 (10Y-2Y)', unit: '%' },
  { id: 'T10Y3M', name: '장단기 스프레드 (10Y-3M)', unit: '%' },
  { id: 'MORTGAGE30US', name: '30년 모기지 금리', unit: '%' },
  { id: 'BAMLH0A0HYM2', name: '하이일드 스프레드', unit: '%' },
];

const FRED_INFLATION: FredSeriesDef[] = [
  { id: 'CPIAUCSL', name: 'CPI (소비자물가)', unit: 'Index' },
  { id: 'CPILFESL', name: '근원 CPI', unit: 'Index' },
  { id: 'PCEPI', name: 'PCE 물가지수', unit: 'Index' },
  { id: 'PCEPILFE', name: '근원 PCE', unit: 'Index' },
  { id: 'PPIACO', name: 'PPI (생산자물가)', unit: 'Index' },
  { id: 'T5YIE', name: '기대인플레이션 (5년)', unit: '%' },
  { id: 'T10YIE', name: '기대인플레이션 (10년)', unit: '%' },
];

const FRED_EMPLOYMENT: FredSeriesDef[] = [
  { id: 'UNRATE', name: '실업률', unit: '%' },
  { id: 'PAYEMS', name: '비농업 고용자수', unit: '천 명' },
  { id: 'ICSA', name: '신규 실업수당 청구', unit: '건' },
  { id: 'CIVPART', name: '경제활동참가율', unit: '%' },
];

const FRED_GDP_ACTIVITY: FredSeriesDef[] = [
  { id: 'GDP', name: 'GDP', unit: '십억 달러' },
  { id: 'A191RL1Q225SBEA', name: '실질 GDP 성장률', unit: '%' },
  { id: 'RSAFS', name: '소매판매', unit: '백만 달러' },
  { id: 'INDPRO', name: '산업생산지수', unit: 'Index' },
  { id: 'UMCSENT', name: '소비자신뢰지수', unit: 'Index' },
];

const FRED_LIQUIDITY: FredSeriesDef[] = [
  { id: 'M2SL', name: 'M2 통화량', unit: '십억 달러' },
  { id: 'WALCL', name: '연준 총자산', unit: '백만 달러' },
];

const FRED_HOUSING: FredSeriesDef[] = [
  { id: 'CSUSHPINSA', name: '주택가격지수 (Case-Shiller)', unit: 'Index' },
  { id: 'HOUST', name: '신규주택착공', unit: '천 호' },
];

const FRED_BY_CATEGORY: Record<string, FredSeriesDef[]> = {
  sentiment: FRED_SENTIMENT,
  rates: FRED_RATES,
  us_economy: [
    ...FRED_INFLATION,
    ...FRED_EMPLOYMENT,
    ...FRED_GDP_ACTIVITY,
    ...FRED_LIQUIDITY,
    ...FRED_HOUSING,
  ],
};

export async function getFredByCategory(category: string): Promise<FredIndicator[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  const series = FRED_BY_CATEGORY[category];
  if (!series) return [];

  const results: FredIndicator[] = [];

  await Promise.all(
    series.map(async (s) => {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) return;
        const json = await res.json();
        const obs = json.observations?.[0];
        if (!obs || obs.value === '.') return;
        results.push({
          seriesId: s.id,
          name: s.name,
          value: parseFloat(obs.value),
          date: obs.date,
          unit: s.unit,
        });
      } catch (e) {
        console.error(`FRED ${s.id} error:`, e);
      }
    })
  );

  return series
    .map((s) => results.find((r) => r.seriesId === s.id))
    .filter((r): r is FredIndicator => r != null);
}

// ════════════════════════════════════════════
// 환율 - api.stock.naver.com (새 엔드포인트)
// ════════════════════════════════════════════

const NAVER_EXCHANGE_API = 'https://api.stock.naver.com/marketindex/exchange';

const EXCHANGE_PAIRS = [
  { code: 'USD', reuters: 'FX_USDKRW' },
  { code: 'EUR', reuters: 'FX_EURKRW' },
  { code: 'JPY', reuters: 'FX_JPYKRW' },
  { code: 'CNY', reuters: 'FX_CNYKRW' },
  { code: 'GBP', reuters: 'FX_GBPKRW' },
  { code: 'AUD', reuters: 'FX_AUDKRW' },
  { code: 'CHF', reuters: 'FX_CHFKRW' },
];

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const results: ExchangeRate[] = [];

  await Promise.all(
    EXCHANGE_PAIRS.map(async ({ code, reuters }) => {
      try {
        const res = await fetch(`${NAVER_EXCHANGE_API}/${reuters}`, {
          headers: { 'User-Agent': UA },
          next: { revalidate: 300 },
        });
        if (!res.ok) return;
        const json = await res.json();
        const d = json.exchangeInfo;
        if (!d) return;
        results.push({
          currency: code,
          rate: parseNum(d.closePrice),
          change: parseNum(d.fluctuations),
          changePercent: parseNum(d.fluctuationsRatio),
        });
      } catch (e) {
        console.error(`Exchange ${code} error:`, e);
      }
    })
  );

  // 원본 순서 유지
  return EXCHANGE_PAIRS
    .map((p) => results.find((r) => r.currency === p.code))
    .filter((r): r is ExchangeRate => r != null);
}

// ════════════════════════════════════════════
// 원자재 + DXY - Yahoo Finance
// ════════════════════════════════════════════

const YAHOO_COMMODITIES = [
  { ticker: 'CL=F', name: 'WTI 유가', unit: 'USD/bbl' },
  { ticker: 'BZ=F', name: '브렌트유', unit: 'USD/bbl' },
  { ticker: 'NG=F', name: '천연가스', unit: 'USD/MMBtu' },
  { ticker: 'GC=F', name: '금', unit: 'USD/oz' },
  { ticker: 'SI=F', name: '은', unit: 'USD/oz' },
  { ticker: 'PL=F', name: '백금', unit: 'USD/oz' },
  { ticker: 'PA=F', name: '팔라듐', unit: 'USD/oz' },
  { ticker: 'HG=F', name: '구리', unit: 'USD/lb' },
  { ticker: 'ZC=F', name: '옥수수', unit: 'cents/bu' },
  { ticker: 'ZS=F', name: '대두', unit: 'cents/bu' },
  { ticker: 'ZW=F', name: '밀', unit: 'cents/bu' },
];

async function getYahooQuote(ticker: string): Promise<{ price: number; prevClose: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2d&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price: meta.regularMarketPrice || 0,
      prevClose: meta.chartPreviousClose || meta.previousClose || 0,
    };
  } catch {
    return null;
  }
}

export async function getCommodityPrices(): Promise<CommodityPrice[]> {
  const results: CommodityPrice[] = [];

  await Promise.all(
    YAHOO_COMMODITIES.map(async ({ ticker, name, unit }) => {
      const quote = await getYahooQuote(ticker);
      if (!quote || quote.price === 0) return;
      const change = quote.price - quote.prevClose;
      const changePercent = quote.prevClose > 0 ? (change / quote.prevClose) * 100 : 0;
      results.push({
        name,
        price: Math.round(quote.price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        unit,
      });
    })
  );

  // 원본 순서 유지
  return YAHOO_COMMODITIES
    .map((c) => results.find((r) => r.name === c.name))
    .filter((r): r is CommodityPrice => r != null);
}

export async function getDollarIndex(): Promise<CommodityPrice | null> {
  const quote = await getYahooQuote('DX-Y.NYB');
  if (!quote || quote.price === 0) return null;
  const change = quote.price - quote.prevClose;
  const changePercent = quote.prevClose > 0 ? (change / quote.prevClose) * 100 : 0;
  return {
    name: '달러인덱스 (DXY)',
    price: Math.round(quote.price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    unit: '',
  };
}

// ════════════════════════════════════════════
// 한국은행 ECOS - 카테고리별
// ════════════════════════════════════════════

interface EcosSeriesDef {
  statCode: string;
  itemCode: string;
  name: string;
  unit: string;
  freq?: 'M' | 'Q' | 'A';
}

const ECOS_RATES: EcosSeriesDef[] = [
  { statCode: '722Y001', itemCode: '0101000', name: '한국 기준금리', unit: '%' },
  { statCode: '817Y002', itemCode: '010101000', name: '콜금리 (1일물)', unit: '%' },
  { statCode: '817Y002', itemCode: '010502000', name: 'CD 금리 (91일)', unit: '%' },
  { statCode: '817Y002', itemCode: '010200000', name: '국고채 3년', unit: '%' },
  { statCode: '817Y002', itemCode: '010210000', name: '국고채 10년', unit: '%' },
  { statCode: '817Y002', itemCode: '010300000', name: '회사채 AA-', unit: '%' },
];

const ECOS_KOREA: EcosSeriesDef[] = [
  { statCode: '901Y009', itemCode: '0', name: '소비자물가 상승률', unit: '%' },
  { statCode: '901Y067', itemCode: 'I16A', name: '경기동행지수', unit: 'Index' },
  { statCode: '901Y067', itemCode: 'I16D', name: '경기선행지수', unit: 'Index' },
  { statCode: '200Y002', itemCode: '10111', name: 'GDP 성장률', unit: '%', freq: 'Q' },
  { statCode: '101Y018', itemCode: 'BBGA00', name: 'M2 (광의통화)', unit: '십억 원' },
  { statCode: '403Y003', itemCode: '0000', name: '수출액', unit: '백만 달러' },
  { statCode: '403Y003', itemCode: '0001', name: '수입액', unit: '백만 달러' },
  { statCode: '403Y003', itemCode: '0002', name: '무역수지', unit: '백만 달러' },
];

const ECOS_BY_CATEGORY: Record<string, EcosSeriesDef[]> = {
  rates: ECOS_RATES,
  korea: ECOS_KOREA,
};

export async function getEcosByCategory(category: string): Promise<FredIndicator[]> {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) return [];

  const series = ECOS_BY_CATEGORY[category];
  if (!series) return [];

  const results: FredIndicator[] = [];

  await Promise.all(
    series.map(async ({ statCode, itemCode, name, unit, freq }) => {
      try {
        const frequency = freq || 'M';
        const now = new Date();
        let endDate: string;
        let startDate: string;

        if (frequency === 'Q') {
          const q = Math.ceil((now.getMonth() + 1) / 3);
          endDate = `${now.getFullYear()}Q${q}`;
          startDate = `${now.getFullYear() - 2}Q1`;
        } else {
          endDate = now.toISOString().slice(0, 7).replace('-', '');
          startDate = `${now.getFullYear() - 1}01`;
        }

        const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1/${statCode}/${frequency}/${startDate}/${endDate}/${itemCode}`;
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

  const key = (s: EcosSeriesDef) => `${s.statCode}_${s.itemCode}`;
  return series
    .map((s) => results.find((r) => r.seriesId === key(s)))
    .filter((r): r is FredIndicator => r != null);
}

// ════════════════════════════════════════════
// 카테고리별 통합 조회
// ════════════════════════════════════════════

export interface CategoryData {
  fearGreed?: FearGreedData | null;
  dollarIndex?: CommodityPrice | null;
  exchangeRates?: ExchangeRate[];
  commodities?: CommodityPrice[];
  fredIndicators?: FredIndicator[];
  ecosIndicators?: FredIndicator[];
}

export async function getEconomyByCategory(category: EconomyCategory): Promise<CategoryData> {
  switch (category) {
    case 'sentiment': {
      const [fearGreed, fredIndicators] = await Promise.all([
        getFearGreedIndex(),
        getFredByCategory('sentiment'),
      ]);
      return { fearGreed, fredIndicators };
    }
    case 'rates': {
      const [fredIndicators, ecosIndicators] = await Promise.all([
        getFredByCategory('rates'),
        getEcosByCategory('rates'),
      ]);
      return { fredIndicators, ecosIndicators };
    }
    case 'exchange': {
      const [exchangeRates, dollarIndex] = await Promise.all([
        getExchangeRates(),
        getDollarIndex(),
      ]);
      return { exchangeRates, dollarIndex };
    }
    case 'commodities': {
      const commodities = await getCommodityPrices();
      return { commodities };
    }
    case 'us_economy': {
      const fredIndicators = await getFredByCategory('us_economy');
      return { fredIndicators };
    }
    case 'korea': {
      const ecosIndicators = await getEcosByCategory('korea');
      return { ecosIndicators };
    }
    default:
      return {};
  }
}
