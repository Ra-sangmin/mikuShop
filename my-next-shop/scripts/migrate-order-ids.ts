// 🧾 기존 주문번호를 짧은 형식으로 바꾸는 일회성 스크립트
//
//   이전  ORD-1789697428893-116 (21자) / B1789116323320
//   이후  M260918-a3f9 (12자)          / MB260918-a3f9 (13자)
//
// 규칙
//  - 번호는 주문일(한국 시간) + 난수 4자리입니다. lib/orderId.ts 와 같은 규칙을 그대로 씁니다.
//  - 묶음번호는 그 묶음에서 가장 먼저 등록된 주문의 날짜를 기준으로 붙입니다.
//  - 이미 새 형식인 주문은 건드리지 않습니다. (여러 번 실행해도 안전합니다)
//  - notification_logs.order_id 도 함께 바꿔 발송 이력이 끊기지 않게 합니다.
//
// 실행
//   npx tsx scripts/migrate-order-ids.ts --dry     바꾸지 않고 결과만 보여줍니다
//   npx tsx scripts/migrate-order-ids.ts           실제로 반영합니다
//
// ⚠️ 운영 서버에서 돌리기 전에 반드시 DB 를 백업하세요. 주문번호는 고객·메일에 이미 나간 값입니다.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  generateOrderId,
  generateBundleIdCandidate,
  isValidOrderId,
  isValidBundleId,
} from '../lib/orderId';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry');

/** 이미 쓰인 값과 겹치지 않는 번호를 뽑습니다. */
function pickUnused(make: () => string, used: Set<string>): string {
  for (let i = 0; i < 100; i++) {
    const candidate = make();
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  throw new Error('번호가 계속 겹칩니다. 난수 자리수를 늘려야 합니다.');
}

async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, orderId: true, bundleId: true, registeredAt: true },
    orderBy: [{ registeredAt: 'asc' }, { id: 'asc' }],
  });
  console.log(`주문 ${orders.length}건을 확인합니다.${isDryRun ? ' (미리보기)' : ''}`);

  // 1) 이미 쓰고 있는 번호는 다시 쓰지 않도록 모아 둡니다.
  const usedOrderIds = new Set(orders.filter(o => isValidOrderId(o.orderId)).map(o => o.orderId));
  const usedBundleIds = new Set(
    orders.map(o => o.bundleId).filter((b): b is string => !!b && isValidBundleId(b)),
  );

  // 2) 주문번호: 주문일 + 난수
  const orderIdMap = new Map<string, string>(); // 옛 번호 → 새 번호
  for (const order of orders) {
    if (isValidOrderId(order.orderId)) continue; // 이미 새 형식
    orderIdMap.set(order.orderId, pickUnused(() => generateOrderId(order.registeredAt), usedOrderIds));
  }

  // 3) 묶음번호: 묶음마다 가장 먼저 등록된 주문의 날짜로
  const bundleFirstDate = new Map<string, Date>();
  for (const order of orders) {
    if (!order.bundleId || isValidBundleId(order.bundleId)) continue;
    const seen = bundleFirstDate.get(order.bundleId);
    if (!seen || order.registeredAt < seen) bundleFirstDate.set(order.bundleId, order.registeredAt);
  }
  const bundleIdMap = new Map<string, string>();
  const bundlesInOrder = [...bundleFirstDate.entries()].sort((a, b) => a[1].getTime() - b[1].getTime());
  for (const [oldBundleId, firstDate] of bundlesInOrder) {
    bundleIdMap.set(oldBundleId, pickUnused(() => generateBundleIdCandidate(firstDate), usedBundleIds));
  }

  console.log(`  바꿀 주문번호 ${orderIdMap.size}건, 묶음번호 ${bundleIdMap.size}개`);
  if (orderIdMap.size === 0 && bundleIdMap.size === 0) {
    console.log('바꿀 것이 없습니다.');
    return;
  }

  // 미리보기 (앞의 몇 건만)
  [...orderIdMap.entries()].slice(0, 10).forEach(([from, to]) => console.log(`    ${from}  →  ${to}`));
  if (orderIdMap.size > 10) console.log(`    … 외 ${orderIdMap.size - 10}건`);
  [...bundleIdMap.entries()].slice(0, 5).forEach(([from, to]) => console.log(`    ${from}  →  ${to}`));

  if (isDryRun) {
    console.log('미리보기라 DB 는 바꾸지 않았습니다.');
    return;
  }

  // 4) 한 트랜잭션 안에서 반영합니다. 중간에 실패하면 전부 되돌아갑니다.
  await prisma.$transaction(
    async tx => {
      // 옛 번호와 새 번호가 맞물릴 수 있어(A→B, B→C) 임시 값으로 한 번 피했다가 새 번호를 넣습니다.
      for (const [oldId] of orderIdMap) {
        await tx.order.update({
          where: { orderId: oldId },
          data: { orderId: `TMP-${oldId}`.slice(0, 190) },
        });
      }
      for (const [oldId, newId] of orderIdMap) {
        await tx.order.update({
          where: { orderId: `TMP-${oldId}`.slice(0, 190) },
          data: { orderId: newId },
        });
        await tx.notificationLog.updateMany({ where: { orderId: oldId }, data: { orderId: newId } });
      }
      for (const [oldBundleId, newBundleId] of bundleIdMap) {
        await tx.order.updateMany({ where: { bundleId: oldBundleId }, data: { bundleId: newBundleId } });
      }
    },
    { timeout: 120_000 },
  );

  console.log('반영 완료.');
}

main()
  .catch(e => {
    console.error('실패:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
