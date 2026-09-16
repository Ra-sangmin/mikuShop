// lib/rakuten.ts
const applicationId = '0ce6d58d-6e1e-4218-896a-abf6ac69a11d';
const accessKey = 'pk_5ug4iHg98WLU0S76RBMdDOkVwnVwYpkJpMifIjpbLjG';
const affiliateId = '50fdea06.db679051.50fdea07.dd391918';
const originUrl = 'https://proteolytic-karon-nontemperately.ngrok-free.dev';

const rakutenCache = new Map<string, any>();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 🐛 라쿠텐 API 는 앱 ID 당 "1초에 1회" 제한인데(초과 시 429), 예전엔 간격이 500ms 였고
//    동시에 들어온 요청은 서로를 전혀 기다리지 않아(마지막 요청 시각을 응답 후에야 갱신)
//    카테고리를 빠르게 옮길 때마다 429 → 재시도 → 또 429 … 로 늘어지다 결국 실패했습니다.
//    → 모든 호출을 한 줄로 세우고(queue), 발사 시각 기준으로 1초 간격을 보장합니다.
const MIN_INTERVAL = 1050;
let lastRequestTime = 0;
let queue: Promise<unknown> = Promise.resolve();

/** 직전 발사 시각으로부터 MIN_INTERVAL 이 지날 때까지 기다린 뒤, 이번 발사 시각을 예약합니다. */
async function reserveSlot() {
  const waitTime = lastRequestTime + MIN_INTERVAL - Date.now();
  if (waitTime > 0) await delay(waitTime);
  lastRequestTime = Date.now();
}

/** 라쿠텐 호출을 순서대로 하나씩만 실행합니다. (앞 호출이 실패해도 줄은 계속 흐릅니다) */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/** 429 응답의 Retry-After(초)를 ms 로. 없거나 이상하면 기본 1초. */
function retryAfterMs(response: Response): number {
  const raw = Number(response.headers.get('retry-after'));
  return Number.isFinite(raw) && raw > 0 ? raw * 1000 : 1000;
}

export async function rakutenBaseAPIOn(
  //cacheKey: string,
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
  // if (rakutenCache.has(cacheKey)) {
  //   return rakutenCache.get(cacheKey).data;
  // }

  const API_URL = new URL(`https://openapi.rakuten.co.jp/${tailUrl}`);
  API_URL.searchParams.append('format', 'json');
  API_URL.searchParams.append('formatVersion', '2');
  API_URL.searchParams.append('applicationId', applicationId);
  API_URL.searchParams.append('accessKey', accessKey);
  API_URL.searchParams.append('affiliateId', affiliateId);
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
  
  return enqueue(async () => {
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
          const errorBody = await response.text();
          throw new Error(`API Error - Status: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        //rakutenCache.set(cacheKey, { data });

        return data;
      } catch (error) {
        if (attempt >= retries - 1) throw error;
        attempt++;
        await delay(attempt * 500);
      }
    }
    return { Items: [], children: [], parents: [] };
  });
}