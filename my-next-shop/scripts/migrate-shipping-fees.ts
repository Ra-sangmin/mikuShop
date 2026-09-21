// 📦 orders 에 흩어져 있던 배송비 요청 단계의 금액을 order_shipping_fees 로 옮깁니다.
//
// 예전에는 이 금액들이 orders 컬럼에 있었는데, domestic_shipping_fee 하나가
//   · 구매 요청 단계의 "일본내 배송료(¥)"   — 구매 폼에서 받아 주문 생성 때 기록
//   · 배송비 요청 단계의 "현지 배송비(₩)"   — 관리자가 입력하며 위 값을 덮어씀
// 두 가지로 쓰이면서 통화도 의미도 섞여 있었습니다. 그래서 배송비 요청 단계의 금액만
// 별도 테이블로 떼어냈고, orders.domestic_shipping_fee 는 구매 요청 단계 전용으로 남깁니다.
//
// 실행 (운영 서버 배포 순서)
//   1) 스키마에 OrderShippingFee 모델만 추가한 상태로  npx prisma db push   ← 테이블 생성
//   2) npx tsx scripts/migrate-shipping-fees.ts --dry   ← 무엇이 옮겨지는지 확인
//      npx tsx scripts/migrate-shipping-fees.ts         ← 실제로 옮김
//   3) 스키마에서 옛 컬럼 5개를 지우고  npx prisma db push  ← 컬럼 삭제
//
// order_id 기준 upsert 라 여러 번 돌려도 결과가 같습니다.
//
// ⚠️ 2단계를 건너뛰고 3단계로 가면 금액이 사라집니다. 반드시 --dry 로 먼저 확인하세요.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry');

// 배송비 요청을 이미 거친 주문. 이 상태부터는 domestic_shipping_fee 가
// "관리자가 입력한 현지 배송비 청구액(₩)" 입니다. 그 전 단계면 일본내 배송료(¥)라 옮기면 안 됩니다.
const AFTER_PAYMENT_REQ = ['PAYMENT_REQ', 'PAYMENT_DONE', 'SHIPPING', 'DELIVERED', 'COMPLETED'];

type LegacyRow = {
  order_id: string;
  user_id: number;
  status: string;
  intl_jpy: number | null;
  intl_krw: number | null;
  dom_jpy: number | null;
  dom_krw: number | null;
  extra_krw: number | null;
  rate: number | null;
};

async function main() {
  // 옛 컬럼은 스키마에서 이미 지웠으므로 Prisma 모델로는 읽을 수 없습니다. 생 SQL 로 읽습니다.
  const rows = await prisma.$queryRawUnsafe<LegacyRow[]>(`
    SELECT order_id, user_id, status,
           intl_shipping_fee_jpy AS intl_jpy,
           second_payment_amount AS intl_krw,
           domestic_fee_jpy      AS dom_jpy,
           domestic_shipping_fee AS dom_krw,
           extra_payment_fee     AS extra_krw,
           applied_exchange_rate AS rate
    FROM orders
    WHERE second_payment_amount <> 0 OR extra_payment_fee <> 0
       OR intl_shipping_fee_jpy <> 0 OR domestic_fee_jpy <> 0
    ORDER BY order_id
  `);

  console.log(`대상 주문 ${rows.length}건${isDryRun ? ' (실행하지 않습니다)' : ''}\n`);

  for (const r of rows) {
    const movesDomestic = AFTER_PAYMENT_REQ.includes(r.status);
    const data = {
      userId: Number(r.user_id),
      intlFeeJpy: Number(r.intl_jpy) || 0,
      intlFeeKrw: Number(r.intl_krw) || 0,
      domesticFeeJpy: Number(r.dom_jpy) || 0,
      domesticFeeKrw: movesDomestic ? Number(r.dom_krw) || 0 : 0,
      extraFeeKrw: Number(r.extra_krw) || 0,
      appliedExchangeRate: Number(r.rate) || 0,
    };

    console.log(`  ${r.order_id} (${r.status})`, JSON.stringify(data));
    if (!movesDomestic && Number(r.dom_krw)) {
      console.log(`      ↳ domestic_shipping_fee ${r.dom_krw} 은 일본내 배송료(¥)라 옮기지 않습니다`);
    }
    if (isDryRun) continue;

    await prisma.orderShippingFee.upsert({
      where: { orderId_round: { orderId: r.order_id, round: 1 } },
      create: { orderId: r.order_id, round: 1, ...data },
      update: data,
    });

    // 옮긴 값은 orders 쪽에서 비웁니다. 그대로 두면 이 컬럼을 "일본내 배송료(¥)"로 읽는
    // 마이페이지 합계(장바구니·전체내역 탭)가 원화 금액을 엔화로 더해 버립니다.
    if (movesDomestic && Number(r.dom_krw)) {
      await prisma.$executeRawUnsafe(
        'UPDATE orders SET domestic_shipping_fee = 0 WHERE order_id = ?',
        r.order_id,
      );
      console.log(`      ↳ orders.domestic_shipping_fee 를 0 으로 비웠습니다 (값은 domestic_fee_krw 에 보존)`);
    }
  }

  if (!isDryRun) {
    const total = await prisma.orderShippingFee.count();
    console.log(`\n완료. order_shipping_fees 총 ${total}행`);
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
