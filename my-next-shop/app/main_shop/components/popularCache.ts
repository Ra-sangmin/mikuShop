import type { GlobalProduct } from './GlobalProductDetail';

// 🌟 "실시간 인기 상품" 클라이언트 캐시 (rakuten / mercari / yahoo_shopping / yahoo_auction 공용)
//
// 홈 화면을 떠났다가(카테고리·상세·다른 쇼핑몰·마이페이지 …) 다시 들어오면 페이지 컴포넌트가
// 다시 마운트되면서 인기 상품 API 를 매번 다시 불렀습니다. 메루카리·야후옥션은 크롤링이라
// 수십 초씩 걸리고, 라쿠텐은 1초 1회 제한이 있어 체감이 컸습니다.
// → 한 번 받은 목록을 브라우저 세션 저장소에 TTL 과 함께 보관하고, 살아 있으면 API 를 건너뜁니다.
//
// - sessionStorage: 같은 탭에서 새로고침·페이지 이동을 해도 유지되고, 탭을 닫으면 사라집니다.
//   ("실시간" 성격상 며칠 전 목록이 남는 localStorage 보다 이쪽이 맞습니다)
// - 메모리 맵은 같은 SPA 세션 안에서 JSON 파싱을 반복하지 않기 위한 빠른 길입니다.
// - 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 조용히 기존 동작(API 호출)으로 돌아갑니다.

const TTL_MS = 10 * 60 * 1000;

type Entry = { at: number; items: GlobalProduct[] };
const memory = new Map<string, Entry>();
const storageKey = (platform: string) => `miku:popular:${platform}`;

export function readPopularCache(platform: string): GlobalProduct[] | null {
  const now = Date.now();

  const inMemory = memory.get(platform);
  if (inMemory && now - inMemory.at < TTL_MS) return inMemory.items;

  try {
    const raw = sessionStorage.getItem(storageKey(platform));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    if (now - parsed.at >= TTL_MS) {
      sessionStorage.removeItem(storageKey(platform));
      return null;
    }
    memory.set(platform, parsed);
    return parsed.items;
  } catch {
    return null;
  }
}

export function writePopularCache(platform: string, items: GlobalProduct[]): void {
  if (!items || items.length === 0) return; // 빈 결과(일시적 실패)를 캐시하면 TTL 동안 계속 비어 보입니다
  const entry: Entry = { at: Date.now(), items };
  memory.set(platform, entry);
  try {
    sessionStorage.setItem(storageKey(platform), JSON.stringify(entry));
  } catch {
    // 용량 초과·비활성 저장소 — 메모리 캐시만으로도 같은 세션 안에서는 충분합니다
  }
}
