import { Controller, Get, Query, Render } from '@nestjs/common';
import { RakutenService } from './rakuten.service';

@Controller('api/rakuten')
export class RakutenController {
  constructor(private readonly rakutenService: RakutenService) {}

  /**
   * 카테고리 정보 및 하위 카테고리 목록 조회
   * GET /api/rakuten/categories?genreId=...
   */
  @Get('categories')
  async getCategories(@Query('genreId') genreId: string) {
    // 기본값이 없을 경우 '0' (루트 카테고리) 사용
    const id = genreId || '0';
    
    // 서비스에서 카테고리 트리 정보 가져오기 
    const categoryData = await this.rakutenService.getCategoryInfo(id);

    return {
      parents: categoryData.parents, // 브레드크럼용 부모 경로 [cite: 49]
      current: categoryData.current, // 현재 카테고리명 [cite: 50]
      children: categoryData.children, // 하위 카테고리 리스트 [cite: 51]
    };
  }

  /**
   * 상품 목록 검색 및 페이징/정렬 처리
   * GET /api/rakuten/items?genreId=...&sort=...&page=...
   */
  @Get('items')
  async getItems(
    @Query('genreId') genreId: string,
    @Query('sort') sort: string,
    @Query('page') page: string,
  ) {
    const currentSort = sort || 'standard'; 
    const currentPage = parseInt(page) || 1; 

    // 라쿠텐 API를 통해 상품 데이터 호출 [cite: 18, 33]
    const result = await this.rakutenService.searchItems({
      genreId,
      sort: currentSort,
      page: currentPage,
    });

    return {
      items: result.items, // 상품 배열 [cite: 20, 44]
      page: result.page, // 현재 페이지 [cite: 38]
      pageCount: result.pageCount, // 전체 페이지 수 [cite: 38]
    };
  }
}