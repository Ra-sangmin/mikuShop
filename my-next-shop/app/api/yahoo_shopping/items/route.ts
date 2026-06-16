import { NextResponse } from 'next/server';
import fs from 'fs';

// 🌟 전역 변수: API 호출 간격 제어용 (라쿠텐 로직 적용)
let lastRequestTime: number = 0;
const MIN_INTERVAL = 500; // 야후 API 최소 호출 간격 (0.5초)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 1. 프론트엔드에서 넘어온 파라미터 받기
  const genreId = searchParams.get('genreId') || '1';
  const keyword = searchParams.get('keyword') || '';
  const NGKeyword = searchParams.get('NGKeyword') || null; // 🌟 라쿠텐과 통일성을 위해 NGKeyword 파라미터 추가
  const sort = searchParams.get('sort') || '-score'; // 리뷰 많은 순은 '-review_count'로 들어와야 함
  const page = parseInt(searchParams.get('page') || '1', 10);
  const minPrice = parseInt(searchParams.get('minPrice') || '0', 10);
  const maxPrice = parseInt(searchParams.get('maxPrice') || '1000000', 10);

  // 2. 페이지네이션 계산 (한 페이지에 100개씩)
  const resultsPerPage = 100;
  let startPosition = (page - 1) * resultsPerPage + 1;

  // 🌟 야후 API 상한선 방어 (start + results <= 1000 법칙)
  const MAX_ALLOWED_START = 1000 - resultsPerPage; // 1000 - 100 = 900
  if (startPosition > MAX_ALLOWED_START) {
    startPosition = MAX_ALLOWED_START; 
  }

  // 3. 야후 V3 API URL 및 인증 설정
  const API_URL = new URL('https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch');
  const appId = process.env.YAHOO_CLIENT_ID as string;

  if (!appId) {
    return NextResponse.json({ error: '야후 Client ID가 설정되지 않았습니다.' }, { status: 500 });
  }

  // 4. API 파라미터 조립
  API_URL.searchParams.append('appid', appId);
  API_URL.searchParams.append('genre_category_id', genreId);
  API_URL.searchParams.append('results', resultsPerPage.toString());
  API_URL.searchParams.append('start', startPosition.toString());
  API_URL.searchParams.append('sort', sort);

  // 🌟 가격 파라미터 맵핑 로직
  if (minPrice) {
    API_URL.searchParams.append('price_from', minPrice.toString());
  }

  if (maxPrice) {
    API_URL.searchParams.append('price_to', maxPrice.toString());
  }

  // 🌟 야후 방식의 마이너스 검색어 조합 로직
  let finalQuery = keyword || ''; 

  if (NGKeyword) {
    // 프론트엔드에서 쉼표(,)나 띄어쓰기로 여러 개의 제외 단어를 보낼 경우를 대비
    const ngList = NGKeyword.split(',').map(word => `-${word.trim()}`).join(' ');
    
    // 키워드가 있으면 "키워드 -제외단어", 키워드가 없고 카테고리만 있으면 "-제외단어"
    finalQuery = finalQuery ? `${finalQuery} ${ngList}` : ngList; 
  }

  // 최종 완성된 검색어가 존재할 경우에만 query 파라미터에 추가
  if (finalQuery.trim()) {
    API_URL.searchParams.append('query', finalQuery.trim());
  }

  // 🌟 5. API 호출 전 간격 제어 (Rate Limit 방어)
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_INTERVAL) {
    const waitTime = MIN_INTERVAL - timeSinceLastRequest;
    await delay(waitTime);
  }

  let attempt = 0;
  const retries = 3;
  let data: any = null;

  try {
    // 🌟 6. API 호출 및 재시도(Retry) 루프
    while (attempt < retries) {
      const response = await fetch(API_URL.toString(), { method: 'GET' });
      lastRequestTime = Date.now();

      if (!response.ok) {
        // 429 Too Many Requests 발생 시 딜레이 후 재시도
        if (response.status === 429 && attempt < retries - 1) {
          attempt++;
          console.warn(`[Yahoo API] 429 에러 발생. ${attempt}초 후 재시도합니다...`);
          await delay(attempt * 1000);
          continue;
        }
        throw new Error(`API Error - Status: ${response.status}`);
      }

      data = await response.json();
      break; // 성공 시 루프 탈출
    }

    // 💡 테스트/디버깅용 (실제 운영 시 주석 처리 권장)
    fs.writeFileSync('yahoo_test.json', JSON.stringify(data, null, 2), 'utf-8');

    // 야후 서버 자체 JSON 에러 확인
    if (data?.Error) {
      console.error("[Yahoo Item API Error]:", data.Error.Message);
      return NextResponse.json({ error: '야후 API 요청이 올바르지 않습니다.' }, { status: 400 });
    }

    // 🌟 7. 페이지네이션 동적 계산 (1000개 컷팅 방어 로직)
    const MAX_ALLOWED_ITEMS = 1000;
    const realTotalItems = data?.totalResultsAvailable || 0;
    const safeTotalItems = Math.min(realTotalItems, MAX_ALLOWED_ITEMS);
    const totalPages = Math.ceil(safeTotalItems / resultsPerPage);

    // 8. 정제된 데이터 프론트엔드로 전달
    return NextResponse.json({
      success: true,
      items: data?.hits || [],      // 실제 상품 배열
      page: parseInt(page as any, 10), // 현재 요청한 페이지 번호
      pageCount: totalPages,        // 1000개 제한이 적용된 안전한 총 페이지 수
      totalItems: safeTotalItems    // 프론트가 터지지 않도록 컷팅된 개수 반환
    });

  } catch (error) {
    lastRequestTime = Date.now();
    console.error('Yahoo Item API Fetch Error:', error);
    return NextResponse.json(
      { error: '상품 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}