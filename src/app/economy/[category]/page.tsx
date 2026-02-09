'use client';

import React, { use, useState, useCallback, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { Loader2, RefreshCw, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FearGreedGauge } from '@/components/economy/FearGreedGauge';
import { IndicatorCard } from '@/components/economy/IndicatorCard';
import { MultiSeriesChart } from '@/components/economy/TimeSeriesChart';
import { useEconomyCategory } from '@/hooks/useEconomy';
import { useMultiEconomyChart } from '@/hooks/useEconomyChart';
import type { ChartItem } from '@/hooks/useEconomyChart';
import type { EconomyCategory, CategoryData } from '@/lib/api/economy';
import type { Period } from '@/lib/api/economyHistory';
import { cn } from '@/lib/utils';

// ── 차트 항목 정의 ──

const SENTIMENT_CHARTS: ChartItem[] = [
  { key: 'fng', label: 'Fear & Greed', source: 'fng', params: {}, color: '#eab308' },
  { key: 'VIXCLS', label: 'VIX', source: 'fred', params: { id: 'VIXCLS' }, color: '#ef4444' },
  { key: 'SP500', label: 'S&P 500', source: 'fred', params: { id: 'SP500' }, color: '#3b82f6' },
];

const RATES_CHARTS: ChartItem[] = [
  { key: 'FEDFUNDS', label: '연방기금금리', source: 'fred', params: { id: 'FEDFUNDS' }, unit: '%', color: '#ef4444' },
  { key: 'DGS3MO', label: '미국 3M', source: 'fred', params: { id: 'DGS3MO' }, unit: '%' },
  { key: 'DGS1', label: '미국 1Y', source: 'fred', params: { id: 'DGS1' }, unit: '%' },
  { key: 'DGS2', label: '미국 2Y', source: 'fred', params: { id: 'DGS2' }, unit: '%' },
  { key: 'DGS5', label: '미국 5Y', source: 'fred', params: { id: 'DGS5' }, unit: '%' },
  { key: 'DGS10', label: '미국 10Y', source: 'fred', params: { id: 'DGS10' }, unit: '%', color: '#3b82f6' },
  { key: 'DGS30', label: '미국 30Y', source: 'fred', params: { id: 'DGS30' }, unit: '%' },
  { key: 'T10Y2Y', label: '10Y-2Y', source: 'fred', params: { id: 'T10Y2Y' }, unit: '%', color: '#a855f7' },
  { key: 'T10Y3M', label: '10Y-3M', source: 'fred', params: { id: 'T10Y3M' }, unit: '%' },
  { key: 'MORTGAGE30US', label: '30Y 모기지', source: 'fred', params: { id: 'MORTGAGE30US' }, unit: '%' },
  { key: 'BAMLH0A0HYM2', label: '하이일드', source: 'fred', params: { id: 'BAMLH0A0HYM2' }, unit: '%' },
  { key: 'kr_base', label: '한국 기준금리', source: 'ecos', params: { stat: '722Y001', item: '0101000' }, unit: '%', color: '#16a34a' },
  { key: 'kr_call', label: '콜금리', source: 'ecos', params: { stat: '817Y002', item: '010101000' }, unit: '%' },
  { key: 'kr_cd', label: 'CD 91일', source: 'ecos', params: { stat: '817Y002', item: '010502000' }, unit: '%' },
  { key: 'kr_gov3y', label: '국고채 3Y', source: 'ecos', params: { stat: '817Y002', item: '010200000' }, unit: '%' },
  { key: 'kr_gov10y', label: '국고채 10Y', source: 'ecos', params: { stat: '817Y002', item: '010210000' }, unit: '%' },
  { key: 'kr_corp', label: '회사채 AA-', source: 'ecos', params: { stat: '817Y002', item: '010300000' }, unit: '%' },
];

const EXCHANGE_CHARTS: ChartItem[] = [
  { key: 'DXY', label: '달러인덱스', source: 'yahoo', params: { ticker: 'DX-Y.NYB' }, color: '#3b82f6' },
  { key: 'USDKRW', label: 'USD/KRW', source: 'yahoo', params: { ticker: 'USDKRW=X' }, unit: '원', color: '#ef4444' },
  { key: 'EURKRW', label: 'EUR/KRW', source: 'yahoo', params: { ticker: 'EURKRW=X' }, unit: '원' },
  { key: 'JPYKRW', label: 'JPY/KRW', source: 'yahoo', params: { ticker: 'JPYKRW=X' }, unit: '원' },
  { key: 'CNYKRW', label: 'CNY/KRW', source: 'yahoo', params: { ticker: 'CNYKRW=X' }, unit: '원' },
  { key: 'GBPKRW', label: 'GBP/KRW', source: 'yahoo', params: { ticker: 'GBPKRW=X' }, unit: '원' },
  { key: 'AUDKRW', label: 'AUD/KRW', source: 'yahoo', params: { ticker: 'AUDKRW=X' }, unit: '원' },
  { key: 'CHFKRW', label: 'CHF/KRW', source: 'yahoo', params: { ticker: 'CHFKRW=X' }, unit: '원' },
];

const COMMODITY_CHARTS: ChartItem[] = [
  { key: 'CL=F', label: 'WTI 유가', source: 'yahoo', params: { ticker: 'CL=F' }, unit: 'USD/bbl', color: '#854d0e' },
  { key: 'BZ=F', label: '브렌트유', source: 'yahoo', params: { ticker: 'BZ=F' }, unit: 'USD/bbl' },
  { key: 'NG=F', label: '천연가스', source: 'yahoo', params: { ticker: 'NG=F' }, unit: 'USD/MMBtu' },
  { key: 'GC=F', label: '금', source: 'yahoo', params: { ticker: 'GC=F' }, unit: 'USD/oz', color: '#eab308' },
  { key: 'SI=F', label: '은', source: 'yahoo', params: { ticker: 'SI=F' }, unit: 'USD/oz', color: '#9ca3af' },
  { key: 'PL=F', label: '백금', source: 'yahoo', params: { ticker: 'PL=F' }, unit: 'USD/oz' },
  { key: 'PA=F', label: '팔라듐', source: 'yahoo', params: { ticker: 'PA=F' }, unit: 'USD/oz' },
  { key: 'HG=F', label: '구리', source: 'yahoo', params: { ticker: 'HG=F' }, unit: 'USD/lb', color: '#ea580c' },
  { key: 'ZC=F', label: '옥수수', source: 'yahoo', params: { ticker: 'ZC=F' }, unit: 'cents/bu' },
  { key: 'ZS=F', label: '대두', source: 'yahoo', params: { ticker: 'ZS=F' }, unit: 'cents/bu' },
  { key: 'ZW=F', label: '밀', source: 'yahoo', params: { ticker: 'ZW=F' }, unit: 'cents/bu' },
];

const US_ECONOMY_CHARTS: ChartItem[] = [
  { key: 'CPIAUCSL', label: 'CPI', source: 'fred', params: { id: 'CPIAUCSL' }, unit: 'Index', color: '#ef4444' },
  { key: 'CPILFESL', label: '근원 CPI', source: 'fred', params: { id: 'CPILFESL' }, unit: 'Index' },
  { key: 'PCEPI', label: 'PCE', source: 'fred', params: { id: 'PCEPI' }, unit: 'Index' },
  { key: 'PCEPILFE', label: '근원 PCE', source: 'fred', params: { id: 'PCEPILFE' }, unit: 'Index' },
  { key: 'PPIACO', label: 'PPI', source: 'fred', params: { id: 'PPIACO' }, unit: 'Index' },
  { key: 'T5YIE', label: '기대인플레 5Y', source: 'fred', params: { id: 'T5YIE' }, unit: '%' },
  { key: 'T10YIE', label: '기대인플레 10Y', source: 'fred', params: { id: 'T10YIE' }, unit: '%' },
  { key: 'UNRATE', label: '실업률', source: 'fred', params: { id: 'UNRATE' }, unit: '%', color: '#3b82f6' },
  { key: 'PAYEMS', label: '비농업 고용', source: 'fred', params: { id: 'PAYEMS' }, unit: '천 명' },
  { key: 'ICSA', label: '실업수당', source: 'fred', params: { id: 'ICSA' }, unit: '건' },
  { key: 'CIVPART', label: '참가율', source: 'fred', params: { id: 'CIVPART' }, unit: '%' },
  { key: 'GDP', label: 'GDP', source: 'fred', params: { id: 'GDP' }, unit: '십억$' },
  { key: 'A191RL1Q225SBEA', label: 'GDP 성장률', source: 'fred', params: { id: 'A191RL1Q225SBEA' }, unit: '%', color: '#16a34a' },
  { key: 'RSAFS', label: '소매판매', source: 'fred', params: { id: 'RSAFS' }, unit: '백만$' },
  { key: 'INDPRO', label: '산업생산', source: 'fred', params: { id: 'INDPRO' }, unit: 'Index' },
  { key: 'UMCSENT', label: '소비자신뢰', source: 'fred', params: { id: 'UMCSENT' }, unit: 'Index' },
  { key: 'M2SL', label: 'M2', source: 'fred', params: { id: 'M2SL' }, unit: '십억$' },
  { key: 'WALCL', label: '연준 자산', source: 'fred', params: { id: 'WALCL' }, unit: '백만$' },
  { key: 'CSUSHPINSA', label: '주택가격', source: 'fred', params: { id: 'CSUSHPINSA' }, unit: 'Index' },
  { key: 'HOUST', label: '주택착공', source: 'fred', params: { id: 'HOUST' }, unit: '천 호' },
];

const KOREA_CHARTS: ChartItem[] = [
  { key: 'cpi', label: '소비자물가', source: 'ecos', params: { stat: '901Y009', item: '0' }, unit: '%', color: '#ef4444' },
  { key: 'coincident', label: '경기동행', source: 'ecos', params: { stat: '901Y067', item: 'I16A' }, unit: 'Index', color: '#3b82f6' },
  { key: 'leading', label: '경기선행', source: 'ecos', params: { stat: '901Y067', item: 'I16D' }, unit: 'Index' },
  { key: 'gdp', label: 'GDP 성장률', source: 'ecos', params: { stat: '200Y002', item: '10111', freq: 'Q' }, unit: '%', color: '#16a34a' },
  { key: 'm2', label: 'M2', source: 'ecos', params: { stat: '101Y018', item: 'BBGA00' }, unit: '십억원' },
  { key: 'export', label: '수출', source: 'ecos', params: { stat: '403Y003', item: '0000' }, unit: '백만$' },
  { key: 'import', label: '수입', source: 'ecos', params: { stat: '403Y003', item: '0001' }, unit: '백만$' },
  { key: 'trade', label: '무역수지', source: 'ecos', params: { stat: '403Y003', item: '0002' }, unit: '백만$' },
];

const CHARTS_BY_CATEGORY: Record<EconomyCategory, ChartItem[]> = {
  sentiment: SENTIMENT_CHARTS,
  rates: RATES_CHARTS,
  exchange: EXCHANGE_CHARTS,
  commodities: COMMODITY_CHARTS,
  us_economy: US_ECONOMY_CHARTS,
  korea: KOREA_CHARTS,
};

// ── 카테고리 메타 ──

const CATEGORY_META: Record<EconomyCategory, { title: string; description: string }> = {
  sentiment: { title: '시장 심리', description: 'Fear & Greed Index, VIX, S&P 500' },
  rates: { title: '금리 · 채권', description: '미국 국채, 연방기금금리, 한국 금리' },
  exchange: { title: '환율', description: '주요 통화 대원화 환율, 달러인덱스' },
  commodities: { title: '원자재', description: '에너지, 귀금속, 산업금속, 농산물' },
  us_economy: { title: '미국 경제', description: '물가, 고용, GDP, 소비, 유동성, 주택' },
  korea: { title: '한국 경제', description: '물가, 경기지수, GDP, 통화, 무역' },
};

const VALID_CATEGORIES = Object.keys(CATEGORY_META) as EconomyCategory[];

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y', '3Y', '5Y'];
const MAX_SELECTED = 5;

// ── 페이지 ──

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

// ── 카테고리 콘텐츠 ──

function CategoryContent({ category }: { category: EconomyCategory }) {
  const { data, isLoading, refetch, isFetching } = useEconomyCategory(category);
  const chartItems = CHARTS_BY_CATEGORY[category];
  const [selectedKeys, setSelectedKeys] = useState<string[]>([chartItems[0]?.key || '']);
  const [period, setPeriod] = useState<Period>('1Y');
  const [percentMode, setPercentMode] = useState(false);

  const selectedItems = useMemo(
    () => chartItems.filter((i) => selectedKeys.includes(i.key)),
    [chartItems, selectedKeys]
  );

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // 최소 1개
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MAX_SELECTED) return prev; // 최대 5개
      return [...prev, key];
    });
  }, []);

  if (category === 'sentiment') {
    return (
      <SentimentLayout
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        isFetching={isFetching}
        chartItems={chartItems}
        selectedKeys={selectedKeys}
        toggleKey={toggleKey}
        selectedItems={selectedItems}
        period={period}
        setPeriod={setPeriod}
        percentMode={percentMode}
        setPercentMode={setPercentMode}
      />
    );
  }

  return (
    <ChartLayout
      data={data}
      isLoading={isLoading}
      refetch={refetch}
      isFetching={isFetching}
      category={category}
      chartItems={chartItems}
      selectedKeys={selectedKeys}
      toggleKey={toggleKey}
      selectedItems={selectedItems}
      period={period}
      setPeriod={setPeriod}
      percentMode={percentMode}
      setPercentMode={setPercentMode}
    />
  );
}

