import { NextResponse } from 'next/server';
import {
  getFearGreedIndex,
  getFredSeries,
  getExchangeRates,
  getCommodityPrices,
  getEcosSeries,
} from '@/lib/api/economy';
import { EconomyData } from '@/types/stock';

export async function GET() {
  try {
    const [fearGreed, exchangeRates, commodities, fredIndicators, ecosIndicators] =
      await Promise.all([
        getFearGreedIndex(),
        getExchangeRates(),
        getCommodityPrices(),
        getFredSeries(),
        getEcosSeries(),
      ]);

    const data: EconomyData = {
      fearGreed,
      exchangeRates,
      commodities,
      fredIndicators,
      ecosIndicators,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Economy API error:', error);
    return NextResponse.json(
      { error: '경제지표 데이터를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
