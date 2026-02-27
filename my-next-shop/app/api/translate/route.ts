// app/api/translate/route.ts
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
// 🌟 분리한 번역 유틸리티 함수 불러오기
import { translateToKorean } from '@/lib/translate'; 

export async function POST(req: Request) {
  try {
    const { productUrl, characterLimit = 100 } = await req.json();

    // 1. 타겟 페이지 가져오기
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,ja;q=0.8,en-US;q=0.7,en;q=0.6'
      }
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. 인코딩 감지 및 변환 로직
    const contentType = response.headers.get('content-type') || '';
    let charset = 'utf-8'; 

    if (contentType.toLowerCase().includes('euc-kr')) charset = 'euc-kr';
    else if (contentType.toLowerCase().includes('euc-jp')) charset = 'euc-jp';
    else if (contentType.toLowerCase().includes('shift_jis') || contentType.toLowerCase().includes('sjis')) charset = 'shift_jis';

    let html = buffer.toString('utf-8');
    if (charset === 'utf-8') {
      const charsetMatch = html.match(/charset\s*=\s*["']?([\w-]+)["']?/i);
      if (charsetMatch) {
        const metaCharset = charsetMatch[1].toLowerCase();
        if (['euc-kr', 'euc-jp', 'shift_jis', 'sjis'].includes(metaCharset)) {
          charset = metaCharset === 'sjis' ? 'shift_jis' : metaCharset;
        }
      }
    }

    if (charset !== 'utf-8') {
      html = iconv.decode(buffer, charset);
    }

    // 3. 타이틀 추출
    const $ = cheerio.load(html);
    let originalTitle = $('title').text().trim();

    // 🌟 4. 분리된 번역 함수 호출 (여기서 글자 수 제한도 알아서 처리됨)
    const finalTitle = await translateToKorean(originalTitle,characterLimit);

    return NextResponse.json({ success: true, productName: finalTitle });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ 
      success: false, 
      productName: "서버 통신 오류 (직접 입력해주세요)", 
      error: "서버 오류" 
    }, { status: 200 }); 
  }
}