'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  mainNavItems,
  economyNavItems,
  infoNavItems,
  type NavItem,
} from './navItems';

// 모바일/태블릿(lg 미만)에서 사이드바를 대체하는 햄버거 서랍 메뉴.
// 데스크탑(lg 이상)에서는 햄버거 버튼 자체가 숨겨진다.
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn('w-full justify-start gap-2', isActive && 'bg-secondary')}
        asChild
        onClick={() => setOpen(false)}
      >
        <Link href={item.href}>
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      </Button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left">메뉴</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0 py-4">
          <div className="px-3 space-y-4">
            {/* 메인 메뉴 */}
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>

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
      </SheetContent>
    </Sheet>
  );
}
