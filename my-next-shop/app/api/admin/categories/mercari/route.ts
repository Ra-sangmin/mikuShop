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
    
    // 🚀 [수정] 정말로 확실한 Leaf일 때만 바로 반환
    if (parentRecord?.isLeaf) {
      console.log(`[확정된 최하위] ID: ${parentId}`);
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    const parentLevel = parentRecord?.genreLevel ?? 0;

    const targetUrl = parentId 
        ? `https://jp.mercari.com/categories?category_id=${parentId}`
        : 'https://jp.mercari.com/categories';

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const page = await browser.newPage();

    // 🚀 [최적화] 불필요한 리소스 차단 유지
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 🚀 [타이밍 수정] networkidle2를 사용하여 데이터가 다 로드될 때까지 기다립니다.
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 카테고리 리스트가 나타날 때까지 확실히 대기 (데이터-테스트아이디 기준)
    try {
      await page.waitForSelector('main a[href*="category_id="]', { timeout: 10000 });
    } catch (e) {
      console.log(`[정보] 하위 카테고리 링크를 찾지 못했습니다. 진짜 최하위거나 로딩 실패입니다.`);
    }

    const html = await page.content();
    const $ = cheerio.load(html);
    const scrapedData: any[] = [];

    $('main a[href*="category_id="]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const textName = $(el).text().trim();
      const genreIdParam = href.match(/category_id=([0-9]+)/)?.[1];
      const genreId = genreIdParam ? Number(genreIdParam) : 0;

      if (genreIdParam && textName && textName !== 'すべて' && genreId !== parentId) {
          const isChildLeaf = href.includes('/search');
          scrapedData.push({ 
              genreId: genreId, 
              genreName: CATEGORY_MAP[genreId] || textName, 
              parentId: Number(parentId),
              isLeaf: isChildLeaf
          });
      }
    });

    await browser.close();

    // 🚀 [중요 수정] 진짜로 데이터가 0개인데, 페이지 로딩은 성공했을 때만 isLeaf로 인정!
    if (scrapedData.length === 0 && parentId) {
      // 혹시 로딩 실패로 0개가 잡힌 건 아닌지 확인하기 위해 바로 업데이트하지 않고 일단 반환만 합니다.
      // 수동으로 DB를 고친 뒤에 다시 시도하는 것이 안전해요.
      console.log(`[확인 필요] ID: ${parentId} 에 하위 데이터가 없습니다.`);
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    const currentLevel = parentLevel + 1;

    // 데이터 저장 로직...
    for (const cat of scrapedData) {
      await prisma.mercariCategory.upsert({
        where: { genreId: Number(cat.genreId) },
        update: {
          genreName: cat.genreName,
          genreLevel: currentLevel,
          parentId: Number(parentId),
          isLeaf: cat.isLeaf,
          updatedAt: new Date()
        },
        create: {
          genreId: Number(cat.genreId),
          genreName: cat.genreName,
          genreLevel: currentLevel,
          parentId: Number(parentId),
          isLeaf: cat.isLeaf
        }
      });
    }

    return NextResponse.json({ success: true, data: scrapedData, isLeaf: false });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
