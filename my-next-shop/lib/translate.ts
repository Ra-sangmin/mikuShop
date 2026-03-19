// lib/translate.ts

/**
 * 일본어를 한국어로 번역하고 글자 수를 제한하는 함수
 * @param text 번역할 원문
 * @param characterLimit 글자 수 제한 (기본값 100)
 */
export async function translateToKorean(
  text: string, 
  characterLimit: number = 100 // 기본값 100 설정
): Promise<string> {
  if (!text) return "";

  //TODO :  실제 서비스 할때 번역하도록 함. 테스트 때는 자주 사용해서 막아둠
  {
    console.log(characterLimit);
      // 매개변수로 받은 characterLimit을 기준으로 글자 수 제한 적용
      if (text.length > characterLimit) {
        text = text.substring(0, characterLimit) + "...";
      }
      
      return text;
  }
  

  let finalTitle = text;
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;

  // 일본어가 포함된 경우에만 DeepL 번역 실행
  if (japaneseRegex.test(text)) {
    try {
      const authKey = process.env.DEEPL_API_KEY;

      if (authKey) {
        const deepLUrl = "https://api-free.deepl.com/v2/translate";
        
        const deepLRes = await fetch(deepLUrl, {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${authKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: [text],
            target_lang: 'KO'
          })
        });

        if (deepLRes.ok) {
          const data = await deepLRes.json();
          finalTitle = data.translations[0].text;
        } else {
          console.error("⚠️ DeepL API 에러:", deepLRes.status);
        }
      }
    } catch (transError) {
      console.error("⚠️ DeepL 통신 에러:", transError);
    }
  }

  // 매개변수로 받은 characterLimit을 기준으로 글자 수 제한 적용
  if (finalTitle.length > characterLimit) {
    finalTitle = finalTitle.substring(0, characterLimit) + "...";
  }

  return finalTitle;
}

/**
 * 한국어를 일본어로 번역하고 글자 수를 제한하는 함수
 * @param text 번역할 원문 (한국어 등)
 * @param characterLimit 글자 수 제한 (기본값 100)
 */
export async function translateToJapanese(
  text: string, 
  characterLimit: number = 100
): Promise<string> {
  if (!text) return "";

  // 🧪 [테스트 모드] 실제 서비스 전까지 API 호출을 아끼기 위한 블록
  // 이 블록을 주석 처리하면 실제 DeepL 번역이 작동합니다.
  /*
  {
    console.log("🧪 테스트 모드: 번역 없이 글자수만 제한합니다.");
    if (text.length > characterLimit) {
      text = text.substring(0, characterLimit) + "...";
    }
    return text;
  }
  */

  let finalTitle = text;
  // 한국어가 포함되어 있는지 확인하는 정규식
  const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;

  // 한국어가 포함된 경우에만 DeepL 번역 실행
  if (koreanRegex.test(text)) {
    try {
      const authKey = process.env.DEEPL_API_KEY;

      if (authKey) {
        const deepLUrl = "https://api-free.deepl.com/v2/translate";
        
        const deepLRes = await fetch(deepLUrl, {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${authKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: [text],
            target_lang: 'JA' // 🚀 목적 언어를 일본어(JA)로 설정
          })
        });

        if (deepLRes.ok) {
          const data = await deepLRes.json();
          finalTitle = data.translations[0].text;
          console.log(`✅ 번역 완료: ${text} -> ${finalTitle}`);
        } else {
          console.error("⚠️ DeepL API 에러:", deepLRes.status);
        }
      }
    } catch (transError) {
      console.error("⚠️ DeepL 통신 에러:", transError);
    }
  }

  // 최종 결과물 글자 수 제한 적용
  if (finalTitle.length > characterLimit) {
    finalTitle = finalTitle.substring(0, characterLimit) + "...";
  }

  return finalTitle;
}