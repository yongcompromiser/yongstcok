import { NextRequest, NextResponse } from 'next/server';
import { getCorpCode, getFinancials, getDisclosures, getCompanyInfo } from '@/lib/api/dart';

// GET /api/dart?symbol=005930&type=info|financial|disclosure
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') || 'info';

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  // DART API 키 체크
  if (!process.env.DART_API_KEY || process.env.DART_API_KEY === 'your_dart_api_key') {
    return NextResponse.json(
      { error: 'DART API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  // 종목코드 → DART 고유번호 조회
  const corpCode = await getCorpCode(symbol);
  if (!corpCode) {
    return NextResponse.json(
      { error: 'DART 기업 정보를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  switch (type) {
    case 'info': {
      const info = await getCompanyInfo(corpCode);
      return NextResponse.json({ info });
    }

    case 'financial': {
      const year = searchParams.get('year') || new Date().getFullYear().toString();
      const reportCode = (searchParams.get('report') || '11011') as '11013' | '11012' | '11014' | '11011';
      const financial = await getFinancials(corpCode, year, reportCode);
      if (financial) financial.symbol = symbol;
      return NextResponse.json({ financial });
    }

    case 'disclosure': {
      const disclosures = await getDisclosures(corpCode);
      return NextResponse.json({
        disclosures: disclosures.map((d) => ({ ...d, symbol })),
      });
    }

    default:
      return NextResponse.json(
        { error: '지원하지 않는 type입니다. (info, financial, disclosure)' },
        { status: 400 }
      );
  }
}
