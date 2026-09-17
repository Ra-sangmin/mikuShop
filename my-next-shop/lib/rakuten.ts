// lib/rakuten.ts
// 🔒 자격증명은 .env 에서 읽습니다 (예전엔 여기 하드코딩되어 공개 저장소에 노출됐었습니다).
//    RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_AFFILIATE_ID / RAKUTEN_ORIGIN
//    - RAKUTEN_ORIGIN: 라쿠텐 앱의 Allowed websites 에 등록한 도메인 (예: https://mikushop.co.kr).
//      라쿠텐은 요청의 Origin 헤더를 이 등록값과 대조하므로, 로컬·서버 모두 같은 값을 씁니다.
//    빌드 시점이 아니라 호출 시점에 읽어서, 값이 없으면 어떤 변수가 빠졌는지 바로 알 수 있게 합니다.
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[rakuten] 환경변수 ${name} 이(가) 설정되지 않았습니다. .env 를 확인하세요.`);
  return value;
}
function credentials() {
  return {
    applicationId: requireEnv('RAKUTEN_APPLICATION_ID'),
    accessKey: requireEnv('RAKUTEN_ACCESS_KEY'),
    affiliateId: requireEnv('RAKUTEN_AFFILIATE_ID'),
    originUrl: requireEnv('RAKUTEN_ORIGIN').replace(/\/+$/, ''),
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 🐛 라쿠텐 API 는 앱 ID 당 "1초에 1회" 제한인데(초과 시 429), 예전엔 간격이 500ms 였고
//    동시에 들어온 요청은 서로를 전혀 기다리지 않아(마지막 요청 시각을 응답 후에야 갱신)
//    카테고리를 빠르게 옮길 때마다 429 → 재시도 → 또 429 … 로 늘어지다 결국 실패했습니다.
//    → 모든 호출을 한 줄로 세우고(queue), 발사 시각 기준으로 1초 간격을 보장합니다.
const MIN_INTERVAL = 1050;
let lastRequestTime = 0;

// 🌟 우선순위 레인
//   high: 사용자가 기다리는 호출 (상품 검색, 처음 방문한 장르의 자식 목록)
//   low : 백그라운드 갱신 (오래된 장르 트리 재동기화, 관리자 전체 적재)
//   1초에 1건이라는 한도를 상품 검색과 장르 갱신이 같이 쓰므로, low 는 high 가 비어 있을 때만 발사됩니다.
//   안 그러면 백그라운드 갱신 1건마다 사용자 상품 로딩이 1초씩 밀립니다.
export type RakutenPriority = 'high' | 'low';
type Job = () => Promise<void>;
const lanes: Record<RakutenPriority, Job[]> = { high: [], low: [] };
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (lanes.high.length || lanes.low.length) {
      const job = lanes.high.shift() ?? lanes.low.shift()!;
      await job(); // job 은 내부에서 resolve/reject 를 처리하므로 여기서 던지지 않습니다
    }
  } finally {
    draining = false;
  }
}

/** 큐에 쌓인 건수 (진단·테스트용) */
export function rakutenQueueSize(): { high: number; low: number } {
  return { high: lanes.high.length, low: lanes.low.length };
}

/** 직전 발사 시각으로부터 MIN_INTERVAL 이 지날 때까지 기다린 뒤, 이번 발사 시각을 예약합니다. */
async function reserveSlot() {
  const waitTime = lastRequestTime + MIN_INTERVAL - Date.now();
  if (waitTime > 0) await delay(waitTime);
  lastRequestTime = Date.now();
}

/** 라쿠텐 호출을 순서대로 하나씩만 실행합니다. (앞 호출이 실패해도 줄은 계속 흐릅니다) */
function enqueue<T>(task: () => Promise<T>, priority: RakutenPriority = 'high'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    lanes[priority].push(() => task().then(resolve, reject));
    void drain();
  });
}

/** 429 응답의 Retry-After(초)를 ms 로. 없거나 이상하면 기본 1초. */
function retryAfterMs(response: Response): number {
  const raw = Number(response.headers.get('retry-after'));
  return Number.isFinite(raw) && raw > 0 ? raw * 1000 : 1000;
}

/** 라쿠텐이 4xx/5xx 로 답했을 때. 본문의 error / error_description 을 풀어 둡니다. */
export class RakutenApiError extends Error {
  status: number;
  code?: string;
  description?: string;
  constructor(status: number, body: string) {
    let code: string | undefined;
    let description: string | undefined;
    try {
      const j = JSON.parse(body);
      code = j.error ?? j.errors?.errorCode?.toString();
      description = j.error_description ?? j.errors?.errorMessage;
    } catch { /* 본문이 JSON 이 아니면 원문만 남깁니다 */ }
    super(`API Error - Status: ${status} ${description ?? body}`);
    this.name = 'RakutenApiError';
    this.status = status;
    this.code = code;
    this.description = description;
  }
}

/** 실제 HTTP 호출 (재시도 포함). 반드시 enqueue 안에서 실행됩니다. */
async function performRequest(API_URL: URL, retries: number): Promise<any> {
  const { originUrl } = credentials();
  let attempt = 0;
  while (attempt < retries) {
    await reserveSlot();
    try {
      const response = await fetch(API_URL.toString(), {
        method: 'GET',
        headers: { Origin: originUrl },
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries - 1) {
          // 라쿠텐이 알려준 만큼 쉬고 다시 줄을 섭니다. (reserveSlot 이 1초 간격도 함께 보장)
          attempt++;
          await delay(retryAfterMs(response));
          continue;
        }
        throw new RakutenApiError(response.status, await response.text());
      }

      return await response.json();
    } catch (error) {
      // 잘못된 파라미터(없는 장르 등)는 다시 보내도 같은 답이므로 재시도하지 않습니다.
      if (error instanceof RakutenApiError && error.status === 400) throw error;
      if (attempt >= retries - 1) throw error;
      attempt++;
      await delay(attempt * 500);
    }
  }
  return { Items: [], children: [], parents: [] };
}

/** 공통 쿼리(포맷·자격증명)가 붙은 URL 을 만듭니다. */
function buildUrl(tailUrl: string): URL {
  const API_URL = new URL(`https://openapi.rakuten.co.jp/${tailUrl}`);
  const { applicationId, accessKey, affiliateId } = credentials();
  API_URL.searchParams.append('format', 'json');
  API_URL.searchParams.append('formatVersion', '2');
  API_URL.searchParams.append('applicationId', applicationId);
  API_URL.searchParams.append('accessKey', accessKey);
  API_URL.searchParams.append('affiliateId', affiliateId);
  return API_URL;
}

