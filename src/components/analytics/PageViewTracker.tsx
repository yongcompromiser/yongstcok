'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 방문자 식별용 ID (브라우저별 고정). 비로그인 방문도 "고유 방문자"로 셀 수 있게 한다.
function getVisitorId(): string {
  try {
    let id = localStorage.getItem('visitor_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('visitor_id', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

// 라우트가 바뀔 때마다 /api/track 으로 페이지뷰를 기록한다.
// 로그인/비로그인 모두 기록됨(서버에서 세션 있으면 user_id 연결, 없으면 익명).
export function PageViewTracker() {
  const pathname = usePathname();
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastRef.current === pathname) return; // 동일 경로 연속 중복 방지
    // 관리자/추적 API는 트래픽 통계에서 제외
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;
    lastRef.current = pathname;

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        visitorId: getVisitorId(),
        referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
