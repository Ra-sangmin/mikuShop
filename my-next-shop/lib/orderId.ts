// 🧾 주문번호·묶음번호 만들기
//
// 형식
//   주문번호  M260918-a3f9   (M + 주문일 YYMMDD + 난수 4자리, 12자)
//   묶음번호  MB260918-a3f9  (합포장 묶음, 13자)
//
// 왜 난수인가
//  - 예전엔 `ORD-${Date.now()}-${난수}` 라 21자였습니다. 고객에게 읽어 주기도, 표에 넣기도 길었습니다.
//  - 그다음엔 그날의 일련번호(0001, 0002…)를 썼는데, 번호만 보면 하루 주문량이 그대로 드러납니다.
//    난수로 바꾸면 주문량이 보이지 않고 하루 상한(9,999건)도 사라집니다.
//  - 대신 아주 드물게 번호가 겹칠 수 있습니다. DB 의 unique 제약이 막고, 부르는 쪽에서 다시 채번합니다.
//    하루 1,000건 기준으로 이틀에 한 번 정도 재채번이 일어나는 수준입니다.
//
// 왜 nanoid·dayjs 를 쓰지 않았나
//  - 이 저장소에 두 패키지가 직접 의존성으로 들어와 있지 않습니다. nanoid 는 다른 패키지가 끌고 온 것이라
//    그것에 기대면 그 패키지가 빠질 때 같이 깨집니다. Node 기본 모듈만으로 같은 일을 합니다.

import { randomInt } from 'crypto';
import type { PrismaClient } from '@prisma/client';

export const ORDER_PREFIX = 'M';
export const BUNDLE_PREFIX = 'MB';

/**
 * 혼동하기 쉬운 문자를 뺀 알파벳.
 *   숫자 0/1 과 영문 o/l/i 는 서로 헷갈려 고객이 번호를 잘못 읽습니다.
 *   남은 31자로 4자리면 하루 923,521 가지입니다.
 */
const SAFE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
/** 난수 자리수. 하루 주문이 1만 건에 가까워지면 5로 올립니다. */
const RANDOM_LENGTH = 4;

/** 한국 시간 기준 YYMMDD. 서버가 UTC 여도 고객이 아는 날짜와 어긋나지 않게 합니다. */
export function orderDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

/** 안전 알파벳에서 고른 난수 문자열 (crypto 기반이라 예측하기 어렵습니다) */
function randomSuffix(): string {
  let out = '';
  for (let i = 0; i < RANDOM_LENGTH; i++) out += SAFE_ALPHABET[randomInt(SAFE_ALPHABET.length)];
  return out;
}

/**
 * 주문번호를 만듭니다. DB 를 보지 않으므로 유일성은 보장하지 않습니다.
 * 유일성은 orders.order_id 의 unique 제약과, 부르는 쪽의 재시도가 함께 책임집니다.
 */
export function generateOrderId(date: Date = new Date()): string {
  return `${ORDER_PREFIX}${orderDateKey(date)}-${randomSuffix()}`;
}

/** 묶음번호 후보 (유일성 확인은 generateBundleId 가 합니다) */
export function generateBundleIdCandidate(date: Date = new Date()): string {
  return `${BUNDLE_PREFIX}${orderDateKey(date)}-${randomSuffix()}`;
}

/**
 * 쓰이지 않은 묶음번호를 골라 돌려줍니다.
 *
 * 묶음번호에는 unique 제약이 없습니다(여러 주문이 같은 값을 나눠 가지므로).
 * 그래서 여기서 직접 확인해야 합니다. 겹치면 서로 관계없는 주문이 한 묶음으로 보입니다.
 */
export async function generateBundleId(db: PrismaClient, date: Date = new Date()): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateBundleIdCandidate(date);
    const used = await db.order.findFirst({ where: { bundleId: candidate }, select: { id: true } });
    if (!used) return candidate;
  }
  throw new Error('묶음번호를 만들지 못했습니다. 난수 자리수를 늘려야 할 수 있습니다.');
}

function matchesFormat(value: string, prefix: string): boolean {
  return new RegExp(`^${prefix}[0-9]{6}-[${SAFE_ALPHABET}]{${RANDOM_LENGTH}}$`).test(value);
}

/** 주문번호 형식이 맞는지 (URL 등 바깥에서 받은 값을 조회 조건으로 쓰기 전에) */
export function isValidOrderId(value: string): boolean {
  // 묶음번호(MB…)가 주문번호로 오인되지 않게 먼저 걸러냅니다.
  return !value.startsWith(BUNDLE_PREFIX) && matchesFormat(value, ORDER_PREFIX);
}

/** 묶음번호 형식이 맞는지 */
export function isValidBundleId(value: string): boolean {
  return matchesFormat(value, BUNDLE_PREFIX);
}

/** 주문번호가 이미 있다는 오류인지 (동시에 같은 번호를 집었을 때) */
export function isDuplicateOrderId(e: unknown): boolean {
  return (e as { code?: string })?.code === 'P2002';
}
