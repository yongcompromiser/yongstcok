// 시장 구분
export type Market = 'KR' | 'US';

// 주식 기본 정보
export interface Stock {
  symbol: string;           // 종목코드
  name: string;             // 종목명
  market: Market;           // 시장
  sector?: string;          // 섹터
  industry?: string;        // 업종
}

// 실시간 시세
export interface StockPrice {
  symbol: string;
  price: number;            // 현재가
  change: number;           // 전일대비
  changePercent: number;    // 등락률
  volume: number;           // 거래량
  high: number;             // 고가
  low: number;              // 저가
  open: number;             // 시가
  prevClose: number;        // 전일종가
  marketCap?: number;       // 시가총액
  updatedAt: Date;
}

// 차트 데이터 (캔들)
export interface CandleData {
  time: string;             // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 재무제표
export interface FinancialData {
  symbol: string;
  period: string;           // 2024Q1, 2024
  periodType: 'Q' | 'Y';    // 분기/연간
  revenue: number;          // 매출액
  operatingIncome: number;  // 영업이익
  netIncome: number;        // 순이익
  assets: number;           // 자산총계
  liabilities: number;      // 부채총계
  equity: number;           // 자본총계
}

// 밸류에이션 지표
export interface Valuation {
  symbol: string;
  per?: number;             // PER
  pbr?: number;             // PBR
  psr?: number;             // PSR
  roe?: number;             // ROE
  roa?: number;             // ROA
  dividendYield?: number;   // 배당수익률
  eps?: number;             // EPS
  bps?: number;             // BPS
}

// 공시 정보
export interface Disclosure {
  id: string;
  symbol: string;
  title: string;
  type: string;             // 주요사항보고, 분기보고서 등
  date: string;
  url: string;
}

// 증권사 리포트 (관리자 전용)
export interface AnalystReport {
  id: string;
  symbol: string;
  title: string;
  analyst: string;          // 애널리스트
  firm: string;             // 증권사
  targetPrice?: number;     // 목표가
  opinion?: '매수' | '중립' | '매도' | '보유';
  date: string;
  url?: string;
}

// 관심기업
export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  memo?: string;
  createdAt: Date;
}

// 포트폴리오 항목
export interface PortfolioItem {
  id: string;
  userId: string;
  symbol: string;
  quantity: number;         // 보유수량
  avgPrice: number;         // 평균단가
  createdAt: Date;
  updatedAt: Date;
}

// 사용자 메모
export interface StockMemo {
  id: string;
  userId: string;
  symbol: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// DART 기업정보
export interface CompanyInfo {
  corpCode: string;         // DART 고유번호
  corpName: string;         // 회사명
  stockCode: string;        // 종목코드
  ceoName: string;          // 대표자
  corpClass: string;        // Y: 유가증권, K: 코스닥
  address: string;          // 주소
  homepage: string;         // 홈페이지
  establishDate: string;    // 설립일 (YYYYMMDD)
  accountMonth: string;     // 결산월
  sector?: string;          // 업종
}

// 최대주주 정보
export interface Shareholder {
  name: string;             // 주주명
  relation: string;         // 관계 (본인, 특수관계인 등)
  shares: number;           // 보유주식수
  sharePercent: number;     // 지분율 (%)
}

// 배당 정보
export interface DividendData {
  year: string;             // 사업연도
  dividendPerShare: number; // 주당배당금 (원)
  dividendYield: number;    // 배당수익률 (%)
  totalDividend: number;    // 배당금총액 (원)
  payoutRatio: number;      // 배당성향 (%)
}

// 다년도 재무 통합 데이터
export interface MultiYearFinancials {
  annual: FinancialData[];  // 최근 5년 연간
  quarterly: FinancialData[]; // 최근 4분기
}

// 기업 상세 통합 데이터
export interface CompanyDetail {
  info: CompanyInfo | null;
  financials: MultiYearFinancials | null;
  shareholders: Shareholder[];
  dividends: DividendData[];
  totalShares: {
    commonShares: number;   // 보통주
    preferredShares: number; // 우선주
    treasuryShares: number; // 자기주식
  } | null;
}

// 사용자
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'premium' | 'admin';
  createdAt: Date;
}

// ── 경제지표 ──

// Fear & Greed 지수
export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: string;
}

// 환율
export interface ExchangeRate {
  currency: string;    // USD, EUR, JPY, CNY
  rate: number;        // 원화 기준
  change: number;
  changePercent: number;
}

// 원자재
export interface CommodityPrice {
  name: string;        // WTI, Gold, Silver
  price: number;
  change: number;
  changePercent: number;
  unit: string;        // USD/bbl, USD/oz
}

// FRED/ECOS 지표
export interface FredIndicator {
  seriesId: string;
  name: string;
  value: number;
  date: string;
  unit: string;
}

// 경제지표 통합 데이터
export interface EconomyData {
  fearGreed: FearGreedData | null;
  exchangeRates: ExchangeRate[];
  commodities: CommodityPrice[];
  fredIndicators: FredIndicator[];
  ecosIndicators: FredIndicator[];
}
