// DART OpenAPI (금융감독원 전자공시시스템)
// https://opendart.fss.or.kr

import { FinancialData, Disclosure, Shareholder, DividendData, MultiYearFinancials } from '@/types/stock';
import { getCorpCodeFromMap } from '@/lib/corpCodeMap';

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
  // 먼저 로컬 매핑 테이블에서 조회
  const mappedCode = getCorpCodeFromMap(symbol);
  if (mappedCode) {
    return mappedCode;
  }

  // 매핑에 없으면 null 반환 (DART API는 stock_code 직접 조회 미지원)
  console.log(`Corp code not found in map for symbol: ${symbol}`);
  return null;
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

// 최근 N년 연간 + 최근 4분기 재무제표 통합 조회
export async function getMultiYearFinancials(
  corpCode: string,
  years: number = 5
): Promise<MultiYearFinancials> {
  const currentYear = new Date().getFullYear();
  const result: MultiYearFinancials = { annual: [], quarterly: [] };

  // 연간 재무제표 (최근 N년)
  const annualPromises = Array.from({ length: years }, (_, i) => {
    const year = (currentYear - 1 - i).toString();
    return getFinancials(corpCode, year, '11011').then(f => {
      if (f) f.symbol = corpCode;
      return f;
    });
  });

  // 최근 4분기 재무제표
  const quarterReports: Array<{ year: string; code: '11013' | '11012' | '11014' | '11011' }> = [
    { year: (currentYear - 1).toString(), code: '11014' }, // 전년 3분기
    { year: (currentYear - 1).toString(), code: '11012' }, // 전년 반기
    { year: (currentYear - 1).toString(), code: '11013' }, // 전년 1분기
    { year: currentYear.toString(), code: '11013' },       // 올해 1분기
  ];

  const quarterPromises = quarterReports.map(({ year, code }) =>
    getFinancials(corpCode, year, code).then(f => {
      if (f) f.symbol = corpCode;
      return f;
    })
  );

  const [annualResults, quarterResults] = await Promise.all([
    Promise.all(annualPromises),
    Promise.all(quarterPromises),
  ]);

  result.annual = annualResults.filter((f): f is FinancialData => f !== null);
  result.quarterly = quarterResults.filter((f): f is FinancialData => f !== null);

  // 기간순 정렬
  result.annual.sort((a, b) => a.period.localeCompare(b.period));
  result.quarterly.sort((a, b) => a.period.localeCompare(b.period));

  return result;
}

// 최대주주 현황
export async function getMajorShareholders(
  corpCode: string,
  year?: string
): Promise<Shareholder[]> {
  try {
    const y = year || (new Date().getFullYear() - 1).toString();
    const res = await fetch(
      `${DART_API}/hyslrSttus.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}&bsns_year=${y}&reprt_code=11011`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== '000' || !data.list) return [];

    return data.list
      .filter((item: any) => item.nm && item.nm !== '-')
      .map((item: any) => ({
        name: item.nm || '',
        relation: item.relate || '',
        shares: Number(String(item.bsis_posesn_stock_co || '0').replace(/,/g, '')) || 0,
        sharePercent: parseFloat(item.bsis_posesn_stock_qota_rt || '0') || 0,
      }));
  } catch (error) {
    console.error('getMajorShareholders error:', error);
    return [];
  }
}

// 주식총수 현황
export async function getTotalShares(
  corpCode: string,
  year?: string
): Promise<{ commonShares: number; preferredShares: number; treasuryShares: number } | null> {
  try {
    const y = year || (new Date().getFullYear() - 1).toString();
    const res = await fetch(
      `${DART_API}/stockTotqySttus.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}&bsns_year=${y}&reprt_code=11011`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== '000' || !data.list) return null;

    let commonShares = 0;
    let preferredShares = 0;

    for (const item of data.list) {
      const shares = Number(String(item.istc_totqy || '0').replace(/,/g, '')) || 0;
      if (item.se === '보통주') commonShares = shares;
      else if (item.se === '우선주') preferredShares = shares;
    }

    return { commonShares, preferredShares, treasuryShares: 0 };
  } catch (error) {
    console.error('getTotalShares error:', error);
    return null;
  }
}

// 자기주식 취득/처분 현황
export async function getTreasuryStock(
  corpCode: string,
  year?: string
): Promise<number> {
  try {
    const y = year || (new Date().getFullYear() - 1).toString();
    const res = await fetch(
      `${DART_API}/tesstkAcqsDspsSttus.json?crtfc_key=${getDartKey()}&corp_code=${corpCode}&bsns_year=${y}&reprt_code=11011`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    if (data.status !== '000' || !data.list) return 0;

    let totalTreasury = 0;
    for (const item of data.list) {
      if (item.stock_knd === '보통주') {
        totalTreasury += Number(String(item.trmend_rmndr_co || '0').replace(/,/g, '')) || 0;
      }
    }
    return totalTreasury;
  } catch (error) {
    console.error('getTreasuryStock error:', error);
    return 0;
  }
}

// 다년도 배당이력
export async function getDividendHistory(
  corpCode: string,
  years: number = 5
): Promise<DividendData[]> {
  const currentYear = new Date().getFullYear();
  const results: DividendData[] = [];

  const promises = Array.from({ length: years }, (_, i) => {
    const year = (currentYear - 1 - i).toString();
    return getDividendInfo(corpCode, year).then(data => ({ year, data }));
  });

  const allResults = await Promise.all(promises);

  for (const { year, data } of allResults) {
    if (!data || !Array.isArray(data)) continue;

    let dividendPerShare = 0;
    let dividendYield = 0;
    let totalDividend = 0;
    let payoutRatio = 0;

    for (const item of data) {
      const accountName = item.se || '';
      const value = String(item.thstrm || '0').replace(/,/g, '');

      if (accountName.includes('주당 현금배당금') && accountName.includes('보통주')) {
        dividendPerShare = Number(value) || 0;
      } else if (accountName.includes('현금배당수익률') && accountName.includes('보통주')) {
        dividendYield = parseFloat(value) || 0;
      } else if (accountName.includes('현금배당금총액')) {
        totalDividend = Number(value) || 0;
      } else if (accountName.includes('현금배당성향')) {
        payoutRatio = parseFloat(value) || 0;
      }
    }

    if (dividendPerShare > 0 || totalDividend > 0) {
      results.push({ year, dividendPerShare, dividendYield, totalDividend, payoutRatio });
    }
  }

  results.sort((a, b) => a.year.localeCompare(b.year));
  return results;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}
