// 💱 환율 자동 수집 — 서버 크론이 주기적으로 부릅니다.
//
// 예전에는 관리자가 /admin/estimate 에 접속해 "새로고침"을 눌러야만 환율이 갱신됐습니다.
// 아무도 접속하지 않으면 DB 의 current_exchange_rate 가 며칠 전 값에 머물러,
// 그 사이 견적·주문 금액이 옛 환율로 계산됐습니다.
//
// 설정 (서버 .env)
//   CRON_SECRET   크론만 호출할 수 있게 하는 공유 비밀값. 없으면 이 엔드포인트는 동작하지 않습니다.
//
// 호출 (서버 crontab, 10분마다)
//   */10 * * * * curl -fsS -H "x-cron-secret: <CRON_SECRET>" https://mikushop.co.kr/api/cron/exchange-rate
//
// 왜 관리자 세션이 아니라 비밀값인가
//   크론은 로그인할 수 없습니다. 그렇다고 인증 없이 열어두면 누구나 호출해 네이버를 두드릴 수 있어
//   공유 비밀값을 헤더로 받습니다.
import { NextResponse } from 'next/server';
import { refreshExchangeRate } from '@/lib/exchangeRate';

// 🌟 이 라우트는 매번 실제로 네이버를 조회해야 하므로 정적 최적화 대상에서 뺍니다.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // 설정을 안 해두면 조용히 도는 대신 분명히 실패시킵니다. 크론 로그에 남아야 알아차립니다.
    console.error('[환율크론] CRON_SECRET 이 설정되지 않아 거절합니다.');
    return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 503 });
  }

  // 헤더가 기본, 쿼리스트링은 헤더를 못 붙이는 도구를 위한 차선책입니다.
  const provided =
    request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret');

  if (provided !== secret) {
    console.warn('[환율크론] 비밀값이 맞지 않아 거절했습니다.');
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
  }

  try {
    const rate = await refreshExchangeRate();
    // 크론 로그에서 "언제 얼마로 갱신됐는지" 바로 보이게 남깁니다.
    console.log(`[환율크론] 갱신 완료 — 1엔 = ${rate}원 (100엔 = ${(rate * 100).toFixed(2)}원)`);
    return NextResponse.json({ success: true, rate, updatedAt: new Date().toISOString() });
  } catch (error) {
    // 🌟 여기서는 임시값(9.05)으로 덮어쓰지 않습니다.
    //    자동 수집이 실패했다고 DB 의 멀쩡한 환율을 가짜 값으로 바꾸면 피해가 더 큽니다.
    //    직전에 저장된 환율을 그대로 두고, 다음 주기에 다시 시도합니다.
    console.error('[환율크론] 갱신 실패 — 기존 환율을 유지합니다:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 502 },
    );
  }
}
