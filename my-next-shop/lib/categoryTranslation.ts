// 🈶 카테고리 이름 번역 — Translation 테이블 공용 (라쿠텐·메루카리·야후쇼핑·야후옥션)
//
// 규칙
//  1) 일본어 원문(jp)이 Translation 에 있으면 그 ko 와 id 를 씁니다. 플랫폼이 달라도 같은 원문은 한 번만 번역합니다.
//  2) 없으면 preferredKo(코드에 손으로 넣어둔 한국어) → 그것도 없으면 DeepL 로 번역해 Translation 에 추가합니다.
//  3) 번역을 실제로 못 받은 경우(키 없음·API 실패)는 Translation 에 넣지 않습니다. 틀린 값을 굳히지 않기 위해서입니다.
//     (CD・DVD 처럼 번역 결과가 원문과 같은 정상 케이스는 등록합니다)
//  각 카테고리 테이블에는 이름 컬럼이 없습니다. translationId 로 이 표를 가리키기만 하고, 화면에 쓸 이름은
//  translation.ko(없으면 jp)를 읽습니다 — lib/categoryPath.ts 의 categoryDisplayName().

import prisma from '@/lib/prisma';
import { translateBatch, type Translated } from '@/lib/deepl';

export interface ResolvedName { ko: string; translationId: number | null; }

/**
 * DeepL 일본어→한국어. ok=false 는 번역을 못 받아 원문을 돌려준 것.
 *
 * 실제 호출은 lib/deepl.ts 가 합니다. 이 이름을 남겨 둔 것은 부르는 쪽이 여럿이고
 * (아래 두 곳 + lib/itemVariants.ts) 전부 "일본어 → 한국어"로만 쓰기 때문입니다.
 */
export async function translateWithDeepL(namesJa: string[]): Promise<Translated[]> {
  // 카테고리·옵션 이름은 일본어라는 것이 확실해서 원본 언어를 못박습니다.
  // 짧은 단어는 DeepL 이 언어를 잘못 짚는 일이 있습니다. ("CD" 를 영어로 보는 식)
  return translateBatch(namesJa, 'KO', 'JA');
}

/**
 * 일본어 이름들을 한국어로 풀어냅니다. (원문 → { ko, translationId })
 * preferredKo: 원문별로 미리 정해둔 한국어 (없는 원문에만 쓰이고, Translation 에 그 값으로 등록됩니다)
 * ensureRow: 번역을 못 받아도 ko=jp(원문 그대로)인 Translation 행을 만들어 translationId 를 보장합니다.
 *   카테고리 테이블에는 이름 컬럼이 없어 참조가 끊기면 이름 자체가 사라지므로 모든 플랫폼 동기화가 이 옵션을 씁니다.
 *   이렇게 원문 그대로 들어간 행은 retranslateUntranslated() 가 나중에 채웁니다.
 */
export async function resolveCategoryNames(
  namesJa: string[],
  preferredKo: Map<string, string> = new Map(),
  options: { ensureRow?: boolean } = {},
): Promise<Map<string, ResolvedName>> {
  const result = new Map<string, ResolvedName>();
  const unique = [...new Set(namesJa.map(n => (n ?? '').trim()).filter(Boolean))];
  if (unique.length === 0) return result;

  const found = await prisma.translation.findMany({
    where: { jp: { in: unique } },
    select: { id: true, jp: true, ko: true },
  });
  found.forEach(t => result.set(t.jp, { ko: t.ko, translationId: t.id }));

  const missing = unique.filter(jp => !result.has(jp));
  const needDeepl = missing.filter(jp => !preferredKo.get(jp));
  const translated = await translateWithDeepL(needDeepl);
  const deeplMap = new Map(needDeepl.map((jp, i) => [jp, translated[i]]));

  for (const jp of missing) {
    const preferred = preferredKo.get(jp);
    const machine = deeplMap.get(jp);
    const ko = (preferred ?? machine?.text ?? jp).trim() || jp;
    // 번역을 못 받았으면 틀린 값을 굳히지 않으려고 등록하지 않습니다. 단 ensureRow 면 ko=jp 로라도 행을 만듭니다.
    if (!preferred && !machine?.ok && !options.ensureRow) { result.set(jp, { ko, translationId: null }); continue; }
    try {
      const row = await prisma.translation.upsert({
        where: { jp },
        create: { jp, ko },
        update: {},
        select: { id: true, ko: true },
      });
      result.set(jp, { ko: row.ko, translationId: row.id });
    } catch (e) {
      // 🐛 같은 원문을 두 요청이 동시에 넣으면(같은 카테고리를 동시에 처음 방문, 백그라운드 갱신과 겹침) MySQL 에서는
      //    upsert 가 SELECT→INSERT 로 풀리기 때문에 한쪽이 unique 충돌(P2002)을 냅니다. 그때는 상대가 넣은 행을 다시 읽어 씁니다.
      const isDuplicate = (e as { code?: string })?.code === 'P2002';
      const existing = isDuplicate
        ? await prisma.translation.findUnique({ where: { jp }, select: { id: true, ko: true } }).catch(() => null)
        : null;
      if (existing) {
        result.set(jp, { ko: existing.ko, translationId: existing.id });
      } else {
        console.error('[categoryTranslation] Translation 저장 실패:', (e as Error).message);
        result.set(jp, { ko, translationId: null });
      }
    }
  }
  return result;
}

/**
 * ensureRow 로 ko=jp 로 등록됐던(=번역을 못 받았던) 행을 DeepL 로 다시 번역합니다.
 * 원문과 번역이 같은 정상 케이스(CD・DVD 등)는 DeepL 이 또 같은 값을 주므로 그대로 남습니다.
 */
export async function retranslateUntranslated(limit = 200): Promise<{ scanned: number; updated: number }> {
  // 🐛 한자만 보고 고르면 "에도가와（江戶川） 란포（亂步）" 처럼 이미 한국어인데 괄호 안에 한자가 있는 행까지 잡힙니다.
  //    한글이 섞인 행은 번역 대상이 아니므로 제외합니다.
  const rows: { id: number; jp: string }[] = await prisma.$queryRawUnsafe(
    `SELECT id, jp FROM Translation
     WHERE ko = jp AND jp REGEXP '[ぁ-んァ-ヶ一-龥]' AND jp NOT REGEXP '[가-힣]'
     LIMIT ${Math.max(1, Math.floor(limit))}`,
  );
  if (rows.length === 0) return { scanned: 0, updated: 0 };
  const translated = await translateWithDeepL(rows.map(r => r.jp));
  let updated = 0;
  for (let i = 0; i < rows.length; i++) {
    const t = translated[i];
    if (!t.ok || t.text === rows[i].jp) continue;
    await prisma.translation.update({ where: { id: rows[i].id }, data: { ko: t.text } });
    updated++;
  }
  return { scanned: rows.length, updated };
}
