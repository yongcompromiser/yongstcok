import { NextRequest, NextResponse } from 'next/server';
import { getEconomyByCategory, type EconomyCategory } from '@/lib/api/economy';

const VALID_CATEGORIES: EconomyCategory[] = [
  'sentiment',
  'rates',
  'exchange',
  'commodities',
  'us_economy',
  'korea',
];

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category') as EconomyCategory | null;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category 파라미터 필요: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const data = await getEconomyByCategory(category);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Economy API error:', error);
    return NextResponse.json(
      { error: '경제지표 데이터를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
