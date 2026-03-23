// 🌟 1. Request 대신 NextRequest를 가져오도록 수정
import { NextRequest, NextResponse } from 'next/server'; 
import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const TABLE_MAP: Record<string, string> = {
  YAHOO_AUCTION: 'YahooAuctionCategory',
  MERCARI: 'MercariCategory',
  RAKUTEN: 'RakutenCategory',
};

// 🌟 2. 파라미터 타입을 NextRequest로 변경
export async function GET(request: NextRequest) { 
  try {
    // 🌟 3. nextUrl을 이용해 훨씬 직관적으로 파라미터를 가져옵니다.
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform') || 'YAHOO_AUCTION';
    const tableName = TABLE_MAP[platform];

    if (!tableName) {
      return NextResponse.json({ success: false, error: '유효하지 않은 플랫폼입니다.' }, { status: 400 });
    }

    // 🌟 1. Promise.all을 사용하여 '통계 쿼리'와 '다음 타겟 쿼리'를 동시에 실행합니다.
    const [statsResult, nextTarget] = await Promise.all([
      // 쿼리 A: 통계 데이터
      prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM ${Prisma.raw(tableName)}) AS totalCount,
          (SELECT COUNT(*)
           FROM ${Prisma.raw(tableName)}
           WHERE isLeaf = false
             AND genreId NOT IN (
               SELECT DISTINCT parentId
               FROM ${Prisma.raw(tableName)}
               WHERE parentId IS NOT NULL
             )
          ) AS pendingCount
      ` as Promise<any[]>,
      
      // 쿼리 B: 다음 수집 타겟
      prisma.$queryRaw`
        SELECT * FROM ${Prisma.raw(tableName)} 
        WHERE isLeaf = false 
        AND genreId NOT IN (SELECT DISTINCT parentId FROM ${Prisma.raw(tableName)} WHERE parentId IS NOT NULL)
        ORDER BY genreLevel ASC, updatedAt ASC
        LIMIT 1
      ` as Promise<any[]>
    ]);

    // BigInt 타입 변환
    const totalCount = Number(statsResult[0].totalCount);
    const pendingCount = Number(statsResult[0].pendingCount);

    // 🌟 2. 타겟이 없을 때도 통계 데이터는 같이 보내줍니다.
    if (nextTarget.length === 0) {
      return NextResponse.json({ 
        success: true, 
        nextId: null,
        totalCount,
        pendingCount
      });
    }

    // 🌟 3. 타겟 정보와 통계 데이터를 한 번에 응답합니다.
    return NextResponse.json({ 
      success: true, 
      nextId: nextTarget[0].genreId,
      nextName: nextTarget[0].genreName,
      totalCount,
      pendingCount
    });

  } catch (e: any) {
    // 🌟 수정됨: searchParams 대신 request.nextUrl.searchParams 를 직접 참조!
    console.error(`[${request.nextUrl.searchParams.get('platform')}] API 오류:`, e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}