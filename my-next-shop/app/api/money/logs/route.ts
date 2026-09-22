// app/api/money/logs/route.ts
//
// 💰 마이페이지 "이용 내역"(/mypage/money/history) 목록을 내려주는 라우트입니다.
//
// ⚠️ 이 파일은 한동안 저장소에 올라가 있지 않았습니다.
//    저장소 루트 .gitignore 의 `logs` 한 줄이 (경로 어디에 있든) logs 라는 이름의 폴더를
//    전부 무시해서, app/api/money/logs/ 가 통째로 제외되고 있었습니다.
//    내 PC 에서는 동작하는데 운영에서는 404 → 화면이 통째로 비어 보였습니다.
//    루트 .gitignore 에서 `/logs/` 로 좁혀 두었으니, 폴더 이름을 logs 로 지을 때는
//    반드시 `git status` 에 잡히는지 확인하세요.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import type { Prisma, MoneyLogType } from '@prisma/client';

/** 한국 표준시(UTC+9) */
const KST = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/**
 * 'YYYY-MM-DD'(한국 달력 날짜) → 그날 한국시간 0시의 실제 시각.
 *
 * ⚠️ new Date('2026-09-23') 을 그냥 쓰면 UTC 0시(= 한국시간 오전 9시)가 됩니다.
 *    그러면 그날 새벽 0~9시 내역이 통째로 빠집니다. 서버 시간대(UTC)와도 무관하게
 *    항상 한국 달력 기준으로 자르기 위해 직접 계산합니다.
 */
function kstDayStart(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - KST);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 지금 이 순간이 속한 한국 달력 날짜의 0시 */
function kstTodayStart(now = new Date()): Date {
  const k = new Date(now.getTime() + KST);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST);
}

const MONEY_LOG_TYPES: MoneyLogType[] = ['CHARGE', 'USE', 'REFUND'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get('userId');
  const type = searchParams.get('type') || 'ALL';
  const period = searchParams.get('period') || 'all';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // 🔒 본인 또는 관리자만 조회할 수 있습니다.
  //    쿼리로 온 userId 를 그대로 믿으면 남의 결제 내역이 그대로 새어 나갑니다.
  const auth = await requireUser(requestedId, { allowAdmin: true });
  if (!auth.ok) return auth.response;
  // 관리자 세션은 대상 회원을 쿼리로 지정합니다. (회원 본인은 세션 ID 를 씁니다)
  if (!auth.userId) {
    return NextResponse.json({ success: false, error: '조회할 회원 ID가 필요합니다.' }, { status: 400 });
  }

  try {
    const where: Prisma.MoneyLogWhereInput = { userId: auth.userId };

    // 🏷️ 유형: 'ALL' 이면 거르지 않습니다.
    //    모르는 값이 오면 조용히 전체로 둡니다. (그대로 넘기면 Prisma 가 500 을 냅니다)
    if (MONEY_LOG_TYPES.includes(type as MoneyLogType)) {
      where.type = type as MoneyLogType;
    }

    // 📅 기간 — 모두 한국시간 기준입니다.
    const from = startDate ? kstDayStart(startDate) : null;
    const toDay = endDate ? kstDayStart(endDate) : null;

    if (from || toDay) {
      // 직접 선택. 한쪽만 골랐어도 그쪽만 적용합니다.
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        // ⚠️ 종료일은 "그날 끝까지" 포함해야 합니다. 종료일 0시를 그대로 상한으로 쓰면
        //    시작일 = 종료일 = 오늘로 뒀을 때 오늘 내역이 하나도 안 나옵니다.
        ...(toDay ? { lt: new Date(toDay.getTime() + DAY) } : {}),
      };
    } else if (period === '1week' || period === '1month') {
      const today = kstTodayStart();
      const k = new Date(today.getTime() + KST); // 오늘의 한국 달력 연·월·일
      const gte = period === '1week'
        // 오늘을 포함해 7일
        ? new Date(today.getTime() - 6 * DAY)
        // 한 달 전 같은 날 0시 (3/31 처럼 그 날짜가 없는 달이면 다음 달로 넘어갑니다)
        : new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() - 1, k.getUTCDate()) - KST);
      where.createdAt = { gte };
    }
    // period === 'all' 이거나 모르는 값이면 기간 조건 없이 전체를 봅니다.

    // 🌟 확정된 내역(MoneyLog)만 봅니다. 신청 중(MoneyRequest)은 여기 나오지 않습니다.
    //    화면이 자체적으로 페이지를 나누므로 전체를 내려보냅니다.
    const logs = await prisma.moneyLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('[머니 이용내역] 조회 실패:', error);
    return NextResponse.json({ success: false, error: '이용 내역을 불러오지 못했습니다.' }, { status: 500 });
  }
}
