import { NextResponse } from 'next/server';
import { getAllKrxStocks } from '@/lib/krxStockCache';
import { STOCK_LIST } from '@/lib/stockList';

// GET /api/stock/list → 전체 종목 리스트 (KRX 캐시, fallback: stockList.ts)
export async function GET() {
  try {
    const stocks = await getAllKrxStocks();
    if (stocks.length > 0) {
      return NextResponse.json({ stocks, source: 'krx' });
    }
  } catch {
    // KRX 실패 시 fallback
  }

  // fallback: 하드코딩 리스트 (중복 제거)
  const seen = new Set<string>();
  const unique = STOCK_LIST.filter((s) => {
    if (seen.has(s.symbol)) return false;
    seen.add(s.symbol);
    return true;
  });

  return NextResponse.json({ stocks: unique, source: 'local' });
}
