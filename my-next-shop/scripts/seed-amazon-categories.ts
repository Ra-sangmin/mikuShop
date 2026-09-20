// 🛒 아마존 재팬 카테고리 트리를 DB 에 채웁니다.
//
// 실행
//   npx tsx scripts/seed-amazon-categories.ts --dry          쓰지 않고 계획만 보여줍니다 (크레딧 0)
//   npx tsx scripts/seed-amazon-categories.ts --depth=2      최상위 + 2단계 (기본값)
//   npx tsx scripts/seed-amazon-categories.ts --depth=3      3단계까지
//   npx tsx scripts/seed-amazon-categories.ts --budget=40    크레딧을 이 개수까지만 씁니다
//
// ⚠️ 크레딧을 씁니다. **부모 노드 하나를 펼칠 때마다 1건**입니다.
//    최상위 12개를 펼치면 12건, 거기서 나온 2단계를 다 펼치면 100건 가까이 듭니다.
//    그래서 --budget 으로 상한을 두고, 넘으면 거기서 멈춥니다. 다시 실행하면
//    이미 펼친 곳은 건너뛰고 이어서 진행합니다. (여러 번 나눠 돌려도 됩니다)
//
// 왜 최상위를 손으로 적나
//   아마존 페이지에서 부문 목록을 긁어봤더니 "Amazonで売る", "採用情報" 같은 비카테고리와
//   Kindle·Audible 같은 배송 불가 상품이 섞여 나옵니다. 어차피 "구매대행으로 보낼 수 있는
//   것만" 고르는 건 사업 판단이라, 한 번 정해서 여기 적어 둡니다.
//
// 이름은 Translation 표에 넣습니다. 다른 플랫폼과 같은 방식이라 한국어 번역이 따라옵니다.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { fetchChildCategories, fetchCredits, RainforestError } from '../lib/rainforest';
import { resolveCategoryNames } from '../lib/categoryTranslation';
import { blockedCategoryIdStrings } from '../lib/blockedCategories';

const prisma = new PrismaClient();

/** 취급할 최상위 부문. 의약품·콘택트렌즈(ドラッグストア)는 수입 제한이라 뺐습니다. */
const ROOTS: { id: string; nameJa: string }[] = [
  { id: '2229202051', nameJa: 'ファッション' },
  { id: '2016926051', nameJa: 'シューズ＆バッグ' },
  { id: '52374051', nameJa: 'ビューティー' },
  { id: '3828871', nameJa: 'ホーム＆キッチン' },
  { id: '13299531', nameJa: 'おもちゃ＆ホビー' },
  { id: '57239051', nameJa: '食品＆飲料' },
  { id: '2127209051', nameJa: 'パソコン・周辺機器' },
  { id: '2188968051', nameJa: 'スポーツ＆アウトドア' },
  { id: '2127212051', nameJa: 'ペット用品' },
  { id: '344845011', nameJa: 'ベビー＆マタニティ' },
  { id: '2016929051', nameJa: 'DIY・工具' },
  { id: '2017304051', nameJa: '車＆バイク' },
];

