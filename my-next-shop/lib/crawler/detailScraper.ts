import * as cheerio from 'cheerio';
import { createPage } from './browserPool';

// 🚀 mercari/productDetail과 yahoo_auction/productDetail이 거의 동일하게 들고 있던
// "캐시 확인 → 페이지 이동 → 준비 대기 → HTML 파싱 → 캐시 저장" 뼈대를 하나로 합쳤습니다.
// 플랫폼마다 다른 부분(대기 조건, 필드 파싱)만 옵션으로 주입받습니다.

export type DetailReadiness =
  | { ok: true }
  | { ok: false; status?: number; error: string; extra?: Record<string, any> };

export interface DetailScraperOptions<TData> {
  itemId: string;
  targetUrl: string;
  /** 상품 상세 캐시 (플랫폼별로 별도 인스턴스를 넘겨주세요) */
  cache: { get(key: string): TData | undefined; set(key: string, value: TData): void };
  gotoTimeoutMs?: number;
  /** 핵심 요소가 렌더링될 때까지 대기하고, 삭제/캡챠 등 예외 상황을 판별합니다. */
  waitReady: (page: any) => Promise<DetailReadiness>;
  /** 렌더링된 HTML(cheerio)에서 실제 데이터를 뽑아냅니다. */
  parse: ($: cheerio.CheerioAPI, page: any) => TData;
  /** 정상적으로 파싱된 결과인지 판별합니다 (빈/깨진 결과는 캐싱하지 않기 위함, 기본: 항상 true) */
  isCacheable?: (data: TData) => boolean;
}

export type DetailScraperResult<TData> =
  | { success: true; data: TData }
  | { success: false; error: string; status?: number; extra?: Record<string, any> };

export async function fetchDetailWithCache<TData>(options: DetailScraperOptions<TData>): Promise<DetailScraperResult<TData>> {
  const cached = options.cache.get(options.itemId);
  if (cached) {
    console.log(`⚡ [CACHE HIT] 상품 상세 ${options.itemId} (스크래핑 생략)`);
    return { success: true, data: cached };
  }

  const page = await createPage();

  try {
    await page.goto(options.targetUrl, { waitUntil: 'domcontentloaded', timeout: options.gotoTimeoutMs ?? 20000 });

    const readiness = await options.waitReady(page);
    if (!readiness.ok) {
      await page.close().catch(() => {});
      return { success: false, error: readiness.error, status: readiness.status, extra: readiness.extra };
    }

    const html = await page.content();
    const $ = cheerio.load(html);
    const data = options.parse($, page);

    await page.close().catch(() => {});

    const cacheable = options.isCacheable ? options.isCacheable(data) : true;
    if (cacheable) {
      options.cache.set(options.itemId, data);
    }

    return { success: true, data };
  } catch (error: any) {
    await page.close().catch(() => {});
    return { success: false, error: error.message, status: 500 };
  }
}
