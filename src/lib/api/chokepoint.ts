import type { Period } from '@/lib/api/economyHistory';

// IMF PortWatch — Daily Chokepoints Data (호르무즈 = chokepoint6)
const PORTWATCH_URL =
  'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query';

export const HORMUZ_PORTID = 'chokepoint6';

// 차트에 노출할 지표 필드
export const CHOKEPOINT_FIELDS = [
  'n_total',
  'n_tanker',
  'n_cargo',
  'n_container',
  'n_dry_bulk',
  'n_general_cargo',
  'n_roro',
  'capacity',
  'capacity_tanker',
] as const;

export type ChokepointMetric = (typeof CHOKEPOINT_FIELDS)[number];

export interface ChokepointPoint {
  date: string;
  n_total: number;
  n_tanker: number;
  n_cargo: number;
  n_container: number;
  n_dry_bulk: number;
  n_general_cargo: number;
  n_roro: number;
  capacity: number;
  capacity_tanker: number;
}

function periodToDays(period: Period): number {
  switch (period) {
    case '1M': return 31;
    case '3M': return 93;
    case '6M': return 186;
    case '1Y': return 370;
    case '3Y': return 1100;
    case '5Y': return 1830;
  }
}

// ArcGIS dateOnly 필드는 보통 "YYYY-MM-DD" 문자열, 간혹 epoch(ms) 숫자로 반환됨
function normalizeDate(raw: unknown): string {
  if (typeof raw === 'number') return new Date(raw).toISOString().slice(0, 10);
  if (typeof raw === 'string') return raw.slice(0, 10);
  return '';
}

export async function getHormuzHistory(period: Period = '1Y'): Promise<ChokepointPoint[]> {
  try {
    const count = periodToDays(period);
    const params = new URLSearchParams({
      where: `portid='${HORMUZ_PORTID}'`,
      outFields: ['date', ...CHOKEPOINT_FIELDS].join(','),
      orderByFields: 'date DESC',
      resultRecordCount: String(count),
      returnGeometry: 'false',
      f: 'json',
    });

    const res = await fetch(`${PORTWATCH_URL}?${params.toString()}`, {
      next: { revalidate: 3600 }, // PortWatch는 주 1회(화) 갱신 → 1시간 캐시면 충분
    });
    if (!res.ok) return [];
    const json = await res.json();
    const features: Array<{ attributes: Record<string, unknown> }> = json.features || [];

    return features
      .map((f) => {
        const a = f.attributes;
        const point: ChokepointPoint = {
          date: normalizeDate(a.date),
          n_total: Number(a.n_total) || 0,
          n_tanker: Number(a.n_tanker) || 0,
          n_cargo: Number(a.n_cargo) || 0,
          n_container: Number(a.n_container) || 0,
          n_dry_bulk: Number(a.n_dry_bulk) || 0,
          n_general_cargo: Number(a.n_general_cargo) || 0,
          n_roro: Number(a.n_roro) || 0,
          capacity: Number(a.capacity) || 0,
          capacity_tanker: Number(a.capacity_tanker) || 0,
        };
        return point;
      })
      .filter((p) => p.date)
      .reverse(); // 오래된 → 최신 순 (차트용)
  } catch (e) {
    console.error('Hormuz history error:', e);
    return [];
  }
}
