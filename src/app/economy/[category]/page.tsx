'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FearGreedGauge } from '@/components/economy/FearGreedGauge';
import { IndicatorCard } from '@/components/economy/IndicatorCard';
import { useEconomyCategory } from '@/hooks/useEconomy';
import type { EconomyCategory } from '@/lib/api/economy';

const CATEGORY_META: Record<
  EconomyCategory,
  { title: string; description: string }
> = {
  sentiment: {
    title: '시장 심리',
    description: 'Fear & Greed, VIX, S&P 500',
  },
  rates: {
    title: '금리 · 채권',
    description: '미국 국채, 연방기금금리, 한국 금리',
  },
  exchange: {
    title: '환율',
    description: '주요 통화 대원화 환율, 달러인덱스',
  },
  commodities: {
    title: '원자재',
    description: '에너지, 귀금속, 산업금속, 농산물',
  },
  us_economy: {
    title: '미국 경제',
    description: '물가, 고용, GDP, 소비, 유동성, 주택',
  },
  korea: {
    title: '한국 경제',
    description: '물가, 경기지수, GDP, 통화, 무역',
  },
};

const VALID_CATEGORIES = Object.keys(CATEGORY_META) as EconomyCategory[];

const CURRENCY_LABELS: Record<string, string> = {
  USD: '미국 달러 (USD)',
  EUR: '유로 (EUR)',
  JPY: '일본 엔 (JPY/100)',
  CNY: '중국 위안 (CNY)',
  GBP: '영국 파운드 (GBP)',
  AUD: '호주 달러 (AUD)',
  CHF: '스위스 프랑 (CHF)',
};

export default function EconomyCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);

  if (!VALID_CATEGORIES.includes(category as EconomyCategory)) {
    notFound();
  }

  const cat = category as EconomyCategory;
  const meta = CATEGORY_META[cat];

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <CategoryContent category={cat} />
    </div>
  );
}

