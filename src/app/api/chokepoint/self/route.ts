import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Period } from '@/lib/api/economyHistory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PERIODS = ['1M', '3M', '6M', '1Y', '3Y', '5Y'] as const;

function periodStart(period: Period): string {
  const d = new Date();
  switch (period) {
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case '1Y': d.setFullYear(d.getFullYear() - 1); break;
    case '3Y': d.setFullYear(d.getFullYear() - 3); break;
    case '5Y': d.setFullYear(d.getFullYear() - 5); break;
  }
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const rawPeriod = request.nextUrl.searchParams.get('period') || '3M';
  const period: Period = VALID_PERIODS.includes(rawPeriod as Period) ? (rawPeriod as Period) : '3M';

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ data: [], meta: { configured: false } });
  }

  try {
    const start = periodStart(period);
    const today = new Date().toISOString().slice(0, 10);

    const [dailyRes, lastRunRes, runsTodayRes] = await Promise.all([
      supabase.from('hormuz_ais_daily').select('*').gte('date', start).order('date', { ascending: true }),
      supabase.from('hormuz_ais_runs').select('ran_at, vessels_found').order('ran_at', { ascending: false }).limit(1),
      supabase.from('hormuz_ais_runs').select('id', { count: 'exact', head: true }).eq('date', today),
    ]);

    return NextResponse.json({
      data: dailyRes.data || [],
      meta: {
        configured: true,
        lastRunAt: lastRunRes.data?.[0]?.ran_at || null,
        lastFound: lastRunRes.data?.[0]?.vessels_found ?? null,
        runsToday: runsTodayRes.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Hormuz self API error:', error);
    return NextResponse.json({ data: [], meta: { configured: true } });
  }
}
