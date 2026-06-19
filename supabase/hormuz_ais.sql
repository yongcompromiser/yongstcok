-- 호르무즈 실시간 AIS 자체 집계 스키마
-- Supabase 대시보드 SQL Editor에서 실행하세요.

-- 1. 일별 선박 관측 테이블 (date + mmsi 복합 PK로 하루 단위 중복 제거)
CREATE TABLE IF NOT EXISTS hormuz_ais_sightings (
  date       DATE   NOT NULL,
  mmsi       BIGINT NOT NULL,
  name       TEXT,
  category   TEXT   NOT NULL DEFAULT 'other',
  last_sog   REAL,
  last_lat   REAL,
  last_lon   REAL,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (date, mmsi)
);

CREATE INDEX IF NOT EXISTS idx_hormuz_sightings_date ON hormuz_ais_sightings(date);

-- 2. 수집 실행 로그 (0척이어도 "수집했다"는 사실을 기록)
CREATE TABLE IF NOT EXISTS hormuz_ais_runs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at        TIMESTAMPTZ DEFAULT NOW(),
  date          DATE NOT NULL,
  vessels_found INTEGER NOT NULL DEFAULT 0,
  window_sec    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_hormuz_runs_date ON hormuz_ais_runs(date);

-- 3. 일별 집계 뷰
CREATE OR REPLACE VIEW hormuz_ais_daily AS
SELECT
  date,
  COUNT(*)::int                                     AS n_total,
  COUNT(*) FILTER (WHERE category = 'tanker')::int    AS n_tanker,
  COUNT(*) FILTER (WHERE category = 'cargo')::int     AS n_cargo,
  COUNT(*) FILTER (WHERE category = 'passenger')::int AS n_passenger,
  COUNT(*) FILTER (WHERE category = 'fishing')::int   AS n_fishing,
  COUNT(*) FILTER (WHERE category = 'other')::int     AS n_other,
  MAX(last_seen)                                    AS updated_at
FROM hormuz_ais_sightings
GROUP BY date;

-- 4. RLS: 클라이언트 직접 접근 차단. 모든 접근은 서버(서비스 롤)에서만.
--    (서비스 롤은 RLS를 우회하므로 별도 정책 불필요)
ALTER TABLE hormuz_ais_sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hormuz_ais_runs ENABLE ROW LEVEL SECURITY;
