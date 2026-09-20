// 🈯 DeepL 번역 호출 — 프로젝트에서 DeepL 을 부르는 유일한 곳
//
// 예전에는 카테고리 번역(lib/categoryTranslation.ts)과 상품명·검색어 번역(lib/translate.ts)이
// 각자 fetch 를 들고 있었습니다. 키를 읽는 방식도, 실패했을 때의 처리도 조금씩 달라서
// 한쪽만 고치면 다른 쪽이 그대로 남았습니다. 그래서 호출은 여기 하나로 모읍니다.
//
// 이 파일은 **prisma 를 쓰지 않습니다.** 번역 결과를 Translation 테이블에 쌓을지는
// 부르는 쪽이 정할 일입니다. 카테고리 이름은 종류가 정해져 있어 쌓아 두면 계속 재사용되지만,
// 상품명은 상품마다 달라서 쌓아 봐야 표만 불어납니다.

/** 번역 결과. ok=false 는 번역을 못 받아 **원문을 그대로** 돌려준 것입니다. */
export type Translated = { text: string; ok: boolean };

type Lang = 'KO' | 'JA' | 'EN';

/** DeepL 은 한 요청에 50개까지 받습니다. */
const CHUNK = 50;

/**
 * 여러 문구를 한 번에 번역합니다. 입력 순서 그대로 돌려줍니다.
 *
 * 번역하지 못해도 예외를 던지지 않습니다. 번역은 있으면 좋은 것이지 없으면 화면이
 * 멈춰야 하는 것이 아니라서, 원문에 ok=false 를 달아 돌려줍니다.
 * 부르는 쪽은 그 값을 그대로 보여 주면 되고, 저장하는 쪽은 ok 를 보고 거를 수 있습니다.
 * (실패한 번역을 저장하면 원문이 "번역된 값"으로 굳어 다음에도 그대로 나옵니다)
 *
 * @param texts 번역할 문구들
 * @param to    목적 언어
 * @param from  원본 언어. 생략하면 DeepL 이 알아서 판단합니다.
 *              한 문장에 여러 언어가 섞일 수 있으면 생략하는 편이 낫습니다.
 */
export async function translateBatch(texts: string[], to: Lang, from?: Lang): Promise<Translated[]> {
  const key = process.env.DEEPL_API_KEY;
  // 키가 없으면 조용히 원문을 돌려줍니다. 로컬에서 키 없이 개발할 때 화면이 깨지지 않도록.
  if (!key || texts.length === 0) return texts.map(text => ({ text, ok: false }));

  const out: Translated[] = [];

  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK);
    try {
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk, target_lang: to, ...(from ? { source_lang: from } : {}) }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`DeepL ${res.status}`);

      const body = await res.json();
      const translated: string[] = (body.translations ?? []).map((t: { text?: string }) => String(t.text ?? ''));

      out.push(...chunk.map((original, k) => {
        const text = translated[k]?.trim();
        return text ? { text, ok: true } : { text: original, ok: false };
      }));
    } catch (e) {
      // ⚠️ 키 자체가 로그에 남지 않도록 메시지만 찍습니다.
      console.error('[DeepL] 번역 실패, 원문 유지:', (e as Error).message);
      out.push(...chunk.map(text => ({ text, ok: false })));
    }
  }

  return out;
}

/** 한 건만 번역할 때. 실패하면 원문이 그대로 돌아옵니다. */
export async function translateOne(text: string, to: Lang, from?: Lang): Promise<Translated> {
  const [result] = await translateBatch([text], to, from);
  return result ?? { text, ok: false };
}
