// DART OpenAPI (금융감독원 전자공시시스템)
// https://opendart.fss.or.kr

import { FinancialData, Disclosure } from '@/types/stock';

const DART_API = 'https://opendart.fss.or.kr/api';

function getDartKey(): string {
  const key = process.env.DART_API_KEY;
  if (!key || key === 'your_dart_api_key') {
    throw new Error('DART_API_KEY가 설정되지 않았습니다.');
  }
  return key;
}

// 기업 고유번호 조회 (종목코드 → DART 고유번호)
export async function getCorpCode(symbol: string): Promise<string | null> {
  // DART는 종목코드가 아닌 고유번호를 사용
  // 실제로는 corpCode.xml에서 매핑 필요 → 캐시 테이블 활용
  // 여기서는 API로 직접 검색
  try {
    const res = await fetch(
      `${DART_API}/company.json?crtfc_key=${getDartKey()}&stock_code=${symbol}`,
      { next: { revalidate: 86400 } } // 24시간 캐시
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== '000') return null;

    return data.corp_code || null;
  } catch (error) {
    console.error('getCorpCode error:', error);
    return null;
  }
}

// 기업 기본 정보
export async function getCompanyInfo(corpCode: string) {
  try {
    const res = await fetch(
      `${DART_API}/company.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== '000') return null;

    return {
      corpCode: data.corp_code,
      corpName: data.corp_name,
      stockCode: data.stock_code,
      ceoName: data.ceo_nm,
      corpClass: data.corp_cls, // Y: 유가증권, K: 코스닥
      address: data.adres,
      homepage: data.hm_url,
      establishDate: data.est_dt,
      accountMonth: data.acc_mt, // 결산월
    };
  } catch (error) {
    console.error('getCompanyInfo error:', error);
    return null;
  }
}

// 재무제표 조회 (단일회사 주요 계정)
export async function getFinancials(
  corpCode: string,
  year: string,
  reportCode: '11013' | '11012' | '11014' | '11011' = '11011'
  // 11013: 1분기, 11012: 반기, 11014: 3분기, 11011: 사업보고서
): Promise<FinancialData | null> {
  try {
    const res = await fetch(
      `${DART_API}/fnlttSinglAcnt.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reportCode}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== '000' || !data.list) return null;

    const items = data.list;

    // 연결재무제표 우선, 없으면 개별
    const getAmount = (accountName: string): number => {
      const item = items.find(
        (i: any) =>
          i.account_nm === accountName &&
          (i.fs_div === 'CFS' || i.fs_div === 'OFS') // CFS: 연결, OFS: 개별
      );
      return Number(item?.thstrm_amount?.replace(/,/g, '') || 0);
    };

    const periodMap: Record<string, string> = {
      '11013': `${year}Q1`,
      '11012': `${year}Q2`,
      '11014': `${year}Q3`,
      '11011': year,
    };

    return {
      symbol: '', // 호출측에서 설정
      period: periodMap[reportCode],
      periodType: reportCode === '11011' ? 'Y' : 'Q',
      revenue: getAmount('매출액') || getAmount('수익(매출액)'),
      operatingIncome: getAmount('영업이익') || getAmount('영업이익(손실)'),
      netIncome: getAmount('당기순이익') || getAmount('당기순이익(손실)'),
      assets: getAmount('자산총계'),
      liabilities: getAmount('부채총계'),
      equity: getAmount('자본총계'),
    };
  } catch (error) {
    console.error('getFinancials error:', error);
    return null;
  }
}

// 공시 검색
export async function getDisclosures(
  corpCode: string,
  options?: {
    startDate?: string; // YYYYMMDD
    endDate?: string;
    type?: string; // A: 정기공시, B: 주요사항, C: 발행공시 등
    count?: number;
  }
): Promise<Disclosure[]> {
  try {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    const bgn_de = options?.startDate || formatDate(threeMonthsAgo);
    const end_de = options?.endDate || formatDate(today);
    const page_count = options?.count || 20;

    let url = `${DART_API}/list.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}&bgn_de=${bgn_de}&end_de=${end_de}&page_count=${page_count}`;

    if (options?.type) {
      url += `&pblntf_ty=${options.type}`;
    }

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== '000' || !data.list) return [];

    return data.list.map((item: any) => ({
      id: item.rcept_no,
      symbol: '',
      title: item.report_nm,
      type: item.pblntf_ty || '기타',
      date: item.rcept_dt,
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
    }));
  } catch (error) {
    console.error('getDisclosures error:', error);
    return [];
  }
}

// 배당 정보
export async function getDividendInfo(corpCode: string, year: string) {
  try {
    const res = await fetch(
      `${DART_API}/alotMatter.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== '000' || !data.list) return null;

    return data.list;
  } catch (error) {
    console.error('getDividendInfo error:', error);
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}
