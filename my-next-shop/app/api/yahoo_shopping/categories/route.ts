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
  const setGenreId = Number(genreId) || 1;

  //const { searchParams } = new URL(request.url);
  //const keyword = searchParams.get('keyword');
  //const clientId = process.env.YAHOO_CLIENT_ID;

  //if (!keyword) return NextResponse.json({ error: '검색어를 입력하세요.' }, { status: 400 });

  // const appId = "dmVyPTIwMjUwNyZpZD1PUm04RzB3N3RlJmhhc2g9TkdRME5qaGtNbVkxWVdZelpUWmtaUQ";
  // const API_URL = new URL(`https://shopping.yahooapis.jp/ShoppingWebService/V1/json/categorySearch?}`);
  // API_URL.searchParams.append('appid', appId);
  // API_URL.searchParams.append('category_id', "1");

  try {

    const parentRecord = await prisma.yahooShoppingCategory.findUnique({ where: { genreId: setGenreId } });
        if (parentRecord?.isLeaf) {
          return NextResponse.json({ success: true, data: [], isLeaf: true });
        }
    
        const parentLevel = parentRecord?.genreLevel ?? 0;
    
        const existing = await prisma.yahooShoppingCategory.findMany({ 
          where: { parentId: Number(setGenreId) }, // 앞선 에러 방지를 위해 숫자 변환 포함
          orderBy: {
            updatedAt: 'asc' // 최신 데이터가 배열의 0번째로 오도록 정렬
          }
        });
    
        return NextResponse.json({ 
          success: true, 
          data: existing, 
          isLeaf: false,
          fromCache: true // 💡 이 데이터를 추가하여 프론트엔드에 알립니다.
        });
    
      }catch (error) {
        console.error('Yahoo Category API Error:', error);
        return NextResponse.json(
          { error: '카테고리 정보를 불러오는데 실패했습니다.' }, 
          { status: 500 }
        );
      }
    }