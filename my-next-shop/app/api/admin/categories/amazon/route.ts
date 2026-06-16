import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // 프론트엔드 매크로에서 넘어온 부모 카테고리 ID
  const parentId = searchParams.get('parentId'); 
  
  const apiKey = process.env.RAINFOREST_API_KEY as string;

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      domain: 'amazon.co.jp', // 🌟 일본 아마존 고정
    });
    
    // parentId가 0이 아니거나 존재할 때만 파라미터에 추가하여 자식 노드 탐색
    if (parentId && parentId !== '0') {
      params.append('parent_id', parentId);
    }

    const response = await fetch(`https://api.rainforestapi.com/categories?${params.toString()}`);
    const data = await response.json();

    // 에러 및 크레딧 소진 방어 로직
    if (!data.request_info?.success) {
      console.error("[Rainforest API Error]:", data.request_info);
      return NextResponse.json({ error: 'API 호출 실패' }, { status: 400 });
    }

    const categories = data.categories || [];
    const responseArray = [];

    // 🌟 DB 적재 및 응답 배열 생성
    for (const cat of categories) {
      await prisma.amazonCategory.upsert({
        where: { genreId: cat.id }, // 아마존 Node ID는 숫자가 커서 String 처리 필수
        update: {
          genreName: cat.name,
          parentId: Number(parentId || 0),
          isLeaf: !cat.has_children, // Rainforest가 알려주는 has_children 속성 활용
          updatedAt: new Date()
        },
        create: {
          genreId: cat.id,
          genreName: cat.name,
          parentId: Number(parentId || 0),
          isLeaf: !cat.has_children,
        }
      });

      responseArray.push({
        genreId: cat.id,
        genreName: cat.name,
        hasChildren: cat.has_children
      });
    }

    // 프론트엔드 매크로가 다음 단계로 파고들지 여부를 결정할 수 있도록 데이터 반환
    return NextResponse.json({ 
      success: true, 
      data: responseArray,
      isLeaf: categories.length === 0 
    });

  } catch (error) {
    console.error('Amazon Category API Error:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}