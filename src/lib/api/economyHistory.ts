const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export type Period = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y';

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

function subtractPeriod(date: Date, period: Period): Date {
  const d = new Date(date);
  switch (period) {
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case '1Y': d.setFullYear(d.getFullYear() - 1); break;
    case '3Y': d.setFullYear(d.getFullYear() - 3); break;
    case '5Y': d.setFullYear(d.getFullYear() - 5); break;
  }
  return d;
}

// ── FRED 히스토리 ──
export async function getFredHistory(seriesId: string, period: Period = '1Y'): Promise<TimeSeriesPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  try {
    const start = subtractPeriod(new Date(), period);
    const startStr = start.toISOString().slice(0, 10);

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=asc&observation_start=${startStr}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();

    return (json.observations || [])
      .filter((o: any) => o.value !== '.')
      .map((o: any) => ({
        date: o.date,
        value: parseFloat(o.value),
      }));
  } catch (e) {
    console.error(`FRED history ${seriesId} error:`, e);
    return [];
  }
}

// ── Yahoo Finance 히스토리 ──
function yahooRangeInterval(period: Period): { range: string; interval: string } {
  switch (period) {
    case '1M': return { range: '1mo', interval: '1d' };
    case '3M': return { range: '3mo', interval: '1d' };
    case '6M': return { range: '6mo', interval: '1d' };
    case '1Y': return { range: '1y', interval: '1d' };
    case '3Y': return { range: '3y', interval: '1wk' };
    case '5Y': return { range: '5y', interval: '1wk' };
  }
}

export async function getYahooHistory(ticker: string, period: Period = '1Y'): Promise<TimeSeriesPoint[]> {
  try {
    const { range, interval } = yahooRangeInterval(period);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    return timestamps
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        value: closes[i] != null ? Math.round(closes[i]! * 100) / 100 : NaN,
      }))
      .filter((d) => !isNaN(d.value));
  } catch (e) {
    console.error(`Yahoo history ${ticker} error:`, e);
    return [];
  }
}

// ── ECOS 히스토리 ──
export async function getEcosHistory(
  statCode: string,
  itemCode: string,
  freq: string = 'M',
  period: Period = '1Y'
): Promise<TimeSeriesPoint[]> {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) return [];

  try {
    const now = new Date();
    let endDate: string;
    let startDate: string;

    if (freq === 'Q') {
      const q = Math.ceil((now.getMonth() + 1) / 3);
      endDate = `${now.getFullYear()}Q${q}`;
      const startDt = subtractPeriod(now, period);
      const sq = Math.ceil((startDt.getMonth() + 1) / 3);
      startDate = `${startDt.getFullYear()}Q${sq}`;
    } else {
      endDate = now.toISOString().slice(0, 7).replace('-', '');
      const startDt = subtractPeriod(now, period);
      startDate = startDt.toISOString().slice(0, 7).replace('-', '');
    }

    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/300/${statCode}/${freq}/${startDate}/${endDate}/${itemCode}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json.StatisticSearch?.row || [];

    return rows.map((r: any) => ({
      date: r.TIME || '',
      value: parseFloat(r.DATA_VALUE) || 0,
    }));
  } catch (e) {
    console.error(`ECOS history ${statCode} error:`, e);
    return [];
  }
}

// ── Fear & Greed 히스토리 ──
function fngLimit(period: Period): number {
  switch (period) {
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 180;
    case '1Y': return 365;
    case '3Y': return 365; // API 최대 한계
    case '5Y': return 365;
  }
}

export async function getFearGreedHistory(period: Period = '1Y'): Promise<TimeSeriesPoint[]> {
  try {
    const limit = fngLimit(period);
    const res = await fetch(`https://api.alternative.me/fng/?limit=${limit}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data || [];

    return data
      .map((d: any) => ({
        date: new Date(parseInt(d.timestamp) * 1000).toISOString().slice(0, 10),
        value: parseInt(d.value),
      }))
      .reverse();
  } catch (e) {
    console.error('FNG history error:', e);
    return [];
  }
}
