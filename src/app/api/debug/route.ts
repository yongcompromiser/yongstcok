import { NextResponse } from 'next/server';

export async function GET() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const results: Record<string, any> = {};

  const urls = [
    // 환율 (확인됨)
    ['exchange_usd', 'https://api.stock.naver.com/marketindex/exchange/FX_USDKRW'],
    // 원자재 후보
    ['commodity_wti', 'https://api.stock.naver.com/marketindex/worldCommodity/OILCL1'],
    ['commodity_wti2', 'https://api.stock.naver.com/marketindex/commodity/OILCL1'],
    ['commodity_wti3', 'https://api.stock.naver.com/marketindex/OILCL1'],
    ['commodity_gold', 'https://api.stock.naver.com/marketindex/worldCommodity/CMDT_GC'],
    ['commodity_gold2', 'https://api.stock.naver.com/marketindex/commodity/CMDT_GC'],
    ['commodity_gold3', 'https://api.stock.naver.com/marketindex/CMDT_GC'],
    // DXY
    ['dxy', 'https://api.stock.naver.com/marketindex/exchange/DXY'],
    ['dxy2', 'https://api.stock.naver.com/marketindex/DXY'],
    // 리스트형
    ['exchange_list', 'https://api.stock.naver.com/marketindex/exchangeList'],
    ['commodity_list', 'https://api.stock.naver.com/marketindex/commodityList'],
    ['marketindex_list', 'https://api.stock.naver.com/marketindex'],
  ];

  for (const [name, url] of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      const body = await r.text();
      results[name] = {
        status: r.status,
        body: body.substring(0, 600),
      };
    } catch (e: any) {
      results[name] = { error: e.message };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
