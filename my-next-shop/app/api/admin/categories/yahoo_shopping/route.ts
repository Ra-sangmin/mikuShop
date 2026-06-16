// app/api/admin/categories/yahoo_shopping/route.ts
// (주석: 파일명이나 경로는 프로젝트 상황에 맞게 사용하세요)

import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genreId = searchParams.get('genreId');
  const setGenreId = Number(genreId) || 1;

  console.log(`[Yahoo API] 카테고리 조회 요청 ID: ${setGenreId}`);

  try {
    // 1. 이미 최하위 카테고리(isLeaf)로 판명된 경우 바로 리턴
    const parentRecord = await prisma.yahooShoppingCategory.findUnique({ where: { genreId: setGenreId } });
    if (parentRecord?.isLeaf) {
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

    // 2. URL 끝에 있던 '?}' 오타 수정 및 URL 생성
    const API_URL = new URL(`https://shopping.yahooapis.jp/ShoppingWebService/V1/json/categorySearch`);
    const appId = process.env.YAHOO_CLIENT_ID as string;
    
    API_URL.searchParams.append('appid', appId);
    API_URL.searchParams.append('category_id', setGenreId.toString());

    // 3. 야후 API 호출
    const response = await fetch(API_URL.toString(), { method: 'GET' });
    const jsonData = await response.json();
    const categoryData = jsonData?.ResultSet?.['0']?.Result?.Categories;

    //console.log(JSON.stringify(jsonData, null, 2));

    if (categoryData) {

      let currentLevel = 0;

      const pathObj = categoryData.Current?.Path;
      
      if (pathObj) {
        // "_container" 같은 메타데이터를 제외하고 실제 depth 값들만 뽑아서 가장 큰 숫자를 찾습니다.
        const depths = Object.values(pathObj)
          .map((p: any) => p?._attributes?.depth)
          .filter(depth => typeof depth === 'number');

        if (depths.length > 0) {
          currentLevel = Math.max(...depths);
        }
      }

      // 자식 카테고리들의 레벨은 현재 레벨 + 1 입니다.
      const childLevel = currentLevel;

      // 🌟 [핵심 수정 1] "_container" 같은 가짜 데이터를 걸러내고 진짜만 배열로 만듭니다.
      const childrenArray = categoryData.Children 
        ? Object.values(categoryData.Children).filter((cat: any) => cat && cat.Title)
        : [];

      // 4. 자식 카테고리가 0개면 최하위(isLeaf=true)로 업데이트
      if (childrenArray.length === 0 && setGenreId) {
        console.log(`[마지막 단계 감지] ID: ${setGenreId} 를 isLeaf=true로 설정합니다.`);
        
        await prisma.yahooShoppingCategory.update({
          where: { genreId: setGenreId },
          data: { isLeaf: true, updatedAt: new Date() }
        });
        
        return NextResponse.json({ success: true, data: [], isLeaf: true });
      }

      // 5. 정제된 진짜 카테고리 데이터만 순회하며 DB 저장
      for (const cat of childrenArray as any[]) { 
        const targetId = Number(cat.genreId || cat.Id);

        await prisma.yahooShoppingCategory.upsert({
          where: { genreId: targetId },
          update: {
            genreName: cat.Title.Short,
            genreLevel: childLevel,
            parentId: Number(setGenreId || 0),
            isLeaf: false, 
            updatedAt: new Date()
          },
          create: {
            genreId: targetId,
            genreName: cat.Title.Short,
            genreLevel: childLevel,
            parentId: Number(setGenreId || 0),
            isLeaf: false
          }
        });
      }

      // 🌟 [핵심 수정 2] 클라이언트에게 응답할 때, 정제해둔 childrenArray를 보냅니다.
      // (기존 categoryData?.children은 대소문자 문제로 undefined가 나갔음)
      return NextResponse.json({
        success: true, 
        data: childrenArray, 
        isLeaf: false 
      });

    } else {
      console.log("카테고리 정보가 응답 데이터에 없습니다.");
      return NextResponse.json({ success: true, data: [], isLeaf: true });
    }

  } catch (error) {
    console.error('Yahoo Category API Error:', error);
    return NextResponse.json(
      { error: '카테고리 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}