const argOf = (name: string, fallback: number) => {
  const raw = process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const isDryRun = process.argv.includes('--dry');
const maxDepth = argOf('depth', 2);
const budget = argOf('budget', 1000);
const blocked = blockedCategoryIdStrings('amazon');

let creditsSpent = 0;

/** 카테고리 한 줄을 넣거나 갱신합니다. 이름은 Translation 을 가리킵니다. */
async function upsert(node: { id: string; nameJa: string }, parentId: string, level: number) {
  const names = await resolveCategoryNames([node.nameJa], undefined, { ensureRow: true });
  const translationId = names.get(node.nameJa)?.translationId ?? null;

  await prisma.amazonCategory.upsert({
    where: { genreId: node.id },
    create: { genreId: node.id, translationId, genreLevel: level, parentId, isActive: true },
    update: { translationId, genreLevel: level, parentId, isActive: true },
  });
}

/**
 * 한 노드의 자식을 받아 저장하고, 자식 목록을 돌려줍니다.
 * 이미 자식이 DB 에 있으면 크레딧을 쓰지 않고 그대로 씁니다. (다시 실행해도 안전)
 */
async function expand(node: { id: string; nameJa: string }, level: number) {
  const already = await prisma.amazonCategory.findMany({
    where: { parentId: node.id },
    select: { genreId: true, translation: { select: { jp: true } } },
  });
  if (already.length > 0) {
    console.log(`  · ${node.nameJa} — 이미 자식 ${already.length}개 (건너뜀)`);
    return already.map(r => ({ id: r.genreId, nameJa: r.translation?.jp ?? r.genreId }));
  }

  if (creditsSpent >= budget) return null; // 예산 소진
  if (isDryRun) {
    console.log(`  · ${node.nameJa} — 펼칠 예정 (1건)`);
    creditsSpent++;
    return [];
  }

  let children;
  try {
    const res = await fetchChildCategories(node.id);
    children = res.children;
    creditsSpent++;
    const left = res.creditsRemaining;
    console.log(`  · ${node.nameJa} — 자식 ${children.length}개${left !== null ? ` (남은 크레딧 ${left})` : ''}`);
  } catch (e) {
    // 한 부문이 실패해도 나머지는 계속합니다. 다시 실행하면 이어서 시도합니다.
    console.warn(`  ! ${node.nameJa} — 실패: ${(e as Error).message}`);
    creditsSpent++; // 실패해도 크레딧이 빠질 수 있어 세어 둡니다
    return [];
  }

  const kept = children.filter(c => !blocked.has(c.id));
  if (kept.length !== children.length) {
    console.log(`    (차단 카테고리 ${children.length - kept.length}개 제외)`);
  }

  for (const c of kept) await upsert({ id: c.id, nameJa: c.name }, node.id, level);
  return kept.map(c => ({ id: c.id, nameJa: c.name }));
}

async function main() {
  const before = await fetchCredits();
  console.log(
    `아마존 카테고리 수집${isDryRun ? ' (모의 실행 — 크레딧을 쓰지 않습니다)' : ''}\n` +
    `  최상위 ${ROOTS.length}개 · 최대 ${maxDepth}단계 · 예산 ${budget}건` +
    (before ? ` · 현재 남은 크레딧 ${before.remaining}건` : ''),
  );

  // 1단계: 최상위는 API 없이 바로 넣습니다. (목록을 코드에 적어 두었으므로 크레딧 0)
  console.log('\n[1단계] 최상위 부문');
  for (const r of ROOTS) {
    if (blocked.has(r.id)) { console.log(`  · ${r.nameJa} — 차단 목록이라 건너뜀`); continue; }
    if (!isDryRun) await upsert(r, '0', 1);
    console.log(`  · ${r.nameJa} (${r.id})`);
  }

  // 2단계부터: 부모를 하나씩 펼칩니다.
  let frontier = ROOTS.filter(r => !blocked.has(r.id));
  for (let level = 2; level <= maxDepth; level++) {
    console.log(`\n[${level}단계] 부모 ${frontier.length}개를 펼칩니다`);
    const next: { id: string; nameJa: string }[] = [];

    for (const parent of frontier) {
      const kids = await expand(parent, level);
      if (kids === null) {
        console.log(`\n⚠️ 예산 ${budget}건을 다 썼습니다. 여기서 멈춥니다.`);
        console.log('   다시 실행하면 이미 펼친 곳은 건너뛰고 이어서 진행합니다.');
        return;
      }
      next.push(...kids);
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  // 자식이 없는 노드는 최하위로 표시합니다. 화면이 "더 들어갈 수 있는지" 판단에 씁니다.
  if (!isDryRun) {
    const all = await prisma.amazonCategory.findMany({ select: { genreId: true } });
    const parents = new Set(
      (await prisma.amazonCategory.findMany({ select: { parentId: true } })).map(r => r.parentId),
    );
    const leaves = all.filter(r => !parents.has(r.genreId)).map(r => r.genreId);
    if (leaves.length) {
      await prisma.amazonCategory.updateMany({ where: { genreId: { in: leaves } }, data: { isLeaf: true } });
    }
  }

  const total = await prisma.amazonCategory.count();
  const after = await fetchCredits();
  console.log(
    `\n완료 — 카테고리 ${total}개 · 이번에 쓴 크레딧 ${creditsSpent}건` +
    (after ? ` · 남은 크레딧 ${after.remaining}건` : ''),
  );
}

main()
  .catch(e => {
    if (e instanceof RainforestError) console.error('Rainforest 오류:', e.message);
    else console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
