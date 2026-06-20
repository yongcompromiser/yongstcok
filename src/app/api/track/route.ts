import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 페이지뷰 기록. 로그인 여부와 무관하게 호출되며,
// 세션이 있으면 user_id를 연결하고 없으면 익명으로 남긴다.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path.slice(0, 512) : null;
    const visitorId =
      typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : null;
    const referrer =
      typeof body.referrer === 'string' ? body.referrer.slice(0, 512) : null;

    if (!path) return new NextResponse(null, { status: 204 });

    // 로그인 사용자면 user_id 연결 (실패해도 익명으로 진행)
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      /* 익명 */
    }

    const admin = createAdminClient();
    if (admin) {
      await admin.from('page_views').insert({
        path,
        visitor_id: visitorId,
        user_id: userId,
        referrer,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    // 추적 실패가 사용자 경험에 영향 주지 않도록 항상 조용히 성공 처리
    return new NextResponse(null, { status: 204 });
  }
}
