'use client';

import { Globe, MapPin, User, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyInfo } from '@/types/stock';

interface BusinessInfoTabProps {
  info: CompanyInfo | null;
  isLoading: boolean;
}

export default function BusinessInfoTab({ info, isLoading }: BusinessInfoTabProps) {
  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!info) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            사업 정보를 불러올 수 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (d: string) => {
    if (!d || d.length !== 8) return '-';
    return `${d.slice(0, 4)}년 ${d.slice(4, 6)}월 ${d.slice(6, 8)}일`;
  };

  const items = [
    { icon: User, label: '대표자', value: info.ceoName || '-' },
    { icon: Calendar, label: '설립일', value: formatDate(info.establishDate) },
    { icon: Building2, label: '시장', value: info.corpClass === 'Y' ? '유가증권시장 (KOSPI)' : '코스닥시장 (KOSDAQ)' },
    { icon: Calendar, label: '결산월', value: info.accountMonth ? `${info.accountMonth}월` : '-' },
    { icon: MapPin, label: '주소', value: info.address || '-' },
    { icon: Globe, label: '홈페이지', value: info.homepage || '-', isLink: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">사업 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 py-2 border-b last:border-0">
              <item.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                {item.isLink && item.value !== '-' ? (
                  <a
                    href={item.value.startsWith('http') ? item.value : `https://${item.value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-500 hover:underline break-all"
                  >
                    {item.value}
                  </a>
                ) : (
                  <div className="text-sm font-medium">{item.value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
