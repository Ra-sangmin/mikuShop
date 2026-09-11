// 🚀 검색 결과/상품 상세 스크래핑 결과를 짧은 TTL로 캐싱하기 위한 범용 인메모리 캐시.
// 같은 검색어나 같은 상품을 다시 요청할 때 Puppeteer 스크래핑을 건너뛰고 즉시 응답할 수 있게 합니다.
// 인스턴스 하나의 서버 메모리에서만 동작하는 캐시라 별도 Redis 없이도 t3.small/medium에서
// 안전하게 쓸 수 있도록 항목 수 상한(maxEntries)을 함께 둡니다.
export function createTtlCache<T>(ttlMs: number, maxEntries: number) {
  const store = new Map<string, { value: T; timestamp: number }>();

  function prune() {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.timestamp > ttlMs) store.delete(key);
    }
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      if (oldestKey === undefined) break;
      store.delete(oldestKey);
    }
  }

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.timestamp > ttlMs) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T): void {
      prune();
      store.set(key, { value, timestamp: Date.now() });
    },
  };
}
