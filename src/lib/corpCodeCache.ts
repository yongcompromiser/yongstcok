// DART corpCode.xml 동적 다운로드 + 메모리 캐싱
// 서버 첫 요청 시 ZIP 다운로드 → XML 파싱 → stock_code → corp_code 매핑
// 캐시 유효기간: 24시간 (Vercel 서버리스 cold start 시 자동 갱신)

import AdmZip from 'adm-zip';

// stock_code(6자리) → corp_code(8자리) 매핑
let cache: Map<string, string> | null = null;
let cacheTime = 0;
let loading: Promise<void> | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cacheTime < CACHE_TTL;
}

async function loadCorpCodes(): Promise<void> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey || apiKey === 'your_dart_api_key') {
    throw new Error('DART_API_KEY가 설정되지 않았습니다.');
  }

  const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DART corpCode.xml 다운로드 실패: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const xmlEntry = entries.find(e => e.entryName.endsWith('.xml'));
  if (!xmlEntry) {
    throw new Error('corpCode.xml ZIP에 XML 파일이 없습니다.');
  }

  const xml = xmlEntry.getData().toString('utf-8');

  // XML 구조: <list><corp_code>00126380</corp_code><corp_name>삼성전자</corp_name><stock_code>005930</stock_code>...</list>
  // 정규식으로 파싱 (구조가 단순하므로 라이브러리 불필요)
  const newCache = new Map<string, string>();
  const listRegex = /<list>([\s\S]*?)<\/list>/g;
  let match;

  while ((match = listRegex.exec(xml)) !== null) {
    const block = match[1];
    const corpCode = block.match(/<corp_code>(\d+)<\/corp_code>/)?.[1];
    const stockCode = block.match(/<stock_code>(\d+)<\/stock_code>/)?.[1];

    // stock_code가 있는 상장기업만 (비상장은 stock_code가 빈 문자열)
    if (corpCode && stockCode && stockCode.trim().length > 0) {
      newCache.set(stockCode.trim(), corpCode.trim());
    }
  }

  if (newCache.size === 0) {
    throw new Error('corpCode.xml 파싱 결과가 비어있습니다.');
  }

  cache = newCache;
  cacheTime = Date.now();
  console.log(`[corpCodeCache] ${newCache.size}개 기업 코드 로드 완료`);
}

// 동적 조회 (캐시 없으면 로드)
export async function getCorpCodeDynamic(symbol: string): Promise<string | null> {
  if (!isCacheValid()) {
    // 동시 요청 시 중복 로드 방지
    if (!loading) {
      loading = loadCorpCodes()
        .catch(err => {
          console.error('[corpCodeCache] 로드 실패:', err);
        })
        .finally(() => {
          loading = null;
        });
    }
    await loading;
  }

  return cache?.get(symbol) ?? null;
}

// 동기 조회 (캐시가 있을 때만 - 빠른 경로)
export function getCorpCodeSync(symbol: string): string | null {
  if (!cache) return null;
  return cache.get(symbol) ?? null;
}
