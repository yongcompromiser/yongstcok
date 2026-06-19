import { NextRequest, NextResponse } from 'next/server';
import { getHormuzLiveVessels } from '@/lib/api/aisStream';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// 호르무즈 AIS 스냅샷을 수집해 Supabase에 누적 저장.
// Vercel Cron이 호출(Authorization: Bearer <CRON_SECRET>) 하거나 ?secret= 로 수동 실행.
export async function GET(request: NextRequest) {
  // ── 인증 ──
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    const qSecret = request.nextUrl.searchParams.get('secret');
    if (auth !== `Bearer ${secret}` && qSecret !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase 서비스 롤이 설정되지 않았습니다.' }, { status: 500 });
  }

  // 수집 시간: 기본 15초 (5~25초)
  const rawWindow = parseInt(request.nextUrl.searchParams.get('window') || '15000', 10);
  const windowMs = Math.min(Math.max(isNaN(rawWindow) ? 15000 : rawWindow, 5000), 25000);

  try {
    const snapshot = await getHormuzLiveVessels(windowMs);

    if (!snapshot.configured) {
      return NextResponse.json({ error: 'AISSTREAM_API_KEY 미설정' }, { status: 500 });
    }

    // UTC 기준 날짜 (PortWatch와 동일한 달력일 기준)
    const date = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    // 카테고리가 확정된 선박은 category 포함 upsert,
    // 미상('other')은 category 제외 → 기존에 확정됐던 분류를 덮어쓰지 않음
    const known = snapshot.vessels
      .filter((v) => v.category !== 'other')
      .map((v) => ({
        date, mmsi: v.mmsi, name: v.name, category: v.category,
        last_sog: v.sog, last_lat: v.lat, last_lon: v.lon, last_seen: nowIso,
      }));
    const unknown = snapshot.vessels
      .filter((v) => v.category === 'other')
      .map((v) => ({
        date, mmsi: v.mmsi, name: v.name,
        last_sog: v.sog, last_lat: v.lat, last_lon: v.lon, last_seen: nowIso,
      }));

    if (known.length > 0) {
      await supabase.from('hormuz_ais_sightings').upsert(known, { onConflict: 'date,mmsi' });
    }
    if (unknown.length > 0) {
      await supabase.from('hormuz_ais_sightings').upsert(unknown, { onConflict: 'date,mmsi' });
    }

    // 수집 로그 (0척이어도 기록)
    await supabase.from('hormuz_ais_runs').insert({
      date,
      vessels_found: snapshot.total,
      window_sec: snapshot.windowSec,
    });

    return NextResponse.json({
      ok: true,
      date,
      found: snapshot.total,
      windowSec: snapshot.windowSec,
      byCategory: snapshot.byCategory,
    });
  } catch (error) {
    console.error('Hormuz collect error:', error);
    return NextResponse.json({ error: '수집 실패' }, { status: 500 });
  }
}
