'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useVolumeRanking,
  useTradingValueRanking,
  useShortSelling,
} from '@/hooks/useMarketRank';
import type { StockRankItem, ShortSellingItem } from '@/types/stock';

export default function MarketPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">시장 동향</h1>
        <p className="text-sm text-muted-foreground">
          거래량·거래대금 상위, 공매도 현황 (금융위원회)
        </p>
      </div>

      <Tabs defaultValue="volume">
        <TabsList>
          <TabsTrigger value="volume">거래량 TOP</TabsTrigger>
          <TabsTrigger value="trading_value">거래대금 TOP</TabsTrigger>
          <TabsTrigger value="short_selling">공매도 상위</TabsTrigger>
        </TabsList>

        <TabsContent value="volume">
          <VolumeTab />
        </TabsContent>
        <TabsContent value="trading_value">
          <TradingValueTab />
        </TabsContent>
        <TabsContent value="short_selling">
          <ShortSellingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 거래량 TOP ──

function VolumeTab() {
  const { data, isLoading } = useVolumeRanking();

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.data?.length) return <EmptyState />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          거래량 상위 종목
          <DateBadge date={data.date} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>종목</TableHead>
              <TableHead className="text-right">현재가</TableHead>
              <TableHead className="text-right">등락률</TableHead>
              <TableHead className="text-right">거래량</TableHead>
              <TableHead className="text-right hidden sm:table-cell">시가총액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((item: StockRankItem, i: number) => (
              <StockRow key={item.stockCode} item={item} rank={i + 1} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── 거래대금 TOP ──

function TradingValueTab() {
  const { data, isLoading } = useTradingValueRanking();

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.data?.length) return <EmptyState />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          거래대금 상위 종목
          <DateBadge date={data.date} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>종목</TableHead>
              <TableHead className="text-right">현재가</TableHead>
              <TableHead className="text-right">등락률</TableHead>
              <TableHead className="text-right">거래대금</TableHead>
              <TableHead className="text-right hidden sm:table-cell">시가총액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((item: StockRankItem, i: number) => (
              <StockRow
                key={item.stockCode}
                item={item}
                rank={i + 1}
                showTradingValue
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── 공매도 상위 ──

function ShortSellingTab() {
  const { data, isLoading } = useShortSelling();

  if (isLoading) return <LoadingSkeleton />;
  if (!data?.data?.length) return <EmptyState />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          공매도 비중 상위
          <DateBadge date={data.date} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>종목</TableHead>
              <TableHead>시장</TableHead>
              <TableHead className="text-right">공매도 비중</TableHead>
              <TableHead className="text-right">공매도 수량</TableHead>
              <TableHead className="text-right hidden sm:table-cell">총 거래량</TableHead>
              <TableHead className="text-right hidden md:table-cell">공매도 금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((item: ShortSellingItem, i: number) => (
              <TableRow key={item.stockCode}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <Link
                    href={`/company/${item.stockCode}`}
                    className="font-medium hover:underline"
                  >
                    {item.stockName}
                  </Link>
                  <span className="text-xs text-muted-foreground ml-1">
                    {item.stockCode}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {item.market}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium text-red-500">
                  {item.shortRatio.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.shortVolume.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden sm:table-cell">
                  {item.totalVolume.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden md:table-cell">
                  {formatAmount(item.shortAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── 공통 컴포넌트 ──

function StockRow({
  item,
  rank,
  showTradingValue,
}: {
  item: StockRankItem;
  rank: number;
  showTradingValue?: boolean;
}) {
  const isPositive = item.change > 0;
  const isZero = item.change === 0;

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{rank}</TableCell>
      <TableCell>
        <Link
          href={`/company/${item.stockCode}`}
          className="font-medium hover:underline"
        >
          {item.stockName}
        </Link>
        <span className="text-xs text-muted-foreground ml-1">
          {item.stockCode}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {item.price.toLocaleString()}원
      </TableCell>
      <TableCell
        className={cn(
          'text-right tabular-nums font-medium',
          isZero
            ? 'text-muted-foreground'
            : isPositive
            ? 'text-red-500'
            : 'text-blue-500'
        )}
      >
        {isPositive ? '+' : ''}
        {item.changePercent.toFixed(2)}%
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {showTradingValue
          ? formatAmount(item.tradingValue)
          : item.volume.toLocaleString()}
      </TableCell>
      <TableCell className="text-right tabular-nums hidden sm:table-cell">
        {formatAmount(item.marketCap)}
      </TableCell>
    </TableRow>
  );
}

function DateBadge({ date }: { date: string }) {
  if (!date) return null;
  const formatted = `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
  return (
    <span className="text-xs font-normal text-muted-foreground">
      ({formatted} 기준)
    </span>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground text-center py-8">
          DATA_GO_KR_API_KEY 설정 시 표시됩니다
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function formatAmount(value: number): string {
  if (!value) return '-';
  if (value >= 1_0000_0000_0000) return `${(value / 1_0000_0000_0000).toFixed(1)}조`;
  if (value >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(0)}억`;
  if (value >= 1_0000) return `${(value / 1_0000).toFixed(0)}만`;
  return value.toLocaleString();
}
