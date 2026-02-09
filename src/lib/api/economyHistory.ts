const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// ── FRED 히스토리 ──
export async function getFredHistory(seriesId: string): Promise<TimeSeriesPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  try {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
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
export async function getYahooHistory(ticker: string): Promise<TimeSeriesPoint[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d`;
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
  freq: string = 'M'
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
      startDate = `${now.getFullYear() - 5}Q1`;
    } else {
      endDate = now.toISOString().slice(0, 7).replace('-', '');
      startDate = `${now.getFullYear() - 3}01`;
    }

    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/100/${statCode}/${freq}/${startDate}/${endDate}/${itemCode}`;
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
export async function getFearGreedHistory(): Promise<TimeSeriesPoint[]> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=90', {
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
