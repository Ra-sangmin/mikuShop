// app/api/rakuten/categories/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { rakutenBaseAPIOn } from '@/lib/rakuten';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url);
  const genreId = searchParams.get('genreId');
  const setGenreId = Number(genreId) || 0;

  try {

    const parentRecord = await prisma.rakutenCategory.findUnique({ where: { genreId: setGenreId } });
    if (parentRecord?.isLeaf) {
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    const parentLevel = parentRecord?.genreLevel ?? 0;

    const existing = await prisma.rakutenCategory.findMany({ 
      where: { parentId: Number(setGenreId) }, // 앞선 에러 방지를 위해 숫자 변환 포함
      orderBy: {
        updatedAt: 'asc' // 최신 데이터가 배열의 0번째로 오도록 정렬
      }
    });


    // 2. 데이터가 있고 7일 이내면 즉시 반환
    if (existing.length > 0) {
      const lastUpdate = new Date(existing[0].updatedAt).getTime();
      const isFresh = (new Date().getTime() - lastUpdate) / (1000 * 60 * 60 * 24) < 7;
       //console.log(`[캐시 반환] ID: ${result }`);

      if (isFresh) {
       
        return NextResponse.json({ 
          success: true, 
          data: existing, 
          isLeaf: false,
          fromCache: true // 💡 이 데이터를 추가하여 프론트엔드에 알립니다.
        });
      }

    }

    //const cacheKey = `rakuten_categoriAPI_${setGenreId}`;
    const tailUrl = "ichibagt/api/IchibaGenre/Search/20170711";
    
    // 카테고리는 page: 1, sort: "" 고정
    const categoryData = await rakutenBaseAPIOn(tailUrl, setGenreId.toString());


    // 2. 진짜로 데이터가 0개일 때만 isLeaf로 마킹
    if (categoryData?.children.length === 0 && setGenreId) {
      console.log(`[마지막 단계 감지] ID: ${setGenreId} 를 isLeaf=true로 설정합니다.`);
      
      await prisma.$executeRaw`
        UPDATE RakutenCategory 
        SET isLeaf = true 
        WHERE genreId = ${Number(setGenreId)}
      `;
      
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    for (const cat of categoryData?.children) {

        // 1. 숫자로 확실하게 변환하여 변수에 담습니다.
        const targetId = Number(cat.genreId || cat.id);

        console.log(`[저장 시작] ID: ${targetId} : ${cat.genreName}`);

        await prisma.rakutenCategory.upsert({
          where: { genreId: targetId },

          // 2. 이미 데이터가 있다면 이름과 레벨, 갱신 시간을 업데이트합니다.
          update: {
            genreName: cat.genreName,
            genreLevel: cat.genreLevel,
            parentId: Number(setGenreId || 0),
            isLeaf: cat.lowestFlg === 1 || false,
            updatedAt: new Date()
          },
          // 3. 데이터가 없다면 새로 생성합니다.
          create: {
            genreId: targetId,
            genreName: cat.genreName,
            genreLevel: cat.genreLevel,
            parentId: Number(setGenreId || 0),
            isLeaf: cat.lowestFlg === 1 || false
          }
        });
      }

    
    return NextResponse.json({
      success: true, data: categoryData?.children, isLeaf: false 
    });

  } catch (error) {
    console.error('Rakuten Category API Error:', error);
    return NextResponse.json(
      { error: '카테고리 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}