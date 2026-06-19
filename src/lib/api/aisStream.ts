import WebSocket from 'ws';

// AISStream.io 실시간 AIS 스냅샷 수집
// Vercel(서버리스)에서는 상시 스트림이 불가 → 짧게 접속해 현재 선박 스냅샷만 수집
const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream';

// 호르무즈 해협 bounding box [[[lat, lon], [lat, lon]]] (좌표 순서는 무관)
const HORMUZ_BBOX = [[[25.5, 55.5], [27.0, 57.3]]];

export type VesselCategory = 'tanker' | 'cargo' | 'passenger' | 'fishing' | 'other';

export const CATEGORY_LABEL: Record<VesselCategory, string> = {
  tanker: '유조선',
  cargo: '화물선',
  passenger: '여객선',
  fishing: '어선',
  other: '기타',
};

// AIS ship type code → 카테고리 (ITU-R M.1371)
function classifyType(type?: number): VesselCategory {
  if (type == null) return 'other';
  if (type >= 80 && type <= 89) return 'tanker';
  if (type >= 70 && type <= 79) return 'cargo';
  if (type >= 60 && type <= 69) return 'passenger';
  if (type === 30) return 'fishing';
  return 'other';
}

export interface LiveVessel {
  mmsi: number;
  name: string;
  category: VesselCategory;
  lat: number;
  lon: number;
  sog: number; // 속도 (knots)
  cog: number; // 침로 (도)
}

export interface LiveSnapshot {
  asOf: string;        // 수집 종료 시각(ISO)
  windowSec: number;   // 수집 시간(초)
  total: number;
  byCategory: Record<VesselCategory, number>;
  vessels: LiveVessel[];
  configured: boolean; // API 키 설정 여부
}

function emptySnapshot(configured: boolean, windowSec: number, asOf: string): LiveSnapshot {
  return {
    asOf,
    windowSec,
    total: 0,
    byCategory: { tanker: 0, cargo: 0, passenger: 0, fishing: 0, other: 0 },
    vessels: [],
    configured,
  };
}

export async function getHormuzLiveVessels(windowMs = 8000): Promise<LiveSnapshot> {
  const apiKey = process.env.AISSTREAM_API_KEY;
  const windowSec = Math.round(windowMs / 1000);
  const nowIso = new Date().toISOString();

  if (!apiKey) {
    return emptySnapshot(false, windowSec, nowIso);
  }

  return new Promise<LiveSnapshot>((resolve) => {
    // MMSI별 최신 위치/정적정보 누적
    const positions = new Map<number, { lat: number; lon: number; sog: number; cog: number; name: string }>();
    const types = new Map<number, number>();

    let settled = false;
    let ws: WebSocket | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { ws?.close(); } catch { /* noop */ }

      const vessels: LiveVessel[] = [];
      const byCategory: Record<VesselCategory, number> = {
        tanker: 0, cargo: 0, passenger: 0, fishing: 0, other: 0,
      };

      for (const [mmsi, pos] of positions) {
        const category = classifyType(types.get(mmsi));
        byCategory[category] += 1;
        vessels.push({
          mmsi,
          name: pos.name?.trim() || `MMSI ${mmsi}`,
          category,
          lat: pos.lat,
          lon: pos.lon,
          sog: pos.sog,
          cog: pos.cog,
        });
      }

      vessels.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

      resolve({
        asOf: new Date().toISOString(),
        windowSec,
        total: vessels.length,
        byCategory,
        vessels,
        configured: true,
      });
    };

    const timer = setTimeout(finish, windowMs);

    try {
      ws = new WebSocket(AISSTREAM_URL);
    } catch {
      clearTimeout(timer);
      resolve(emptySnapshot(true, windowSec, nowIso));
      return;
    }

    ws.on('open', () => {
      ws?.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: HORMUZ_BBOX,
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }));
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        const meta = msg.MetaData || {};
        const mmsi: number | undefined = meta.MMSI;
        if (mmsi == null) return;

        if (msg.MessageType === 'PositionReport') {
          const p = msg.Message?.PositionReport || {};
          positions.set(mmsi, {
            lat: p.Latitude ?? meta.latitude ?? 0,
            lon: p.Longitude ?? meta.longitude ?? 0,
            sog: p.Sog ?? 0,
            cog: p.Cog ?? 0,
            name: meta.ShipName || positions.get(mmsi)?.name || '',
          });
        } else if (msg.MessageType === 'ShipStaticData') {
          const s = msg.Message?.ShipStaticData || {};
          if (typeof s.Type === 'number') types.set(mmsi, s.Type);
        }
      } catch {
        /* 개별 메시지 파싱 실패는 무시 */
      }
    });

    ws.on('error', () => {
      clearTimeout(timer);
      finish();
    });
  });
}
