// app/api/admin/categories/rakuten/route.ts
// 관리자용: 한 장르의 자식 목록을 라쿠텐에서 받아 DB 에 반영합니다.
// 관리자 개발자 페이지의 "자동 수집"이 이 라우트를 장르마다 반복 호출해 트리를 채웁니다.
//   (auto-crawl 라우트가 "아직 자식을 받아오지 않은 비-리프 장르"를 하나씩 골라 줍니다)
//
// 🐛 예전엔 폐기된 API 버전(20170711)을 호출해 항상 400 이 났고, 그래서 트리가 L2 에서 멈춰
//    있었습니다. 동기화 로직은 lib/rakutenGenres.ts 로 옮겨 사용자용 라우트와 같은 코드를 씁니다.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { syncGenreChildren, isGenreNotFoundError } from '@/lib/rakutenGenres';

export async function GET(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const { searchParams } = new URL(request.url);
  const genreId = Number(searchParams.get('genreId')) || 0;

  try {
    // 관리자가 화면에서 기다리는 호출이므로 high. (사용자 상품 검색과 같은 레인이지만 건수가 적습니다)
    const { children, parents, isLeaf } = await syncGenreChildren(genreId, 'high');
    if (isLeaf) console.log(`[라쿠텐 장르] ${genreId} 는 최하위 카테고리 (isLeaf=true)`);

    return NextResponse.json({ success: true, data: children, parents, isLeaf });
  } catch (error) {
    if (isGenreNotFoundError(error)) {
      return NextResponse.json({ success: false, error: `라쿠텐에 없는 장르입니다: ${genreId}` }, { status: 404 });
    }
    console.error('Rakuten Category Sync Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || '카테고리 정보를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
