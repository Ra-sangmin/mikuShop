// 📦 사서함 번호가 없는 기존 회원에게 번호를 발급합니다.
//
// 사서함 번호(users.japan_mailbox_number)는 가입할 때 발급하도록 했지만,
// 그 이전에 가입한 회원은 값이 비어 있습니다. 번호가 없으면 일본 배송지 카드에
// "발급 준비 중"으로만 나오고 배송대행을 쓸 수 없습니다.
//
// 실행
//   npx tsx scripts/backfill-mailbox.ts --dry   발급하지 않고 대상만 보여줍니다
//   npx tsx scripts/backfill-mailbox.ts         실제로 발급합니다
//
// 이미 번호가 있는 회원은 건드리지 않습니다. 여러 번 실행해도 안전합니다.
// ⚠️ 한 번 발급된 번호는 바꾸지 마세요. 고객이 일본 쇼핑몰마다 등록해 둔 주소가 어긋납니다.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generateMailboxNumber } from '../lib/japanAddress';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry');

async function main() {
  const targets = await prisma.user.findMany({
    where: { japanMailboxNumber: null },
    select: { id: true, loginId: true, name: true },
    orderBy: { id: 'asc' },
  });

  const total = await prisma.user.count();
  console.log(`\n전체 ${total}명 / 번호 없는 회원 ${targets.length}명`);

  if (targets.length === 0) {
    console.log('발급할 대상이 없습니다.\n');
    return;
  }

  for (const user of targets) {
    // 후보를 만들 때마다 DB 를 확인하므로, 이 루프 안에서 서로 겹치지 않습니다.
    const number = await generateMailboxNumber(prisma);
    console.log(`  ${isDryRun ? '[dry]' : '[발급]'} #${user.id} ${user.name}(${user.loginId}) → ${number}`);
    if (!isDryRun) {
      await prisma.user.update({ where: { id: user.id }, data: { japanMailboxNumber: number } });
    }
  }

  console.log(isDryRun ? '\n--dry 라서 실제로 발급하지 않았습니다.\n' : '\n완료했습니다.\n');
}

main()
  .catch(e => { console.error('실패:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