// ── 기간 선택 바 ──

function PeriodBar({ period, setPeriod }: { period: Period; setPeriod: (p: Period) => void }) {
  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            period === p
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── 체크박스 칩 ──

function ChipSelector({
  items,
  selectedKeys,
  toggleKey,
}: {
  items: ChartItem[];
  selectedKeys: string[];
  toggleKey: (key: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {items.map((item) => {
        const isSelected = selectedKeys.includes(item.key);
        return (
          <button
            key={item.key}
            onClick={() => toggleKey(item.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap border transition-colors inline-flex items-center gap-1.5',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
            )}
          >
            {isSelected && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color || '#3b82f6' }}
              />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ── 시장 심리 전용 레이아웃 ──

function SentimentLayout({
  data,
  isLoading,
  refetch,
  isFetching,
  chartItems,
  selectedKeys,
  toggleKey,
  selectedItems,
  period,
  setPeriod,
  percentMode,
  setPercentMode,
}: {
  data: CategoryData | undefined;
  isLoading: boolean;
  refetch: () => void;
  isFetching: boolean;
  chartItems: ChartItem[];
  selectedKeys: string[];
  toggleKey: (key: string) => void;
  selectedItems: ChartItem[];
  period: Period;
  setPeriod: (p: Period) => void;
  percentMode: boolean;
  setPercentMode: (v: boolean) => void;
}) {
  const { series, isLoading: chartLoading } = useMultiEconomyChart(selectedItems, period);

  return (
    <>
      <div className="flex justify-end">
        <RefreshBtn refetch={refetch} isFetching={isFetching} />
      </div>

      {/* Fear & Greed 게이지 + 상세 정보 */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Skeleton className="h-40 w-56 rounded-full" />
            </div>
          ) : data?.fearGreed ? (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="flex-shrink-0">
                <FearGreedGauge data={data.fearGreed} />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="font-semibold text-lg">Fear &amp; Greed Index</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem label="현재" value={data.fearGreed.value} />
                  <InfoItem label="분류" value={data.fearGreed.classification} />
                </div>
                {data.fredIndicators && data.fredIndicators.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
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
                )}
              </div>
            </div>
          ) : (
            <EmptyMsg />
          )}
        </CardContent>
      </Card>

      {/* 차트 컨트롤 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">
              {selectedItems.length === 1 ? `${selectedItems[0].label} 추이` : '지표 비교'}
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedKeys.length >= 2 && (
                <PercentToggle percentMode={percentMode} setPercentMode={setPercentMode} />
              )}
              <PeriodBar period={period} setPeriod={setPeriod} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChipSelector items={chartItems} selectedKeys={selectedKeys} toggleKey={toggleKey} />
          <MultiSeriesChart
            series={series}
            isLoading={chartLoading}
            height={400}
            percentMode={percentMode && selectedKeys.length >= 2}
          />
        </CardContent>
      </Card>
    </>
  );
}

// ── 일반 카테고리 레이아웃 (차트 + 칩 + 현재값) ──

function ChartLayout({
  data,
  isLoading,
  refetch,
  isFetching,
  category,
  chartItems,
  selectedKeys,
  toggleKey,
  selectedItems,
  period,
  setPeriod,
  percentMode,
  setPercentMode,
}: {
  data: CategoryData | undefined;
  isLoading: boolean;
  refetch: () => void;
  isFetching: boolean;
  category: EconomyCategory;
  chartItems: ChartItem[];
  selectedKeys: string[];
  toggleKey: (key: string) => void;
  selectedItems: ChartItem[];
  period: Period;
  setPeriod: (p: Period) => void;
  percentMode: boolean;
  setPercentMode: (v: boolean) => void;
}) {
  const { series, isLoading: chartLoading } = useMultiEconomyChart(selectedItems, period);

  return (
    <>
      <div className="flex justify-end">
        <RefreshBtn refetch={refetch} isFetching={isFetching} />
      </div>

      {/* 차트 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {selectedItems.length === 1 ? selectedItems[0].label : '지표 비교'}
              </CardTitle>
              {selectedItems.length === 1 && selectedItems[0].unit && (
                <span className="text-xs text-muted-foreground">{selectedItems[0].unit}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedKeys.length >= 2 && (
                <PercentToggle percentMode={percentMode} setPercentMode={setPercentMode} />
              )}
              <PeriodBar period={period} setPeriod={setPeriod} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChipSelector items={chartItems} selectedKeys={selectedKeys} toggleKey={toggleKey} />
          <MultiSeriesChart
            series={series}
            isLoading={chartLoading}
            height={400}
            percentMode={percentMode && selectedKeys.length >= 2}
          />
        </CardContent>
      </Card>

      {/* 현재값 그리드 */}
      <CurrentValues category={category} data={data} isLoading={isLoading} />
    </>
  );
}

// ── 변화율 토글 ──

function PercentToggle({
  percentMode,
  setPercentMode,
}: {
  percentMode: boolean;
  setPercentMode: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => setPercentMode(!percentMode)}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
        percentMode
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      title="변화율(%) 모드"
    >
      <BarChart3 className="w-3.5 h-3.5" />
      %
    </button>
  );
}

// ── 현재값 카드 그리드 ──

const CURRENCY_LABELS: Record<string, string> = {
  USD: '미국 달러',
  EUR: '유로',
  JPY: '일본 엔',
  CNY: '중국 위안',
  GBP: '영국 파운드',
  AUD: '호주 달러',
  CHF: '스위스 프랑',
};

function CurrentValues({
  category,
  data,
  isLoading,
}: {
  category: EconomyCategory;
  data: CategoryData | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const cards: React.ReactNode[] = [];

  if (category === 'rates') {
    if (data?.fredIndicators && data.fredIndicators.length > 0) {
      cards.push(
        <SectionLabel key="us-label" label="미국" />,
        ...data.fredIndicators.map((ind) => (
          <IndicatorCard
            key={ind.seriesId}
            name={ind.name}
            value={ind.value}
            unit={ind.unit}
            date={ind.date}
          />
        ))
      );
    }
    if (data?.ecosIndicators && data.ecosIndicators.length > 0) {
      cards.push(
        <SectionLabel key="kr-label" label="한국" />,
        ...data.ecosIndicators.map((ind) => (
          <IndicatorCard
            key={ind.seriesId}
            name={ind.name}
            value={ind.value}
            unit={ind.unit}
            date={ind.date}
          />
        ))
      );
    }
  }

  if (category === 'exchange') {
    if (data?.dollarIndex) {
      cards.push(
        <IndicatorCard
          key="dxy"
          name={data.dollarIndex.name}
          value={data.dollarIndex.price}
          change={data.dollarIndex.change}
          changePercent={data.dollarIndex.changePercent}
        />
      );
    }
    if (data?.exchangeRates) {
      cards.push(
        ...data.exchangeRates.map((rate) => (
          <IndicatorCard
            key={rate.currency}
            name={CURRENCY_LABELS[rate.currency] || rate.currency}
            value={rate.rate}
            change={rate.change}
            changePercent={rate.changePercent}
            unit="원"
          />
        ))
      );
    }
  }

  if (category === 'commodities' && data?.commodities) {
    cards.push(
      ...data.commodities.map((c) => (
        <IndicatorCard
          key={c.name}
          name={c.name}
          value={c.price}
          change={c.change}
          changePercent={c.changePercent}
          unit={c.unit}
        />
      ))
    );
  }

  if (category === 'us_economy' && data?.fredIndicators) {
    cards.push(
      ...data.fredIndicators.map((ind) => (
        <IndicatorCard
          key={ind.seriesId}
          name={ind.name}
          value={ind.value}
          unit={ind.unit}
          date={ind.date}
        />
      ))
    );
  }

  if (category === 'korea' && data?.ecosIndicators) {
    cards.push(
      ...data.ecosIndicators.map((ind) => (
        <IndicatorCard
          key={ind.seriesId}
          name={ind.name}
          value={ind.value}
          unit={ind.unit}
          date={ind.date}
        />
      ))
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">현재 지표</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {cards}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 공통 컴포넌트 ──

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="col-span-full text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 first:pt-0">
      {label}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function RefreshBtn({ refetch, isFetching }: { refetch: () => void; isFetching: boolean }) {
  return (
    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
      {isFetching ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      <span className="ml-1.5 hidden sm:inline">새로고침</span>
    </Button>
  );
}

function EmptyMsg() {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">
      데이터를 불러올 수 없습니다
    </p>
  );
}
