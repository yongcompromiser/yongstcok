'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  mainNavItems,
  economyNavItems,
  infoNavItems,
  type NavItem,
} from './navItems';

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
