// app/api/admin/categories/mercari/route.ts
// 관리자용: 메루카리 카테고리 트리에서 한 카테고리의 자식 목록을 골라 DB 에 반영합니다.
// 관리자 개발자 페이지의 "자동 수집"이 이 라우트를 카테고리마다 반복 호출해 트리를 채웁니다.
// 동기화 로직은 lib/mercariCategories.ts 에 있고, 사용자용 라우트(첫 방문 시 자동 수집)와 같은 코드를 씁니다.
import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { syncCategoryChildren, isCategoryNotFoundError, MERCARI_ROOT_ID } from '@/lib/mercariCategories';

export async function GET(req: NextRequest) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const { searchParams } = new URL(req.url);
  // 관리자 자동 수집은 genreId 로, 예전 호출은 parentId 로 보냅니다. 둘 다 받습니다.
  const genreId = Number(searchParams.get('parentId') ?? searchParams.get('genreId')) || MERCARI_ROOT_ID;

  try {
    const { children, parents, isLeaf } = await syncCategoryChildren(genreId);
    if (isLeaf) console.log(`[메루카리 카테고리] ${genreId} 는 최하위 카테고리 (isLeaf=true)`);

    return NextResponse.json({ success: true, data: children, parents, isLeaf });
  } catch (error) {
    if (isCategoryNotFoundError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('Mercari Category Sync Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || '카테고리 정보를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