function CategoryContent({ category }: { category: EconomyCategory }) {
  const { data, isLoading, refetch, isFetching } = useEconomyCategory(category);

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1.5 hidden sm:inline">새로고침</span>
        </Button>
      </div>

      {/* 시장 심리 */}
      {category === 'sentiment' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fear &amp; Greed Index</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Skeleton className="h-32 w-48 rounded-full" />
                </div>
              ) : data?.fearGreed ? (
                <FearGreedGauge data={data.fearGreed} />
              ) : (
                <Empty />
              )}
            </CardContent>
          </Card>
          {renderFredIndicators(data?.fredIndicators, isLoading, 2)}
        </div>
      )}

      {/* 금리·채권 */}
      {category === 'rates' && (
        <div className="space-y-4">
          {data?.fredIndicators && data.fredIndicators.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">미국 금리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.fredIndicators.map((ind) => (
                    <IndicatorCard
                      key={ind.seriesId}
                      name={ind.name}
                      value={ind.value}
                      unit={ind.unit}
                      date={ind.date}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {!isLoading && (!data?.fredIndicators || data.fredIndicators.length === 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">미국 금리</CardTitle>
              </CardHeader>
              <CardContent><EmptyKey label="FRED_API_KEY" /></CardContent>
            </Card>
          )}
          {data?.ecosIndicators && data.ecosIndicators.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">한국 금리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {data.ecosIndicators.map((ind) => (
                    <IndicatorCard
                      key={ind.seriesId}
                      name={ind.name}
                      value={ind.value}
                      unit={ind.unit}
                      date={ind.date}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {!isLoading && (!data?.ecosIndicators || data.ecosIndicators.length === 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">한국 금리</CardTitle>
              </CardHeader>
              <CardContent><EmptyKey label="ECOS_API_KEY" /></CardContent>
            </Card>
          )}
          {isLoading && <LoadingGrid count={8} />}
        </div>
      )}

      {/* 환율 */}
      {category === 'exchange' && (
        <div className="space-y-4">
          {data?.dollarIndex && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">달러인덱스</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <IndicatorCard
                    name={data.dollarIndex.name}
                    value={data.dollarIndex.price}
                    change={data.dollarIndex.change}
                    changePercent={data.dollarIndex.changePercent}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">주요 환율</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingGrid count={7} />
              ) : data?.exchangeRates && data.exchangeRates.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.exchangeRates.map((rate) => (
                    <IndicatorCard
                      key={rate.currency}
                      name={CURRENCY_LABELS[rate.currency] || rate.currency}
                      value={rate.rate}
                      change={rate.change}
                      changePercent={rate.changePercent}
                      unit="원"
                    />
                  ))}
                </div>
              ) : (
                <Empty />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 원자재 */}
      {category === 'commodities' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">원자재 시세</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingGrid count={11} />
            ) : data?.commodities && data.commodities.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {data.commodities.map((c) => (
                  <IndicatorCard
                    key={c.name}
                    name={c.name}
                    value={c.price}
                    change={c.change}
                    changePercent={c.changePercent}
                    unit={c.unit}
                  />
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      )}

      {/* 미국 경제 */}
      {category === 'us_economy' && (
        <>
          {isLoading ? (
            <LoadingGrid count={12} />
          ) : data?.fredIndicators && data.fredIndicators.length > 0 ? (
            renderGroupedFred(data.fredIndicators)
          ) : (
            <Card>
              <CardContent className="pt-6"><EmptyKey label="FRED_API_KEY" /></CardContent>
            </Card>
          )}
        </>
      )}

      {/* 한국 경제 */}
      {category === 'korea' && (
        <>
          {isLoading ? (
            <LoadingGrid count={8} />
          ) : data?.ecosIndicators && data.ecosIndicators.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">한국 주요 경제지표</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.ecosIndicators.map((ind) => (
                    <IndicatorCard
                      key={ind.seriesId}
                      name={ind.name}
                      value={ind.value}
                      unit={ind.unit}
                      date={ind.date}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6"><EmptyKey label="ECOS_API_KEY" /></CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}

// ── 미국 경제 지표를 소그룹으로 표시 ──

const US_GROUPS: { title: string; ids: string[] }[] = [
  {
    title: '물가',
    ids: ['CPIAUCSL', 'CPILFESL', 'PCEPI', 'PCEPILFE', 'PPIACO', 'T5YIE', 'T10YIE'],
  },
  {
    title: '고용',
    ids: ['UNRATE', 'PAYEMS', 'ICSA', 'CIVPART'],
  },
  {
    title: 'GDP · 경기',
    ids: ['GDP', 'A191RL1Q225SBEA', 'RSAFS', 'INDPRO', 'UMCSENT'],
  },
  {
    title: '유동성',
    ids: ['M2SL', 'WALCL'],
  },
  {
    title: '주택',
    ids: ['CSUSHPINSA', 'HOUST'],
  },
];

function renderGroupedFred(indicators: { seriesId: string; name: string; value: number; unit: string; date: string }[]) {
  const byId = Object.fromEntries(indicators.map((i) => [i.seriesId, i]));

  return (
    <div className="space-y-4">
      {US_GROUPS.map((group) => {
        const items = group.ids.map((id) => byId[id]).filter(Boolean);
        if (items.length === 0) return null;
        return (
          <Card key={group.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {items.map((ind) => (
                  <IndicatorCard
                    key={ind.seriesId}
                    name={ind.name}
                    value={ind.value}
                    unit={ind.unit}
                    date={ind.date}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function renderFredIndicators(
  indicators: { seriesId: string; name: string; value: number; unit: string; date: string }[] | undefined,
  isLoading: boolean,
  expectedCount: number
) {
  if (isLoading) return <LoadingGrid count={expectedCount} />;
  if (!indicators || indicators.length === 0) return null;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {indicators.map((ind) => (
            <IndicatorCard
              key={ind.seriesId}
              name={ind.name}
              value={ind.value}
              unit={ind.unit}
              date={ind.date}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 공통 컴포넌트 ──

function Empty() {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">
      데이터를 불러올 수 없습니다
    </p>
  );
}

function EmptyKey({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">
      {label} 설정 시 표시됩니다
    </p>
  );
}

function LoadingGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}
