import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { KAKAO_REST_API_KEY, KAKAO_CALLBACK_PATH } from '@/lib/kakao';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 커스텀 카카오 OAuth 콜백:
// 1) code → 카카오 access_token 교환
// 2) access_token → 카카오 사용자 정보(id, 닉네임)
// 3) Supabase 어드민으로 사용자 find-or-create
// 4) magiclink 토큰 발급 → verifyOtp 로 세션(쿠키) 생성
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('kakao_oauth_state')?.value;

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  if (!code) return fail('kakao_no_code');
  if (!state || !savedState || state !== savedState) return fail('kakao_state');

  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const redirectUri = `${origin}${KAKAO_CALLBACK_PATH}`;

  try {
    // 1. code → access_token
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        redirect_uri: redirectUri,
        code,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error('Kakao token error:', tokenJson);
      return fail('kakao_token');
    }

    // 2. access_token → 사용자 정보
    const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const me = await meRes.json();
    if (!meRes.ok || !me.id) {
      console.error('Kakao user error:', me);
      return fail('kakao_user');
    }

    const kakaoId = String(me.id);
    const nickname =
      me?.kakao_account?.profile?.nickname ??
      me?.properties?.nickname ??
      '카카오사용자';
    // 카카오는 이메일을 안 주므로 결정적 내부 이메일을 만든다.
    const email = `kakao_${kakaoId}@kakao.local`;

    const admin = createAdminClient();
    if (!admin) return fail('admin_unconfigured');

    // 3. find-or-create (이미 있으면 createUser가 에러 → 무시하고 진행)
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: nickname, provider: 'kakao', kakao_id: kakaoId },
    });
    if (createErr && !/registered|already|exists/i.test(createErr.message)) {
      console.error('createUser error:', createErr);
      return fail('user_create');
    }

    // 4. magiclink 토큰 발급 → 세션으로 교환
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink error:', linkErr);
      return fail('link');
    }

    const supabase = await createClient(); // 쿠키 세팅용 서버 클라이언트
    const { error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });
    if (otpErr) {
      console.error('verifyOtp error:', otpErr);
      return fail('session');
    }

    // 성공 → 홈으로 (Vercel 프록시 뒤 forwarded host 우선)
    const forwardedHost = request.headers.get('x-forwarded-host');
    const base =
      process.env.NODE_ENV === 'development'
        ? origin
        : forwardedHost
        ? `https://${forwardedHost}`
        : origin;

    const res = NextResponse.redirect(`${base}/`);
    res.cookies.set('kakao_oauth_state', '', { maxAge: 0, path: '/' });
    return res;
  } catch (e) {
    console.error('Kakao callback error:', e);
    return fail('kakao_callback');
  }
}
