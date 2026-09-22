// 📦 배송대행 주문을 새 상태 "입고 대기중(WAITING)" 으로 옮기는 일회성 스크립트
//
//   예전에는 배송대행을 신청하면 "상품 결제 완료(PAID)" 로 저장하고 화면에서만 "입고 대기중" 으로 보여 줬습니다.
//   이제는 WAITING 상태로 따로 저장하므로, 아직 입고 전인 예전 배송대행 주문(type=DELIVERY, status=PAID)을 옮깁니다.
//   구매대행(PURCHASE) 주문은 건드리지 않습니다. 여러 번 실행해도 안전합니다.
//
// 실행 (먼저 스키마를 DB 에 반영해야 합니다)
//   npx prisma db push
//   npx tsx scripts/migrate-waiting-status.ts --dry     바꾸지 않고 대상만 보여줍니다
//   npx tsx scripts/migrate-waiting-status.ts           실제로 반영합니다
//
// ⚠️ 운영 서버에서 돌리기 전에 DB 를 백업하세요.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry');

async function main() {
  const targets = await prisma.order.findMany({
    where: { type: 'DELIVERY', status: 'PAID' },
    select: { orderId: true, productName: true },
  });
  console.log(`대상 배송대행 주문: ${targets.length}건`);
  targets.slice(0, 20).forEach(o => console.log(`  - ${o.orderId}  ${o.productName}`));
  if (targets.length > 20) console.log(`  … 외 ${targets.length - 20}건`);

  if (isDryRun || targets.length === 0) {
    console.log(isDryRun ? '(--dry: 바꾸지 않았습니다)' : '옮길 주문이 없습니다.');
    return;
  }
  const res = await prisma.order.updateMany({
    where: { type: 'DELIVERY', status: 'PAID' },
    data: { status: 'WAITING' as any },
  });
  console.log(`✅ ${res.count}건을 입고 대기중(WAITING)으로 옮겼습니다.`);
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
