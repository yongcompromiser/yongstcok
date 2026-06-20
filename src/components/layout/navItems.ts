import type { ComponentType } from 'react';
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
  Ship,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

// 데스크탑 사이드바와 모바일 서랍 메뉴가 공유하는 네비게이션 항목.
export const mainNavItems: NavItem[] = [
  { title: '홈', href: '/', icon: LayoutDashboard },
  { title: '스크리너', href: '/screener', icon: TrendingUp },
  { title: '관심기업', href: '/watchlist', icon: Star },
  { title: '포트폴리오', href: '/portfolio', icon: Briefcase },
  { title: '기업비교', href: '/compare', icon: GitCompare },
];

export const economyNavItems: NavItem[] = [
  { title: '시장 심리', href: '/economy/sentiment', icon: Gauge },
  { title: '금리·채권', href: '/economy/rates', icon: Landmark },
  { title: '환율', href: '/economy/exchange', icon: ArrowLeftRight },
  { title: '원자재', href: '/economy/commodities', icon: Gem },
  { title: '미국 경제', href: '/economy/us_economy', icon: BarChart3 },
  { title: '한국 경제', href: '/economy/korea', icon: Building },
  { title: '시장 동향', href: '/economy/market', icon: Activity },
  { title: '호르무즈 통행량', href: '/economy/hormuz', icon: Ship },
];

export const infoNavItems: NavItem[] = [
  { title: '내 메모', href: '/memo', icon: StickyNote },
  { title: '공시', href: '/disclosure', icon: FileCheck },
  { title: '뉴스', href: '/news', icon: Newspaper },
];
