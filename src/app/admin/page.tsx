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
        ※ 방문/트래픽 분석은 다음 단계에서 추가됩니다.
      </p>
    </div>
  );
}
