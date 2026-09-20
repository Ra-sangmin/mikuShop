// 🈯 한 건짜리 문구 번역 — 상품명(구매대행 신청)과 검색어에 씁니다.
//
// DeepL 호출 자체는 lib/deepl.ts 한 곳에 모여 있습니다. 여기서는 두 가지만 더 합니다.
//  1) 번역할 필요가 있는지 먼저 봅니다. 이미 목적 언어로 적힌 문구를 보내면 DeepL 할당량만 씁니다.
//  2) 결과를 글자 수에 맞춰 자릅니다.
//
// 이 파일은 prisma 를 쓰지 않습니다. 상품명·검색어는 매번 달라서 표에 쌓아 봐야 재사용되지 않습니다.
// (종류가 정해진 카테고리 이름은 lib/categoryTranslation.ts 가 Translation 표에 쌓아 재사용합니다)

import { translateOne } from '@/lib/deepl';

const HAS_JAPANESE = /[぀-ゟ゠-ヿ]/;
const HAS_KOREAN = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;

/** 글자 수를 넘으면 잘라내고 말줄임표를 붙입니다. */
function clamp(text: string, characterLimit: number): string {
  return text.length > characterLimit ? `${text.substring(0, characterLimit)}...` : text;
}

/**
 * 일본어를 한국어로 번역하고 글자 수를 제한합니다.
 *
 * 일본어(히라가나·가타카나)가 없으면 번역하지 않습니다. 영문 상품명처럼
 * 그대로 두는 편이 나은 문구까지 보내면 할당량만 줄어듭니다.
 * 번역에 실패해도 원문을 돌려줍니다 — 빈 칸보다는 일본어라도 남는 편이 낫습니다.
 *
 * @param text 번역할 원문
 * @param characterLimit 글자 수 제한 (기본값 100)
 */
export async function translateToKorean(text: string, characterLimit: number = 100): Promise<string> {
  if (!text) return '';
  if (!HAS_JAPANESE.test(text)) return clamp(text, characterLimit);

  // 원본 언어는 지정하지 않습니다. 상품명에는 일본어·영문·숫자가 섞여 있는 경우가 많습니다.
  const { text: translated } = await translateOne(text, 'KO');
  return clamp(translated, characterLimit);
}

/**
 * 한국어를 일본어로 번역하고 글자 수를 제한합니다. 손님이 한국어로 검색할 때 씁니다.
 * 한국어가 없으면(이미 일본어로 검색한 경우 등) 그대로 둡니다.
 */
export async function translateToJapanese(text: string, characterLimit: number = 100): Promise<string> {
  if (!text) return '';
  if (!HAS_KOREAN.test(text)) return clamp(text, characterLimit);

  const { text: translated } = await translateOne(text, 'JA');
  return clamp(translated, characterLimit);
}
