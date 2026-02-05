'use client';

import Link from 'next/link';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 임시 데이터 (나중에 실제 데이터로 교체)
const watchlistData = [
  { symbol: '005930', name: '삼성전자', price: 71500, change: 1.2 },
  { symbol: '000660', name: 'SK하이닉스', price: 178000, change: -0.8 },
  { symbol: '035720', name: '카카오', price: 42500, change: 2.5 },
  { symbol: '035420', name: 'NAVER', price: 185000, change: 0 },
  { symbol: '051910', name: 'LG화학', price: 385000, change: -1.5 },
];

function PriceChange({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="flex items-center text-red-500 text-sm">
        <TrendingUp className="h-3 w-3 mr-0.5" />+{change.toFixed(2)}%
      </span>
    );
  } else if (change < 0) {
    return (
      <span className="flex items-center text-blue-500 text-sm">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {change.toFixed(2)}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted-foreground text-sm">
      <Minus className="h-3 w-3 mr-0.5" />
      0.00%
    </span>
  );
}

export function RightPanel() {
  return (
    <aside className="hidden xl:flex w-72 flex-col border-l bg-background">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* 관심기업 퀵뷰 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                관심기업
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {watchlistData.map((stock) => (
                <Link
                  key={stock.symbol}
                  href={`/company/${stock.symbol}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{stock.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stock.symbol}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {stock.price.toLocaleString()}원
                    </p>
                    <PriceChange change={stock.change} />
                  </div>
                </Link>
              ))}
              {watchlistData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  관심기업이 없습니다
                </p>
              )}
            </CardContent>
          </Card>

          {/* 시장 요약 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">시장 현황</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">코스피</span>
                <div className="text-right">
                  <span className="font-medium">2,645.23</span>
                  <Badge
                    variant="outline"
                    className="ml-2 text-red-500 border-red-500"
                  >
                    +0.85%
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">코스닥</span>
                <div className="text-right">
                  <span className="font-medium">823.45</span>
                  <Badge
                    variant="outline"
                    className="ml-2 text-blue-500 border-blue-500"
                  >
                    -0.32%
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">원/달러</span>
                <div className="text-right">
                  <span className="font-medium">1,325.50</span>
                  <Badge variant="outline" className="ml-2">
                    0.00%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </aside>
  );
}
