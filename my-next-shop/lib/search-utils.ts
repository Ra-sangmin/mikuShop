'use server';

import prisma from '@/lib/prisma';
import { translateToJapanese } from '@/lib/translate';

/**
 * [공통] 언어 감지 함수
 */
export const checkLanguage = async (text: string) => { // 👈 async 추가
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  if (hasKorean && hasJapanese) return { lang: 'MIXED' };
  if (hasKorean) return { lang: 'KOREAN' };
  if (hasJapanese) return { lang: 'JAPANESE' };
  return { lang: 'OTHER' };
};

export async function getTranslatedText(koreanText: string): Promise<string> {
  const trimmedText = koreanText.trim();
  if (!trimmedText) return "";

  // 1. 언어 체크
  const { lang } = await checkLanguage(trimmedText);

  // 이미 일본어만 있거나, 번역이 필요 없는 'OTHER'인 경우 그대로 반환
  if (lang === 'JAPANESE' || lang === 'OTHER') {
    return trimmedText;
  }

  try {
    // 2. DB에서 먼저 찾기 (한국어로 일본어 결과가 있는지 검색)
    // 주의: schema.prisma에서 'ko' 필드에도 @unique나 index가 있으면 성능이 좋습니다.
    const cached = await prisma.translation.findFirst({
      where: { ko: trimmedText }
    });

    if (cached) {
      console.log(`♻️ [DB 캐시 적중] ${trimmedText} -> ${cached.jp}`);
      return cached.jp;
    }

    // 3. DB에 없으면 번역 실행 (한국어 -> 일본어)
    console.log(`🌐 [신규 번역] 한국어 -> 일본어 변환 중: ${trimmedText}`);
    const translatedJp = await translateToJapanese(trimmedText); 

    // 4. 번역 결과가 있으면 DB에 저장
    if (translatedJp && translatedJp !== trimmedText) {
      await prisma.translation.create({
        data: {
          jp: translatedJp,
          ko: trimmedText
        }
      }).catch(err => {
        // 중복 데이터 에러 방지
        if (err.code !== 'P2002') console.error("❌ DB 저장 실패:", err);
      });
    }

    return translatedJp;

  } catch (error) {
    console.error("❌ 번역 프로세스 에러:", error);
    return trimmedText;
  }
}