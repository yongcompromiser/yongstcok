import { NextResponse } from 'next/server';

export async function GET() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const results: Record<string, any> = {};

  const urls = [
    ['api_marketIndex', 'https://m.stock.naver.com/api/marketIndex/FX_USDKRW'],
    ['api_marketIndex2', 'https://m.stock.naver.com/api/marketIndex/exchange/FX_USDKRW'],
    ['api_index', 'https://m.stock.naver.com/api/index/marketIndex/FX_USDKRW'],
    ['api_exchangeList', 'https://m.stock.naver.com/api/marketIndex/exchangeList'],
    ['api_exchange', 'https://m.stock.naver.com/api/exchange/FX_USDKRW'],
    ['api_commodityList', 'https://m.stock.naver.com/api/marketIndex/commodityList'],
    ['api_commodity', 'https://m.stock.naver.com/api/marketIndex/worldCommodity/OILCL1'],
    ['api_commodity2', 'https://m.stock.naver.com/api/commodity/OILCL1'],
    ['api_worldCommodity', 'https://m.stock.naver.com/api/marketIndex/OILCL1'],
    ['api_marketIndex_all', 'https://m.stock.naver.com/api/marketIndex/all'],
    ['api_home', 'https://m.stock.naver.com/api/home'],
    ['finance_api', 'https://api.stock.naver.com/marketindex/exchange/FX_USDKRW'],
    ['finance_api2', 'https://api.stock.naver.com/marketindex/FX_USDKRW'],
  ];

  for (const [name, url] of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      const body = await r.text();
      results[name] = {
        status: r.status,
        body: body.substring(0, 500),
      };
    } catch (e: any) {
      results[name] = { error: e.message };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
