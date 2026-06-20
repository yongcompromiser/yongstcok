'use client';

import { useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

// Supabase 세션을 zustand 스토어에 동기화한다.
// 이게 있어야 이메일/카카오 로그인 결과가 헤더 등 UI에 반영된다.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const supabase = createClient();

    const applyUser = async (sessionUser: SupabaseUser | null) => {
      if (!sessionUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // profiles 테이블에서 role/name/avatar 보강 (없으면 메타데이터로 폴백)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url, role')
        .eq('id', sessionUser.id)
        .single();

      const meta = sessionUser.user_metadata ?? {};
      setUser({
        id: sessionUser.id,
        email: sessionUser.email ?? '',
        name: profile?.name ?? meta.name ?? meta.full_name ?? meta.nickname,
        avatar: profile?.avatar_url ?? meta.avatar_url ?? meta.picture,
        role: profile?.role ?? 'user',
        createdAt: new Date(sessionUser.created_at),
      });
      setLoading(false);
    };

    // onAuthStateChange는 마운트 시 INITIAL_SESSION으로 즉시 한 번 발화한다.
    // 콜백 내부에서 supabase 호출을 await하면 데드락 위험이 있어 setTimeout으로 분리.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setTimeout(() => {
        applyUser(sessionUser);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
