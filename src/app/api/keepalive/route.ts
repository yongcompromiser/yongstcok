import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase 자동 일시정지(7일 비활성) 방지용 가벼운 핑.
// GitHub Actions가 주기적으로 호출 → DB에 가벼운 쿼리를 날려 "활동"을 기록한다.
// 외부 시크릿 불필요 (Vercel에 설정된 서비스 롤 사용).
export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, reason: 'unconfigured' }, { status: 500 });
  }
  try {
    await admin.from('stock_cache').select('symbol', { head: true, count: 'exact' });
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
