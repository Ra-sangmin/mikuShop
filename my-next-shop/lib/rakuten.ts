// lib/rakuten.ts
const applicationId = '0ce6d58d-6e1e-4218-896a-abf6ac69a11d';
const accessKey = 'pk_5ug4iHg98WLU0S76RBMdDOkVwnVwYpkJpMifIjpbLjG';
const affiliateId = '50fdea06.db679051.50fdea07.dd391918';
const originUrl = 'https://proteolytic-karon-nontemperately.ngrok-free.dev';

const rakutenCache = new Map<string, any>();
let lastRequestTime: number = 0;
const MIN_INTERVAL = 500;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_INTERVAL) {
    const waitTime = MIN_INTERVAL - timeSinceLastRequest;
    await delay(waitTime);
  }

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
  
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await fetch(API_URL.toString(), {
        method: 'GET',
        headers: { Origin: originUrl },
      });

      lastRequestTime = Date.now();

      if (!response.ok) {
        if (response.status === 429 && attempt < retries - 1) {
          attempt++;
          await delay(attempt * 1000);
          continue;
        }
        throw new Error(`API Error - Status: ${response.status}`);
      }

      const data = await response.json();
      //rakutenCache.set(cacheKey, { data });

      return data;
    } catch (error) {
      lastRequestTime = Date.now();
      break;
    }
  }
  return { Items: [], children: [], parents: [] };
}