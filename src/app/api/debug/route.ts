import { NextResponse } from 'next/server';

export async function GET() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const results: Record<string, any> = {};

  // 테스트 1: productList (환율)
  try {
    const r = await fetch(
      'https://m.stock.naver.com/front-api/marketIndex/productList?category=exchange&reutersCode=FX_USDKRW',
      { headers: { 'User-Agent': UA } }
    );
    results.productList = {
      status: r.status,
      headers: Object.fromEntries(r.headers.entries()),
      body: await r.text().then(t => t.substring(0, 1000)),
    };
  } catch (e: any) {
    results.productList = { error: e.message };
  }

  // 테스트 2: productDetail (환율)
  try {
    const r = await fetch(
      'https://m.stock.naver.com/front-api/marketIndex/productDetail?reutersCode=FX_USDKRW',
      { headers: { 'User-Agent': UA } }
    );
    results.productDetail = {
      status: r.status,
      body: await r.text().then(t => t.substring(0, 1000)),
    };
  } catch (e: any) {
    results.productDetail = { error: e.message };
  }

  // 테스트 3: 원자재
  try {
    const r = await fetch(
      'https://m.stock.naver.com/front-api/marketIndex/productList?category=worldCommodity&reutersCode=OILCL1',
      { headers: { 'User-Agent': UA } }
    );
    results.commodity = {
      status: r.status,
      body: await r.text().then(t => t.substring(0, 1000)),
    };
  } catch (e: any) {
    results.commodity = { error: e.message };
  }

  // 테스트 4: 기존 잘 되는 주식 API (비교용)
  try {
    const r = await fetch(
      'https://m.stock.naver.com/api/stock/005930/basic',
      { headers: { 'User-Agent': UA } }
    );
    results.stockApi = {
      status: r.status,
      body: await r.text().then(t => t.substring(0, 500)),
    };
  } catch (e: any) {
    results.stockApi = { error: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
