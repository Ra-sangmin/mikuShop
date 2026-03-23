import { NextResponse, NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';

// 🚀 최근 처리된 부모 ID 5개를 보관하는 큐 (메모리 내 보관)
let recentParentIds: number[] = [];

export async function GET(request: NextRequest) {
  // 1. URL 파라미터 추출
  const searchParams = request.nextUrl.searchParams;
  const genreIdParam = searchParams.get('genre') || searchParams.get('category');
  const genreId = Number(genreIdParam) || 0;

  try {

    // 2️⃣ DB에서 부모 레코드 정보 확인
    const parentRecord = await prisma.yahooAuctionCategory.findUnique({ where: { genreId } });

    // 🚀 [무한 루프 감지 및 중단] 로직
    const isLooping = recentParentIds.includes(genreId);
    
    if (isLooping || parentRecord?.isLeaf) {
      console.log(`🚫 [무한루프 감지/이미종료] ID: ${genreId} 를 isLeaf 처리하고 스킵합니다.`);
      
      // DB에서도 이 부모를 확실히 최하위(isLeaf)로 닫아줌
      await prisma.yahooAuctionCategory.update({
        where: { genreId },
        data: { isLeaf: true, updatedAt: new Date() }
      });

      return NextResponse.json({ success: true, data: [], isLeaf: true, fromCache: true });
    }

    // ✅ 이번 부모 ID를 최근 기록에 추가 (최대 5개 유지)
    recentParentIds.push(genreId);
    if (recentParentIds.length > 5) recentParentIds.shift();

    // 3️⃣ 외부 사이트(비드바이) 스크래핑 시작
    const targetUrl = `https://www.bidbuy.co.kr/auctions/yahoo/jp/list/miku-shop/${genreId}`;
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store' // 매번 새로 긁어오도록 설정
    });

    if (!response.ok) throw new Error(`접속 실패: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const scrapedData: any[] = [];

    // 카테고리 박스 파싱
    $('.cateBox .td a').each((_, element) => {
      const el = $(element);
      const genreName = el.text().trim();
      const href = el.attr('href') || '';
      const idMatch = href.match(/\/(\d+)(\?|$)/);
      const extractedId = idMatch ? Number(idMatch[1]) : null;

      // 추출된 ID가 유효하고, 부모 ID와 다르며, 이름이 있는 경우만 수집
      if (extractedId && genreName && extractedId !== genreId) {
        scrapedData.push({ genreId: extractedId, genreName, parentId: genreId });
      }
    });

    // 4️⃣ 자식 카테고리가 하나도 없는 경우 (최하위 노드)
    if (scrapedData.length === 0) {
      await prisma.yahooAuctionCategory.update({
        where: { genreId },
        data: { isLeaf: true, updatedAt: new Date() }
      });

      //console.log(`✅ [최하위 확정] ID: ${genreId}`);
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    // 5️⃣ 수집된 자식들 저장 (Upsert)
    const uniqueData = Array.from(new Map(scrapedData.map(item => [item.genreId, item])).values());
    const currentLevel = (parentRecord?.genreLevel || 1) + 1;

    await Promise.all(uniqueData.map(cat => 
      prisma.yahooAuctionCategory.upsert({
        where: { genreId: cat.genreId },
        update: {
          genreName: cat.genreName,
          genreLevel: currentLevel,
          parentId: genreId,
          updatedAt: new Date()
        },
        create: {
          genreId: cat.genreId,
          genreName: cat.genreName,
          genreLevel: currentLevel,
          parentId: genreId
        }
      })
    ));

    //console.log(`✅ [수집완료] ID: ${genreId} (최근기록: [${recentParentIds.join(', ')}])`);

    return NextResponse.json({ success: true, data: uniqueData, isLeaf: false });

  } catch (error: any) {
    console.error("🔥 야후 카테고리 수집 에러:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}