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

// 사용자
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'premium' | 'admin';
  createdAt: Date;
}
