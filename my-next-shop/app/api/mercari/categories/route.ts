import { NextResponse, NextRequest } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CATEGORY_MAP: { [key: string]: string } = {
  "3088": "패션", "3": "아기 키즈", "1328": "게임 · 장난감 · 상품", "6386": "취미, 악기, 미술",
  "1027": "티켓", "5": "책, 잡지, 만화", "9879": "CD·DVD·블루 레이", "7": "스마트 폰, 태블릿, PC",
  "3888": "TV, 오디오, 카메라", "4136": "생활가전 · 공조", "8": "스포츠", "2634": "야외, 낚시, 여행용품",
  "6": "화장품 · 미용", "3134": "다이어트 · 건강", "1844": "식품·음료·술", "113": "주방 · 일용품 · 기타",
  "4": "가구·인테리어", "69": "애완 동물 용품", "5597": "DIY · 공구", "1206": "꽃 정원",
  "9": "핸드메이드·수예", "1318": "자동차, 오토바이, 자전거"
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parentIdParam = searchParams.get('parentId');
  const parentId = Number(parentIdParam) || 0;

  try {

    const parentRecord = await prisma.mercariCategory.findUnique({ where: { genreId: parentId } });
    if (parentRecord?.isLeaf) {
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    const parentLevel = parentRecord?.genreLevel ?? 0;

    // 1. DB 확인 (updatedAt 기준 최신순 정렬)
    const existing = await prisma.mercariCategory.findMany({ 
      where: { parentId: Number(parentId) }, // 앞선 에러 방지를 위해 숫자 변환 포함
      orderBy: {
        updatedAt: 'asc' // 최신 데이터가 배열의 0번째로 오도록 정렬
      }
    });

    // 2. 데이터가 있고 7일 이내면 즉시 반환
    if (existing.length > 0) {
      const lastUpdate = new Date(existing[0].updatedAt).getTime();
      const isFresh = (new Date().getTime() - lastUpdate) / (1000 * 60 * 60 * 24) < 7;

      if (isFresh) {
        console.log(`[캐시 반환] ID: ${parentId}`);
        return NextResponse.json({ 
          success: true, 
          data: existing, 
          isLeaf: false,
          fromCache: true // 💡 이 데이터를 추가하여 프론트엔드에 알립니다.
        });
      }

    }

    const targetUrl = parentId 
        ? `https://jp.mercari.com/categories?category_id=${parentId}`
        : 'https://jp.mercari.com/categories';

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 🚀 [속도 최적화 2] networkidle2 대신 domcontentloaded 사용
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    try {
      await page.waitForSelector('[data-testid="category-list"], [data-testid="search-item-grid"], #item-grid', { timeout: 5000 });
    } catch (e) {
      console.log(`[타임아웃] 원하는 엘리먼트를 찾지 못함. 빈 페이지일 수 있습니다.`);
    }

    // 💡 수정된 부분: 특정 영역(main 또는 특정 리스트) 내의 링크만 타겟팅
    const html = await page.content();
    const $ = cheerio.load(html);
    const scrapedData: any[] = [];

    // 메루카리 카테고리 페이지의 실제 리스트 영역을 더 정확히 짚어야 함
    // 보통 하위 카테고리는 특정 컨테이너 안에 모여 있습니다.
    $('main a[href*="category_id="]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const textName = $(el).text().trim();
      const genreIdParam = href.match(/category_id=([0-9]+)/)?.[1];
      const genreId = genreIdParam ? Number(genreIdParam) : 0;

      // '모두 보기(すべて)'는 제외하고, ID가 있는 경우만 처리
      if (genreIdParam && textName && textName !== 'すべて') {
          
          // 💡 여기가 핵심입니다!
          // 링크 주소에 '/search'가 포함되어 있다면 이 카테고리는 마지막 단계입니다.
          // 포함되어 있지 않다면('/categories') 하위 단계가 더 있는 것입니다.
          const isChildLeaf = href.includes('/search');

          scrapedData.push({ 
              genreId: genreId, 
              genreName: CATEGORY_MAP[genreId] || textName, 
              parentId: Number(parentId),
              isLeaf: isChildLeaf // 판별된 값을 바로 넣어줍니다.
          });
      }
      
      // // 💡 내 부모가 아니면서, 텍스트가 비어있지 않은 것만 필터링
      // if (genreId && textName && genreId !== parentId) {
      //   // 브레드크럼(상위 경로)에 포함된 ID인지 체크하여 제외하는 로직이 필요할 수 있음
      //   scrapedData.push({ genreId, genreName: CATEGORY_MAP[genreId] || textName, parentId });
      // }
    });

    await browser.close();

      // 💡 로그 강화: 데이터가 몇 개나 잡히는지 확인
    console.log(`[디버그] Scraped Data 개수: ${scrapedData.length} (ID: ${parentId})`);
    if (scrapedData.length > 0) {
      //console.log(`[디버그] 첫 번째 데이터 샘플:`, scrapedData[0]);
    }

    // 2. 진짜로 데이터가 0개일 때만 isLeaf로 마킹
    if (scrapedData.length === 0 && parentId) {
      console.log(`[마지막 단계 감지] ID: ${parentId} 를 isLeaf=true로 설정합니다.`);
      
      await prisma.$executeRaw`
        UPDATE MercariCategory 
        SET isLeaf = true 
        WHERE genreId = ${Number(parentId)}
      `;
      
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    const currentLevel = parentLevel + 1;

    // 5. 자식이 있다면 저장 (중복 방지 upsert)
    for (const cat of scrapedData) {

      // 1. 숫자로 확실하게 변환하여 변수에 담습니다.
      const targetId = Number(cat.genreId || cat.id);

      //console.log(`[저장 시작] ID: ${targetId} : ${cat.genreName}`);

      await prisma.mercariCategory.upsert({
        where: { genreId: targetId },

        // 2. 이미 데이터가 있다면 이름과 레벨, 갱신 시간을 업데이트합니다.
        update: {
          genreName: cat.genreName,
          genreLevel: currentLevel,
          parentId: Number(parentId || 0),
          isLeaf: cat.isLeaf || false,
          updatedAt: new Date()
        },
        // 3. 데이터가 없다면 새로 생성합니다.
        create: {
          genreId: targetId,
          genreName: cat.genreName,
          genreLevel: currentLevel,
          parentId: Number(parentId || 0),
          isLeaf: cat.isLeaf || false
        }
      });
    }

 /* 
  try {

    const isRoot = currentId === '0';

    const cachedCategory = await prisma.mercariCategory.findUnique({
      where: { id: isRoot ? 'ROOT' : currentId }, // 루트는 'ROOT'라는 가상 ID 사용 권장
      select: { updatedAt: true }
    });

    // 1. DB 선제 확인 (이미 isLeaf라면 즉시 반환)
    if (parentId) {
      const parentRecord = await prisma.mercariCategory.findUnique({ where: { id: parentId } });
      if (parentRecord?.isLeaf) {
        return NextResponse.json({ success: true, data: [], isLeaf: true });
      }
    }

    // 1. DB 확인
    const existing = await prisma.mercariCategory.findMany({ where: { parentId } });

    // 2. 데이터가 있고 7일 이내면 즉시 반환
    if (existing.length > 0) {
      const lastUpdate = new Date(existing[0].updatedAt).getTime();
      const isFresh = (new Date().getTime() - lastUpdate) / (1000 * 60 * 60 * 24) < 7;
      if (isFresh) return NextResponse.json({ success: true, data: existing, isLeaf: false });
    }

    // 3. 데이터가 없거나 오래된 경우 크롤링
    const targetUrl = parentId 
      ? `https://jp.mercari.com/categories?category_id=${parentId}`
      : 'https://jp.mercari.com/categories';


    const browser = await puppeteer.launch({ 
      headless: true, // "new" 에러 방지
      args: ['--no-sandbox'] 
    });
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    
    // 💡 수정된 부분: 특정 영역(main 또는 특정 리스트) 내의 링크만 타겟팅
    const html = await page.content();
    const $ = cheerio.load(html);
    const scrapedData: any[] = [];

    // 메루카리 카테고리 페이지의 실제 리스트 영역을 더 정확히 짚어야 함
    // 보통 하위 카테고리는 특정 컨테이너 안에 모여 있습니다.
    $('main a[href*="category_id="]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const textName = $(el).text().trim();
      const id = href.match(/category_id=([0-9]+)/)?.[1];

      // 💡 내 부모가 아니면서, 텍스트가 비어있지 않은 것만 필터링
      if (id && textName && id !== parentId) {
        // 브레드크럼(상위 경로)에 포함된 ID인지 체크하여 제외하는 로직이 필요할 수 있음
        scrapedData.push({ id, name: CATEGORY_MAP[id] || textName, parentId });
      }
    });

    await browser.close();

    // 💡 로그 강화: 데이터가 몇 개나 잡히는지 확인
    console.log(`[디버그] Scraped Data 개수: ${scrapedData.length} (ID: ${parentId})`);
    if (scrapedData.length > 0) {
      console.log(`[디버그] 첫 번째 데이터 샘플:`, scrapedData[0]);
    }

    // 2. 진짜로 데이터가 0개일 때만 isLeaf로 마킹
    if (scrapedData.length === 0 && parentId) {
      console.log(`[마지막 단계 감지] ID: ${parentId} 를 isLeaf=true로 설정합니다.`);
      
      await prisma.mercariCategory.update({
        where: { id: parentId },
        data: { isLeaf: true, updatedAt: new Date() }
      });
      
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    // 5. 자식이 있다면 저장 (중복 방지 upsert)
    for (const cat of scrapedData) {

      console.log(`[저장 시작] ID: ${cat.id} : ${cat.name}`);

      await prisma.mercariCategory.upsert({
        where: { id: cat.id },
        update: { name: cat.name, updatedAt: new Date() },
        create: { id: cat.id, name: cat.name, parentId, isLeaf: false }
      });
    }

    return NextResponse.json({ success: true, data: scrapedData, isLeaf: false });
    */
   return NextResponse.json({ success: true, data: scrapedData, isLeaf: false });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
  
}