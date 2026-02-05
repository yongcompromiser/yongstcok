-- 주뇽좌의 주식생활 - Supabase 스키마
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 관심기업 테이블
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- 3. 포트폴리오 테이블
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- 4. 메모 테이블
CREATE TABLE IF NOT EXISTS memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 주식 캐시 테이블 (API 호출 최소화)
CREATE TABLE IF NOT EXISTS stock_cache (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT DEFAULT 'KR',
  sector TEXT,
  industry TEXT,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 재무제표 캐시 테이블
CREATE TABLE IF NOT EXISTS financial_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  period TEXT NOT NULL,
  period_type TEXT CHECK (period_type IN ('Q', 'Y')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, period)
);

-- 7. 증권사 리포트 테이블 (관리자용)
CREATE TABLE IF NOT EXISTS analyst_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  title TEXT NOT NULL,
  analyst TEXT,
  firm TEXT NOT NULL,
  target_price DECIMAL(15, 2),
  opinion TEXT CHECK (opinion IN ('매수', '중립', '매도', '보유')),
  report_date DATE NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 정책

-- profiles 테이블
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- watchlist 테이블
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- portfolio 테이블
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio"
  ON portfolio FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own portfolio"
  ON portfolio FOR ALL
  USING (auth.uid() = user_id);

-- memos 테이블
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memos"
  ON memos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own memos"
  ON memos FOR ALL
  USING (auth.uid() = user_id);

-- stock_cache, financial_cache는 공개 읽기
ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stock cache"
  ON stock_cache FOR SELECT
  TO authenticated, anon
  USING (true);

ALTER TABLE financial_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read financial cache"
  ON financial_cache FOR SELECT
  TO authenticated, anon
  USING (true);

-- analyst_reports는 관리자만 쓰기 가능
ALTER TABLE analyst_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analyst reports"
  ON analyst_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage analyst reports"
  ON analyst_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger: 새 사용자 가입 시 profiles 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at
  BEFORE UPDATE ON portfolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON memos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
