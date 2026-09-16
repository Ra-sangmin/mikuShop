// 🔒 간단한 메모리 기반 레이트리밋.
//
// 무차별 대입(관리자 로그인)과 비밀번호 재설정 남용을 막기 위한 최소 방어선입니다.
// 프로세스 메모리에 저장하므로 서버를 여러 대로 늘리거나 재시작하면 기록이 초기화됩니다.
// 인스턴스가 늘어나면 Redis 등 공유 저장소 기반으로 교체해야 합니다.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// 오래된 항목이 계속 쌓이지 않도록 가끔 정리합니다.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * @param key    제한 단위 (예: `login:${ip}`)
 * @param limit  windowMs 동안 허용할 횟수
 * @param windowMs 창 길이(ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds };
}

/** 성공했을 때 해당 키의 실패 누적을 초기화합니다. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** 프록시 뒤에서도 최대한 실제 클라이언트 IP를 얻습니다. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
