import { NextRequest, NextResponse } from 'next/server';
import { getHormuzLiveVessels } from '@/lib/api/aisStream';

// WebSocket 수집을 위해 Node 런타임 필요 (Edge 불가)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  // 수집 시간 (ms), 기본 8초, 3~20초로 제한
  const rawWindow = parseInt(sp.get('window') || '8000', 10);
  const windowMs = Math.min(Math.max(isNaN(rawWindow) ? 8000 : rawWindow, 3000), 20000);

  try {
    const snapshot = await getHormuzLiveVessels(windowMs);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Hormuz live API error:', error);
    return NextResponse.json({ error: '실시간 통행 데이터를 불러올 수 없습니다.' }, { status: 500 });
  }
}
