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