import { Controller, Get, Query} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('rakuten/categories')
  async getCategories(@Query('genreId') genreId: string) {
      // 기본값이 없을 경우 '0' (루트 카테고리) 사용
      const setGenreId = genreId || '0';
      
      const cacheKey = `rakuten_categoriAPI_${genreId}`;
      const tailUrl = "ichibagt/api/IchibaGenre/Search/20170711";

      const setPage = 1;
      const setSort = "";

      // 서비스에서 카테고리 트리 정보 가져오기 
      const categoryData = await this.appService.rakutenBaseAPIOn(cacheKey,tailUrl,setGenreId,setPage,setSort);
  
      return {
        genreId: categoryData.genreId, // 브레드크럼용 부모 경로 [cite: 49]
        parents: categoryData.parents, // 브레드크럼용 부모 경로 [cite: 49]
        current: categoryData.current, // 현재 카테고리명 [cite: 50]
        children: categoryData.children, // 하위 카테고리 리스트 [cite: 51]
      };
    }

  @Get('rakuten/items')
  async getItems(
    @Query('genreId') genreId: string,
    @Query('sort') sort: string,
    @Query('page') page: number
  ) {
      // 기본값이 없을 경우 '0' (루트 카테고리) 사용
      const setGenreId = genreId || '0';
      const setSort = sort || '0';
      const setPage = page || 0;

      const cacheKey = `rakuten_ItemAPI_${genreId}_${setPage}_${setSort}`;
      const tailUrl = "ichibams/api/IchibaItem/Search/20220601";

      // 서비스에서 카테고리 트리 정보 가져오기 
      const itemData = await this.appService.rakutenBaseAPIOn(cacheKey,tailUrl,setGenreId,setPage,setSort);
  
      return {
        items: itemData.Items, 
        page: itemData.page, 
        pageCount: itemData.pageCount, 
      };
    }
}
