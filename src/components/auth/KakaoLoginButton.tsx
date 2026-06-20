'use client';

import { useState } from 'react';
import {
  KAKAO_REST_API_KEY,
  KAKAO_CALLBACK_PATH,
  KAKAO_SCOPE,
} from '@/lib/kakao';

// 커스텀 카카오 OAuth 로그인 버튼.
// Supabase 네이티브 provider는 account_email scope를 강제로 붙여 KOE205가 나므로,
// 카카오 인가 요청을 직접 만들어 닉네임만 요청한다. 콜백(/auth/kakao/callback)에서
// 토큰 교환 + Supabase 세션 발급을 처리한다.
export function KakaoLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleKakaoLogin = () => {
    setIsLoading(true);

    // CSRF 방지용 state (콜백에서 쿠키와 대조)
    const state = crypto.randomUUID();
    document.cookie = `kakao_oauth_state=${state}; path=/; max-age=600; samesite=lax`;

    const redirectUri = `${window.location.origin}${KAKAO_CALLBACK_PATH}`;
    const params = new URLSearchParams({
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: KAKAO_SCOPE,
      state,
    });

    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  };

  return (
    <button
      type="button"
      onClick={handleKakaoLogin}
      disabled={isLoading}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 text-sm font-medium text-[#191600] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          fill="#191600"
          d="M12 3C6.477 3 2 6.477 2 10.8c0 2.77 1.86 5.2 4.66 6.58-.2.72-.74 2.66-.85 3.07-.13.51.19.5.4.37.16-.11 2.6-1.77 3.66-2.49.69.1 1.4.16 2.13.16 5.523 0 10-3.477 10-7.69C24 6.477 17.523 3 12 3Z"
        />
      </svg>
      {isLoading ? '연결 중...' : '카카오로 시작하기'}
    </button>
  );
}