/**
 * 🌟 장르(카테고리) 조회 전용.
 * 새 API(20260701) 는 한 호출로 ancestors / genre / siblings / children 을 모두 돌려줍니다.
 * (예전 버전 20170711 등은 새 호스트에서 "API Configuration not found" 로 죽어 있습니다)
 * 상품 검색용 파라미터(sort·page)는 붙이지 않습니다.
 */
export const RAKUTEN_GENRE_API = 'ichibagt/api/IchibaGenre/Search/20260701';
export async function rakutenGenreAPI(genreId: number | string, priority: RakutenPriority = 'high', retries = 3): Promise<any> {
  const API_URL = buildUrl(RAKUTEN_GENRE_API);
  API_URL.searchParams.append('genreId', String(genreId));
  return enqueue(() => performRequest(API_URL, retries), priority);
}

export async function rakutenBaseAPIOn(
  tailUrl: string,
  genreId: string,
  page: string = '1',
  sort: string = 'standard',
  keyword?: string | null,
  NGKeyword?: string | null,
  minPrice?: string | null,
  maxPrice?: string | null,

  retries: number = 3,

): Promise<any> {
  const API_URL = buildUrl(tailUrl);
  API_URL.searchParams.append('genreId', genreId.toString());
  API_URL.searchParams.append('sort', sort);
  API_URL.searchParams.append('page', page.toString());

  if(keyword){
      API_URL.searchParams.append('keyword', keyword);
  }

  if(NGKeyword){
      API_URL.searchParams.append('NGKeyword', NGKeyword);
  }

  if(minPrice){
      API_URL.searchParams.append('minPrice', minPrice.toString());
  }

  if(maxPrice){
      API_URL.searchParams.append('maxPrice', maxPrice.toString());
  }

  // 사용자가 기다리는 호출이므로 항상 high 레인입니다.
  return enqueue(() => performRequest(API_URL, retries), 'high');
}
