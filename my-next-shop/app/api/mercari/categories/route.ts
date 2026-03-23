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
    // 1. 🚀 DB에서 하위 카테고리 목록 조회
    const categories = await prisma.mercariCategory.findMany({
      where: { parentId: parentId },
      orderBy: { updatedAt: 'asc' }
    });

    // 2. 🚀 부모 카테고리의 정보 조회 (Breadcrumb 및 isLeaf 확인용)
    const parentRecord = await prisma.mercariCategory.findUnique({
      where: { genreId: parentId }
    });

    // 3. 🚀 현재 카테고리가 최하위(Leaf)인지 판정
    // - DB에 자식이 하나도 없거나, 이미 부모 레코드에 isLeaf가 1로 되어 있는 경우
    const isLeaf = categories.length === 0 || !!parentRecord?.isLeaf;

    // 4. 🚀 응답 데이터 구성
    return NextResponse.json({
      success: true,
      data: categories,
      isLeaf: isLeaf,
      // 프론트엔드 경로 표시를 위해 부모 정보가 필요하다면 추가 (선택사항)
      parentName: parentRecord?.genreName || (parentId === 0 ? 'HOME' : '')
    });

  } catch (e: any) {
    console.error("❌ DB 조회 에러:", e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}