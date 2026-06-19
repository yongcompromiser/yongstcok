import { createClient } from '@supabase/supabase-js';

// 서버 전용 서비스 롤 클라이언트 (RLS 우회). 절대 클라이언트 번들에 노출 금지.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
