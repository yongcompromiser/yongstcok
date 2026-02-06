import { NextRequest, NextResponse } from 'next/server';
import {
  getCorpCode,
  getCompanyInfo,
  getMultiYearFinancials,
  getMajorShareholders,
  getTotalShares,
  getTreasuryStock,
  getDividendHistory,
} from '@/lib/api/dart';

// GET /api/dart/company?symbol=005930
// 기업정보 + 재무 + 주주 + 배당 통합 엔드포인트
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  if (!process.env.DART_API_KEY || process.env.DART_API_KEY === 'your_dart_api_key') {
    return NextResponse.json(
      { error: 'DART API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  const corpCode = await getCorpCode(symbol);
  if (!corpCode) {
    return NextResponse.json(
      { error: 'DART 기업 정보를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  // 모든 데이터를 병렬로 가져오기
  const [info, financials, shareholders, totalShares, treasuryShares, dividends] =
    await Promise.all([
      getCompanyInfo(corpCode),
      getMultiYearFinancials(corpCode, 5),
      getMajorShareholders(corpCode),
      getTotalShares(corpCode),
      getTreasuryStock(corpCode),
      getDividendHistory(corpCode, 5),
    ]);

  // 자기주식 수량 병합
  const sharesData = totalShares
    ? { ...totalShares, treasuryShares: treasuryShares }
    : null;

  return NextResponse.json({
    info,
    financials,
    shareholders,
    totalShares: sharesData,
    dividends,
  });
}
