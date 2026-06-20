// 카카오 OAuth 공용 설정.
// REST API 키는 OAuth client_id로, 인가 URL에 그대로 노출되는 "공개" 식별자라
// 클라이언트에 하드코딩해도 무방하다. (시크릿은 절대 여기 두지 않는다 → 서버 env)
export const KAKAO_REST_API_KEY = '58c8fb15943a3def06b0e3037a13f37e';

// 우리 앱이 받는 콜백 경로 (Supabase 콜백과 별개).
// 이 경로를 카카오 개발자콘솔의 Redirect URI에도 등록해야 한다.
export const KAKAO_CALLBACK_PATH = '/auth/kakao/callback';

// 닉네임만 요청한다. (account_email/profile_image는 권한 없음 → 요청 시 KOE205)
export const KAKAO_SCOPE = 'profile_nickname';
