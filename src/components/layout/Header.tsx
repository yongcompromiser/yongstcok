'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Search,
  Sun,
  Moon,
  LogOut,
  Settings,
  Star,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStockSearch } from '@/hooks/useStock';

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isAdmin } = useAuthStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading: isSearching } = useStockSearch(query);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 검색어 변경 시 드롭다운 열기
  useEffect(() => {
    if (query.length >= 1) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (symbol: string) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/company/${symbol}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="text-primary">주뇽좌의</span>
          <span>주식생활</span>
        </Link>

        {/* 검색창 */}
        <div ref={searchRef} className="relative flex-1 max-w-xl mx-4">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              type="text"
              placeholder="종목명 또는 종목코드 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 1 && setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  setQuery('');
                }
              }}
              className="pl-10 w-full"
            />
          </div>

          {/* 검색 결과 드롭다운 */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  검색 중...
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleSelect(stock.symbol)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{stock.name}</p>
                      <p className="text-xs text-muted-foreground">{stock.symbol}</p>
                    </div>
                    {stock.market && (
                      <span className="text-xs text-muted-foreground">
                        {stock.market}
                      </span>
                    )}
                  </button>
                ))
              ) : query.length >= 1 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/watchlist">
              <Star className="h-4 w-4 mr-1" />
              관심기업
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/portfolio">
              <Briefcase className="h-4 w-4 mr-1" />
              포트폴리오
            </Link>
          </Button>
        </nav>

        {/* 테마 토글 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">테마 변경</span>
        </Button>

        {/* 사용자 메뉴 */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  설정
                </Link>
              </DropdownMenuItem>
              {isAdmin() && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/reports">
                    <Settings className="mr-2 h-4 w-4" />
                    관리자
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" asChild>
            <Link href="/login">로그인</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
