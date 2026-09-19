// 🌟 미쿠짱 일본 창고(배송대행 입고지) 주소와 회원별 사서함 번호
// mypage/profile과 delivery/address가 같은 값을 쓰도록 한 곳에 모았습니다.

import { randomInt } from 'crypto';
import type { PrismaClient } from '@prisma/client';

export const JAPAN_WAREHOUSE_ADDRESS = {
  zipCode: '123-0865',
  prefecture: '東京都 (Tokyo)',
  city: '足立区 (Adachi-ku)',
  address1: '新田 3-35-32 309号',
  // ⚠️ 아직 실제 번호가 아닙니다. 창고 전화번호가 정해지면 여기를 고쳐 주세요.
  phone: '03-xxxx-xxxx',
};

/**
 * 한 줄로 이어 쓴 일본식 주소. (예: 〒123-0865 東京都足立区新田 3-35-32 309号)
 * 푸터처럼 칸을 나누지 않고 한 줄로 보여주는 곳이 씁니다.
 * 주소를 화면마다 따로 적어 두면 한쪽만 고쳐져 어긋납니다 — 실제로 그런 적이 있습니다.
 */
export function japanWarehouseOneLine(): string {
  const a = JAPAN_WAREHOUSE_ADDRESS;
  // 괄호 안의 로마자 표기는 한 줄 주소에서는 뺍니다. (東京都 (Tokyo) → 東京都)
  const jp = (v: string) => v.replace(/\s*\(.*\)\s*/, '').trim();
  return `〒${a.zipCode} ${jp(a.prefecture)}${jp(a.city)}${a.address1}`;
}

/* ------------------------------------------------------------------ 사서함 번호 */

export const MAILBOX_PREFIX = 'MK';

/**
 * 혼동하기 쉬운 문자를 뺀 알파벳. (lib/orderId.ts 와 같은 사고방식)
 *   숫자 0/1 과 영문 O/I/L 은 서로 헷갈립니다. 이 번호는 고객이 일본 쇼핑몰의
 *   주소칸에 손으로 옮겨 적는 값이라, 한 글자만 틀려도 소포가 다른 회원에게 갑니다.
 * 주문번호는 소문자를 쓰지만 사서함 번호는 일본 주소 양식에 섞여 들어가므로
 * 대문자로 둡니다. 눈에 띄고 필기 오류도 적습니다.
 */
const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
/** 난수 자리수. 31^5 = 약 2,860만 가지입니다. */
const RANDOM_LENGTH = 5;

/**
 * 사서함 번호 후보를 만듭니다. (예: MK-A3F9K)
 * DB 를 보지 않으므로 유일성은 보장하지 않습니다 — generateMailboxNumber 가 확인합니다.
 *
 * 일련번호(MK-00013)로 하지 않은 이유는 주문번호와 같습니다.
 * 번호만 보고 회원 수가 그대로 드러나기 때문입니다.
 */
export function generateMailboxCandidate(): string {
  let out = '';
  for (let i = 0; i < RANDOM_LENGTH; i++) out += SAFE_ALPHABET[randomInt(SAFE_ALPHABET.length)];
  return `${MAILBOX_PREFIX}-${out}`;
}

/**
 * 아직 쓰이지 않은 사서함 번호를 골라 돌려줍니다.
 *
 * users.japanMailboxNumber 에 unique 제약이 있어 최종 방어는 DB 가 하지만,
 * 가입 도중 오류로 보이지 않도록 여기서 미리 비어 있는 값을 찾습니다.
 */
export async function generateMailboxNumber(db: PrismaClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateMailboxCandidate();
    const used = await db.user.findUnique({
      where: { japanMailboxNumber: candidate },
      select: { id: true },
    });
    if (!used) return candidate;
  }
  // 10번 연속 겹칠 확률은 사실상 0입니다. 여기까지 왔다면 뭔가 잘못된 것이라 알립니다.
  throw new Error('사서함 번호를 만들지 못했습니다. (10회 연속 중복)');
}
