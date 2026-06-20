import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  // ── 인증 + 관리자 권한 확인 ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (myProfile?.role !== 'admin') redirect('/');

  // ── 데이터 조회 (서비스 롤) ──
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">
          서비스 롤이 설정되지 않아 관리자 데이터를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  const now = Date.now();

  // 회원/가입 (profiles) + 로그인 시각 (auth.users)
  const [{ data: profiles }, listRes] = await Promise.all([
    admin.from('profiles').select('id, email, name, role, created_at'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const lastSignInById = new Map<string, string | null>();
  for (const u of listRes.data?.users ?? []) {
    lastSignInById.set(u.id, u.last_sign_in_at ?? null);
  }

  const members = (profiles ?? []).map((p) => ({
    ...p,
    lastSignIn: lastSignInById.get(p.id) ?? null,
  }));

  const totalUsers = members.length;
  const signups7d = members.filter((m) => now - new Date(m.created_at).getTime() < 7 * DAY).length;
  const signups30d = members.filter((m) => now - new Date(m.created_at).getTime() < 30 * DAY).length;
  const active7d = members.filter(
    (m) => m.lastSignIn && now - new Date(m.lastSignIn).getTime() < 7 * DAY
  ).length;

  const recentMembers = [...members]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  // 데이터 수집 현황 (호르무즈 AIS)
  const today = new Date().toISOString().slice(0, 10);
  const [{ count: runsTotal }, { count: runsToday }, lastRunRes, dailyRes] = await Promise.all([
    admin.from('hormuz_ais_runs').select('id', { count: 'exact', head: true }),
    admin.from('hormuz_ais_runs').select('id', { count: 'exact', head: true }).eq('date', today),
    admin.from('hormuz_ais_runs').select('ran_at, vessels_found').order('ran_at', { ascending: false }).limit(1),
    admin.from('hormuz_ais_daily').select('date, n_total').order('date', { ascending: false }).limit(7),
  ]);
  const lastRun = lastRunRes.data?.[0];

  // ── 방문/트래픽 (page_views) — 테이블이 아직 없으면 graceful 처리 ──
  const traffic = {
    available: false,
    total: 0,
    today: 0,
    views7d: 0,
    uniqueVisitors7d: 0,
    anonViews7d: 0,
    memberViews7d: 0,
    topPages: [] as { path: string; count: number }[],
    recent: [] as {
      path: string;
      visitor_id: string | null;
      user_id: string | null;
      created_at: string;
    }[],
  };
  try {
    const todayStart = `${today}T00:00:00.000Z`;
    const sevenAgo = new Date(now - 7 * DAY).toISOString();
    const [totalRes, todayRes, week7Res, rows7dRes, recentRes] = await Promise.all([
      admin.from('page_views').select('id', { count: 'exact', head: true }),
      admin.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      admin.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', sevenAgo),
      admin
        .from('page_views')
        .select('path, visitor_id, user_id')
        .gte('created_at', sevenAgo)
        .limit(10000),
      admin
        .from('page_views')
        .select('path, visitor_id, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (totalRes.error) throw totalRes.error;

    traffic.available = true;
    traffic.total = totalRes.count ?? 0;
    traffic.today = todayRes.count ?? 0;
    traffic.views7d = week7Res.count ?? 0;

    const rows = rows7dRes.data ?? [];
    traffic.uniqueVisitors7d = new Set(rows.map((r) => r.visitor_id).filter(Boolean)).size;
    traffic.anonViews7d = rows.filter((r) => !r.user_id).length;
    traffic.memberViews7d = rows.filter((r) => r.user_id).length;

    const pageCount = new Map<string, number>();
    for (const r of rows) pageCount.set(r.path, (pageCount.get(r.path) ?? 0) + 1);
    traffic.topPages = [...pageCount.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    traffic.recent = recentRes.data ?? [];
  } catch {
    traffic.available = false;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">사용 현황</h1>
        <p className="text-sm text-muted-foreground">관리자 전용 대시보드</p>
      </div>

      {/* 회원/가입 현황 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          회원 · 가입
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 회원" value={totalUsers} />
          <StatCard label="최근 7일 가입" value={signups7d} />
          <StatCard label="최근 30일 가입" value={signups30d} />
          <StatCard label="최근 7일 로그인" value={active7d} sub="활동 사용자" />
        </div>
      </section>

      {/* 데이터 수집 현황 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          데이터 수집 (호르무즈 AIS)
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard label="총 수집 실행" value={runsTotal ?? 0} />
          <StatCard label="오늘 실행" value={runsToday ?? 0} />
          <StatCard
            label="마지막 실행"
            value={lastRun ? `${lastRun.vessels_found}척` : '—'}
            sub={lastRun ? fmt(lastRun.ran_at) : '기록 없음'}
          />
          <StatCard
            label="최근 일별 평균"
            value={
              dailyRes.data && dailyRes.data.length > 0
                ? Math.round(
                    dailyRes.data.reduce((s, d) => s + (d.n_total ?? 0), 0) / dailyRes.data.length
                  )
                : 0
            }
            sub="최근 7일 n_total"
          />
        </div>
      </section>

      {/* 방문 · 트래픽 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          방문 · 트래픽
        </h2>
        {!traffic.available ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                방문 기록 테이블(page_views)이 아직 없습니다. SQL Editor에서 테이블을 생성하면
                이 섹션에 방문 통계가 표시됩니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard label="총 페이지뷰" value={traffic.total.toLocaleString()} />
              <StatCard label="오늘 페이지뷰" value={traffic.today.toLocaleString()} />
              <StatCard label="최근 7일 페이지뷰" value={traffic.views7d.toLocaleString()} />
              <StatCard
                label="최근 7일 방문자"
                value={traffic.uniqueVisitors7d.toLocaleString()}
                sub="고유 방문자(비로그인 포함)"
              />
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard label="비로그인 조회(7일)" value={traffic.anonViews7d.toLocaleString()} />
              <StatCard label="회원 조회(7일)" value={traffic.memberViews7d.toLocaleString()} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* 인기 페이지 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">인기 페이지 (최근 7일)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {traffic.topPages.map((p) => (
                      <div key={p.path} className="flex justify-between text-sm">
                        <span className="truncate pr-2 text-muted-foreground">{p.path}</span>
                        <span className="font-medium tabular-nums">{p.count}</span>
                      </div>
                    ))}
                    {traffic.topPages.length === 0 && (
                      <p className="text-sm text-muted-foreground">아직 방문 기록이 없습니다</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 최근 방문 (비로그인 포함) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">최근 방문</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {traffic.recent.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{r.path}</span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className={r.user_id ? 'text-green-600' : ''}>
                            {r.user_id ? '회원' : '익명'}
                          </span>
                          {fmt(r.created_at)}
                        </span>
                      </div>
                    ))}
                    {traffic.recent.length === 0 && (
                      <p className="text-sm text-muted-foreground">아직 방문 기록이 없습니다</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* 최근 가입 회원 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          최근 가입 회원
        </h2>
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">이름</th>
                  <th className="pb-2 pr-4 font-medium">이메일</th>
                  <th className="pb-2 pr-4 font-medium">역할</th>
                  <th className="pb-2 pr-4 font-medium">가입일</th>
                  <th className="pb-2 font-medium">마지막 로그인</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{m.name || '—'}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.email}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          m.role === 'admin'
                            ? 'text-red-500 font-medium'
                            : m.role === 'premium'
                            ? 'text-amber-500'
                            : ''
                        }
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{fmt(m.created_at)}</td>
                    <td className="py-2 text-muted-foreground">{fmt(m.lastSignIn)}</td>
                  </tr>
                ))}
                {recentMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      회원이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        ※ 방문 통계는 JS가 실행되는 실제 방문 기준입니다(봇 제외). 관리자/일부 경로는 집계에서 제외됩니다.
      </p>
    </div>
  );
}
