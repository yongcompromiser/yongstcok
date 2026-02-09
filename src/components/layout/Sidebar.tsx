'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Star,
  Briefcase,
  GitCompare,
  Gauge,
  Landmark,
  ArrowLeftRight,
  Gem,
  BarChart3,
  Building,
  Activity,
  StickyNote,
  FileCheck,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { title: '홈', href: '/', icon: LayoutDashboard },
  { title: '스크리너', href: '/screener', icon: TrendingUp },
  { title: '관심기업', href: '/watchlist', icon: Star },
  { title: '포트폴리오', href: '/portfolio', icon: Briefcase },
  { title: '기업비교', href: '/compare', icon: GitCompare },
];

const economyNavItems: NavItem[] = [
  { title: '시장 심리', href: '/economy/sentiment', icon: Gauge },
  { title: '금리·채권', href: '/economy/rates', icon: Landmark },
  { title: '환율', href: '/economy/exchange', icon: ArrowLeftRight },
  { title: '원자재', href: '/economy/commodities', icon: Gem },
  { title: '미국 경제', href: '/economy/us_economy', icon: BarChart3 },
  { title: '한국 경제', href: '/economy/korea', icon: Building },
  { title: '시장 동향', href: '/economy/market', icon: Activity },
];

const infoNavItems: NavItem[] = [
  { title: '내 메모', href: '/memo', icon: StickyNote },
  { title: '공시', href: '/disclosure', icon: FileCheck },
  { title: '뉴스', href: '/news', icon: Newspaper },
];

export function Sidebar() {
  const pathname = usePathname();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-2',
          isActive && 'bg-secondary'
        )}
        asChild
      >
        <Link href={item.href}>
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      </Button>
    );
  };

  return (
    <aside className="hidden lg:flex w-56 flex-col border-r bg-background">
      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-4">
          {/* 메인 메뉴 */}
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>

          {/* 구분선 */}
          <div className="border-t my-2" />

          {/* 경제지표 */}
          <div className="space-y-1">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              경제지표
            </p>
            {economyNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>

          {/* 구분선 */}
          <div className="border-t my-2" />

          {/* 정보 메뉴 */}
          <div className="space-y-1">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              정보
            </p>
            {infoNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
